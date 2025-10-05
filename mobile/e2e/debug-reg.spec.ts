import { test } from '@playwright/test';

test('Debug Registration Failure', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const msgType = msg.type();
    const msgText = msg.text();
    consoleLogs.push(`[${msgType}] ${msgText}`);
  });

  const networkActivity: any[] = [];
  page.on('request', request => {
    networkActivity.push({
      method: request.method(),
      url: request.url(),
      postData: request.postData()
    });
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      const status = response.status();
      let body = 'Could not read body';
      try {
        body = await response.text();
      } catch (e) {
        body = 'Error reading body';
      }
      networkActivity.push({
        type: 'response',
        url: response.url(),
        status,
        body
      });
    }
  });

  console.log('[Debug] Navigating to registration page...');
  await page.goto('http://localhost:8081/register');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const timestamp = Date.now();
  const testEmail = `test-debug-${timestamp}@example.com`;

  console.log('[Debug] Filling form...');
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', 'Test1234');

  const experienceButton = page.locator('text=/beginner/i').first();
  await experienceButton.click();

  console.log('[Debug] Clicking Create Account...');
  const createAccountButton = page.locator('text=/create account/i').first();
  await createAccountButton.click();

  await page.waitForTimeout(5000);

  console.log('\n=== CONSOLE LOGS ===');
  consoleLogs.forEach(log => console.log(log));

  console.log('\n=== NETWORK ACTIVITY ===');
  networkActivity.forEach(activity => {
    console.log(JSON.stringify(activity, null, 2));
  });

  console.log('\n=== CURRENT URL ===');
  console.log(page.url());

  await page.screenshot({ path: 'e2e-results/debug-registration-failure.png', fullPage: true });
});
