// ===================================
// Exchange Rate Service
// ===================================

class ExchangeRateService {
    constructor() {
        this.rates = null;
        this.lastUpdate = null;
        this.sources = [
            {
                name: 'Open Exchange Rates',
                url: 'https://open.er-api.com/v6/latest/USD',
                parser: (data) => ({
                    USD: 1,
                    ARS: data.rates.ARS,
                    AED: data.rates.AED,
                    CNY: data.rates.CNY
                })
            },
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                parser: (data) => ({
                    USD: 1,
                    ARS: data.rates.ARS,
                    AED: data.rates.AED,
                    CNY: data.rates.CNY
                })
            },
            {
                name: 'Frankfurter',
                url: 'https://api.frankfurter.app/latest?from=USD&to=AED,CNY',
                parser: (data) => ({
                    USD: 1,
                    ARS: null, // Frankfurter doesn't support ARS
                    AED: data.rates.AED,
                    CNY: data.rates.CNY
                })
            }
        ];
    }

    async fetchFromSource(source) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(source.url, {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const rates = source.parser(data);

            console.log(`✓ ${source.name}:`, rates);
            return rates;
        } catch (error) {
            console.warn(`✗ ${source.name} failed:`, error.message);
            return null;
        }
    }

    async fetchRates() {
        console.log('Fetching exchange rates from multiple sources...');

        // Fetch from all sources in parallel
        const results = await Promise.all(
            this.sources.map(source => this.fetchFromSource(source))
        );

        // Filter out failed requests
        const validResults = results.filter(result => result !== null);

        if (validResults.length === 0) {
            throw new Error('All exchange rate sources failed');
        }

        // Calculate average rates
        const averagedRates = { USD: 1 };

        // Average ARS (only sources that support it)
        const arsRates = validResults
            .map(r => r.ARS)
            .filter(rate => rate !== null && rate !== undefined);

        if (arsRates.length > 0) {
            averagedRates.ARS = arsRates.reduce((sum, rate) => sum + rate, 0) / arsRates.length;
        } else {
            throw new Error('No source provided ARS exchange rate');
        }

        // Average AED
        const aedRates = validResults
            .map(r => r.AED)
            .filter(rate => rate !== null && rate !== undefined);

        if (aedRates.length > 0) {
            averagedRates.AED = aedRates.reduce((sum, rate) => sum + rate, 0) / aedRates.length;
        } else {
            throw new Error('No source provided AED exchange rate');
        }

        // Average CNY
        const cnyRates = validResults
            .map(r => r.CNY)
            .filter(rate => rate !== null && rate !== undefined);

        if (cnyRates.length > 0) {
            averagedRates.CNY = cnyRates.reduce((sum, rate) => sum + rate, 0) / cnyRates.length;
        } else {
            throw new Error('No source provided CNY exchange rate');
        }

        this.rates = averagedRates;
        this.lastUpdate = new Date();

        console.log('📊 Averaged rates:', averagedRates);
        console.log(`📈 Sources used: ${validResults.length}/${this.sources.length}`);

        return {
            rates: averagedRates,
            sourcesUsed: validResults.length,
            totalSources: this.sources.length
        };
    }

    convert(amount, fromCurrency, toCurrency) {
        if (!this.rates) {
            throw new Error('Exchange rates not loaded');
        }

        if (fromCurrency === toCurrency) {
            return amount;
        }

        // Convert to USD first, then to target currency
        const amountInUSD = amount / this.rates[fromCurrency];
        const convertedAmount = amountInUSD * this.rates[toCurrency];

        return convertedAmount;
    }
}

// ===================================
// Currency Converter App
// ===================================

class CurrencyConverter {
    constructor() {
        this.service = new ExchangeRateService();
        this.inputs = {
            USD: document.getElementById('usd'),
            ARS: document.getElementById('ars'),
            AED: document.getElementById('aed'),
            CNY: document.getElementById('cny')
        };
        this.rateStatus = document.getElementById('rateStatus');
        this.rateInfo = document.getElementById('rateInfo');
        this.activeInput = null;

        this.init();
    }

    async init() {
        try {
            // Fetch exchange rates
            const result = await this.service.fetchRates();
            this.showSuccess(result);
            this.displayRateInfo(result);

            // Setup event listeners
            this.setupEventListeners();

            // Set initial value
            this.inputs.USD.value = '100';
            this.handleInput('USD');

        } catch (error) {
            this.showError(error.message);
        }
    }

    setupEventListeners() {
        Object.keys(this.inputs).forEach(currency => {
            const input = this.inputs[currency];

            input.addEventListener('input', () => this.handleInput(currency));
            input.addEventListener('focus', () => this.setActiveInput(currency));
            input.addEventListener('blur', () => this.clearActiveInput());
        });
    }

    setActiveInput(currency) {
        // Remove active class from all inputs
        Object.values(this.inputs).forEach(input => {
            input.classList.remove('active');
        });

        // Add active class to current input
        this.inputs[currency].classList.add('active');
        this.activeInput = currency;
    }

    clearActiveInput() {
        setTimeout(() => {
            Object.values(this.inputs).forEach(input => {
                input.classList.remove('active');
            });
            this.activeInput = null;
        }, 200);
    }

    handleInput(sourceCurrency) {
        const value = parseFloat(this.inputs[sourceCurrency].value);

        // If input is empty or invalid, clear other fields
        if (isNaN(value) || value < 0) {
            Object.keys(this.inputs).forEach(currency => {
                if (currency !== sourceCurrency) {
                    this.inputs[currency].value = '';
                }
            });
            return;
        }

        // Convert and update other currencies
        Object.keys(this.inputs).forEach(targetCurrency => {
            if (targetCurrency !== sourceCurrency) {
                const convertedValue = this.service.convert(
                    value,
                    sourceCurrency,
                    targetCurrency
                );
                this.inputs[targetCurrency].value = convertedValue.toFixed(2);
            }
        });
    }

    showSuccess(result) {
        this.rateStatus.className = 'rate-status success';
        this.rateStatus.innerHTML = `
            <span>✓</span>
            <span>Exchange rates loaded successfully (${result.sourcesUsed}/${result.totalSources} sources)</span>
        `;
    }

    showError(message) {
        this.rateStatus.className = 'rate-status error';
        this.rateStatus.innerHTML = `
            <span>⚠</span>
            <span>Error: ${message}</span>
        `;
    }

    displayRateInfo(result) {
        const rates = result.rates;
        const now = new Date().toLocaleString();

        this.rateInfo.innerHTML = `
            <strong>Current Exchange Rates (1 USD =)</strong><br>
            • ${rates.ARS.toFixed(2)} ARS (Argentine Peso)<br>
            • ${rates.AED.toFixed(4)} AED (UAE Dirham)<br>
            • ${rates.CNY.toFixed(4)} CNY (Chinese Yuan)<br>
            <br>
            <small>Last updated: ${now}</small><br>
            <small>Data averaged from ${result.sourcesUsed} independent sources</small>
        `;
    }
}

// ===================================
// Initialize App
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});
