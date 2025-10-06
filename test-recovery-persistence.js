const { chromium } = require('playwright');

async function testRecoveryPersistence() {
  console.log('=== Recovery Assessment Persistence Test ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
  page.on('pageerror', error => console.error(`[Browser Error] ${error}`));

  const results = {
    formVisible: false,
    submissionWorks: false,
    loggedStateAppears: false,
    loggedStatePersists: false,
    databaseEntries: 0,
    errors: []
  };

  try {
    // Step 1: Navigate to Expo web version
    console.log('Step 1: Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('Page loaded successfully\n');

    // Step 2: Login
    console.log('Step 2: Logging in as asigator@googlemail.com...');

    // Wait for login form
    try {
      await page.waitForSelector('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', { timeout: 10000 });

      // Fill login form
      const emailInput = await page.$('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]');
      await emailInput.fill('asigator@googlemail.com');

      const passwordInput = await page.$('input[type="password"]');
      await passwordInput.fill('password123');

      // Click login button
      const loginButton = await page.$('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")');
      await loginButton.click();

      console.log('Login credentials submitted');
      await page.waitForTimeout(3000);
      console.log('Waiting for dashboard to load...\n');

    } catch (error) {
      console.log('Login form not found or already logged in, continuing...\n');
    }

    // Step 3: Check if recovery assessment form is visible
    console.log('Step 3: Checking if recovery assessment form is visible...');

    await page.waitForTimeout(2000);

    // Take screenshot of current state
    await page.screenshot({ path: '/mnt/1000gb/Fitness/fitflowpro/screenshot-dashboard.png' });
    console.log('Screenshot saved: screenshot-dashboard.png');

    // Check for recovery form elements
    const recoveryFormSelectors = [
      'text=/recovery/i',
      'text=/sleep/i',
      'text=/soreness/i',
      'text=/motivation/i',
      'input[type="number"]',
      'button:has-text("Submit")',
      'button:has-text("Log Assessment")'
    ];

    let formFound = false;
    for (const selector of recoveryFormSelectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found element matching: ${selector}`);
        formFound = true;
      }
    }

    results.formVisible = formFound;
    console.log(`Recovery form visible: ${formFound}\n`);

    if (!formFound) {
      console.log('Recovery form not found. Checking page content...');
      const pageContent = await page.content();
      console.log('Page title:', await page.title());

      // Check for "logged" state
      const loggedStateSelectors = [
        'text=/Recovery Score/i',
        'text=/score:/i',
        'text=/logged/i'
      ];

      for (const selector of loggedStateSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found logged state element: ${selector}`);
          results.loggedStateAppears = true;
          results.loggedStatePersists = true;
        }
      }
    }

    // Step 4: Submit recovery assessment (if form is visible)
    if (formFound) {
      console.log('Step 4: Submitting recovery assessment (5, 5, 5)...');

      try {
        // Find input fields (sleep, soreness, motivation)
        const numberInputs = await page.$$('input[type="number"]');

        if (numberInputs.length >= 3) {
          await numberInputs[0].fill('5'); // Sleep
          await numberInputs[1].fill('5'); // Soreness
          await numberInputs[2].fill('5'); // Motivation

          console.log('Filled recovery values: sleep=5, soreness=5, motivation=5');

          // Find and click submit button
          const submitButton = await page.$('button:has-text("Submit"), button:has-text("Log Assessment")');
          if (submitButton) {
            await submitButton.click();
            console.log('Submit button clicked');

            await page.waitForTimeout(2000);
            results.submissionWorks = true;

            // Step 5: Verify logged state appears
            console.log('\nStep 5: Checking if logged state appears...');

            await page.screenshot({ path: '/mnt/1000gb/Fitness/fitflowpro/screenshot-after-submit.png' });
            console.log('Screenshot saved: screenshot-after-submit.png');

            const loggedStateSelectors = [
              'text=/Recovery Score/i',
              'text=/score:/i',
              'text=/15/i' // Total score should be 15
            ];

            for (const selector of loggedStateSelectors) {
              const element = await page.$(selector);
              if (element) {
                console.log(`Found logged state element: ${selector}`);
                results.loggedStateAppears = true;
              }
            }

            console.log(`Logged state appears: ${results.loggedStateAppears}\n`);

          } else {
            console.log('Submit button not found');
            results.errors.push('Submit button not found');
          }
        } else {
          console.log(`Expected 3 number inputs, found ${numberInputs.length}`);
          results.errors.push(`Expected 3 number inputs, found ${numberInputs.length}`);
        }

      } catch (error) {
        console.error('Error submitting form:', error.message);
        results.errors.push(`Form submission error: ${error.message}`);
      }

      // Step 6: Refresh page
      console.log('Step 6: Refreshing page...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      console.log('Page refreshed\n');

      // Step 7: Verify logged state persists
      console.log('Step 7: Checking if logged state persists after refresh...');

      await page.screenshot({ path: '/mnt/1000gb/Fitness/fitflowpro/screenshot-after-refresh.png' });
      console.log('Screenshot saved: screenshot-after-refresh.png');

      const loggedStateSelectors = [
        'text=/Recovery Score/i',
        'text=/score:/i',
        'text=/15/i'
      ];

      let persistsFound = false;
      for (const selector of loggedStateSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found persisted logged state element: ${selector}`);
          persistsFound = true;
        }
      }

      results.loggedStatePersists = persistsFound;
      console.log(`Logged state persists: ${persistsFound}\n`);
    }

  } catch (error) {
    console.error('Test error:', error.message);
    results.errors.push(`Test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

async function checkDatabase() {
  console.log('\n=== Database Check ===\n');

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);

  try {
    const dbPath = '/mnt/1000gb/Fitness/fitflowpro/backend/data/fitflow.db';
    const query = `SELECT * FROM recovery_assessments WHERE user_id = 151 AND date = '2025-10-03'`;

    const { stdout, stderr } = await execPromise(`sqlite3 "${dbPath}" "${query}"`);

    if (stderr) {
      console.error('Database error:', stderr);
      return { entries: 0, error: stderr };
    }

    const lines = stdout.trim().split('\n').filter(line => line.length > 0);
    console.log(`Database entries for user 151 on 2025-10-03: ${lines.length}`);

    if (lines.length > 0) {
      console.log('\nDatabase records:');
      lines.forEach((line, index) => {
        console.log(`  ${index + 1}: ${line}`);
      });
    } else {
      console.log('No recovery assessments found for today');
    }

    // Also check all entries for user 151
    const allQuery = `SELECT date, sleep_quality, muscle_soreness, motivation, recovery_score FROM recovery_assessments WHERE user_id = 151 ORDER BY date DESC LIMIT 5`;
    const { stdout: allStdout } = await execPromise(`sqlite3 "${dbPath}" "${allQuery}"`);

    const allLines = allStdout.trim().split('\n').filter(line => line.length > 0);
    if (allLines.length > 0) {
      console.log('\nRecent recovery assessments for user 151:');
      allLines.forEach((line, index) => {
        console.log(`  ${index + 1}: ${line}`);
      });
    }

    return { entries: lines.length, records: lines };

  } catch (error) {
    console.error('Database check error:', error.message);
    return { entries: 0, error: error.message };
  }
}

async function main() {
  const testResults = await testRecoveryPersistence();
  const dbResults = await checkDatabase();

  testResults.databaseEntries = dbResults.entries;

  console.log('\n=== Test Results Summary ===\n');
  console.log(`Recovery form visible: ${testResults.formVisible}`);
  console.log(`Submission works: ${testResults.submissionWorks}`);
  console.log(`Logged state appears: ${testResults.loggedStateAppears}`);
  console.log(`Logged state persists: ${testResults.loggedStatePersists}`);
  console.log(`Database entries for today: ${testResults.databaseEntries}`);

  if (testResults.errors.length > 0) {
    console.log('\nErrors encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
