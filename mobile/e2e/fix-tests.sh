#!/bin/bash

# Script to fix common Expo Router v6 selector patterns in E2E tests

echo "Fixing E2E tests for Expo Router v6..."

# Files to fix
FILES=(
  "e2e/auth-flow.spec.ts"
  "e2e/cross-platform.spec.ts"
  "e2e/workout-logging.spec.ts"
)

for file in "${FILES[@]}"; do
  echo "Processing $file..."

  # Fix: await page.goto(APP_URL) → await navigateToLogin(page)
  # (only when followed by login-related actions)

  # Fix: await page.goto(`${APP_URL}/(auth)/login`) → await navigateToLogin(page)
  sed -i "s|await page.goto(\`\${APP_URL}/(auth)/login\`);|await navigateToLogin(page);|g" "$file"
  sed -i "s|await page.goto(APP_URL);.*waitForLoadState|await navigateToLogin(page); // Fixed: direct navigation|g" "$file"

  # Fix: await page.goto(`${APP_URL}/(auth)/register`) → await navigateToRegister(page)
  sed -i "s|await page.goto(\`\${APP_URL}/(auth)/register\`);|await navigateToRegister(page);|g" "$file"

  # Fix: await page.click('text=Register') → await clickRegisterLink(page)
  sed -i "s|await page.click('text=Register');|await clickRegisterLink(page); // Fixed: Expo Router link|g" "$file"

  # Fix: await page.click('text=Login') → await clickLoginLink(page) (but NOT button)
  # This is tricky - only replace if it's for navigation, not form submission

  # Fix: await page.screenshot({path: '/tmp/screenshots/...', fullPage: true}) → await takeScreenshot(page, '...')
  # Extract filename from path and use helper

  # Fix: const token = await page.evaluate(() => localStorage.getItem('@fitflow/auth_token')) → const token = await getStoredToken(page)
  sed -i "s|await page.evaluate(() => localStorage.getItem('@fitflow/auth_token'))|await getStoredToken(page)|g" "$file"

  # Fix: await page.waitForURL(/.*\\(tabs\\).*/, {timeout: 10000}) → await verifyOnDashboard(page)
  # (only when followed by dashboard verification)

  echo "  ✓ Fixed common patterns in $file"
done

echo "✅ All files processed!"
echo ""
echo "Note: Some manual fixes may still be needed for complex patterns."
echo "Run tests to verify: npx playwright test e2e/auth-flow.spec.ts --reporter=line"
