console.log('PIXELVAULT background service worker loaded');

// Lifecycle management
chrome.runtime.onInstalled.addListener(() => {
  console.log('PIXELVAULT extension installed');
});

// Message handling
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (message.type === 'EXPORT_CONTENT') {
    handleExport(message.data, message.format)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleExport(data: any, format: string) {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;
    case 'markdown':
    case 'md':
      // Simple markdown conversion for MVP
      content = convertToMarkdown(data);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'html':
      // Simple HTML conversion for MVP
      content = convertToHTML(data);
      mimeType = 'text/html';
      extension = 'html';
      break;
    default:
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pixelvault-capture-${timestamp}.${extension}`;

  // Create blob and download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
    
    return { downloadId, filename };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function convertToMarkdown(data: any): string {
  let md = `# ${data.title}\n\n`;
  md += `**URL:** ${data.url}\n\n`;
  md += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;
  
  // Handle conversation turns if present
  if (data.conversationTurns && data.conversationTurns.length > 0) {
    for (const turn of data.conversationTurns) {
      const role = turn.role === 'user' ? 'User' : 'Assistant';
      md += `## ${role}\n\n`;
      md += `${turn.content}\n\n`;
    }
  } else {
    // Simple node traversal
    function processNode(node: any, depth = 0): string {
      let result = '';
      const indent = '  '.repeat(depth);
      
      if (node.textContent) {
        result += `${indent}${node.textContent}\n\n`;
      }
      
      if (node.children) {
        for (const child of node.children) {
          result += processNode(child, depth + 1);
        }
      }
      
      return result;
    }
    
    for (const node of data.nodes) {
      md += processNode(node);
    }
  }
  
  return md;
}

function convertToHTML(data: any): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .metadata { color: #666; font-size: 0.9em; }
    .conversation-turn { margin: 20px 0; padding: 15px; border-radius: 8px; }
    .user-turn { background: #e3f2fd; }
    .assistant-turn { background: #f3e5f5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.title)}</h1>
    <div class="metadata">
      <p><strong>URL:</strong> <a href="${escapeHtml(data.url)}">${escapeHtml(data.url)}</a></p>
      <p><strong>Captured:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
    </div>
  </div>
  <div class="content">
`;

  // Handle conversation turns if present
  if (data.conversationTurns && data.conversationTurns.length > 0) {
    for (const turn of data.conversationTurns) {
      const turnClass = turn.role === 'user' ? 'user-turn' : 'assistant-turn';
      const roleName = turn.role === 'user' ? 'User' : 'Assistant';
      html += `<div class="conversation-turn ${turnClass}">\n`;
      html += `<h3>${escapeHtml(roleName)}</h3>\n`;
      html += `<p>${escapeHtml(turn.content)}</p>\n`;
      html += `</div>\n`;
    }
  } else {
    function processNode(node: any): string {
      let result = '';
      
      if (node.textContent) {
        result += `<p>${escapeHtml(node.textContent)}</p>\n`;
      }
      
      if (node.children) {
        for (const child of node.children) {
          result += processNode(child);
        }
      }
      
      return result;
    }
    
    for (const node of data.nodes) {
      html += processNode(node);
    }
  }
  
  html += `
  </div>
</body>
</html>`;
  
  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
