import { test, expect } from '@playwright/test';

test.describe('FitFlow Web App', () => {
  test('should load without import.meta syntax errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors (uncaught exceptions)
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('http://localhost:8081', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for React to render
    await page.waitForTimeout(5000);

    // Check for the root element
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    // Check that the app rendered something
    const hasContent = await page.locator('body').evaluate((el) => {
      return el.textContent && el.textContent.trim().length > 0;
    });
    expect(hasContent).toBe(true);

    // Log any errors found
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }
    if (pageErrors.length > 0) {
      console.log('Page errors found:', pageErrors);
    }

    // Check for import.meta syntax errors specifically
    const hasSyntaxError = errors.some((err) =>
      err.toLowerCase().includes('import.meta') ||
      err.toLowerCase().includes('syntaxerror')
    );
    expect(hasSyntaxError).toBe(false);

    // Take a screenshot
    await page.screenshot({ path: '/tmp/fitflow-web.png', fullPage: true });

    console.log('✅ Web app loaded successfully without errors!');
  });

  test('should show auth screen', async ({ page }) => {
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for app to render
    await page.waitForTimeout(3000);

    // Look for common auth elements
    const bodyText = await page.textContent('body');
    const hasAuthElements =
      bodyText?.includes('Login') ||
      bodyText?.includes('Register') ||
      bodyText?.includes('Email') ||
      bodyText?.includes('Password');

    expect(hasAuthElements).toBe(true);

    await page.screenshot({ path: '/tmp/fitflow-auth.png' });
    console.log('✅ Auth screen is visible!');
  });
});
