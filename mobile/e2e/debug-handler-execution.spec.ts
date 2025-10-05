import { test } from '@playwright/test';

test('check if onClick handler executes', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  // Capture ALL console output
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    console.log(`[Browser ${msg.type()}]`, text);
  });

  page.on('pageerror', (err) => {
    errors.push(err.toString());
    console.error('[Page Error]', err);
  });

  await page.goto('http://localhost:8081/register');
  await page.waitForTimeout(2000);

  // Fill form
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('Test1234');

  // Inject a test to verify the button's onClick
  const buttonInfo = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return { found: false };

    // Check if onclick is set
    const hasOnClick = button.onclick !== null;
    const hasEventListener = (button as any)._reactListeners !== undefined;

    // Try to trigger a click via JS
    (button as HTMLButtonElement).click();

    return {
      found: true,
      hasOnClick,
      hasEventListener,
      tagName: button.tagName,
      textContent: button.textContent,
      disabled: (button as HTMLButtonElement).disabled,
    };
  });

  console.log('[Test] Button info:', JSON.stringify(buttonInfo, null, 2));

  await page.waitForTimeout(3000);

  console.log('\n--- All captured logs ---');
  logs.forEach((log) => console.log(log));

  if (errors.length > 0) {
    console.log('\n--- Page errors ---');
    errors.forEach((err) => console.error(err));
  }

  // Check if we got the expected console log
  const hasRegisterScreenLog = logs.some((log) => log.includes('[RegisterScreen]'));
  console.log('\n[Test] Did we see [RegisterScreen] logs?', hasRegisterScreenLog);
});
