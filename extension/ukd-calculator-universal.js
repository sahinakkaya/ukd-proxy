(function (global, factory) {
    // Universal Module Definition (UMD) pattern
    // Works in Node.js, Browser, and AMD environments
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        // Node.js
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals
        global.UKDCalculator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    class UKDCalculator {
        constructor() {
            this.ratingTable = [
                [3, 0.50, 0.50],
                [10, 0.51, 0.49],
                [17, 0.52, 0.48],
                [25, 0.53, 0.47],
                [32, 0.54, 0.46],
                [39, 0.55, 0.45],
                [46, 0.56, 0.44],
                [53, 0.57, 0.43],
                [61, 0.58, 0.42],
                [68, 0.59, 0.41],
                [76, 0.60, 0.40],
                [83, 0.61, 0.39],
                [91, 0.62, 0.38],
                [98, 0.63, 0.37],
                [106, 0.64, 0.36],
                [113, 0.65, 0.35],
                [121, 0.66, 0.34],
                [129, 0.67, 0.33],
                [137, 0.68, 0.32],
                [145, 0.69, 0.31],
                [153, 0.70, 0.30],
                [162, 0.71, 0.29],
                [170, 0.72, 0.28],
                [179, 0.73, 0.27],
                [188, 0.74, 0.26],
                [197, 0.75, 0.25],
                [206, 0.76, 0.24],
                [215, 0.77, 0.23],
                [225, 0.78, 0.22],
                [235, 0.79, 0.21],
                [245, 0.80, 0.20],
                [256, 0.81, 0.19],
                [267, 0.82, 0.18],
                [278, 0.83, 0.17],
                [290, 0.84, 0.16],
                [302, 0.85, 0.15],
                [315, 0.86, 0.14],
                [328, 0.87, 0.13],
                [344, 0.88, 0.12]
            ];
        }

        // Lookup win probabilities for a given rating difference
        lookupRatingDiff(ratingDiff) {
            if (ratingDiff < 0) {
                return [0.5, 0.5]; // Invalid case, return even odds
            }

            // Linear search through sorted table
            for (const [maxDiff, highProb, lowProb] of this.ratingTable) {
                if (ratingDiff <= maxDiff) {
                    return [highProb, lowProb];
                }
            }

            // If rating_diff > 344, return constant value
            return [0.89, 0.11];
        }

        // Calculate expected score for a player against an opponent
        expectedScore(playerRating, opponentRating) {
            // Handle special case where opponent has rating = 0 (unrated)
            // For unrated opponents, use expected score of 0.5
            // Combined with K=6, this gives: Win: +3, Loss: -3, Draw: 0
            if (opponentRating === 0) {
                return 0.5;
            }
            
            const ratingDiff = Math.abs(playerRating - opponentRating);
            const [highProb, lowProb] = this.lookupRatingDiff(ratingDiff);
            
            // Return probability for the higher-rated player
            if (playerRating >= opponentRating) {
                return highProb; // Player is higher rated
            } else {
                return lowProb; // Player is lower rated
            }
        }

        // Get K-factor based on player rating
        getKFactor(playerRating) {
            if (playerRating < 1300) return 30;
            if (playerRating < 1600) return 25;
            if (playerRating < 2000) return 20;
            if (playerRating < 2400) return 15;
            return 10;
        }

        // Calculate UKD rating changes for a list of matches
        calculateUKDChange(playerRating, matches) {
            const k = this.getKFactor(playerRating);
            let totalChange = 0;
            const calculations = [];

            for (const [opponentRating, result] of matches) {
                const exp = this.expectedScore(playerRating, opponentRating);
                // Use K=6 for unrated opponents, normal K for rated opponents
                const kFactor = (opponentRating === 0) ? 6 : k;
                const change = kFactor * (result - exp);
                totalChange += change;
                
                calculations.push({
                    opponent: opponentRating,
                    result: result,
                    expected: exp,
                    change: change
                });
            }

            return {
                totalChange: totalChange,
                newRating: playerRating + Math.round(totalChange),
                calculations: calculations
            };
        }

        // Extract match data - platform-specific implementations
        extractMatchData(documentOrCheerio) {
            // Detect environment and delegate to appropriate parser
            if (typeof window !== 'undefined' && documentOrCheerio === document) {
                // Browser environment - use DOM APIs
                return this.extractMatchDataFromDOM(documentOrCheerio);
            } else if (documentOrCheerio && typeof documentOrCheerio === 'function') {
                // Server environment with Cheerio
                return this.extractMatchDataFromCheerio(documentOrCheerio);
            } else {
                throw new Error('Unsupported environment for match data extraction');
            }
        }

        // Browser DOM-based extraction
        extractMatchDataFromDOM(document) {
            const matches = [];
            const skippedRounds = new Set();
            let playerRating = null;

            // Extract player rating from player info table
            const playerInfoTables = document.querySelectorAll('table.CRs1');
            for (const table of playerInfoTables) {
                const rows = table.querySelectorAll('tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const label = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        
                        if (label.toLowerCase().includes('rating') || 
                            label.toLowerCase().includes('ulusal rating') ||
                            label.toLowerCase() === 'rtg') {
                            const rating = parseInt(value);
                            if (rating >= 1000 && rating <= 3000 && !playerRating) {
                                playerRating = rating;
                                this.log('Found player rating:', rating, 'from label:', label);
                            }
                        }
                    }
                }
            }

            // Extract match results from results table
            const resultsTables = document.querySelectorAll('table.CRs1');
            for (const table of resultsTables) {
                const rows = table.querySelectorAll('tr');
                
                if (rows.length === 0) continue;
                
                const headerRow = rows[0];
                const headerText = headerRow.textContent;
                
                if ((headerText.includes('Tur') || headerText.includes('Rd.')) && 
                    (headerText.includes('Sonuç') || headerText.includes('Res.'))) {
                    
                    this.log('Found results table');
                    
                    const { ratingColumnIndex, resultColumnIndex } = this.findColumnIndices(headerRow);
                    
                    this.log('Rating column index:', ratingColumnIndex, 'Result column index:', resultColumnIndex);
                    
                    // Process each game row (skip header)
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td');
                        
                        if (cells.length > Math.max(ratingColumnIndex, resultColumnIndex) && 
                            ratingColumnIndex >= 0 && resultColumnIndex >= 0) {
                            
                            const matchResult = this.extractSingleMatch(cells, ratingColumnIndex, resultColumnIndex, i - 1);
                            
                            if (matchResult.isSkipped) {
                                skippedRounds.add(matchResult.roundIndex);
                            } else if (matchResult.match) {
                                matches.push(matchResult.match);
                                this.log('Found match - Opponent rating:', matchResult.match[0], 'Result:', matchResult.match[1]);
                            }
                        }
                    }
                }
            }

            this.log('Final results - Player rating:', playerRating, 'Matches:', matches.length);
            return { playerRating, matches, skippedRounds };
        }

        // Server Cheerio-based extraction
        extractMatchDataFromCheerio($) {
            const matches = [];
            const skippedRounds = new Set();
            let playerRating = null;

            // Extract player rating from player info table
            $('table.CRs1').each((tableIndex, table) => {
                const $table = $(table);
                const rows = $table.find('tr');
                
                rows.each((rowIndex, row) => {
                    const $row = $(row);
                    const cells = $row.find('td');
                    
                    if (cells.length >= 2) {
                        const label = $(cells[0]).text().trim();
                        const value = $(cells[1]).text().trim();
                        
                        if (label.toLowerCase().includes('rating') || 
                            label.toLowerCase().includes('ulusal rating') ||
                            label.toLowerCase() === 'rtg') {
                            const rating = parseInt(value);
                            if (rating >= 1000 && rating <= 3000 && !playerRating) {
                                playerRating = rating;
                                this.log('Found player rating:', rating, 'from label:', label);
                            }
                        }
                    }
                });
            });

            // Extract match results from results table
            $('table.CRs1').each((tableIndex, table) => {
                const $table = $(table);
                const rows = $table.find('tr');
                
                if (rows.length === 0) return;
                
                const headerRow = rows.first();
                const headerText = headerRow.text();
                
                if ((headerText.includes('Tur') || headerText.includes('Rd.')) && 
                    (headerText.includes('Sonuç') || headerText.includes('Res.'))) {
                    
                    this.log('Found results table');
                    
                    const { ratingColumnIndex, resultColumnIndex } = this.findColumnIndicesCheerio(headerRow, $);
                    
                    this.log('Rating column index:', ratingColumnIndex, 'Result column index:', resultColumnIndex);
                    
                    // Process each game row (skip header)
                    rows.slice(1).each((rowIndex, row) => {
                        const $row = $(row);
                        const cells = $row.find('td');
                        
                        if (cells.length > Math.max(ratingColumnIndex, resultColumnIndex) && 
                            ratingColumnIndex >= 0 && resultColumnIndex >= 0) {
                            
                            const matchResult = this.extractSingleMatchCheerio(cells, ratingColumnIndex, resultColumnIndex, rowIndex, $);
                            
                            if (matchResult.isSkipped) {
                                skippedRounds.add(matchResult.roundIndex);
                            } else if (matchResult.match) {
                                matches.push(matchResult.match);
                                this.log('Found match - Opponent rating:', matchResult.match[0], 'Result:', matchResult.match[1]);
                            }
                        }
                    });
                }
            });

            this.log('Final results - Player rating:', playerRating, 'Matches:', matches.length);
            return { playerRating, matches, skippedRounds };
        }

        // Helper method to find column indices (DOM version)
        findColumnIndices(headerRow) {
            const headerCells = headerRow.querySelectorAll('th');
            let ratingColumnIndex = -1;
            let resultColumnIndex = -1;
            
            for (let i = 0; i < headerCells.length; i++) {
                const headerText = headerCells[i].textContent.trim().toLowerCase();
                
                if (headerText === 'ukd') {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtgn') {
                    ratingColumnIndex = i;
                } else if (headerText === 'elo' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtg' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtgi' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText.includes('rating') && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'sonuç' || headerText.includes('sonuc') || 
                          headerText === 'res.' || headerText.includes('res')) {
                    resultColumnIndex = i;
                }
            }
            
            return { ratingColumnIndex, resultColumnIndex };
        }

        // Helper method to find column indices (Cheerio version)
        findColumnIndicesCheerio(headerRow, $) {
            const headerCells = headerRow.find('th');
            let ratingColumnIndex = -1;
            let resultColumnIndex = -1;
            
            headerCells.each((i, cell) => {
                const headerText = $(cell).text().trim().toLowerCase();
                
                if (headerText === 'ukd') {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtgn') {
                    ratingColumnIndex = i;
                } else if (headerText === 'elo' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtg' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'rtgi' && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText.includes('rating') && ratingColumnIndex === -1) {
                    ratingColumnIndex = i;
                } else if (headerText === 'sonuç' || headerText.includes('sonuc') || 
                          headerText === 'res.' || headerText.includes('res')) {
                    resultColumnIndex = i;
                }
            });
            
            return { ratingColumnIndex, resultColumnIndex };
        }

        // Extract single match (DOM version)
        extractSingleMatch(cells, ratingColumnIndex, resultColumnIndex, roundIndex) {
            let opponentRating = null;
            let result = null;
            
            // Extract opponent rating
            if (ratingColumnIndex >= 0 && cells[ratingColumnIndex]) {
                const ratingText = cells[ratingColumnIndex].textContent.trim();
                const rating = parseInt(ratingText);
                
                if (rating === 0) {
                    opponentRating = 0;
                    this.log('Found unrated opponent (rating = 0)');
                } else if (rating >= 1000 && rating <= 3000) {
                    opponentRating = rating;
                }
            }
            
            // Extract result
            if (resultColumnIndex >= 0 && cells[resultColumnIndex]) {
                const resultCell = cells[resultColumnIndex];
                const cellText = resultCell.textContent.trim();
                
                // Check for forfeit
                if (cellText.includes('K') || cellText.includes('k')) {
                    this.log('Skipping forfeit result:', cellText);
                    return { isSkipped: true, roundIndex: roundIndex };
                }
                
                // Try nested table first
                const resultTable = resultCell.querySelector('table');
                if (resultTable) {
                    const resultText = resultTable.textContent.trim();
                    result = this.parseResult(resultText);
                } else {
                    result = this.parseResult(cellText);
                }
            }
            
            if (opponentRating !== null && result !== null) {
                return { match: [opponentRating, result] };
            }
            
            return {};
        }

        // Extract single match (Cheerio version)
        extractSingleMatchCheerio(cells, ratingColumnIndex, resultColumnIndex, roundIndex, $) {
            let opponentRating = null;
            let result = null;
            
            // Extract opponent rating
            if (ratingColumnIndex >= 0 && cells[ratingColumnIndex]) {
                const ratingText = $(cells[ratingColumnIndex]).text().trim();
                const rating = parseInt(ratingText);
                
                if (rating === 0) {
                    opponentRating = 0;
                    this.log('Found unrated opponent (rating = 0)');
                } else if (rating >= 1000 && rating <= 3000) {
                    opponentRating = rating;
                }
            }
            
            // Extract result
            if (resultColumnIndex >= 0 && cells[resultColumnIndex]) {
                const resultCell = $(cells[resultColumnIndex]);
                const cellText = resultCell.text().trim();
                
                // Check for forfeit
                if (cellText.includes('K') || cellText.includes('k')) {
                    this.log('Skipping forfeit result:', cellText);
                    return { isSkipped: true, roundIndex: roundIndex };
                }
                
                // Try nested table first
                const resultTable = resultCell.find('table');
                if (resultTable.length > 0) {
                    const resultText = resultTable.text().trim();
                    result = this.parseResult(resultText);
                } else {
                    result = this.parseResult(cellText);
                }
            }
            
            if (opponentRating !== null && result !== null) {
                return { match: [opponentRating, result] };
            }
            
            return {};
        }

        // Parse result string to numeric value
        parseResult(resultText) {
            if (resultText === '1' || resultText === '1.0') {
                return 1;
            } else if (resultText === '0' || resultText === '0.0') {
                return 0;
            } else if (resultText === '½' || resultText === '0.5') {
                return 0.5;
            }
            return null;
        }

        // Logging helper (works in both environments)
        log(...args) {
            if (typeof console !== 'undefined') {
                console.log('UKD Calculator:', ...args);
            }
        }
    }

    // Return the class for UMD
    return UKDCalculator;
}));