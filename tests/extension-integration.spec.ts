import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('PIXELVAULT Fixture Tests', () => {
  test('should load short conversation fixture', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'index.html');
    await page.goto(`file://${fixturePath}`);
    await expect(page).toHaveTitle('PIXELVAULT Test Fixture');
  });

  test('should load long conversation fixture', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'long-conversation.html');
    await page.goto(`file://${fixturePath}`);
    await expect(page).toHaveTitle('Long ChatGPT Conversation Test');
  });

  test('should have conversation turns in short fixture', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'index.html');
    await page.goto(`file://${fixturePath}`);
    
    const conversationTurns = page.locator('.conversation-turn');
    await expect(conversationTurns).toHaveCount(4);
  });

  test('should have multiple conversation turns in long fixture', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'long-conversation.html');
    await page.goto(`file://${fixturePath}`);
    
    const conversationTurns = page.locator('[data-testid="conversation-turn"]');
    await expect(conversationTurns).toHaveCount(18);
  });

  test('should have proper Markdown structure in fixture', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'index.html');
    await page.goto(`file://${fixturePath}`);
    
    const codeBlocks = page.locator('pre code');
    await expect(codeBlocks).toHaveCount(3);
    
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible();
  });
});
