// ===================================
// Cookie Utilities
// ===================================

const CookieManager = {
    set(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
    },

    get(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(cookie.substring(nameEQ.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    },

    delete(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }
};

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
                    CNY: data.rates.CNY,
                    CAD: data.rates.CAD,
                    PEN: data.rates.PEN,
                    BRL: data.rates.BRL
                })
            },
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                parser: (data) => ({
                    USD: 1,
                    ARS: data.rates.ARS,
                    AED: data.rates.AED,
                    CNY: data.rates.CNY,
                    CAD: data.rates.CAD,
                    PEN: data.rates.PEN,
                    BRL: data.rates.BRL
                })
            },
            {
                name: 'Frankfurter',
                url: 'https://api.frankfurter.app/latest?from=USD&to=AED,CNY,CAD,PEN,BRL',
                parser: (data) => ({
                    USD: 1,
                    ARS: null, // Frankfurter doesn't support ARS
                    AED: data.rates.AED,
                    CNY: data.rates.CNY,
                    CAD: data.rates.CAD,
                    PEN: data.rates.PEN,
                    BRL: data.rates.BRL
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

        // Average CAD
        const cadRates = validResults
            .map(r => r.CAD)
            .filter(rate => rate !== null && rate !== undefined);

        if (cadRates.length > 0) {
            averagedRates.CAD = cadRates.reduce((sum, rate) => sum + rate, 0) / cadRates.length;
        } else {
            throw new Error('No source provided CAD exchange rate');
        }

        // Average PEN
        const penRates = validResults
            .map(r => r.PEN)
            .filter(rate => rate !== null && rate !== undefined);

        if (penRates.length > 0) {
            averagedRates.PEN = penRates.reduce((sum, rate) => sum + rate, 0) / penRates.length;
        } else {
            throw new Error('No source provided PEN exchange rate');
        }

        // Average BRL
        const brlRates = validResults
            .map(r => r.BRL)
            .filter(rate => rate !== null && rate !== undefined);

        if (brlRates.length > 0) {
            averagedRates.BRL = brlRates.reduce((sum, rate) => sum + rate, 0) / brlRates.length;
        } else {
            throw new Error('No source provided BRL exchange rate');
        }

        this.rates = averagedRates;
        this.lastUpdate = new Date();

        console.log('📊 Averaged rates:', averagedRates);
        console.log(`📈 Sources used: ${validResults.length}/${this.sources.length}`);

        // Save to cookie for future use
        const cacheData = {
            rates: averagedRates,
            lastUpdate: this.lastUpdate.toISOString(),
            sourcesUsed: validResults.length,
            totalSources: this.sources.length
        };
        CookieManager.set('exchangeRates', cacheData, 7);
        console.log('💾 Saved rates to cookie');

        return {
            rates: averagedRates,
            lastUpdate: this.lastUpdate,
            sourcesUsed: validResults.length,
            totalSources: this.sources.length
        };
    }

    loadFromCache() {
        const cached = CookieManager.get('exchangeRates');
        if (cached && cached.rates) {
            this.rates = cached.rates;
            this.lastUpdate = new Date(cached.lastUpdate);
            console.log('📦 Loaded rates from cookie cache');
            console.log('🕐 Cache timestamp:', this.lastUpdate);
            return {
                rates: cached.rates,
                lastUpdate: this.lastUpdate,
                sourcesUsed: cached.sourcesUsed,
                totalSources: cached.totalSources,
                fromCache: true
            };
        }
        return null;
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
            CNY: document.getElementById('cny'),
            CAD: document.getElementById('cad'),
            PEN: document.getElementById('pen'),
            BRL: document.getElementById('brl')
        };
        this.rateStatus = document.getElementById('rateStatus');
        this.rateInfo = document.getElementById('rateInfo');
        this.activeInput = null;

        this.init();
    }

    async init() {
        try {
            // Try to load from cache first
            const cachedResult = this.service.loadFromCache();

            if (cachedResult) {
                // Show cached rates immediately
                this.showSuccess(cachedResult, true);
                this.displayRateInfo(cachedResult);

                // Setup event listeners
                this.setupEventListeners();

                // Set initial value
                this.inputs.USD.value = '100';
                this.handleInput('USD');

                // Fetch fresh rates in background
                console.log('🔄 Fetching fresh rates in background...');
                this.fetchFreshRates();
            } else {
                // No cache available, show loading and fetch
                // Fetch exchange rates
                const result = await this.service.fetchRates();
                this.showSuccess(result);
                this.displayRateInfo(result);

                // Setup event listeners
                this.setupEventListeners();

                // Set initial value
                this.inputs.USD.value = '100';
                this.handleInput('USD');
            }

        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchFreshRates() {
        try {
            const result = await this.service.fetchRates();
            this.showSuccess(result);
            this.displayRateInfo(result);

            // Update all currency values with new rates
            // Find which input has a value
            Object.keys(this.inputs).forEach(currency => {
                const value = parseFloat(this.inputs[currency].value);
                if (!isNaN(value) && value > 0) {
                    this.handleInput(currency);
                    return;
                }
            });
        } catch (error) {
            console.error('Failed to fetch fresh rates:', error);
            // Keep using cached rates
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

    showSuccess(result, isCache = false) {
        this.rateStatus.className = 'rate-status success';
        const cacheIndicator = isCache ? '📦 ' : '✓ ';
        const cacheText = isCache ? '(using cached rates)' : '(live from API)';
        this.rateStatus.innerHTML = `
            <span>${cacheIndicator}</span>
            <span>Exchange rates loaded ${cacheText} - ${result.sourcesUsed}/${result.totalSources} sources</span>
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
        const timestamp = result.lastUpdate || new Date();
        const formattedTime = timestamp.toLocaleString();

        // Calculate time ago
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo;
        if (diffMins < 1) {
            timeAgo = 'just now';
        } else if (diffMins < 60) {
            timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }

        this.rateInfo.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <strong style="font-size: 1.1em;">📅 Rate Timestamp</strong><br>
                <span style="font-size: 1.05em; color: var(--accent-primary);">${formattedTime}</span><br>
                <small style="opacity: 0.8;">(${timeAgo})</small>
            </div>
            <strong>Current Exchange Rates (1 USD =)</strong><br>
            • ${rates.ARS.toFixed(2)} ARS (Argentine Peso)<br>
            • ${rates.AED.toFixed(4)} AED (UAE Dirham)<br>
            • ${rates.CNY.toFixed(4)} CNY (Chinese Yuan)<br>
            • ${rates.CAD.toFixed(4)} CAD (Canadian Dollar)<br>
            • ${rates.PEN.toFixed(4)} PEN (Peruvian Sol)<br>
            • ${rates.BRL.toFixed(4)} BRL (Brazilian Real)<br>
            <br>
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
