const express = require('express');
const path = require('path');
const { fetchPage } = require('./lib/fetcher');
const { addUKDCalculations } = require('./lib/html-modifier');
const { rewriteLinks } = require('./lib/link-rewriter');

// Helper function to determine the base URL
function getBaseUrl(req) {
    // Check for environment variable first
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    }
    
    // Check for forwarded headers (common in proxy setups)
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto');
    
    if (forwardedHost) {
        const protocol = forwardedProto || (forwardedHost.includes('localhost') ? 'http' : 'https');
        return `${protocol}://${forwardedHost}`;
    }
    
    // Fall back to request host
    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Main route handler
app.get('/', async (req, res) => {
    try {
        const targetUrl = req.query.page;
        
        // If no page specified, show landing page
        if (!targetUrl) {
            return res.render('landing', { 
                title: 'UKD Calculator Proxy',
                error: null 
            });
        }

        console.log('Fetching page:', targetUrl);
        
        // Add protocol if missing
        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        
        // Fetch original page
        const { html: originalHtml, contentType } = await fetchPage(fullUrl);
        
        // If it's not HTML, just proxy it directly
        if (!contentType || !contentType.includes('text/html')) {
            res.set('Content-Type', contentType || 'application/octet-stream');
            return res.send(originalHtml);
        }
        
        // Check if this is a chess-results.com page that needs UKD calculations
        const needsUKD = fullUrl.includes('chess-results.com') && 
                        (originalHtml.includes('table.CRs1') || originalHtml.includes('CRs1'));
        
        let modifiedHtml = originalHtml;
        
        if (needsUKD) {
            console.log('Adding UKD calculations to page');
            // Add UKD calculations
            modifiedHtml = await addUKDCalculations(originalHtml, fullUrl);
        }
        
        // Determine the base URL for link rewriting
        const baseUrl = getBaseUrl(req);
        
        // Rewrite all links to go through proxy
        const finalHtml = rewriteLinks(modifiedHtml, baseUrl);
        
        res.send(finalHtml);
        
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).render('landing', { 
            title: 'UKD Calculator Proxy',
            error: `Error loading page: ${error.message}` 
        });
    }
});

// Handle POST requests from landing page form
app.post('/', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.render('landing', { 
            title: 'UKD Calculator Proxy',
            error: 'Please enter a valid URL' 
        });
    }
    
    // Redirect to GET request with URL as query parameter
    res.redirect(`/?page=${encodeURIComponent(url)}`);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`UKD Proxy Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});