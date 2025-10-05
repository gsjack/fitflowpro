import { test } from '@playwright/test';

test('verify button is clickable and logs appear', async ({ page }) => {
  // Capture console
  page.on('console', (msg) => {
    console.log(`[Browser ${msg.type()}]`, msg.text());
  });

  await page.goto('http://localhost:8081/register');
  await page.waitForTimeout(2000);

  // Fill form
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('Test1234');

  console.log('[Test] About to click button...');

  // Try different selectors
  const buttonSelectors = [
    'button:has-text("Create Account")',
    'text="Create Account"',
    'button[type="button"]',
    '[role="button"]:has-text("Create Account")',
  ];

  for (const selector of buttonSelectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      const isEnabled = isVisible ? await element.isEnabled().catch(() => false) : false;

      console.log(`[Test] Selector "${selector}": visible=${isVisible}, enabled=${isEnabled}`);

      if (isVisible && isEnabled) {
        console.log(`[Test] Clicking with selector: ${selector}`);
        await element.click();
        await page.waitForTimeout(2000);
        console.log('[Test] Click completed');
        break;
      }
    } catch (e) {
      console.log(`[Test] Selector "${selector}" failed:`, e.message);
    }
  }

  await page.screenshot({ path: '/tmp/button-click-test.png' });
});
