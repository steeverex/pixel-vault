console.log('PIXELVAULT background service worker loaded');

// Lifecycle management
chrome.runtime.onInstalled.addListener(() => {
  console.log('PIXELVAULT extension installed');
});

// Message handling
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.type === 'EXPORT_MARKDOWN') {
    handleMarkdownExport(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleMarkdownExport(data: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pixelvault-capture-${timestamp}.md`;
  
  // Convert conversation turns to Markdown
  let markdown = `# ${data.title}\n\n`;
  markdown += `**URL:** ${data.url}\n\n`;
  markdown += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
  markdown += `**Messages:** ${data.conversationTurns?.length || 0}\n\n`;
  markdown += `---\n\n`;
  
  // Process conversation turns
  if (data.conversationTurns && data.conversationTurns.length > 0) {
    for (const turn of data.conversationTurns) {
      const role = turn.role === 'user' ? 'User' : 'Assistant';
      markdown += `## ${role}\n\n`;
      markdown += `${turn.content}\n\n`;
    }
  }
  
  // Create blob and download
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  try {
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
    
    // Wait for download to start
    await waitForDownloadComplete(downloadId);
    
    return { downloadId, filename };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function waitForDownloadComplete(downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxWait = 10000; // 10 seconds max wait
    const startTime = Date.now();
    
    const checkDownload = () => {
      if (Date.now() - startTime > maxWait) {
        reject(new Error('Download confirmation timeout'));
        return;
      }
      
      chrome.downloads.search({ id: downloadId }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const download = results[0];
        if (!download) {
          reject(new Error('Download not found'));
          return;
        }
        
        // Download is considered complete when it's not in progress
        if (download.state !== 'in_progress') {
          resolve();
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkDownload, 100);
      });
    };
    
    checkDownload();
  });
}
