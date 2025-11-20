# MoneyExchanger

A premium currency conversion web application with real-time exchange rates.

## Features

- 💱 **Real-time Exchange Rates**: Fetches rates from multiple APIs and averages them for accuracy
- 🌍 **Multi-Currency Support**: Convert between 6 currencies (USD, ARS, AED, CNY, CAD, PEN)
- 🎨 **Premium UI**: Glassmorphism design with smooth animations
- 📱 **Fully Responsive**: Works beautifully on desktop and mobile
- ⚡ **No Backend Required**: Pure frontend application

## Supported Currencies

- 🇺🇸 **USD** - US Dollar
- 🇦🇷 **ARS** - Argentine Peso
- 🇦🇪 **AED** - UAE Dirham
- 🇨🇳 **CNY** - Chinese Yuan
- 🇨🇦 **CAD** - Canadian Dollar
- 🇵🇪 **PEN** - Peruvian Sol

## How to Use

1. Simply open `index.html` in your browser
2. Or run a local server:
   ```bash
   python3 -m http.server 8080
   ```
   Then visit `http://localhost:8080`

3. Enter an amount in any currency field
4. Watch the other currencies update automatically!

## Technical Details

### API Sources

The app fetches exchange rates from three independent sources:

1. **Open Exchange Rates** (`open.er-api.com`)
2. **ExchangeRate-API** (`api.exchangerate-api.com`)
3. **Frankfurter** (`api.frankfurter.app`)

Rates are averaged across all successful API calls for maximum accuracy.

### Tech Stack

- **HTML5**: Semantic structure with SEO optimization
- **CSS3**: Modern design system with CSS variables and glassmorphism
- **JavaScript ES6+**: Class-based architecture with async/await
- **No Dependencies**: Pure vanilla web technologies

### Browser Support

Modern browsers supporting:
- CSS Custom Properties
- `backdrop-filter` for glassmorphism
- Fetch API with AbortController
- ES6+ JavaScript features

Recommended: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## License

MIT License - Feel free to use and modify!
