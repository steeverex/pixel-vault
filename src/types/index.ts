export interface CaptureNode {
  type: 'element' | 'text' | 'canvas' | 'svg' | 'image' | 'code' | 'conversation-turn';
  tagName?: string;
  attributes?: Record<string, string>;
  textContent?: string;
  innerHTML?: string;
  children?: CaptureNode[];
  metadata?: {
    isCodeBlock?: boolean;
    language?: string;
    isUserTurn?: boolean;
    isAssistantTurn?: boolean;
    role?: 'user' | 'assistant' | 'system';
    timestamp?: string;
  };
  imageData?: string;
  svgData?: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
  };
}

export interface CaptureResult {
  title: string;
  url: string;
  timestamp: string;
  nodes: CaptureNode[];
  conversationTurns?: ConversationTurn[];
  assets: Asset[];
  metadata: {
    totalNodes: number;
    captureMode: 'basic' | 'ai-conversation' | 'full';
    scrollDepth?: number;
  };
}

export interface Asset {
  type: 'image' | 'font' | 'stylesheet' | 'script';
  url: string;
  blob?: Blob;
  base64?: string;
  mimeType?: string;
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'html' | 'pdf';
  includeAssets: boolean;
  prettyPrint: boolean;
  metadata?: {
    author?: string;
    description?: string;
  };
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  size: number;
}
