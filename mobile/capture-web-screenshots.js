const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  try {
    console.log('Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for initial render
    console.log('Waiting for content to load...');
    await page.waitForTimeout(5000);
    
    // Capture initial page
    console.log('Capturing initial page...');
    await page.screenshot({ path: '/tmp/web-initial.png', fullPage: true });
    
    // Get page content to check what's loaded
    const bodyText = await page.locator('body').innerText();
    console.log('Page contains text:', bodyText.substring(0, 200));
    
    // Wait a bit more
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/web-loaded.png', fullPage: true });
    
    console.log('Screenshots captured: /tmp/web-initial.png, /tmp/web-loaded.png');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/web-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
