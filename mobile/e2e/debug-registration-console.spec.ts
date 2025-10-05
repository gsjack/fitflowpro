import { test, expect } from '@playwright/test';

test.describe('Registration Debug - Console Capture', () => {
  test('capture all console messages during registration', async ({ page }) => {
    // Capture ALL console messages
    const consoleMessages: Array<{ type: string; text: string; location?: string }> = [];
    const pageErrors: Array<string> = [];
    const failedRequests: Array<{ url: string; error: string }> = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      const location = msg.location();

      console.log(`[Browser ${type.toUpperCase()}]`, text);

      consoleMessages.push({
        type,
        text,
        location: location ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : undefined,
      });
    });

    page.on('pageerror', (err) => {
      const errorMsg = err.toString();
      console.error('[Browser Page Error]', errorMsg);
      console.error('[Error Stack]', err.stack);
      pageErrors.push(errorMsg);
    });

    page.on('requestfailed', (req) => {
      const url = req.url();
      const failure = req.failure();
      const errorMsg = failure ? failure.errorText : 'Unknown error';

      console.error('[Request Failed]', url, errorMsg);
      failedRequests.push({ url, error: errorMsg });
    });

    // Also capture successful requests
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        console.log('[API Request]', req.method(), req.url());
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        const status = res.status();
        console.log('[API Response]', res.url(), status);

        if (status >= 400) {
          try {
            const body = await res.text();
            console.error('[API Error Body]', body);
          } catch (e) {
            console.error('[Could not read error body]', e);
          }
        }
      }
    });

    console.log('\n========== STARTING REGISTRATION TEST ==========\n');

    // Navigate to registration page
    console.log('[Test] Navigating to registration page...');
    await page.goto('http://localhost:8081/register', { waitUntil: 'networkidle' });

    // Wait for page to fully load
    await page.waitForTimeout(2000);
    console.log('[Test] Page loaded');

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/registration-initial.png' });
    console.log('[Test] Initial screenshot saved');

    // Fill email field
    console.log('[Test] Filling email field...');
    const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('test-debug@example.com');
    console.log('[Test] Email filled: test-debug@example.com');

    // Fill password field
    console.log('[Test] Filling password field...');
    const passwordInput = page.locator('input[placeholder*="password" i], input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill('Test1234');
    console.log('[Test] Password filled: Test1234');

    // Select experience level
    console.log('[Test] Selecting experience level...');
    // Try to find the experience selector - it might be a dropdown or button group
    const beginnerButton = page.locator('text=beginner').or(page.locator('text=Beginner')).first();
    if (await beginnerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await beginnerButton.click();
      console.log('[Test] Beginner experience selected');
    } else {
      console.log('[Test] Could not find experience selector (may be optional)');
    }

    // Take screenshot before clicking submit
    await page.screenshot({ path: '/tmp/registration-before-submit.png' });
    console.log('[Test] Pre-submit screenshot saved');

    // Find and click the Create Account button
    console.log('[Test] Looking for Create Account button...');
    const createAccountButton = page.locator('text="Create Account"').or(page.locator('button:has-text("Create Account")')).first();
    await createAccountButton.waitFor({ state: 'visible', timeout: 5000 });

    console.log('[Test] Clicking Create Account button...');
    await createAccountButton.click();
    console.log('[Test] Button clicked');

    // Wait and observe
    console.log('[Test] Waiting 5 seconds to observe behavior...');
    await page.waitForTimeout(5000);

    // Check current URL
    const currentUrl = page.url();
    console.log('[Test] Current URL after submit:', currentUrl);

    // Take screenshot after submit
    await page.screenshot({ path: '/tmp/registration-after-submit.png' });
    console.log('[Test] Post-submit screenshot saved');

    // Print summary
    console.log('\n========== CONSOLE SUMMARY ==========\n');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total page errors: ${pageErrors.length}`);
    console.log(`Total failed requests: ${failedRequests.length}`);

    if (pageErrors.length > 0) {
      console.log('\n--- PAGE ERRORS ---');
      pageErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    if (failedRequests.length > 0) {
      console.log('\n--- FAILED REQUESTS ---');
      failedRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.url} - ${req.error}`);
      });
    }

    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    if (errorMessages.length > 0) {
      console.log('\n--- ERROR MESSAGES ---');
      errorMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
        if (msg.location) {
          console.log(`   Location: ${msg.location}`);
        }
      });
    }

    const warningMessages = consoleMessages.filter(m => m.type === 'warning');
    if (warningMessages.length > 0) {
      console.log('\n--- WARNING MESSAGES ---');
      warningMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.text}`);
      });
    }

    console.log('\n========== END SUMMARY ==========\n');

    // Check if registration succeeded
    if (currentUrl === 'http://localhost:8081/' || currentUrl.includes('/(tabs)')) {
      console.log('✅ Registration appears to have succeeded (redirected to dashboard)');
    } else if (currentUrl.includes('/register')) {
      console.log('❌ Still on registration page - registration likely failed');

      // Try to find error messages in the UI
      const errorText = await page.locator('text=/error|failed|invalid/i').allTextContents();
      if (errorText.length > 0) {
        console.log('UI Error messages:', errorText);
      }
    }

    // Save all captured data to a file
    const debugData = {
      finalUrl: currentUrl,
      consoleMessages,
      pageErrors,
      failedRequests,
      timestamp: new Date().toISOString(),
    };

    const fs = require('fs');
    fs.writeFileSync(
      '/tmp/registration-debug.json',
      JSON.stringify(debugData, null, 2)
    );
    console.log('\n[Test] Full debug data saved to /tmp/registration-debug.json\n');
  });
});
