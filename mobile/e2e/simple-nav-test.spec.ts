/**
 * Simple navigation test
 */

import { test } from '@playwright/test';

test('simple tab navigation', async ({ page }) => {
  test.setTimeout(30000);

  console.log('1. Loading app...');
  await page.goto('http://localhost:8081', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log('2. Taking screenshot...');
  await page.screenshot({ path: '/tmp/simple-nav-01.png', fullPage: true });

  console.log('3. Looking for Workout tab...');

  // Try different selectors
  const selectors = [
    'button:has-text("Workout")',
    'a:has-text("Workout")',
    '[role="button"]:has-text("Workout")',
    'text=Workout',
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count();
      console.log(`  Selector "${selector}": found ${count} elements`);

      if (count > 0) {
        console.log(`  Attempting to click with selector: ${selector}`);
        await element.click({ timeout: 5000 });
        console.log(`  ✓ Successfully clicked!`);

        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/simple-nav-02-after-click.png', fullPage: true });

        const newContent = await page.textContent('body');
        console.log('  Page content after click:', newContent?.substring(0, 300));
        return;
      }
    } catch (error) {
      console.log(`  ✗ Failed with selector "${selector}": ${error}`);
    }
  }

  console.log('✗ Could not find or click Workout tab with any selector');
});
