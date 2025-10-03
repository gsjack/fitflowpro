import { test } from '@playwright/test';

test('inspect button element and click', async ({ page }) => {
  // Enable verbose logging
  page.on('console', msg => {
    console.log('[BROWSER]:', msg.text());
  });

  page.on('pageerror', error => {
    console.error('[PAGE ERROR]:', error.message);
    console.error('[STACK]:', error.stack);
  });

  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('\n=== INSPECTING BUTTON ===\n');

  // Fill form first
  await page.locator('input[type="email"]').fill('demo@fitflow.test');
  await page.locator('input[type="password"]').fill('Password123');

  // Find all buttons
  const buttons = page.locator('button, div[role="button"], [accessibilityrole="button"]');
  const count = await buttons.count();
  console.log(`Found ${count} button-like elements`);

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const text = await button.textContent();
    const role = await button.getAttribute('role');
    const accessibilityRole = await button.getAttribute('accessibilityrole');
    const tag = await button.evaluate(el => el.tagName);

    console.log(`\nButton ${i}:`);
    console.log(`  Tag: ${tag}`);
    console.log(`  Text: "${text}"`);
    console.log(`  Role: ${role}`);
    console.log(`  AccessibilityRole: ${accessibilityRole}`);

    // Check if this is the login button
    if (text?.toLowerCase().includes('login')) {
      console.log(`\n✓ This is the LOGIN button!`);

      // Get all event listeners (if possible)
      const hasOnClick = await button.evaluate(el => {
        const hasClickAttr = el.hasAttribute('onclick');
        const hasClickListener = (el as any)._reactProps?.onPress || (el as any)._reactProps?.onClick;
        return { hasClickAttr, hasClickListener: !!hasClickListener };
      });

      console.log(`  Has onclick attribute: ${hasOnClick.hasClickAttr}`);
      console.log(`  Has React click handler: ${hasOnClick.hasClickListener}`);

      // Try multiple click methods
      console.log('\n=== TRYING MULTIPLE CLICK METHODS ===\n');

      console.log('Method 1: Playwright click()');
      await button.click();
      await page.waitForTimeout(1000);

      console.log('Method 2: JavaScript click()');
      await button.evaluate(el => (el as HTMLElement).click());
      await page.waitForTimeout(1000);

      console.log('Method 3: dispatchEvent');
      await button.evaluate(el => {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });
      await page.waitForTimeout(1000);

      break;
    }
  }

  console.log('\n=== WAITING FOR LOGS ===\n');
  await page.waitForTimeout(3000);

  console.log('\n=== TEST COMPLETE ===\n');
});
