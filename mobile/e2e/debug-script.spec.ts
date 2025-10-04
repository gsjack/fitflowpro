import { test } from '@playwright/test';

test('check if script tag loads', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[CONSOLE ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]', error.message);
    console.error(error.stack);
  });

  await page.goto('http://localhost:8081', {
    waitUntil: 'load',
    timeout: 60000,
  });

  // Wait for script to potentially load
  await page.waitForTimeout(20000);

  // Check if script tag exists
  const scripts = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll('script'));
    return scriptTags.map((s) => ({
      src: s.src,
      defer: s.defer,
      async: s.async,
      loaded: (s as any).loaded || 'unknown',
    }));
  });

  console.log('\n========== SCRIPT TAGS ==========');
  scripts.forEach((s) => console.log(JSON.stringify(s, null, 2)));

  // Try to manually execute something
  const canExecute = await page.evaluate(() => {
    try {
      console.log('TEST: Can execute JavaScript');
      return true;
    } catch (e) {
      return false;
    }
  });
  console.log(`\nCan execute JavaScript: ${canExecute}`);

  await page.screenshot({ path: '/tmp/debug-script.png' });
});
