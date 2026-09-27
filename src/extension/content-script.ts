import type { CaptureResult, ExportOptions } from '../types';
import { AIConversationDetector } from '../engine/capture-engine/ai-conversation-detector';

console.log('PIXELVAULT content script loaded');

// Message listener for capture requests
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.type === 'CAPTURE_MARKDOWN') {
    handleMarkdownCapture(message.options)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  } else if (message.type === 'PING') {
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
});

async function handleMarkdownCapture(_options: ExportOptions): Promise<CaptureResult> {
  const document = window.document;
  const startTime = Date.now();
  
  console.log('Starting Markdown capture at:', new Date().toISOString());
  
  // Check if this is an AI conversation page
  const isAIConversation = AIConversationDetector.isAIConversationPage(document);
  
  if (!isAIConversation) {
    throw new Error('This page does not appear to be an AI conversation. Currently only ChatGPT, Claude, and similar platforms are supported.');
  }

  const result: CaptureResult = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    nodes: [],
    assets: [],
    metadata: {
      totalNodes: 0,
      captureMode: 'ai-conversation'
    }
  };

  // Use incremental scrolling and extraction
  console.log('Starting incremental capture...');
  const conversationTurns = await captureConversationIncrementally(document);
  result.conversationTurns = conversationTurns;
  result.metadata.totalNodes = conversationTurns.length;

  console.log(`Captured ${conversationTurns.length} conversation turns`);

  // Collect only content assets (images, SVGs, canvas) from captured content
  console.log('Collecting content assets...');
  const contentAssets = await collectContentAssets(document, conversationTurns);
  result.assets = contentAssets;

  const endTime = Date.now();
  console.log(`Capture completed in ${endTime - startTime}ms`);

  return result;
}

async function captureConversationIncrementally(document: Document): Promise<any[]> {
  const turns: any[] = [];
  const seenContent = new Set<string>();
  let scrollAttempts = 0;
  const maxScrollAttempts = 50;
  const scrollIncrement = 300;
  const scrollDelay = 200;

  // Initial capture of visible content
  await captureVisibleTurns(document, turns, seenContent);

  // Scroll and capture incrementally
  while (scrollAttempts < maxScrollAttempts) {
    const previousTurnCount = turns.length;
    
    // Scroll down
    const currentScroll = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    
    if (currentScroll >= maxScroll - 100) {
      console.log('Reached bottom of page');
      break;
    }

    const nextScroll = Math.min(currentScroll + scrollIncrement, maxScroll);
    window.scrollTo(0, nextScroll);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, scrollDelay));
    
    // Capture newly visible turns
    await captureVisibleTurns(document, turns, seenContent);
    
    // Check if we got new content
    if (turns.length === previousTurnCount) {
      // No new content, check if we're truly at the end
      if (currentScroll >= maxScroll - 100) {
        console.log('No new content and at bottom, stopping');
        break;
      }
      // Maybe virtualized, try a few more times
      scrollAttempts++;
      if (scrollAttempts > 5) {
        console.log('No new content after 5 attempts, stopping');
        break;
      }
    } else {
      scrollAttempts = 0; // Reset counter if we got new content
      console.log(`Scroll ${scrollAttempts}: Found ${turns.length - previousTurnCount} new turns, total: ${turns.length}`);
    }
  }

  // Scroll back to top
  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Sort by position in document (chronological order)
  turns.sort((a, b) => (a.position || 0) - (b.position || 0));

  return turns;
}

async function captureVisibleTurns(document: Document, turns: any[], seenContent: Set<string>): Promise<void> {
  const isChatGPT = document.location.hostname.includes('chatgpt.com') || 
                    document.location.hostname.includes('chat.openai.com');
  const isClaude = document.location.hostname.includes('claude.ai') || 
                  document.location.hostname.includes('anthropic.com');

  if (isChatGPT) {
    await captureChatGPTTurns(document, turns, seenContent);
  } else if (isClaude) {
    await captureClaudeTurns(document, turns, seenContent);
  } else {
    await captureGenericTurns(document, turns, seenContent);
  }
}

async function captureChatGPTTurns(document: Document, turns: any[], seenContent: Set<string>): Promise<void> {
  const containers = document.querySelectorAll('[data-testid="conversation-turn"]');
  
  for (const container of Array.from(containers)) {
    try {
      const isUser = container.querySelector('[data-message-author-role="user"]') !== null;
      const isAssistant = container.querySelector('[data-message-author-role="assistant"]') !== null;
      const contentEl = container.querySelector('.markdown, .prose');
      
      if (!contentEl || (!isUser && !isAssistant)) continue;

      // Create content fingerprint for deduplication
      const contentFingerprint = createContentFingerprint(contentEl);
      if (seenContent.has(contentFingerprint)) continue;
      seenContent.add(contentFingerprint);

      // Get position for chronological ordering
      const rect = container.getBoundingClientRect();
      const position = rect.top + window.scrollY;

      // Convert to semantic Markdown
      const markdownContent = await convertDOMToMarkdown(contentEl);
      
      turns.push({
        role: isUser ? 'user' : 'assistant',
        content: markdownContent,
        timestamp: new Date().toISOString(),
        position,
        metadata: {
          platform: 'chatgpt'
        }
      });
    } catch (e) {
      console.warn('Error capturing ChatGPT turn:', e);
    }
  }
}

async function captureClaudeTurns(document: Document, turns: any[], seenContent: Set<string>): Promise<void> {
  const containers = document.querySelectorAll('[data-testid="message"]');
  
  for (const container of Array.from(containers)) {
    try {
      const isUser = container.matches('[data-is-from-user="true"]');
      const isAssistant = container.matches('[data-is-from-user="false"]');
      const contentEl = container.querySelector('.font-claude-message, .prose');
      
      if (!contentEl || (!isUser && !isAssistant)) continue;

      const contentFingerprint = createContentFingerprint(contentEl);
      if (seenContent.has(contentFingerprint)) continue;
      seenContent.add(contentFingerprint);

      const rect = container.getBoundingClientRect();
      const position = rect.top + window.scrollY;

      const markdownContent = await convertDOMToMarkdown(contentEl);
      
      turns.push({
        role: isUser ? 'user' : 'assistant',
        content: markdownContent,
        timestamp: new Date().toISOString(),
        position,
        metadata: {
          platform: 'claude'
        }
      });
    } catch (e) {
      console.warn('Error capturing Claude turn:', e);
    }
  }
}

async function captureGenericTurns(document: Document, turns: any[], seenContent: Set<string>): Promise<void> {
  const userSelectors = ['.user-message', '.message.user', '[data-role="user"]'];
  const assistantSelectors = ['.assistant-message', '.message.assistant', '[data-role="assistant"]', '.ai-message'];

  // Try user messages
  for (const selector of userSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of Array.from(elements)) {
      try {
        const contentFingerprint = createContentFingerprint(el);
        if (seenContent.has(contentFingerprint)) continue;
        seenContent.add(contentFingerprint);

        const rect = el.getBoundingClientRect();
        const position = rect.top + window.scrollY;

        const markdownContent = await convertDOMToMarkdown(el);
        
        turns.push({
          role: 'user',
          content: markdownContent,
          timestamp: new Date().toISOString(),
          position,
          metadata: {
            platform: 'generic'
          }
        });
      } catch (e) {
        console.warn('Error capturing generic user turn:', e);
      }
    }
  }

  // Try assistant messages
  for (const selector of assistantSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of Array.from(elements)) {
      try {
        const contentFingerprint = createContentFingerprint(el);
        if (seenContent.has(contentFingerprint)) continue;
        seenContent.add(contentFingerprint);

        const rect = el.getBoundingClientRect();
        const position = rect.top + window.scrollY;

        const markdownContent = await convertDOMToMarkdown(el);
        
        turns.push({
          role: 'assistant',
          content: markdownContent,
          timestamp: new Date().toISOString(),
          position,
          metadata: {
            platform: 'generic'
          }
        });
      } catch (e) {
        console.warn('Error capturing generic assistant turn:', e);
      }
    }
  }
}

function createContentFingerprint(element: Element): string {
  const text = element.textContent?.slice(0, 200) || '';
  const className = element.className || '';
  return `${className}:${text}`.replace(/\s+/g, '');
}

async function convertDOMToMarkdown(element: Element): Promise<string> {
  let markdown = '';
  
  // Clone to avoid modifying original
  const clone = element.cloneNode(true) as Element;
  
  // Process each node
  for (const child of Array.from(clone.childNodes)) {
    markdown += processNode(child);
  }
  
  return markdown.trim();
}

function processNode(node: Node): string {
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
      // Check if inside pre
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
      // Process children
      let childMarkdown = '';
      for (const child of Array.from(element.childNodes)) {
        childMarkdown += processNode(child);
      }
      return childMarkdown;
    
    default:
      // Process children for unknown elements
      let defaultMarkdown = '';
      for (const child of Array.from(element.childNodes)) {
        defaultMarkdown += processNode(child);
      }
      return defaultMarkdown;
  }
}

async function collectContentAssets(document: Document, conversationTurns: any[]): Promise<any[]> {
  const assets: any[] = [];
  const processedUrls = new Set<string>();

  // Collect images, SVGs, and canvas from conversation content
  for (const turn of conversationTurns) {
    const content = turn.content || '';
    
    // Extract image URLs from markdown
    const imageMatches = content.match(/!\[.*?\]\((.*?)\)/g);
    if (imageMatches) {
      for (const match of imageMatches) {
        const urlMatch = match.match(/!\[.*?\]\((.*?)\)/);
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1];
          if (!processedUrls.has(url) && !url.startsWith('data:')) {
            processedUrls.add(url);
            try {
              const asset = await fetchContentAsset(url, 'image');
              if (asset) {
                assets.push(asset);
              }
            } catch (e) {
              console.warn(`Failed to fetch image ${url}:`, e);
            }
          }
        }
      }
    }
  }

  // Also scan the DOM for images in captured conversation containers
  const images = document.querySelectorAll('img');
  for (const img of Array.from(images)) {
    const src = (img as HTMLImageElement).src;
    if (src && !src.startsWith('data:') && !processedUrls.has(src)) {
      // Check if this image is within a conversation turn
      const container = img.closest('[data-testid="conversation-turn"], [data-testid="message"]');
      if (container) {
        processedUrls.add(src);
        try {
          const asset = await fetchContentAsset(src, 'image');
          if (asset) {
            assets.push(asset);
          }
        } catch (e) {
          console.warn(`Failed to fetch image ${src}:`, e);
        }
      }
    }
  }

  return assets;
}

async function fetchContentAsset(url: string, type: string): Promise<any | null> {
  try {
    if (url.startsWith('data:')) {
      return null;
    }

    // Skip cross-origin
    if (!isSameOrigin(url)) {
      console.warn(`Skipping cross-origin asset: ${url}`);
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    return {
      type,
      url,
      blob,
      base64,
      mimeType: blob.type
    };
  } catch (e) {
    console.warn(`Error fetching asset ${url}:`, e);
    return null;
  }
}

function isSameOrigin(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.href);
    return urlObj.origin === window.location.origin;
  } catch {
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export function for testing
(window as any).handleMarkdownCapture = handleMarkdownCapture;
