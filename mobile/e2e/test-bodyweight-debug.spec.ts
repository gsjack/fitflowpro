import { test } from '@playwright/test';

test('Body weight chart debug', async ({ page }) => {
  const consoleMessages: string[] = [];
  const networkRequests: any[] = [];
  const networkResponses: any[] = [];

  // Capture console logs
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('[BROWSER CONSOLE]:', text);
  });

  // Capture network
  page.on('request', (request) => {
    if (request.url().includes('/api/body-weight')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: Object.fromEntries(
          Object.entries(request.headers()).filter(([k]) => k === 'authorization')
        ),
      });
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('/api/body-weight')) {
      try {
        const body = await response.json();
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          body: body,
        });
      } catch (e) {
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          body: 'Failed to parse JSON',
        });
      }
    }
  });

  // Navigate and login
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(2000);

  const usernameInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await usernameInput.fill('bodyweight-test-123@example.com');
  await passwordInput.fill('Test123!');

  const loginButton = page.locator('button').first();
  await loginButton.click();
  await page.waitForTimeout(3000);

  // Navigate to Analytics
  await page.click('text=Analytics');
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/bodyweight-debug.png', fullPage: true });

  console.log('\n=== NETWORK REQUESTS ===');
  console.log(JSON.stringify(networkRequests, null, 2));

  console.log('\n=== NETWORK RESPONSES ===');
  console.log(JSON.stringify(networkResponses, null, 2));

  console.log('\n=== CONSOLE MESSAGES (filtered) ===');
  const relevantLogs = consoleMessages.filter(
    (msg) =>
      msg.includes('body') ||
      msg.includes('weight') ||
      msg.includes('error') ||
      msg.includes('Error') ||
      msg.includes('failed') ||
      msg.includes('Failed')
  );
  console.log(relevantLogs.join('\n'));
});
