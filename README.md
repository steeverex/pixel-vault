# PIXELVAULT

A high-fidelity Chromium Manifest V3 browser extension for capturing complex web content and AI conversations.

## Features

- **Basic DOM Capture**: Extracts title, URL, timestamp, and DOM structure
- **AI Conversation Mode**: Automatically detects and captures ChatGPT, Claude, and generic AI conversations
- **Visual Serialization**: Handles Canvas (to PNG) and SVG elements
- **Scroll Capture**: Handles long pages with virtualization detection
- **Asset Collection**: Collects images, stylesheets, scripts, and fonts
- **Multiple Export Formats**: JSON, Markdown (GFM), and HTML

## Tech Stack

- TypeScript + React + Vite
- TailwindCSS for styling
- Chromium Manifest V3
- Local processing only (no external dependencies)

## Installation

### Building the Extension

```bash
npm install
npm run build
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder
5. The extension will appear in your toolbar

## Usage

1. Navigate to any webpage
2. Click the PIXELVAULT extension icon
3. Choose a capture format:
   - **Capture as JSON**: Full structured data
   - **Capture as Markdown**: GitHub Flavored Markdown
   - **Capture as HTML**: Self-contained HTML with embedded assets

## Testing

```bash
# Run Playwright E2E tests
npm run test:e2e
```

## Project Structure

```
pixelvault/
├── dist/                    # Built extension files
├── src/
│   ├── extension/          # Extension scripts
│   ├── engine/             # Capture & export engines
│   ├── types/              # TypeScript interfaces
│   └── App.tsx             # React popup UI
├── tests/                  # Playwright tests
└── public/                 # Static assets
```

## Security & Privacy

- All processing happens locally in the browser
- No external API calls or data transmission
- No data storage on remote servers
- Safe DOM parsing (no eval() on captured content)

## License

MIT

## Note

This is a demonstration project. Icons are placeholders and should be replaced with final artwork before production use.
