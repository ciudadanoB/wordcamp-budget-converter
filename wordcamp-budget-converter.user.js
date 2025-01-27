// ==UserScript==
// @name         WordCamp Budget Converter
// @namespace    https://central.wordcamp.org/
// @version      1.2
// @description  Convert prices in WordCamp budget pages between currencies using ExchangeRate-API
// @author       Juan Hernando
// @match        *://*/*/wp-admin/admin.php?page=wordcamp-budget*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let currencies = []; // To store the list of currencies from the API
    let lastRateInfo = ''; // To store the last exchange rate information

    // Fetch the list of available currencies from the API
    async function fetchCurrencies() {
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await response.json();
            if (data.rates) {
                currencies = Object.keys(data.rates);
                console.log('Currencies fetched:', currencies);
                populateCurrencyList();
            }
        } catch (error) {
            console.error('Error fetching currency list:', error);
        }
    }

    // Populate the datalist with currency options
    function populateCurrencyList() {
        const currencyList = document.createElement('datalist');
        currencyList.id = 'currencyList';
        currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            currencyList.appendChild(option);
        });
        document.body.appendChild(currencyList);
    }

    // Initialize the script
    async function init() {
        await fetchCurrencies();

        // Get the parent container where the controls will be added
        const wpbodyContent = document.getElementById('wpbody-content');
        if (!wpbodyContent) {
            console.error('wpbody-content not found');
            return;
        }

        // Create the controls container
        const controlsDiv = document.createElement('div');
        controlsDiv.style.margin = '30px 0px 0px';
        controlsDiv.style.textAlign = 'center';
        controlsDiv.innerHTML = `
            <label>Base currency:
                <input type="text" id="originCurrency" value="USD" style="width: 50px;" list="currencyList" />
            </label>
            <label>Target currency:
                <input type="text" id="destinationCurrency" value="EUR" style="width: 50px;" list="currencyList" />
            </label>
            <button id="convertPrices" style="margin-left: 10px;">Convert Prices</button>
            <button id="resetPrices" style="margin-left: 10px;">Reset</button>
            <div id="rateInfo" style="margin-top: 5px; font-size: 0.9em; font-style: italic; color: #777;"></div>
        `;
        wpbodyContent.prepend(controlsDiv);

        // Event listener for Convert button
        document.getElementById('convertPrices').addEventListener('click', async () => {
            const origin = document.getElementById('originCurrency').value.toUpperCase();
            const destination = document.getElementById('destinationCurrency').value.toUpperCase();

            // Fetch the exchange rate
            const rate = await fetchExchangeRate(origin, destination);
            if (!rate) {
                alert('Error fetching the exchange rate. Please check the currencies.');
                return;
            }

            // Update rate information
            lastRateInfo = `1 ${origin} = ${rate} ${destination}`;
            document.getElementById('rateInfo').textContent = lastRateInfo;

            // Convert prices
            const amounts = document.querySelectorAll('.amount');
            amounts.forEach((element) => {
                let originalValue;

                // Detect element type and extract value
                if (element.tagName === 'INPUT') {
                    originalValue = parseFloat(formatAmericanNumber(element.value));
                } else if (element.tagName === 'DIV' || element.tagName === 'TD') {
                    originalValue = parseFloat(formatAmericanNumber(element.textContent));
                }

                if (isNaN(originalValue)) return;

                const convertedValue = (originalValue * rate).toFixed(2);

                // Add converted value as a <span>
                if (element.tagName === 'INPUT') {
                    let convertedSpan = element.nextElementSibling;
                    if (!convertedSpan || !convertedSpan.classList.contains('converted-price')) {
                        convertedSpan = document.createElement('span');
                        convertedSpan.className = 'converted-price';
                        convertedSpan.style.marginLeft = 'auto';
                        convertedSpan.style.marginRight = '5px';
                        convertedSpan.style.fontStyle = 'italic';
                        convertedSpan.style.color = 'rgb(85, 85, 85)';
                        convertedSpan.style.display = 'table';
                        convertedSpan.style.textAlign = 'right';
                        element.parentNode.insertBefore(convertedSpan, element.nextSibling);
                    }
                    convertedSpan.textContent = `≈ ${convertedValue} ${destination}`;
                } else {
                    let convertedSpan = element.querySelector('.converted-price');
                    if (!convertedSpan) {
                        convertedSpan = document.createElement('span');
                        convertedSpan.className = 'converted-price';
                        convertedSpan.style.marginLeft = '10px';
                        convertedSpan.style.fontStyle = 'italic';
                        convertedSpan.style.color = 'rgb(85, 85, 85)';
                        element.appendChild(convertedSpan);
                    }
                    convertedSpan.textContent = `≈ ${convertedValue} ${destination}`;
                }
            });
        });

        // Event listener for Reset button
        document.getElementById('resetPrices').addEventListener('click', () => {
            const convertedSpans = document.querySelectorAll('.converted-price');
            convertedSpans.forEach(span => span.remove());
            document.getElementById('rateInfo').textContent = ''; // Clear rate info
        });
    }

    // Fetch exchange rate from ExchangeRate-API
    async function fetchExchangeRate(origin, destination) {
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${origin}`);
            const data = await response.json();

            // Check if the exchange rate is available
            if (data.rates && data.rates[destination]) {
                console.log(`Exchange rate ${origin} -> ${destination}:`, data.rates[destination]);
                return data.rates[destination];
            } else {
                console.error('Error: Exchange rate not found.');
                return null;
            }
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
            return null;
        }
    }

    // Convert numbers with American formatting to floats
    function formatAmericanNumber(numberString) {
        return numberString.replace(/,/g, ''); // Remove commas
    }

    // Run the script
    init();
})();
