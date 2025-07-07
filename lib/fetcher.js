const axios = require('axios');

// Simple in-memory cache with 5-minute expiration
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchPage(url) {
    try {
        // Check cache first
        const cached = cache.get(url);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('Serving from cache:', url);
            return cached.data;
        }

        console.log('Fetching from server:', url);
        
        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            responseType: 'text' // Ensure we get text response
        });

        const result = {
            html: response.data,
            contentType: response.headers['content-type'] || 'text/html'
        };

        // Cache the result
        cache.set(url, {
            data: result,
            timestamp: Date.now()
        });

        // Clean up old cache entries (simple cleanup)
        if (cache.size > 100) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }

        return result;
        
    } catch (error) {
        console.error('Error fetching page:', error.message);
        
        // More specific error handling
        if (error.code === 'ENOTFOUND') {
            throw new Error('Page not found or network error');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout');
        } else if (error.response) {
            throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
        } else {
            throw new Error(`Network error: ${error.message}`);
        }
    }
}

module.exports = { fetchPage };