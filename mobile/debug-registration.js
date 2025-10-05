/**
 * Debug registration to see what's happening
 */

const puppeteer = require('puppeteer');

async function debugRegistration() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', (msg) => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Capture all requests
  page.on('request', (request) => {
    if (request.url().includes('api')) {
      console.log(`[Request] ${request.method()} ${request.url()}`);
    }
  });

  // Capture all responses
  page.on('response', async (response) => {
    if (response.url().includes('api')) {
      console.log(`[Response] ${response.status()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`[Response Body]:`, text.substring(0, 200));
      } catch (e) {
        // Ignore
      }
    }
  });

  page.on('pageerror', (error) => {
    console.log(`[Page Error]:`, error.message);
  });

  try {
    console.log('🔍 Debugging Registration Flow...\n');

    // Navigate to register
    console.log('1. Navigating to /register...');
    await page.goto('http://localhost:8081/register', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n2. Filling registration form...');
    const uniqueEmail = `debug_${Date.now()}@test.com`;

    await page.type('input[type="email"]', uniqueEmail);
    const passwordInputs = await page.$$('input[type="password"]');
    await passwordInputs[0].type('TestPass123!');

    console.log(`   Email: ${uniqueEmail}`);
    console.log(`   Password: TestPass123!`);

    console.log('\n3. Submitting form...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const buttons = await page.$$('button[type="submit"], button');
    console.log(`   Found ${buttons.length} buttons`);

    await buttons[0].click();
    console.log('   Clicked submit button');

    console.log('\n4. Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    console.log(`\n5. Current URL: ${currentUrl}`);

    await page.screenshot({ path: '/home/asigator/fitness2025/mobile/screenshot-debug-result.png', fullPage: true });
    console.log('   Screenshot saved: screenshot-debug-result.png');

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`\n6. Page content:\n${bodyText.substring(0, 300)}`);

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
  } finally {
    console.log('\n⏸ Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

debugRegistration();
