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
      const content = this.extractContentFromElement(messageEl);
      if (content) {
        turns.push({
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
          position: index
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
      const content = this.extractContentFromElement(messageEl);
      if (content) {
        turns.push({
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
          position: index
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
        const content = this.extractContentFromElement(el);
        if (content) {
          turns.push({
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
            position: index
          });
        }
      });
    });

    return turns;
  }

  static extractContentFromElement(element: Element): string {
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

    // Convert to semantic Markdown
    return this.convertDOMToMarkdown(clone);
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
