import type { CaptureResult, ExportResult, ExportOptions, Asset } from '../../types';

export class HtmlExporter {
  static export(capture: CaptureResult, options: ExportOptions): ExportResult {
    const content = this.generateHtml(capture, options);
    // Include assets if option is set (not implemented in MVP)
    if (options.includeAssets) {
      console.log('Assets would be included here');
    }
    const filename = `pixelvault-capture-${Date.now()}.html`;

    return {
      content,
      filename,
      mimeType: 'text/html',
      size: content.length
    };
  }

  private static generateHtml(capture: CaptureResult, _options: ExportOptions): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(capture.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .metadata {
      color: #666;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .content {
      margin-top: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      font-family: 'Courier New', monospace;
    }
    .conversation-turn {
      margin: 20px 0;
      padding: 15px;
      border-radius: 8px;
    }
    .user-turn {
      background: #e3f2fd;
    }
    .assistant-turn {
      background: #f3e5f5;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${this.escapeHtml(capture.title)}</h1>
    <div class="metadata">
      <p><strong>URL:</strong> <a href="${this.escapeHtml(capture.url)}">${this.escapeHtml(capture.url)}</a></p>
      <p><strong>Captured:</strong> ${new Date(capture.timestamp).toLocaleString()}</p>
      <p><strong>Nodes:</strong> ${capture.metadata.totalNodes}</p>
    </div>
  </div>
  <div class="content">
`;

    // Process nodes
    for (const node of capture.nodes) {
      html += this.processNode(node, capture.assets);
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  private static processNode(node: any, assets: Asset[]): string {
    let html = '';

    if (node.metadata?.isCodeBlock && node.textContent) {
      const language = node.metadata.language || '';
      html += `<pre><code class="language-${language}">${this.escapeHtml(node.textContent)}</code></pre>\n`;
    } else if (node.metadata?.isUserTurn) {
      html += `<div class="conversation-turn user-turn">\n`;
      html += `<h3>User</h3>\n`;
      html += `<p>${this.escapeHtml(node.textContent || '')}</p>\n`;
      html += `</div>\n`;
    } else if (node.metadata?.isAssistantTurn) {
      html += `<div class="conversation-turn assistant-turn">\n`;
      html += `<h3>Assistant</h3>\n`;
      html += `<p>${this.escapeHtml(node.textContent || '')}</p>\n`;
      html += `</div>\n`;
    } else if (node.tagName) {
      switch (node.tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          html += `<${node.tagName}>${this.escapeHtml(node.textContent || '')}</${node.tagName}>\n`;
          break;
        case 'p':
          html += `<p>${this.escapeHtml(node.textContent || '')}</p>\n`;
          break;
        case 'ul':
        case 'ol':
          html += `<${node.tagName}>\n`;
          if (node.children) {
            for (const child of node.children) {
              if (child.tagName === 'li') {
                html += `  <li>${this.escapeHtml(child.textContent || '')}</li>\n`;
              }
            }
          }
          html += `</${node.tagName}>\n`;
          break;
        case 'pre':
          html += `<pre><code>${this.escapeHtml(node.textContent || '')}</code></pre>\n`;
          break;
        case 'code':
          html += `<code>${this.escapeHtml(node.textContent || '')}</code>`;
          break;
        case 'img':
          const src = node.attributes?.src || '';
          const alt = node.attributes?.alt || '';
          // Try to use base64 if available
          const asset = assets.find(a => a.url === src);
          const finalSrc = asset?.base64 || src;
          html += `<img src="${this.escapeHtml(finalSrc)}" alt="${this.escapeHtml(alt)}" />\n`;
          break;
        case 'canvas':
          if (node.imageData) {
            html += `<img src="${node.imageData}" alt="Canvas content" />\n`;
          }
          break;
        case 'svg':
          if (node.svgData) {
            html += node.svgData + '\n';
          }
          break;
        default:
          if (node.textContent) {
            html += `<div>${this.escapeHtml(node.textContent)}</div>\n`;
          }
      }
    }

    // Process children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        html += this.processNode(child, assets);
      }
    }

    return html;
  }

  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
