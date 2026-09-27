import type { ConversationTurn } from '../../types';

export class AIConversationDetector {
  // ChatGPT DOM selectors - use role elements directly
  private static chatGPTSelectors = {
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]'
  };

  // Claude DOM selectors
  private static claudeSelectors = {
    userMessage: '[data-is-streaming="false"][data-is-from-user="true"]',
    assistantMessage: '[data-is-streaming="false"][data-is-from-user="false"]'
  };

  static detectAndExtractConversation(document: Document): ConversationTurn[] {
    // Try ChatGPT first
    const chatGPTTurns = this.extractChatGPTConversation(document);
    if (chatGPTTurns.length > 0) {
      return chatGPTTurns;
    }

    // Try Claude
    const claudeTurns = this.extractClaudeConversation(document);
    if (claudeTurns.length > 0) {
      return claudeTurns;
    }

    // Generic conversation detection
    return this.extractGenericConversation(document);
  }

  private static extractChatGPTConversation(document: Document): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    
    // Query assistant messages directly - no container required
    const assistantMessages = document.querySelectorAll(this.chatGPTSelectors.assistantMessage);
    
    assistantMessages.forEach((messageEl, index) => {
      const result = this.extractContentWithAssets(messageEl);
      if (result.content) {
        turns.push({
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          position: index,
          metadata: {
            platform: 'chatgpt',
            assets: result.assets
          }
        });
      }
    });

    return turns;
  }

  private static extractClaudeConversation(document: Document): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    
    // Query assistant messages directly
    const assistantMessages = document.querySelectorAll(this.claudeSelectors.assistantMessage);
    
    assistantMessages.forEach((messageEl, index) => {
      const result = this.extractContentWithAssets(messageEl);
      if (result.content) {
        turns.push({
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          position: index,
          metadata: {
            platform: 'claude',
            assets: result.assets
          }
        });
      }
    });

    return turns;
  }

  private static extractGenericConversation(document: Document): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    
    // Look for common assistant message patterns
    const assistantSelectors = [
      '.assistant-message',
      '.message.assistant',
      '[data-role="assistant"]',
      '.ai-message',
      '.bot-message'
    ];

    assistantSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const result = this.extractContentWithAssets(el);
        if (result.content) {
          turns.push({
            role: 'assistant',
            content: result.content,
            timestamp: new Date().toISOString(),
            position: index,
            metadata: {
              platform: 'generic',
              assets: result.assets
            }
          });
        }
      });
    });

    return turns;
  }

  public static extractContentFromElement(element: Element): string {
    const result = this.extractContentWithAssets(element);
    return result.content;
  }

  public static extractContentWithAssets(element: Element): { content: string; assets: any[] } {
    const assets: any[] = [];
    let assetIndex = 0;
    
    // Clone to avoid modifying the original
    const clone = element.cloneNode(true) as Element;
    
    // Remove action buttons, copy controls, feedback buttons
    const selectorsToRemove = [
      'button',
      '[aria-label*="copy"]',
      '[aria-label*="Copy"]',
      '[aria-label*="feedback"]',
      '[aria-label*="Feedback"]',
      '.flex-col', // ChatGPT action buttons container
      '.text-xs', // ChatGPT small UI elements
      '[class*="absolute"]', // Floating elements
      '[class*="relative"]' // Relative positioned elements (often UI controls)
    ];
    
    selectorsToRemove.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Process and extract assets
    this.processAssets(clone, assets, () => `asset-${++assetIndex}`);

    // Convert to semantic Markdown
    const content = this.convertDOMToMarkdown(clone);
    
    return { content, assets };
  }

  private static processAssets(element: Element, assets: any[], namingFn: () => string): void {
    // Process SVG diagrams
    const svgs = element.querySelectorAll('svg');
    svgs.forEach((svg) => {
      // Skip small/decorative SVGs (icons, etc.)
      const bbox = svg.getBBox();
      const width = bbox.width || parseInt(svg.getAttribute('width') || '0');
      const height = bbox.height || parseInt(svg.getAttribute('height') || '0');
      
      // Only process substantial SVGs (diagrams, not icons)
      if (width > 50 && height > 50) {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const assetName = namingFn();
        
        // Replace SVG with Markdown image reference
        const imgReplacement = document.createElement('div');
        imgReplacement.innerHTML = `![${assetName}](assets/${assetName}.svg)`;
        svg.parentNode?.replaceChild(imgReplacement, svg);
        
        assets.push({
          type: 'svg',
          name: `${assetName}.svg`,
          content: svgString,
          mimeType: 'image/svg+xml'
        });
      }
    });

    // Process Canvas elements
    const canvases = element.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      try {
        const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
        const assetName = namingFn();
        
        // Replace canvas with Markdown image reference
        const imgReplacement = document.createElement('div');
        imgReplacement.innerHTML = `![${assetName}](assets/${assetName}.png)`;
        canvas.parentNode?.replaceChild(imgReplacement, canvas);
        
        assets.push({
          type: 'canvas',
          name: `${assetName}.png`,
          content: dataUrl,
          mimeType: 'image/png'
        });
      } catch (e) {
        console.warn('Failed to capture canvas:', e);
      }
    });

    // Process images (convert data URLs to assets)
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('data:')) {
        const assetName = namingFn();
        
        // Update src to relative path
        img.setAttribute('src', `assets/${assetName}.png`);
        
        assets.push({
          type: 'image',
          name: `${assetName}.png`,
          content: src,
          mimeType: 'image/png'
        });
      }
    });

    // Process Mermaid code blocks
    const codeBlocks = element.querySelectorAll('pre code');
    codeBlocks.forEach((code) => {
      const text = code.textContent || '';
      // Check if it's Mermaid
      if (text.trim().startsWith('graph') || 
          text.trim().startsWith('flowchart') ||
          text.trim().startsWith('sequenceDiagram') ||
          text.trim().startsWith('gantt') ||
          text.trim().startsWith('stateDiagram') ||
          text.trim().startsWith('erDiagram') ||
          text.trim().startsWith('classDiagram')) {
        
        // Ensure it has language tag
        if (!code.className.includes('mermaid')) {
          code.classList.add('language-mermaid');
        }
      }
    });
  }

  private static convertDOMToMarkdown(element: Element): string {
    let markdown = '';
    
    for (const child of Array.from(element.childNodes)) {
      markdown += this.processNode(child);
    }
    
    return markdown.trim();
  }

  private static processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const level = parseInt(tagName.charAt(1));
        return `\n${'#'.repeat(level)} ${element.textContent?.trim() || ''}\n\n`;
      
      case 'p':
        return `${element.textContent?.trim() || ''}\n\n`;
      
      case 'strong':
      case 'b':
        return `**${element.textContent?.trim() || ''}**`;
      
      case 'em':
      case 'i':
        return `*${element.textContent?.trim() || ''}*`;
      
      case 'code':
        const codeContent = element.textContent?.trim() || '';
        if (element.parentElement?.tagName === 'PRE') {
          return codeContent;
        }
        return `\`${codeContent}\``;
      
      case 'pre':
        const preContent = element.textContent?.trim() || '';
        const codeElement = element.querySelector('code');
        const language = codeElement?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${language}\n${preContent}\n\`\`\`\n\n`;
      
      case 'ul':
      case 'ol':
        let listMarkdown = '\n';
        const items = element.querySelectorAll(':scope > li');
        items.forEach((item, index) => {
          const prefix = tagName === 'ul' ? '- ' : `${index + 1}. `;
          listMarkdown += `${prefix}${item.textContent?.trim() || ''}\n`;
        });
        return listMarkdown + '\n';
      
      case 'li':
        return `${element.textContent?.trim() || ''}\n`;
      
      case 'blockquote':
        return `> ${element.textContent?.trim() || ''}\n\n`;
      
      case 'a':
        const href = element.getAttribute('href') || '';
        const text = element.textContent?.trim() || '';
        return `[${text}](${href})`;
      
      case 'img':
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      
      case 'br':
        return '\n';
      
      case 'div':
      case 'span':
      case 'section':
      case 'article':
      case 'main':
        let childMarkdown = '';
        for (const child of Array.from(element.childNodes)) {
          childMarkdown += this.processNode(child);
        }
        return childMarkdown;
      
      default:
        let defaultMarkdown = '';
        for (const child of Array.from(element.childNodes)) {
          defaultMarkdown += this.processNode(child);
        }
        return defaultMarkdown;
    }
  }

  static isAIConversationPage(document: Document): boolean {
    const hostname = document.location.hostname;

    // Check for known AI platforms
    const aiPlatforms = [
      'chatgpt.com',
      'chat.openai.com',
      'claude.ai',
      'anthropic.com',
      'bard.google.com',
      'gemini.google.com'
    ];

    if (aiPlatforms.some(platform => hostname.includes(platform))) {
      return true;
    }

    // Check for conversation-like structure
    const hasConversation = 
      document.querySelector('[data-message-author-role]') !== null ||
      document.querySelector('[data-testid="message"]') !== null ||
      document.querySelectorAll('.message, .chat-message').length > 2;

    return hasConversation;
  }
}
