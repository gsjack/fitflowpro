const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  try {
    // 1. Login page
    console.log('1. Loading login page...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/web-login.png', fullPage: true });
    console.log('✓ Login page captured');
    
    // 2. Click Register link
    console.log('2. Testing Register navigation...');
    const registerLink = page.locator('text=Register');
    if (await registerLink.count() > 0) {
      await registerLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/web-register.png', fullPage: true });
      console.log('✓ Register page captured');
      
      // Go back to login
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    // 3. Try to access dashboard directly (should redirect to login if not authenticated)
    console.log('3. Testing dashboard route...');
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/web-dashboard-unauthenticated.png', fullPage: true });
    const currentUrl = page.url();
    console.log('✓ Dashboard route tested (redirected to:', currentUrl, ')');
    
    console.log('\nAll screenshots captured successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/web-error-nav.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
