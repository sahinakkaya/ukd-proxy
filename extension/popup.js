document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refresh');
    
    refreshButton.addEventListener('click', function() {
        // Send message to content script to refresh calculations
        browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
            browser.tabs.sendMessage(tabs[0].id, {action: 'refresh'}, function(response) {
                if (response && response.status === 'refreshed') {
                    // Close popup after refresh
                    window.close();
                }
            });
        });
    });
});