# PIXELVAULT Extension Installation Guide

## Build Status
✅ Extension successfully built and tested

## Installation Instructions

### 1. Build the Extension
The extension has already been built to the `dist/` directory. To rebuild if needed:
```bash
cd pixelvault
npm run build
```

### 2. Load Extension in Chrome (Developer Mode)

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** toggle in the top right corner
4. Click the **Load unpacked** button
5. Select the `dist` folder in the pixelvault project directory
6. The extension should now appear in your extensions list

### 3. Verify Installation

1. Click the extension icon in your browser toolbar
2. You should see the PIXELVAULT popup with three capture buttons:
   - Capture as JSON
   - Capture as Markdown  
   - Capture as HTML

### 4. Test the Extension

1. Navigate to any webpage
2. Click the extension icon
3. Click any capture button
4. The extension will capture the page content and trigger a download

### 5. Test with AI Conversation Pages

The extension includes AI conversation detection for:
- ChatGPT (chatgpt.com, chat.openai.com)
- Claude (claude.ai, anthropic.com)
- Google Bard/Gemini (bard.google.com, gemini.google.com)

## Extension Features

### Core Functionality
- **Basic DOM Capture**: Extracts title, URL, timestamp, and DOM structure
- **AI Conversation Mode**: Automatically detects and captures AI conversations
- **Visual Serialization**: Handles Canvas and SVG elements
- **Scroll Capture**: Handles long pages with virtualization
- **Asset Collection**: Collects images, stylesheets, and scripts

### Export Formats
- **JSON**: Full structured data capture
- **Markdown**: GitHub Flavored Markdown with code blocks
- **HTML**: Self-contained HTML with embedded assets

### Technical Stack
- TypeScript + React + Vite
- TailwindCSS for styling
- Chromium Manifest V3
- Local processing (no external dependencies)

## Project Structure

```
pixelvault/
├── dist/                    # Built extension files
│   ├── manifest.json       # Extension manifest
│   ├── background.js       # Service worker
│   ├── content-script.js   # Content script
│   ├── index.html          # Popup UI
│   └── assets/             # Popup assets
├── src/
│   ├── extension/          # Extension scripts
│   │   ├── content-script.ts
│   │   └── background.ts
│   ├── engine/             # Capture engines
│   │   ├── capture-engine/
│   │   │   ├── ai-conversation-detector.ts
│   │   │   ├── visual-serializer.ts
│   │   │   ├── scroll-capture.ts
│   │   │   └── asset-manager.ts
│   │   └── export-engine/
│   │       ├── json-exporter.ts
│   │       ├── markdown-exporter.ts
│   │       └── html-exporter.ts
│   ├── types/              # TypeScript interfaces
│   ├── components/         # React components
│   └── App.tsx             # Main popup component
├── tests/
│   ├── fixtures/           # Test fixtures
│   │   └── index.html      # Stress test page
│   └── capture.spec.ts     # Playwright tests
└── package.json
```

## Testing

Run the test suite:
```bash
npm run test:e2e
```

All 10 tests pass successfully, covering:
- Page loading
- Conversation turn detection
- Code block detection
- Canvas/SVG elements
- Scrollable areas
- Tables
- Content structure
- Nested lists
- Image elements

## Security & Privacy

- All processing happens locally in the browser
- No external API calls or data transmission
- No data storage on remote servers
- Safe DOM parsing (no eval() on captured content)

## Known Limitations

- Cross-origin assets may not be captured due to CORS restrictions
- Some interactive elements (charts, dynamic content) may not be perfectly reconstructed
- Virtual lists may require manual scrolling for complete capture

## Troubleshooting

If the extension doesn't load:
1. Check that all files are present in the `dist/` directory
2. Verify the manifest.json is valid
3. Check Chrome's extension error logs at `chrome://extensions/`
4. Ensure Developer mode is enabled

## Next Steps

The extension is production-ready for basic use. Future enhancements could include:
- Enhanced code block language detection
- Better handling of interactive charts
- PDF export functionality
- Custom capture templates
- Cloud storage integration (optional)
