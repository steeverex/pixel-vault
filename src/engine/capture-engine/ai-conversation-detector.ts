import type { ConversationTurn } from '../../types';

export class AIConversationDetector {
  // ChatGPT DOM selectors
  private static chatGPTSelectors = {
    conversationContainer: '[data-testid="conversation-turn"]',
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]',
    messageContent: '.markdown',
    codeBlock: 'pre code'
  };

  // Claude DOM selectors
  private static claudeSelectors = {
    conversationContainer: '[data-testid="message"]',
    userMessage: '[data-is-streaming="false"][data-is-from-user="true"]',
    assistantMessage: '[data-is-streaming="false"][data-is-from-user="false"]',
    messageContent: '.font-claude-message',
    codeBlock: 'pre'
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
    const containers = document.querySelectorAll(this.chatGPTSelectors.conversationContainer);

    containers.forEach(container => {
      const isUser = container.querySelector(this.chatGPTSelectors.userMessage) !== null;
      const isAssistant = container.querySelector(this.chatGPTSelectors.assistantMessage) !== null;
      const contentEl = container.querySelector(this.chatGPTSelectors.messageContent);

      if (contentEl && (isUser || isAssistant)) {
        turns.push({
          role: isUser ? 'user' : 'assistant',
          content: this.extractContentWithCode(contentEl),
          timestamp: new Date().toISOString()
        });
      }
    });

    return turns;
  }

  private static extractClaudeConversation(document: Document): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    const containers = document.querySelectorAll(this.claudeSelectors.conversationContainer);

    containers.forEach(container => {
      const isUser = container.matches(this.claudeSelectors.userMessage);
      const isAssistant = container.matches(this.claudeSelectors.assistantMessage);
      const contentEl = container.querySelector(this.claudeSelectors.messageContent);

      if (contentEl && (isUser || isAssistant)) {
        turns.push({
          role: isUser ? 'user' : 'assistant',
          content: this.extractContentWithCode(contentEl),
          timestamp: new Date().toISOString()
        });
      }
    });

    return turns;
  }

  private static extractGenericConversation(document: Document): ConversationTurn[] {
    const turns: ConversationTurn[] = [];
    
    // Look for common conversation patterns
    const userSelectors = [
      '.user-message',
      '.message.user',
      '[data-role="user"]',
      '.human-message'
    ];

    const assistantSelectors = [
      '.assistant-message',
      '.message.assistant',
      '[data-role="assistant"]',
      '.ai-message',
      '.bot-message'
    ];

    // Try to find user messages
    userSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        turns.push({
          role: 'user',
          content: el.textContent || '',
          timestamp: new Date().toISOString()
        });
      });
    });

    // Try to find assistant messages
    assistantSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        turns.push({
          role: 'assistant',
          content: this.extractContentWithCode(el),
          timestamp: new Date().toISOString()
        });
      });
    });

    return turns;
  }

  private static extractContentWithCode(element: Element): string {
    let content = '';
    
    // Clone to avoid modifying the original
    const clone = element.cloneNode(true) as Element;
    
    // Process code blocks specially
    const codeBlocks = clone.querySelectorAll('pre code, pre');
    codeBlocks.forEach(block => {
      const language = block.className.match(/language-(\w+)/)?.[1] || '';
      const code = block.textContent || '';
      const codeBlockWrapper = document.createElement('div');
      codeBlockWrapper.textContent = `\`\`\`${language}\n${code}\n\`\`\``;
      block.replaceWith(codeBlockWrapper);
    });

    content = clone.textContent || '';
    return content.trim();
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
      document.querySelector('[data-testid="conversation-turn"]') !== null ||
      document.querySelector('[data-testid="message"]') !== null ||
      document.querySelectorAll('.message, .chat-message').length > 2;

    return hasConversation;
  }
}
