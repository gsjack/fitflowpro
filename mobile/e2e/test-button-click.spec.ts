import { test } from '@playwright/test';

test('Test Button Click Directly', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('http://localhost:8081/register');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('[Test] Filling form...');
  await page.fill('input[type="email"]', 'test-manual@example.com');
  await page.fill('input[type="password"]', 'Test1234');

  console.log('[Test] Clicking button via evaluate...');
  
  // Try to click the button using JavaScript evaluation
  await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    console.log('[Page] Found button:', button);
    if (button) {
      console.log('[Page] Button onclick:', (button as any).onclick);
      console.log('[Page] Clicking button...');
      button.click();
      console.log('[Page] Button clicked');
    } else {
      console.log('[Page] NO BUTTON FOUND!');
    }
  });

  await page.waitForTimeout(3000);

  console.log('\n=== CONSOLE LOGS ===');
  consoleLogs.forEach(log => console.log(log));
});
