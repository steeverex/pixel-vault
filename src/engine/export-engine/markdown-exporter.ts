import TurndownService from 'turndown';
import type { CaptureResult, ExportResult, ExportOptions, CaptureNode } from '../../types';

export class MarkdownExporter {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });

    // Custom rule for code blocks with language detection
    this.turndown.addRule('codeBlock', {
      filter: (node: any) => {
        return node.nodeName === 'PRE' || 
               (node.nodeName === 'CODE' && node.parentNode.nodeName === 'PRE');
      },
      replacement: (content: string, node: any) => {
        const codeNode = node.nodeName === 'CODE' ? node : node.querySelector('code');
        const language = codeNode?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
      }
    });
  }

  static export(capture: CaptureResult, _options: ExportOptions): ExportResult {
    const exporter = new MarkdownExporter();
    const content = exporter.convertToMarkdown(capture);
    const filename = `pixelvault-capture-${Date.now()}.md`;

    return {
      content,
      filename,
      mimeType: 'text/markdown',
      size: content.length
    };
  }

  private convertToMarkdown(capture: CaptureResult): string {
    let markdown = `# ${capture.title}\n\n`;
    markdown += `**URL:** ${capture.url}\n\n`;
    markdown += `**Captured:** ${new Date(capture.timestamp).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    // Process nodes
    for (const node of capture.nodes) {
      markdown += this.processNode(node);
    }

    return markdown;
  }

  private processNode(node: CaptureNode, depth = 0): string {
    let result = '';

    if (node.metadata?.isCodeBlock && node.textContent) {
      const language = node.metadata.language || '';
      result += `\`\`\`${language}\n${node.textContent}\n\`\`\`\n\n`;
    } else if (node.metadata?.isUserTurn) {
      result += `## User\n\n${node.textContent || ''}\n\n`;
    } else if (node.metadata?.isAssistantTurn) {
      result += `## Assistant\n\n${node.textContent || ''}\n\n`;
    } else if (node.tagName) {
      switch (node.tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = parseInt(node.tagName.charAt(1));
          result += `${'#'.repeat(level)} ${node.textContent || ''}\n\n`;
          break;
        case 'p':
          result += `${node.textContent || ''}\n\n`;
          break;
        case 'ul':
        case 'ol':
          if (node.children) {
            for (const child of node.children) {
              if (child.tagName === 'li') {
                const prefix = node.tagName === 'ul' ? '- ' : '1. ';
                result += `${prefix}${child.textContent || ''}\n`;
              }
            }
            result += '\n';
          }
          break;
        case 'pre':
          result += `\`\`\`\n${node.textContent || ''}\n\`\`\`\n\n`;
          break;
        case 'code':
          result += `\`${node.textContent || ''}\``;
          break;
        case 'img':
          if (node.attributes?.alt) {
            result += `![${node.attributes.alt}](${node.attributes.src || ''})\n\n`;
          }
          break;
        default:
          if (node.textContent) {
            result += `${node.textContent}\n\n`;
          }
      }
    }

    // Process children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += this.processNode(child, depth + 1);
      }
    }

    return result;
  }
}
