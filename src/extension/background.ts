console.log('PIXELVAULT background service worker loaded');

// Lifecycle management
chrome.runtime.onInstalled.addListener(() => {
  console.log('PIXELVAULT extension installed');
});

// No message handling needed - download will be handled in popup
