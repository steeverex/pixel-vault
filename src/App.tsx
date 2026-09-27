import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [captureResult, setCaptureResult] = useState<any>(null);
  const [isExtensionContext, setIsExtensionContext] = useState(false);

  useEffect(() => {
    // Check if we're in extension context
    setIsExtensionContext(typeof chrome !== 'undefined' && !!chrome.tabs);
  }, []);

  const handleCapture = async (format: 'json' | 'markdown' | 'html') => {
    if (!isExtensionContext) {
      console.log('Not in extension context - capture functionality disabled');
      return;
    }

    setCaptureStatus('capturing');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CAPTURE_PAGE',
        options: {
          format,
          includeAssets: true,
          prettyPrint: true
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      console.log('Capture result:', response.data);
      setCaptureResult(response.data);
      setCaptureStatus('success');

      // Export via background script
      await chrome.runtime.sendMessage({
        type: 'EXPORT_CONTENT',
        data: response.data,
        format
      });

    } catch (error) {
      console.error('Capture failed:', error);
      setCaptureStatus('error');
    }
  };

  return (
    <div className="min-w-[320px] p-4 bg-white">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">PIXELVAULT</h1>
        <p className="text-sm text-gray-600">Capture web content & AI conversations</p>
      </div>

      {!isExtensionContext && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">⚠️ Extension context not available. Load as extension in Chrome.</p>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => handleCapture('json')}
          disabled={captureStatus === 'capturing' || !isExtensionContext}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {captureStatus === 'capturing' ? 'Capturing...' : 'Capture as JSON'}
        </button>

        <button
          onClick={() => handleCapture('markdown')}
          disabled={captureStatus === 'capturing' || !isExtensionContext}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          {captureStatus === 'capturing' ? 'Capturing...' : 'Capture as Markdown'}
        </button>

        <button
          onClick={() => handleCapture('html')}
          disabled={captureStatus === 'capturing' || !isExtensionContext}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
        >
          {captureStatus === 'capturing' ? 'Capturing...' : 'Capture as HTML'}
        </button>
      </div>

      {captureStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">✓ Capture successful! Download started.</p>
          {captureResult && (
            <p className="text-xs text-green-600 mt-1">
              {captureResult.metadata?.totalNodes || 0} nodes captured
            </p>
          )}
        </div>
      )}

      {captureStatus === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">✗ Capture failed. Check console for details.</p>
        </div>
      )}
    </div>
  );
}

export default App;
