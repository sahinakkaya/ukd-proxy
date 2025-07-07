const cheerio = require('cheerio');

function rewriteLinks(html, baseUrl) {
    try {
        const $ = cheerio.load(html);
        
        console.log(`Starting link rewriting with base URL: ${baseUrl}`);
        
        // Rewrite all <a> href attributes
        $('a[href]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            
            if (href) {
                const shouldRewrite = shouldRewriteLink(href);
                // Log first few links for debugging
                if (index < 5) {
                    console.log(`Link ${index}: "${href}" -> shouldRewrite: ${shouldRewrite}`);
                }
                
                if (shouldRewrite) {
                    const newHref = rewriteUrl(href, baseUrl);
                    $link.attr('href', newHref);
                }
            }
        });
        
        // Rewrite form actions
        $('form[action]').each((index, element) => {
            const $form = $(element);
            const action = $form.attr('action');
            
            if (action && shouldRewriteLink(action)) {
                const newAction = rewriteUrl(action, baseUrl);
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
                        return `url('${rewriteUrl(url, baseUrl)}')`;
                    }
                    return match;
                });
                
                // Rewrite @import statements
                cssContent = cssContent.replace(/@import\s+['"]([^'"]+)['"]/gi, (match, url) => {
                    if (shouldRewriteLink(url)) {
                        return `@import '${rewriteUrl(url, baseUrl)}'`;
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
                const newHref = rewriteUrl(href, baseUrl);
                $link.attr('href', newHref);
            }
        });
        
        // Rewrite script src attributes
        $('script[src]').each((index, element) => {
            const $script = $(element);
            const src = $script.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, baseUrl);
                $script.attr('src', newSrc);
            }
        });
        
        // Rewrite img src attributes
        $('img[src]').each((index, element) => {
            const $img = $(element);
            const src = $img.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, baseUrl);
                $img.attr('src', newSrc);
            }
        });
        
        // Rewrite iframe src attributes
        $('iframe[src]').each((index, element) => {
            const $iframe = $(element);
            const src = $iframe.attr('src');
            
            if (src && shouldRewriteLink(src)) {
                const newSrc = rewriteUrl(src, baseUrl);
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
                        return `background-image: url('${rewriteUrl(url, baseUrl)}')`;
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
        url.startsWith('#')) {
        return false;
    }
    
    // If it's already a proxied URL, check if it needs to be re-proxied with correct domain
    if (url.includes('?page=')) {
        // Extract the current host from the URL
        const match = url.match(/^https?:\/\/([^\/]+)/);
        if (match) {
            const currentHost = match[1];
            // Rewrite if it's pointing to localhost (wrong domain)
            return currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
        }
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

function rewriteUrl(url, baseUrl) {
    try {
        if (!url || url.trim() === '') return url;
        
        let targetUrl;
        
        // Check if this is already a proxied URL that needs domain fixing
        if (url.includes('?page=')) {
            // Extract the page parameter
            const pageMatch = url.match(/[?&]page=([^&]+)/);
            if (pageMatch) {
                const encodedPage = pageMatch[1];
                const rewrittenUrl = `${baseUrl}/?page=${encodedPage}`;
                
                console.log(`Re-proxying URL: "${url}" -> "${rewrittenUrl}"`);
                return rewrittenUrl;
            }
        }
        
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
        
        const rewrittenUrl = `${baseUrl}/?page=${encodeURIComponent(cleanUrl)}`;
        
        // Debug logging (only log first few to avoid spam)
        if (Math.random() < 0.1) { // Log ~10% of rewrites
            console.log(`Rewriting URL: "${url}" -> "${rewrittenUrl}"`);
        }
        
        return rewrittenUrl;
        
    } catch (error) {
        console.error('Error rewriting URL:', url, error);
        return url; // Return original URL if there's an error
    }
}

module.exports = { rewriteLinks };