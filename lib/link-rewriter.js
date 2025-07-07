const cheerio = require('cheerio');

function rewriteLinks(html, proxyHost) {
    try {
        const $ = cheerio.load(html);
        
        // Rewrite all <a> href attributes
        $('a[href]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            
            if (href && shouldRewriteLink(href)) {
                const newHref = rewriteUrl(href, proxyHost);
                $link.attr('href', newHref);
            }
        });
        
        // Rewrite form actions
        $('form[action]').each((index, element) => {
            const $form = $(element);
            const action = $form.attr('action');
            
            if (action && shouldRewriteLink(action)) {
                const newAction = rewriteUrl(action, proxyHost);
                $form.attr('action', newAction);
            }
        });
        
        // Rewrite CSS background images and @import statements
        $('style').each((index, element) => {
            const $style = $(element);
            let cssContent = $style.html();
            
            if (cssContent) {
                // Rewrite url() in CSS
                cssContent = cssContent.replace(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, url) => {
                    if (shouldRewriteLink(url)) {
                        return `url('${rewriteUrl(url, proxyHost)}')`;
                    }
                    return match;
                });
                
                // Rewrite @import statements
                cssContent = cssContent.replace(/@import\s+['"]([^'"]+)['"]/gi, (match, url) => {
                    if (shouldRewriteLink(url)) {
                        return `@import '${rewriteUrl(url, proxyHost)}'`;
                    }
                    return match;
                });
                
                $style.html(cssContent);
            }
        });
        
        // Rewrite link rel="stylesheet" href
        $('link[rel="stylesheet"][href]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            
            if (href && shouldRewriteLink(href)) {
                const newHref = rewriteUrl(href, proxyHost);
                $link.attr('href', newHref);
            }
        });
        
        // Rewrite script src attributes
        $('script[src]').each((index, element) => {
            const $script = $(element);
            const src = $script.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, proxyHost);
                $script.attr('src', newSrc);
            }
        });
        
        // Rewrite img src attributes
        $('img[src]').each((index, element) => {
            const $img = $(element);
            const src = $img.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, proxyHost);
                $img.attr('src', newSrc);
            }
        });
        
        // Rewrite iframe src attributes
        $('iframe[src]').each((index, element) => {
            const $iframe = $(element);
            const src = $iframe.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, proxyHost);
                $iframe.attr('src', newSrc);
            }
        });
        
        // Rewrite any inline style attributes with background-image
        $('[style]').each((index, element) => {
            const $element = $(element);
            let style = $element.attr('style');
            
            if (style && style.includes('background-image')) {
                style = style.replace(/background-image\s*:\s*url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, url) => {
                    if (shouldRewriteLink(url)) {
                        return `background-image: url('${rewriteUrl(url, proxyHost)}')`;
                    }
                    return match;
                });
                $element.attr('style', style);
            }
        });
        
        return $.html();
        
    } catch (error) {
        console.error('Error rewriting links:', error);
        return html; // Return original HTML if there's an error
    }
}

function shouldRewriteLink(url) {
    if (!url || url.trim() === '') return false;
    
    // Don't rewrite:
    // - Absolute URLs to external sites (except chess-results.com)
    // - Data URLs
    // - JavaScript URLs
    // - Mailto links
    // - Hash/fragment links
    // - Already proxied URLs
    
    if (url.startsWith('data:') || 
        url.startsWith('javascript:') || 
        url.startsWith('mailto:') || 
        url.startsWith('#') ||
        url.includes('?page=')) {
        return false;
    }
    
    try {
        // If it's an absolute URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Parse URL manually to avoid URL constructor issues
            const match = url.match(/^https?:\/\/([^\/]+)/);
            if (match) {
                const hostname = match[1];
                // Only rewrite chess-results.com URLs
                return hostname === 'chess-results.com' || hostname.endsWith('.chess-results.com');
            }
            return false;
        }
        
        // Rewrite relative URLs
        return true;
        
    } catch (error) {
        // If URL parsing fails, assume it's a relative URL that should be rewritten
        return true;
    }
}

function rewriteUrl(url, proxyHost) {
    try {
        if (!url || url.trim() === '') return url;
        
        let targetUrl;
        
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Absolute URL
            targetUrl = url;
        } else if (url.startsWith('//')) {
            // Protocol-relative URL
            targetUrl = 'https:' + url;
        } else if (url.startsWith('/')) {
            // Root-relative URL
            targetUrl = 'https://chess-results.com' + url;
        } else {
            // Relative URL
            targetUrl = 'https://chess-results.com/' + url;
        }
        
        // Remove any existing protocol and encode
        const cleanUrl = targetUrl.replace(/^https?:\/\//, '');
        const protocol = proxyHost.includes('localhost') ? 'http' : 'https';
        
        return `${protocol}://${proxyHost}/?page=${encodeURIComponent(cleanUrl)}`;
        
    } catch (error) {
        console.error('Error rewriting URL:', url, error);
        return url; // Return original URL if there's an error
    }
}

module.exports = { rewriteLinks };