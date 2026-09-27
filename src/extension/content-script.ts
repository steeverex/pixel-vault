import type { CaptureResult, ExportOptions } from '../types';
import { AIConversationDetector } from '../engine/capture-engine/ai-conversation-detector';
import { VisualSerializer } from '../engine/capture-engine/visual-serializer';
import { ScrollCapture } from '../engine/capture-engine/scroll-capture';
import { AssetManager } from '../engine/capture-engine/asset-manager';

console.log('PIXELVAULT content script loaded');

// Message listener for capture requests
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.type === 'CAPTURE_PAGE') {
    handleCapture(message.options)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleCapture(_options: ExportOptions): Promise<CaptureResult> {
  const document = window.document;
  
  // Check if this is an AI conversation page
  const isAIConversation = AIConversationDetector.isAIConversationPage(document);
  
  // Perform scroll capture if needed
  let scrollInfo = { nodeCount: 0, scrollDepth: 0 };
  
  if (isAIConversation) {
    // For AI conversations, try to capture full conversation by scrolling
    try {
      scrollInfo = await ScrollCapture.captureFullPage();
    } catch (e) {
      console.warn('Scroll capture failed:', e);
    }
  } else if (ScrollCapture.isScrollablePage()) {
    // For long pages, scroll to capture all content
    try {
      scrollInfo = await ScrollCapture.captureFullPage();
    } catch (e) {
      console.warn('Scroll capture failed:', e);
    }
  }
  
  const result: CaptureResult = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    nodes: [],
    assets: [],
    metadata: {
      totalNodes: 0,
      captureMode: isAIConversation ? 'ai-conversation' : 'basic',
      scrollDepth: scrollInfo.scrollDepth
    }
  };

  // Extract conversation turns if AI conversation detected
  if (isAIConversation) {
    result.conversationTurns = AIConversationDetector.detectAndExtractConversation(document);
    result.metadata.totalNodes = result.conversationTurns.length;
  } else {
    // Extract basic content
    const body = document.body;
    if (body) {
      result.nodes = extractDOMNodes(body);
      result.metadata.totalNodes = result.nodes.length;
    }
  }

  // Collect assets
  try {
    result.assets = await AssetManager.collectAssets(document);
  } catch (e) {
    console.warn('Asset collection failed:', e);
    result.assets = [];
  }

  return result;
}

function extractDOMNodes(element: Element): any[] {
  const nodes: any[] = [];
  
  for (const child of Array.from(element.children)) {
    const node: any = {
      type: 'element',
      tagName: child.tagName.toLowerCase(),
      attributes: getElementAttributes(child),
      textContent: child.textContent?.trim() || '',
      children: []
    };

    // Extract specific element types
    if (child.tagName === 'IMG') {
      node.type = 'image';
      const img = child as HTMLImageElement;
      node.attributes = {
        ...node.attributes,
        src: img.src,
        alt: img.alt
      };
    } else if (child.tagName === 'CANVAS') {
      node.type = 'canvas';
      const canvas = child as HTMLCanvasElement;
      const imageData = VisualSerializer.serializeCanvas(canvas);
      if (imageData) {
        node.imageData = imageData;
      }
    } else if (child.tagName === 'SVG') {
      node.type = 'svg';
      const svgData = VisualSerializer.serializeSVG(child as any);
      if (svgData) {
        node.svgData = svgData;
      }
    }

    // Recursively extract children
    if (child.children.length > 0) {
      node.children = extractDOMNodes(child);
    }

    nodes.push(node);
  }

  return nodes;
}

function getElementAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }
  return attributes;
}
