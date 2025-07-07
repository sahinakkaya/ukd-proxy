// Load the universal UKD calculator
// This script tag should be added to the extension's manifest

// UKD Calculator Content Script - Browser Extension Version
class UKDCalculatorExtension {
    constructor() {
        // Use the universal calculator for core logic
        this.calculator = new UKDCalculator();
        this.init();
    }

    // Extract match data from the page using shared logic
    extractMatchData() {
        return this.calculator.extractMatchData(document);
    }

    // Create and inject UKD display - now integrated into the existing table
    createUKDDisplay(playerRating, ukdData) {
        // Remove existing UKD display if any
        this.removeExistingUKDData();

        // Find the results table and add columns to it
        this.addColumnsToResultsTable(playerRating, ukdData);

        // Create summary box
        this.createSummaryBox(playerRating, ukdData);
    }

    // Remove existing UKD data to prevent duplicates
    removeExistingUKDData() {
        // Remove existing summary
        const existing = document.getElementById('ukd-calculator-display');
        if (existing) existing.remove();

        // Remove existing UKD columns from table
        const ukdHeaders = document.querySelectorAll('.ukd-header');
        ukdHeaders.forEach(header => header.remove());

        const ukdData = document.querySelectorAll('.ukd-data');
        ukdData.forEach(data => data.remove());
    }

    // Add UKD calculation columns to the existing results table
    addColumnsToResultsTable(playerRating, ukdData) {
        const resultsTables = document.querySelectorAll('table.CRs1');
        
        for (const table of resultsTables) {
            const rows = table.querySelectorAll('tr');
            
            // Check if this is a results table by looking for headers
            const headerRow = rows[0];
            if (headerRow && (headerRow.textContent.includes('Tur') || headerRow.textContent.includes('Rd.')) && 
                (headerRow.textContent.includes('Sonuç') || headerRow.textContent.includes('Res.'))) {
                
                // Add new header columns for UKD calculations
                const headerCells = headerRow.querySelectorAll('th');
                if (headerCells.length > 0 && !headerRow.querySelector('.ukd-header')) {
                    const expectedHeader = document.createElement('th');
                    expectedHeader.className = 'CRc ukd-header';
                    // Use English or Turkish headers based on page language
                    expectedHeader.textContent = headerRow.textContent.includes('Res.') ? 'Expected' : 'Beklenen';
                    
                    const changeHeader = document.createElement('th');
                    changeHeader.className = 'CRc ukd-header';
                    changeHeader.textContent = headerRow.textContent.includes('Res.') ? 'Rating Change' : 'UKD Değişim';
                    
                    headerRow.appendChild(expectedHeader);
                    headerRow.appendChild(changeHeader);
                }
                
                // Add calculation data to each game row
                let calcIndex = 0;
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const cells = row.querySelectorAll('td');
                    
                    if (cells.length >= 10 && !row.querySelector('.ukd-data')) {
                        const roundIndex = i - 1; // Convert to 0-based index
                        
                        // Check if this round was skipped (forfeit)
                        if (ukdData.skippedRounds && ukdData.skippedRounds.has(roundIndex)) {
                            // Add empty cells for skipped rounds
                            const expectedCell = document.createElement('td');
                            expectedCell.className = cells[0].className + ' ukd-data';
                            expectedCell.textContent = '-';
                            expectedCell.style.color = '#999';
                            expectedCell.title = 'Forfeit - no rating change';
                            
                            const changeCell = document.createElement('td');
                            changeCell.className = cells[0].className + ' ukd-data';
                            changeCell.textContent = '-';
                            changeCell.style.color = '#999';
                            changeCell.title = 'Forfeit - no rating change';
                            
                            row.appendChild(expectedCell);
                            row.appendChild(changeCell);
                        } else if (calcIndex < ukdData.calculations.length) {
                            // Add actual calculation data
                            const calc = ukdData.calculations[calcIndex];
                            
                            // Add expected score cell - inherit row styling
                            const expectedCell = document.createElement('td');
                            expectedCell.className = cells[0].className + ' ukd-data';
                            expectedCell.textContent = calc.expected.toFixed(3);
                            
                            // Add rating change cell - inherit row styling with color coding
                            const changeCell = document.createElement('td');
                            changeCell.className = cells[0].className + ' ukd-data';
                            const changeText = (calc.change > 0 ? '+' : '') + calc.change.toFixed(2);
                            changeCell.textContent = changeText;
                            
                            // Add subtle color coding through additional classes
                            if (calc.change > 0) {
                                changeCell.classList.add('positive-change');
                            } else if (calc.change < 0) {
                                changeCell.classList.add('negative-change');
                            } else {
                                changeCell.classList.add('neutral-change');
                            }
                            
                            row.appendChild(expectedCell);
                            row.appendChild(changeCell);
                            
                            calcIndex++;
                        }
                    }
                }
                
                break; // Only modify the first results table found
            }
        }
    }

    // Create a compact summary box
    createSummaryBox(playerRating, ukdData) {
        // Find the results table to place summary after it
        const resultsTables = document.querySelectorAll('table.CRs1');
        let targetTable = null;
        
        for (const table of resultsTables) {
            const headerRow = table.querySelector('tr');
            if (headerRow && (headerRow.textContent.includes('Tur') || headerRow.textContent.includes('Rd.')) && 
                (headerRow.textContent.includes('Sonuç') || headerRow.textContent.includes('Res.'))) {
                targetTable = table;
                break;
            }
        }
        
        if (!targetTable) return;

        // Create summary container
        const container = document.createElement('div');
        container.id = 'ukd-calculator-display';
        container.className = 'ukd-calculator-summary';
        
        container.innerHTML = `
            <div class="ukd-summary-header">
                <h3>🧮 UKD Hesaplama Özeti</h3>
            </div>
            <div class="ukd-summary-content">
                <div class="ukd-summary-item">
                    <span class="ukd-label">Mevcut Rating:</span>
                    <span class="ukd-value">${playerRating}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">Toplam Değişim:</span>
                    <span class="ukd-value ${ukdData.totalChange > 0 ? 'positive' : ukdData.totalChange < 0 ? 'negative' : 'neutral'}">
                        ${ukdData.totalChange > 0 ? '+' : ''}${ukdData.totalChange.toFixed(2)}
                    </span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">Yeni Rating:</span>
                    <span class="ukd-value highlight">${ukdData.newRating}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">K-Faktör:</span>
                    <span class="ukd-value">${this.calculator.getKFactor(playerRating)}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">Maç Sayısı:</span>
                    <span class="ukd-value">${ukdData.calculations.length}</span>
                </div>
            </div>
            <div class="ukd-manual-input">
                <label for="manual-rating">Manuel Rating:</label>
                <input type="number" id="manual-rating" min="1000" max="3000" placeholder="${playerRating}">
                <button id="recalculate-ukd">Yeniden Hesapla</button>
            </div>
        `;

        // Insert summary after the results table
        targetTable.parentNode.insertBefore(container, targetTable.nextSibling);

        // Add event listener for recalculation
        document.getElementById('recalculate-ukd').addEventListener('click', () => {
            const manualRating = parseInt(document.getElementById('manual-rating').value);
            if (manualRating >= 1000 && manualRating <= 3000) {
                this.processPage(manualRating);
            } else {
                alert('Lütfen 1000-3000 arasında geçerli bir rating girin');
            }
        });
    }

    // Create error display
    createErrorDisplay(message) {
        const existing = document.getElementById('ukd-calculator-display');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'ukd-calculator-display';
        container.className = 'ukd-calculator-error';
        container.innerHTML = `
            <h3>🧮 UKD Calculator</h3>
            <p>${message}</p>
            <div class="ukd-manual-input">
                <label for="manual-rating">Manuel Rating:</label>
                <input type="number" id="manual-rating" min="1000" max="3000" placeholder="Rating girin">
                <button id="recalculate-ukd">Hesapla</button>
            </div>
        `;

        // Find a good place to insert the error display
        const targetElement = document.querySelector('table.CRs1') || document.querySelector('body');
        if (targetElement.tagName === 'TABLE') {
            targetElement.parentNode.insertBefore(container, targetElement);
        } else {
            targetElement.insertBefore(container, targetElement.firstChild);
        }

        // Add event listener for manual calculation
        document.getElementById('recalculate-ukd').addEventListener('click', () => {
            const manualRating = parseInt(document.getElementById('manual-rating').value);
            if (manualRating >= 1000 && manualRating <= 3000) {
                this.processPage(manualRating);
            } else {
                alert('Lütfen 1000-3000 arasında geçerli bir rating girin');
            }
        });
    }

    // Main processing function
    processPage(manualRating = null) {
        // Prevent infinite loops
        if (this.isProcessing) {
            console.log('UKD Calculator: Already processing, skipping...');
            return;
        }

        this.isProcessing = true;
        console.log('UKD Calculator: Processing page...');

        try {
            const { playerRating, matches, skippedRounds } = this.extractMatchData();
            const currentRating = manualRating || playerRating;

            console.log('UKD Calculator: Auto-detected rating:', playerRating);
            console.log('UKD Calculator: Manual rating:', manualRating);
            console.log('UKD Calculator: Using rating:', currentRating);
            console.log('UKD Calculator: Found matches:', matches.length);

            if (!currentRating) {
                console.log('UKD Calculator: Could not detect player rating');
                this.createErrorDisplay('Could not detect player rating. Please enter it manually below.');
                return;
            }

            if (matches.length === 0) {
                console.log('UKD Calculator: No matches found');
                this.createErrorDisplay('No matches found on this page. Make sure you are on a player\'s results page.');
                return;
            }

            const ukdData = this.calculator.calculateUKDChange(currentRating, matches);
            ukdData.skippedRounds = skippedRounds; // Pass skipped rounds info to UI
            this.createUKDDisplay(currentRating, ukdData);

            console.log('UKD Calculator: Successfully processed', matches.length, 'matches for rating', currentRating);
        } catch (error) {
            console.error('UKD Calculator: Error processing page:', error);
            this.createErrorDisplay('An error occurred while processing the page.');
        } finally {
            // Reset processing flag after a short delay
            setTimeout(() => {
                this.isProcessing = false;
            }, 500);
        }
    }

    // Initialize the calculator
    init() {
        // Flag to prevent infinite loops
        this.isProcessing = false;
        
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.processPage());
        } else {
            // Small delay to ensure page is fully rendered
            setTimeout(() => this.processPage(), 500);
        }

        // Listen for messages from popup
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'refresh') {
                this.processPage();
                sendResponse({status: 'refreshed'});
            }
        });

        // More selective mutation observer - only watch for significant changes
        let debounceTimer = null;
        const observer = new MutationObserver((mutations) => {
            // Skip if we're currently processing
            if (this.isProcessing) return;
            
            let shouldReprocess = false;
            mutations.forEach((mutation) => {
                // Only reprocess if there are significant changes to the page structure
                // Ignore our own UKD additions
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        // Skip if the added node is our UKD content
                        if (node.nodeType === 1) { // Element node
                            if (node.id === 'ukd-calculator-display' || 
                                node.classList?.contains('ukd-header') ||
                                node.classList?.contains('ukd-data')) {
                                continue;
                            }
                            // Only reprocess if new tables or significant content is added
                            if (node.tagName === 'TABLE' || 
                                node.querySelector && node.querySelector('table.CRs1')) {
                                shouldReprocess = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldReprocess) {
                // Debounce to prevent rapid successive calls
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log('UKD Calculator: Detected page changes, reprocessing...');
                    this.processPage();
                }, 1000);
            }
        });

        // Only observe body changes, exclude our own modifications
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
}

// Initialize the UKD Calculator Extension
new UKDCalculatorExtension();