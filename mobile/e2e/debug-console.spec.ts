import { test, expect } from '@playwright/test';

test('capture console errors', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  const pageErrors: Error[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error);
    console.error('PAGE ERROR:', error.message, error.stack);
  });

  await page.goto('http://localhost:8081', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Wait for React to render
  await page.waitForTimeout(10000);

  console.log('\n========== ALL CONSOLE MESSAGES ==========');
  consoleMessages.forEach((msg) => console.log(msg));

  console.log('\n========== ERRORS ==========');
  errors.forEach((err) => console.error(err));

  console.log('\n========== PAGE ERRORS ==========');
  pageErrors.forEach((err) => console.error(err.message, err.stack));

  console.log('\n========== HTML BODY ==========');
  const bodyHTML = await page.locator('body').innerHTML();
  console.log(bodyHTML.substring(0, 500));

  await page.screenshot({ path: '/tmp/debug-screenshot.png', fullPage: true });
});
