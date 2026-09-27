import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [captureResult, setCaptureResult] = useState<any>(null);
  const [isExtensionContext, setIsExtensionContext] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  useEffect(() => {
    // Check if we're in extension context
    setIsExtensionContext(typeof chrome !== 'undefined' && !!chrome.tabs && !!chrome.runtime);
  }, []);

  // Helper to send message with timeout
  const sendMessageWithTimeout = async (tabId: number, message: any, timeoutMs = 30000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeoutMs);

      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  };

  const ensureContentScriptInjected = async (tabId: number): Promise<boolean> => {
    try {
      // First try to send a ping to see if content script is already there
      await sendMessageWithTimeout(tabId, { type: 'PING' }, 1000);
      return true; // Content script responded
    } catch {
      // Content script not present, try programmatic injection
      console.log('Content script not found, attempting programmatic injection...');

      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-script.js']
        });
        console.log('Content script injected programmatically');

        // Wait a moment for the content script to initialize
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify injection worked
        await sendMessageWithTimeout(tabId, { type: 'PING' }, 2000);
        return true;
      } catch (injectError) {
        console.error('Programmatic injection failed:', injectError);
        return false;
      }
    }
  };

  const handleCapture = async () => {
    if (!isExtensionContext) {
      setErrorMessage('Not in extension context. Load as Chrome extension.');
      setCaptureStatus('error');
      return;
    }

    setCaptureStatus('capturing');
    setErrorMessage(null);
    setProgress('Initializing capture...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Check for restricted pages
      if (tab.url?.startsWith('chrome://') ||
          tab.url?.startsWith('chrome-extension://') ||
          tab.url?.startsWith('edge://') ||
          tab.url?.startsWith('about:')) {
        throw new Error('Cannot capture Chrome internal pages (chrome://, about:, etc.)');
      }

      // Ensure content script is injected
      setProgress('Injecting content script...');
      const injected = await ensureContentScriptInjected(tab.id);
      if (!injected) {
        throw new Error('Could not inject content script. Try refreshing the page and clicking the extension again.');
      }

      // Send capture message with progress tracking
      setProgress('Capturing conversation...');
      const response = await sendMessageWithTimeout(tab.id, {
        type: 'CAPTURE_MARKDOWN',
        options: {
          includeAssets: true,
          prettyPrint: true
        }
      }, 60000); // 60 second timeout for long conversations

      if (!response) {
        throw new Error('No response from content script. The page may have navigated or the content script crashed.');
      }

      if (!response.success) {
        throw new Error(response.error || 'Content script returned failure');
      }

      console.log('Capture result:', response.data);
      setCaptureResult(response.data);
      setProgress('Preparing download...');

      // Convert to Markdown and download in popup context (where URL.createObjectURL is supported)
      await downloadMarkdown(response.data);

      setProgress('');
      setCaptureStatus('success');

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Capture failed:', error);
      setErrorMessage(message);
      setProgress('');
      setCaptureStatus('error');
    }
  };

  const downloadMarkdown = async (data: any) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pixelvault-capture-${timestamp}.md`;
    
    // Convert conversation turns to Markdown - assistant only, no extra headings
    let markdown = `# ${data.title}\n\n`;
    markdown += `**URL:** ${data.url}\n\n`;
    markdown += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
    markdown += `**Responses:** ${data.conversationTurns?.length || 0}\n\n`;
    markdown += `---\n\n`;
    
    // Process only assistant messages
    if (data.conversationTurns && data.conversationTurns.length > 0) {
      for (const turn of data.conversationTurns) {
        if (turn.role === 'assistant') {
          markdown += `${turn.content}\n\n`;
          markdown += `---\n\n`;
        }
      }
    }
    
    // Create blob and object URL in popup context (where URL.createObjectURL is supported)
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    try {
      // Trigger download using chrome.downloads API
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
      
      console.log('Download started:', downloadId);
      
      // Wait a moment for download to initiate
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } finally {
      // Revoke object URL after download is initiated
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-w-[320px] p-4 bg-white">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">PIXELVAULT</h1>
        <p className="text-sm text-gray-600">Capture AI conversations to Markdown</p>
      </div>

      {!isExtensionContext && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">⚠️ Extension context not available. Load as extension in Chrome.</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">✗ {errorMessage}</p>
        </div>
      )}

      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">{progress}</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleCapture}
          disabled={captureStatus === 'capturing' || !isExtensionContext}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {captureStatus === 'capturing' ? 'Capturing...' : 'CAPTURE AS MARKDOWN'}
        </button>
      </div>

      {captureStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">✓ Capture successful! Download started.</p>
          {captureResult && (
            <p className="text-xs text-green-600 mt-1">
              {captureResult.metadata?.totalNodes || 0} messages captured
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
