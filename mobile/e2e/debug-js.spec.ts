import { test, expect } from '@playwright/test';

test('check if JavaScript is executing', async ({ page }) => {
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]', error.message, '\n', error.stack);
  });

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait longer
  await page.waitForTimeout(15000);

  // Check if root div exists
  const root = await page.locator('#root');
  console.log('Root exists:', await root.count());

  // Check root innerHTML
  const rootHTML = await root.innerHTML();
  console.log('Root innerHTML length:', rootHTML.length);
  console.log('Root innerHTML:', rootHTML.substring(0, 200));

  // Try to run JavaScript in the page
  const windowLoaded = await page.evaluate(() => {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  });
  console.log('Window loaded:', windowLoaded);

  // Check if React is loaded
  const hasReact = await page.evaluate(() => {
    return typeof (window as any).React !== 'undefined';
  });
  console.log('Has React:', hasReact);

  // Check if any globals from our app exist
  const hasExpo = await page.evaluate(() => {
    return typeof (window as any).__BUNDLE_START_TIME__ !== 'undefined';
  });
  console.log('Has Expo bundle:', hasExpo);

  await page.screenshot({ path: '/tmp/debug-js.png' });
});
