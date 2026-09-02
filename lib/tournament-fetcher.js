const { fetchPage } = require('./fetcher');
const cheerio = require('cheerio');

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_CITIES = 8;
const DEFAULT_CITIES = ['izmir'];
const cityCache = new Map();

const CITY_NAMES = {
    adana: 'Adana',
    ankara: 'Ankara',
    antalya: 'Antalya',
    bursa: 'Bursa',
    eskisehir: 'Eskişehir',
    istanbul: 'İstanbul',
    izmir: 'İzmir',
    kocaeli: 'Kocaeli',
    konya: 'Konya',
    mugla: 'Muğla',
    sakarya: 'Sakarya',
    samsun: 'Samsun',
    trabzon: 'Trabzon'
};

function normalizeCitySlug(value) {
    if (typeof value !== 'string') return null;

    const slug = value
        .trim()
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // A single DNS label only. This prevents the tournament fetcher from being
    // used for arbitrary URLs or sibling domains.
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
}

function parseCities(value) {
    const rawValues = Array.isArray(value) ? value : [value || DEFAULT_CITIES[0]];
    const cities = rawValues
        .flatMap(item => String(item).split(','))
        .map(normalizeCitySlug)
        .filter(Boolean);

    return [...new Set(cities)].slice(0, MAX_CITIES);
}

function getCityName(slug) {
    return CITY_NAMES[slug] || slug.charAt(0).toLocaleUpperCase('tr-TR') + slug.slice(1);
}

function parseChessResultsUrl(href) {
    try {
        const value = href.startsWith('//') ? `https:${href}` : href;
        const url = new URL(value.startsWith('http') ? value : `https://${value.replace(/^\/+/, '')}`);
        if (url.hostname !== 'chess-results.com' && !url.hostname.endsWith('.chess-results.com')) return null;

        const tournamentMatch = url.pathname.match(/\/tnr(\d+)\.aspx/i);
        if (!tournamentMatch) return null;

        const id = tournamentMatch[1];
        const language = url.searchParams.get('lan') || '8';
        return {
            id,
            // A tournament can have hundreds of round, standings, and player
            // views. Link to one stable tournament page for each tournament ID.
            url: `https://chess-results.com/tnr${id}.aspx?lan=${encodeURIComponent(language)}`
        };
    } catch (error) {
        return null;
    }
}

function getArticleTitle($, $link) {
    const $article = $link.closest('.item, article, .blog-item, .item-page');
    const title = $article.find('h1, h2, h3, .page-header, .item-title').first().text();
    if (title.trim()) return title.replace(/\s+/g, ' ').trim();

    const fallback = $link.parents().prevAll('h1, h2, h3').first().text();
    return fallback.replace(/\s+/g, ' ').trim();
}

function isCategoryLinkText(text) {
    return /^(?:açık|genel|\d+\s*yaş(?:\s+ve\s+altı)?|[a-h])\s*(?:kategorisi|kategori)?$/i.test(text.trim());
}

function isGenericLinkText(text) {
    return isCategoryLinkText(text) || /^(?:\d+\.\s*)?tur$|^\d+\.\s*tur$|eşlendirme|sonuç|sıralama|liste|chess.?results|tıkla|detay/i.test(text);
}

function titleScore(title, fromLink) {
    let score = fromLink ? 60 : 40;
    if (/(turnuva|satranç|şampiyona|birincili)/i.test(title)) score += 20;
    if (/(başlıyor|düzenleniyor|yapılacak)/i.test(title)) score += 5;
    if (/(sona erdi|şampiyon|birincisi)/i.test(title)) score -= 10;
    return score;
}

function extractTournamentLinks(html) {
    const $ = cheerio.load(html);
    const tournamentsById = new Map();

    // TSF province sites share a Joomla layout, while individual editors use
    // slightly different containers. Looking at every Chess-Results link makes
    // this work across those variations.
    $('a[href*="chess-results.com"]').each((index, element) => {
        const $link = $(element);
        const href = ($link.attr('href') || '').trim();
        const text = $link.text().trim();
        const parsedUrl = parseChessResultsUrl(href);
        if (!parsedUrl || !text) return;

        const articleTitle = getArticleTitle($, $link);
        const useLinkText = !isGenericLinkText(text) && text.length >= 5 && text.length <= 120;
        const tournamentName = useLinkText ? text : (articleTitle || text);
        const nameScore = titleScore(tournamentName, useLinkText);
        let category = isCategoryLinkText(text) ? text : '';
        const parentText = $link.closest('tr, li, div').text().replace(/\s+/g, ' ').trim();

        if (!category && parentText.length > text.length && parentText.length < 200) {
            const categoryMatch = parentText.match(/(\d+\s+Yaş|Açık|Genel|Kategori)/i);
            if (categoryMatch) category = categoryMatch[0];
        }

        const candidate = {
            name: tournamentName,
            nameScore,
            category,
            url: parsedUrl.url,
            proxyUrl: `/?page=${encodeURIComponent(parsedUrl.url)}`
        };
        const existing = tournamentsById.get(parsedUrl.id);

        if (!existing) {
            tournamentsById.set(parsedUrl.id, candidate);
        } else {
            if (candidate.nameScore > existing.nameScore) {
                existing.name = candidate.name;
                existing.nameScore = candidate.nameScore;
            }
            if (!existing.category && candidate.category) existing.category = candidate.category;
        }
    });

    return [...tournamentsById.values()]
        .map(({ nameScore, ...tournament }) => tournament)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

async function fetchTournamentLinks(city) {
    const sourceUrl = `https://${city}.tsf.org.tr/`;
    console.log(`Fetching tournament links from ${getCityName(city)} TSF...`);
    const { html } = await fetchPage(sourceUrl);
    return extractTournamentLinks(html);
}

async function getCachedTournamentLinks(city = DEFAULT_CITIES[0]) {
    const slug = normalizeCitySlug(city);
    if (!slug) throw new Error('Invalid city');

    const cached = cityCache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.tournaments;
    }

    const tournaments = await fetchTournamentLinks(slug);
    cityCache.set(slug, { tournaments, timestamp: Date.now() });
    console.log(`Found ${tournaments.length} tournament links for ${getCityName(slug)}`);
    return tournaments;
}

async function getTournamentGroups(cities) {
    return Promise.all(cities.map(async city => {
        const sourceUrl = `https://${city}.tsf.org.tr/`;

        try {
            return {
                city,
                name: getCityName(city),
                sourceUrl,
                tournaments: await getCachedTournamentLinks(city),
                error: null
            };
        } catch (error) {
            console.error(`Error fetching tournaments for ${city}:`, error.message);
            return {
                city,
                name: getCityName(city),
                sourceUrl,
                tournaments: [],
                error: 'This city could not be loaded right now.'
            };
        }
    }));
}

module.exports = {
    DEFAULT_CITIES,
    MAX_CITIES,
    extractTournamentLinks,
    getCachedTournamentLinks,
    getTournamentGroups,
    normalizeCitySlug,
    parseCities
};
