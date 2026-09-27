import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('PIXELVAULT Capture Tests', () => {
  test.beforeEach(async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'index.html');
    await page.goto(`file://${fixturePath}`);
  });

  test('should load test fixture page', async ({ page }) => {
    await expect(page).toHaveTitle('PIXELVAULT Test Fixture');
    await expect(page.locator('h1')).toContainText('PIXELVAULT Test Fixture');
  });

  test('should detect conversation turns in fixture', async ({ page }) => {
    const conversationTurns = page.locator('.conversation-turn');
    await expect(conversationTurns).toHaveCount(4);
    
    const userTurns = page.locator('.user-turn');
    await expect(userTurns).toHaveCount(2);
    
    const assistantTurns = page.locator('.assistant-turn');
    await expect(assistantTurns).toHaveCount(2);
  });

  test('should find code blocks with language classes', async ({ page }) => {
    const codeBlocks = page.locator('pre code');
    await expect(codeBlocks).toHaveCount(3);
    
    const jsCode = page.locator('code.language-javascript');
    await expect(jsCode).toHaveCount(2);
    
    const pythonCode = page.locator('code.language-python');
    await expect(pythonCode).toHaveCount(1);
  });

  test('should have canvas element', async ({ page }) => {
    const canvas = page.locator('#testCanvas');
    await expect(canvas).toBeVisible();
  });

  test('should have SVG element', async ({ page }) => {
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('should have scrollable area with items', async ({ page }) => {
    const scrollableContainer = page.locator('#scrollableContainer');
    await expect(scrollableContainer).toBeVisible();
    
    const scrollableItems = page.locator('.scrollable-item');
    await expect(scrollableItems).toHaveCount(15);
  });

  test('should have table with data', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3);
  });

  test('should capture page content structure', async ({ page }) => {
    // Simulate basic content extraction
    const headings = page.locator('h1, h2, h3');
    await expect(headings).toHaveCount(16); // 1 h1, 8 h2, 7 h3
    
    const paragraphs = page.locator('p');
    await expect(paragraphs.first()).toBeVisible();
  });

  test('should handle nested lists', async ({ page }) => {
    const unorderedList = page.locator('ul');
    await expect(unorderedList).toHaveCount(2); // One main list, one nested
    
    const orderedList = page.locator('ol');
    await expect(orderedList).toHaveCount(1);
    
    const listItems = page.locator('li');
    await expect(listItems.first()).toBeVisible();
  });

  test('should have image element', async ({ page }) => {
    const image = page.locator('img');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('alt', 'Test image (base64 SVG)');
  });
});
