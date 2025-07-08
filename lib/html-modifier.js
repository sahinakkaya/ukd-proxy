const cheerio = require('cheerio');
const UKDCalculator = require('./ukd-calculator-universal');

async function addUKDCalculations(html, originalUrl) {
    try {
        const $ = cheerio.load(html);
        const calculator = new UKDCalculator();
        
        // Extract match data from the HTML using the universal extractor
        const { playerRating, matches, skippedRounds } = calculator.extractMatchData($);
        
        // If no valid data found, return original HTML
        if (!playerRating || matches.length === 0) {
            console.log('No valid UKD data found, returning original HTML');
            return html;
        }
        
        // Calculate UKD changes
        const ukdData = calculator.calculateUKDChange(playerRating, matches);
        ukdData.skippedRounds = skippedRounds;
        
        console.log(`UKD Calculator: Processing ${matches.length} matches for rating ${playerRating}`);
        
        // Add UKD calculations to the HTML
        addUKDColumnsToTable($, ukdData);
        addUKDSummaryBox($, playerRating, ukdData, originalUrl);
        addUKDStyles($);
        modifyPageTitleAndIcon($, originalUrl);
        
        return $.html();
        
    } catch (error) {
        console.error('Error adding UKD calculations:', error);
        return html; // Return original HTML if there's an error
    }
}

function addUKDColumnsToTable($, ukdData) {
    // Find the results table and add columns to it
    $('table.CRs1').each((tableIndex, table) => {
        const $table = $(table);
        const rows = $table.find('tr');
        
        if (rows.length === 0) return;
        
        // Check if this is a results table by looking for headers
        const headerRow = rows.first();
        const headerText = headerRow.text();
        
        if ((headerText.includes('Tur') || headerText.includes('Rd.')) && 
            (headerText.includes('Sonuç') || headerText.includes('Res.'))) {
            
            // Add new header columns for UKD calculations
            const headerCells = headerRow.find('th');
            if (headerCells.length > 0 && !headerRow.find('.ukd-header').length) {
                const expectedHeader = $('<th class="CRc ukd-header"></th>');
                const changeHeader = $('<th class="CRc ukd-header"></th>');
                
                // Use English or Turkish headers based on page language
                if (headerText.includes('Res.')) {
                    expectedHeader.text('Expected');
                    changeHeader.text('Rating Change');
                } else {
                    expectedHeader.text('Beklenen');
                    changeHeader.text('UKD Değişim');
                }
                
                headerRow.append(expectedHeader);
                headerRow.append(changeHeader);
            }
            
            // Add calculation data to each game row
            let calcIndex = 0;
            rows.slice(1).each((rowIndex, row) => {
                const $row = $(row);
                const cells = $row.find('td');
                
                if (cells.length >= 10 && !$row.find('.ukd-data').length) {
                    // Check if this round was skipped (forfeit)
                    if (ukdData.skippedRounds && ukdData.skippedRounds.has(rowIndex)) {
                        // Add empty cells for skipped rounds
                        const expectedCell = $('<td class="ukd-data">-</td>');
                        const changeCell = $('<td class="ukd-data">-</td>');
                        
                        expectedCell.css('color', '#999');
                        changeCell.css('color', '#999');
                        expectedCell.attr('title', 'Forfeit - no rating change');
                        changeCell.attr('title', 'Forfeit - no rating change');
                        
                        // Inherit class from first cell
                        if (cells.length > 0) {
                            const firstCellClass = $(cells[0]).attr('class');
                            expectedCell.addClass(firstCellClass);
                            changeCell.addClass(firstCellClass);
                        }
                        
                        $row.append(expectedCell);
                        $row.append(changeCell);
                    } else if (calcIndex < ukdData.calculations.length) {
                        // Add actual calculation data
                        const calc = ukdData.calculations[calcIndex];
                        
                        const expectedCell = $('<td class="ukd-data"></td>');
                        const changeCell = $('<td class="ukd-data"></td>');
                        
                        expectedCell.text(calc.expected.toFixed(3));
                        
                        const changeText = (calc.change > 0 ? '+' : '') + calc.change.toFixed(2);
                        changeCell.text(changeText);
                        
                        // Add color coding
                        if (calc.change > 0) {
                            changeCell.addClass('positive-change');
                        } else if (calc.change < 0) {
                            changeCell.addClass('negative-change');
                        } else {
                            changeCell.addClass('neutral-change');
                        }
                        
                        // Inherit class from first cell
                        if (cells.length > 0) {
                            const firstCellClass = $(cells[0]).attr('class');
                            expectedCell.addClass(firstCellClass);
                            changeCell.addClass(firstCellClass);
                        }
                        
                        $row.append(expectedCell);
                        $row.append(changeCell);
                        
                        calcIndex++;
                    }
                }
            });
        }
    });
}

function addUKDSummaryBox($, playerRating, ukdData, originalUrl) {
    // Find the results table to place summary after it
    let targetTable = null;
    
    $('table.CRs1').each((tableIndex, table) => {
        const $table = $(table);
        const headerRow = $table.find('tr').first();
        const headerText = headerRow.text();
        
        if ((headerText.includes('Tur') || headerText.includes('Rd.')) && 
            (headerText.includes('Sonuç') || headerText.includes('Res.'))) {
            targetTable = $table;
            return false; // Break out of each loop
        }
    });
    
    if (!targetTable) return;
    
    // Determine language for summary
    const headerText = targetTable.find('tr').first().text();
    const isEnglish = headerText.includes('Res.');
    
    // Create summary container
    const summaryHtml = `
        <div id="ukd-calculator-display" class="ukd-calculator-summary">
            <div class="ukd-summary-header">
                <h3>🧮 ${isEnglish ? 'UKD Calculation Summary' : 'UKD Hesaplama Özeti'}</h3>
            </div>
            <div class="ukd-summary-content">
                <div class="ukd-summary-item">
                    <span class="ukd-label">${isEnglish ? 'Current Rating:' : 'Mevcut Rating:'}</span>
                    <span class="ukd-value">${playerRating}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">${isEnglish ? 'Total Change:' : 'Toplam Değişim:'}</span>
                    <span class="ukd-value ${ukdData.totalChange > 0 ? 'positive' : ukdData.totalChange < 0 ? 'negative' : 'neutral'}">
                        ${ukdData.totalChange > 0 ? '+' : ''}${ukdData.totalChange.toFixed(2)}
                    </span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">${isEnglish ? 'New Rating:' : 'Yeni Rating:'}</span>
                    <span class="ukd-value highlight">${ukdData.newRating}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">${isEnglish ? 'K-Factor:' : 'K-Faktör:'}</span>
                    <span class="ukd-value">${getKFactor(playerRating)}</span>
                </div>
                <div class="ukd-summary-item">
                    <span class="ukd-label">${isEnglish ? 'Matches:' : 'Maç Sayısı:'}</span>
                    <span class="ukd-value">${ukdData.calculations.length}</span>
                </div>
            </div>
        </div>
    `;
    
    // Insert summary after the results table
    targetTable.after(summaryHtml);
}

function getKFactor(playerRating) {
    if (playerRating < 1300) return 30;
    if (playerRating < 1600) return 25;
    if (playerRating < 2000) return 20;
    if (playerRating < 2400) return 15;
    return 10;
}

function addUKDStyles($) {
    // Add CSS styles for UKD calculations
    const styles = `
        <style>
            .ukd-calculator-summary {
                margin: 20px 0;
                padding: 15px;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .ukd-summary-header h3 {
                margin: 0 0 15px 0;
                color: #495057;
                font-size: 18px;
                font-weight: bold;
            }
            .ukd-summary-content {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }
            .ukd-summary-item {
                flex: 1;
                min-width: 150px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            .ukd-label {
                font-weight: bold;
                color: #6c757d;
                font-size: 12px;
                margin-bottom: 5px;
            }
            .ukd-value {
                font-size: 16px;
                font-weight: bold;
                color: #495057;
            }
            .ukd-value.positive {
                color: #28a745;
            }
            .ukd-value.negative {
                color: #dc3545;
            }
            .ukd-value.neutral {
                color: #6c757d;
            }
            .ukd-value.highlight {
                color: #007bff;
                font-size: 18px;
            }
            .positive-change {
                color: #28a745 !important;
            }
            .negative-change {
                color: #dc3545 !important;
            }
            .neutral-change {
                color: #6c757d !important;
            }
            .ukd-header {
                background-color: #e9ecef !important;
                font-weight: bold !important;
            }
            .ukd-data {
                font-weight: bold;
            }
            
            @media (max-width: 768px) {
                .ukd-summary-content {
                    flex-direction: column;
                }
                .ukd-summary-item {
                    min-width: auto;
                }
            }
        </style>
    `;
    
    // Add styles to head
    $('head').append(styles);
}

function modifyPageTitleAndIcon($, originalUrl) {
    // Extract tournament name from current title
    const currentTitle = $('title').text() || '';
    
    // Try to extract just the tournament name by removing common prefixes
    let tournamentName = currentTitle
        .replace(/Chess-Results Server Chess-results\.com\s*-\s*/i, '')
        .replace(/Chess-results\.com\s*-\s*/i, '')
        .replace(/Chess Results\s*-\s*/i, '')
        .trim();
    
    // If no tournament name found, use a generic one
    if (!tournamentName) {
        tournamentName = 'Chess Tournament';
    }
    
    // Set new title
    const newTitle = `UKD Calculator Proxy - ${tournamentName}`;
    $('title').text(newTitle);
    
    // Remove existing favicons
    $('link[rel*="icon"]').remove();
    
    console.log(`UKD Calculator: Changed title to "${newTitle}"`);
}

module.exports = { addUKDCalculations };
