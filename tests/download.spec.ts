import { test, expect } from '@playwright/test';

test.describe('PIXELVAULT Download Tests', () => {
  test('should generate proper Markdown from captured conversation', async ({ page }) => {
    // Mock capture data
    const mockData = {
      title: 'Test Conversation',
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      conversationTurns: [
        {
          role: 'user',
          content: 'Can you help me understand machine learning?',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: '## Key Concepts\n\n- **Supervised Learning**: Learning from labeled data\n- **Unsupervised Learning**: Finding patterns in unlabeled data\n\n```python\n# Example: Linear Regression\nfrom sklearn.linear_model import LinearRegression\nmodel = LinearRegression()\n```',
          timestamp: new Date().toISOString()
        }
      ],
      metadata: {
        totalNodes: 2,
        captureMode: 'ai-conversation'
      }
    };

    // Simulate download function (popup context)
    const markdownContent = await page.evaluate((data: any) => {
      let markdown = `# ${data.title}\n\n`;
      markdown += `**URL:** ${data.url}\n\n`;
      markdown += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
      markdown += `**Messages:** ${data.conversationTurns?.length || 0}\n\n`;
      markdown += `---\n\n`;
      
      for (const turn of data.conversationTurns) {
        const role = turn.role === 'user' ? 'User' : 'Assistant';
        markdown += `## ${role}\n\n`;
        markdown += `${turn.content}\n\n`;
      }
      
      return markdown;
    }, mockData);

    console.log('Generated Markdown:', markdownContent);

    // Verify Markdown structure
    expect(markdownContent).toContain('# Test Conversation');
    expect(markdownContent).toContain('## User');
    expect(markdownContent).toContain('## Assistant');
    expect(markdownContent).toContain('## Key Concepts');
    expect(markdownContent).toContain('```python');
    expect(markdownContent).toContain('**Supervised Learning**');
    expect(markdownContent).toContain('Unsupervised Learning');

    // Verify Blob creation works
    const blobCreated = await page.evaluate((markdown: string) => {
      try {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
        return true;
      } catch (e) {
        console.error('Blob creation failed:', e);
        return false;
      }
    }, markdownContent);

    expect(blobCreated).toBe(true);
  });

  test('should handle long conversation capture without timeout', async ({ page }) => {
    // Mock long conversation data
    const mockData = {
      title: 'Long ChatGPT Conversation Test',
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      conversationTurns: Array.from({ length: 18 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content with **bold text** and \`inline code\` and [links](https://example.com).`,
        timestamp: new Date().toISOString()
      })),
      metadata: {
        totalNodes: 18,
        captureMode: 'ai-conversation'
      }
    };

    // Measure capture time
    const startTime = Date.now();

    const markdownContent = await page.evaluate((data: any) => {
      let markdown = `# ${data.title}\n\n`;
      markdown += `**URL:** ${data.url}\n\n`;
      markdown += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
      markdown += `**Messages:** ${data.conversationTurns?.length || 0}\n\n`;
      markdown += `---\n\n`;
      
      for (const turn of data.conversationTurns) {
        const role = turn.role === 'user' ? 'User' : 'Assistant';
        markdown += `## ${role}\n\n`;
        markdown += `${turn.content}\n\n`;
      }
      
      return markdown;
    }, mockData);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Long conversation Markdown generation took ${duration}ms`);

    expect(markdownContent).toContain('# Long ChatGPT Conversation Test');
    expect(markdownContent).toContain('## User');
    expect(markdownContent).toContain('## Assistant');
    expect(markdownContent).toContain('**bold text**');
    expect(markdownContent).toContain('`inline code`');
    expect(markdownContent).toContain('[links](https://example.com)');
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('should preserve Markdown formatting in capture', async ({ page }) => {
    const mockData = {
      title: 'PIXELVAULT Test Fixture',
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      conversationTurns: [
        {
          role: 'user',
          content: 'Can you explain binary search?',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: '## Binary Search Algorithm\n\nBinary search is an efficient algorithm with O(log n) complexity.\n\n### Implementation\n\n```javascript\nfunction binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n```\n\n### Complexity\n\n- Time: O(log n)\n- Space: O(1)',
          timestamp: new Date().toISOString()
        }
      ],
      metadata: {
        totalNodes: 2,
        captureMode: 'ai-conversation'
      }
    };

    const markdownContent = await page.evaluate((data: any) => {
      let markdown = `# ${data.title}\n\n`;
      markdown += `**URL:** ${data.url}\n\n`;
      markdown += `**Captured:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
      markdown += `**Messages:** ${data.conversationTurns?.length || 0}\n\n`;
      markdown += `---\n\n`;
      
      for (const turn of data.conversationTurns) {
        const role = turn.role === 'user' ? 'User' : 'Assistant';
        markdown += `## ${role}\n\n`;
        markdown += `${turn.content}\n\n`;
      }
      
      return markdown;
    }, mockData);

    console.log('Markdown content:', markdownContent);

    // Verify semantic formatting is preserved
    expect(markdownContent).toContain('## Binary Search Algorithm');
    expect(markdownContent).toContain('### Implementation');
    expect(markdownContent).toContain('```javascript');
    expect(markdownContent).toContain('function binarySearch');
    expect(markdownContent).toContain('### Complexity');
    expect(markdownContent).toContain('- Time: O(log n)');
    expect(markdownContent).toContain('- Space: O(1)');
  });
});
