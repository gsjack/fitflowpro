import { test } from '@playwright/test';

test('debug blank screen', async ({ page }) => {
  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[BROWSER ${type}]:`, msg.text());
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]:`, error.message);
    console.log(`[STACK]:`, error.stack);
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 60000 });

  console.log('Page loaded, waiting 5 seconds...');
  await page.waitForTimeout(5000);

  // Get page content
  const html = await page.content();
  console.log('\n=== PAGE HTML ===');
  console.log(html.substring(0, 2000));

  // Get body text
  const bodyText = await page.textContent('body');
  console.log('\n=== BODY TEXT ===');
  console.log(bodyText);

  // Check for React root
  const rootExists = await page.locator('#root').count();
  console.log('\n#root element exists:', rootExists > 0);

  // Check for any text content
  const hasAnyText = await page.locator('text=/./').count();
  console.log('Elements with text:', hasAnyText);

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-blank-screen.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/debug-blank-screen.png');
});
