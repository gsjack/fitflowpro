import { test } from '@playwright/test';

test('check network requests and bundle loading', async ({ page }) => {
  const requests: string[] = [];
  const responses: Array<{ url: string; status: number; type: string }> = [];
  const failures: string[] = [];

  page.on('request', (request) => {
    requests.push(request.url());
  });

  page.on('response', (response) => {
    responses.push({
      url: response.url(),
      status: response.status(),
      type: response.headers()['content-type'] || 'unknown',
    });
  });

  page.on('requestfailed', (request) => {
    failures.push(`${request.url()} - ${request.failure()?.errorText}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[CONSOLE ERROR]', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]', error.message);
  });

  await page.goto('http://localhost:8081', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  await page.waitForTimeout(10000);

  console.log('\n========== REQUESTS ==========');
  requests.forEach((req) => console.log(req));

  console.log('\n========== RESPONSES ==========');
  responses.forEach((res) => {
    console.log(`${res.status} ${res.url.substring(0, 100)} [${res.type}]`);
  });

  console.log('\n========== FAILURES ==========');
  failures.forEach((fail) => console.error(fail));

  console.log('\n========== BUNDLE LOADED? ==========');
  const bundleLoaded = responses.some(
    (res) => res.url.includes('index.ts.bundle') && res.status === 200
  );
  console.log(`Bundle loaded: ${bundleLoaded}`);

  if (bundleLoaded) {
    const bundleResponse = responses.find((res) => res.url.includes('index.ts.bundle'));
    console.log(`Bundle status: ${bundleResponse?.status}`);
    console.log(`Bundle type: ${bundleResponse?.type}`);
  }
});
