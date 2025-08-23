const { fetchPage } = require('./fetcher');
const cheerio = require('cheerio');

async function fetchTournamentLinks() {
    try {
        const tsfUrl = 'https://izmir.tsf.org.tr/';
        console.log('Fetching tournament links from İzmir TSF...');
        
        const { html } = await fetchPage(tsfUrl);
        const $ = cheerio.load(html);
        
        const tournaments = [];
        
        // Find all links that contain chess-results.com
        $('a[href*="chess-results.com"]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const text = $link.text().trim();
            
            if (href && text && href.includes('chess-results.com')) {
                // Clean up the URL - ensure it's properly formatted
                let cleanUrl = href;
                if (!cleanUrl.startsWith('http')) {
                    cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
                }
                
                // Extract tournament name and category
                let tournamentName = text;
                let category = '';
                
                // Try to find parent context for better tournament names
                const parentText = $link.closest('tr, li, div').text().trim();
                if (parentText.length > text.length && parentText.length < 200) {
                    // Look for category indicators
                    const categoryMatch = parentText.match(/(\d+\s+Yaş|Açık|Genel|Kategori)/i);
                    if (categoryMatch) {
                        category = categoryMatch[0];
                    }
                    
                    // Use parent text if it's more descriptive
                    if (parentText.includes(text) && !text.includes('Turnuva') && parentText.includes('Turnuva')) {
                        tournamentName = parentText.replace(/\s+/g, ' ').trim();
                    }
                }
                
                tournaments.push({
                    name: tournamentName,
                    category: category,
                    url: cleanUrl,
                    proxyUrl: `/?page=${encodeURIComponent(cleanUrl)}`
                });
            }
        });
        
        // Remove duplicates based on URL
        const uniqueTournaments = tournaments.filter((tournament, index, self) => 
            index === self.findIndex(t => t.url === tournament.url)
        );
        
        // Sort by name for better organization
        uniqueTournaments.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        
        console.log(`Found ${uniqueTournaments.length} tournament links`);
        return uniqueTournaments;
        
    } catch (error) {
        console.error('Error fetching tournament links:', error);
        return []; // Return empty array on error
    }
}

// Cache tournament links for 30 minutes to avoid excessive requests
let cachedTournaments = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getCachedTournamentLinks() {
    const now = Date.now();
    
    if (!cachedTournaments || (now - lastFetchTime) > CACHE_DURATION) {
        console.log('Refreshing tournament links cache...');
        cachedTournaments = await fetchTournamentLinks();
        lastFetchTime = now;
    }
    
    return cachedTournaments || [];
}

module.exports = { getCachedTournamentLinks };