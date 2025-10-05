import { test } from '@playwright/test';

test('inject debug handler to trace execution', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[Browser ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', (err) => {
    console.error('[Page Error]', err);
  });

  await page.goto('http://localhost:8081/register');
  await page.waitForTimeout(2000);

  // Inject global error tracking
  await page.evaluate(() => {
    window.addEventListener('error', (event) => {
      console.error('[Global Error]', event.error?.toString(), event.error?.stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Rejection]', event.reason);
    });
  });

  // Replace the button's onClick with a debugging version
  await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]') as HTMLButtonElement;
    if (button) {
      console.log('[DEBUG] Found button, replacing onClick');

      // Store original onclick
      const originalOnClick = button.onclick;

      button.onclick = function (e) {
        console.log('[DEBUG] Button onClick fired!');
        console.log('[DEBUG] Event:', e);
        console.log('[DEBUG] Original onClick exists:', originalOnClick !== null);

        if (originalOnClick) {
          try {
            console.log('[DEBUG] Calling original onClick...');
            const result = originalOnClick.call(this, e);
            console.log('[DEBUG] Original onClick returned:', result);
            return result;
          } catch (err) {
            console.error('[DEBUG] Error in original onClick:', err);
            throw err;
          }
        } else {
          console.log('[DEBUG] No original onClick handler!');
        }
      };

      console.log('[DEBUG] onClick replaced successfully');
    } else {
      console.log('[DEBUG] Button not found!');
    }
  });

  // Fill form
  await page.locator('input[type="email"]').fill('test-inject@example.com');
  await page.locator('input[type="password"]').fill('Test1234');

  // Click button
  console.log('[Test] Clicking button...');
  await page.locator('button[type="button"]').click();

  console.log('[Test] Waiting for execution...');
  await page.waitForTimeout(5000);

  console.log('[Test] Test complete');
});
