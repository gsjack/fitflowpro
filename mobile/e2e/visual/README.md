# Visual Regression Testing - FitFlow Pro

Automated visual regression testing using Playwright screenshot comparison to detect unintended UI changes.

## Overview

This test suite captures baseline screenshots of all screens and UI states, then compares them against future runs to detect visual regressions. It's designed to prevent P0/P1 issues from recurring, such as:

- ❌ Drag handles moving from right to left
- ❌ Tab labels disappearing
- ❌ Buttons becoming non-functional
- ❌ Layout shifts and styling breaks

## Test Coverage

### 1. Auth Screen Tests
- Login tab view
- Register tab view
- Form validation states (empty, invalid email)
- Error message display

### 2. Dashboard Screen Tests
- Default state with workout cards
- Recovery assessment visible/hidden states
- Empty state (no workouts)

### 3. Analytics Screen Tests
- Charts view with data
- Volume analytics section
- Empty state (no data)

### 4. Planner Screen Tests
- **P0 Critical**: Exercise list with drag handles on RIGHT
- Volume warning badges visible
- Scrolled view (multiple exercises)
- Empty state (no exercises)

### 5. Settings Screen Tests
- Main view with all options
- Scrolled view

### 6. Workout Screen Tests
- Set logging interface (if accessible)

### 7. P0 Improvement Validation
- `p0-improvements.visual.spec.ts` specifically validates:
  - Drag handles positioned on RIGHT side ✅
  - Tab labels visible ✅
  - Logout button functional ✅
  - Bottom navigation accessible ✅
  - Exercise change dialog renders ✅
  - Form validation error states ✅

## File Structure

```
mobile/e2e/visual/
├── README.md                              # This file
├── helpers.ts                             # Test utilities (login, navigation, etc.)
├── screens.visual.spec.ts                 # Main screen tests
├── p0-improvements.visual.spec.ts         # P0 improvement validation
└── screens.visual.spec.ts-snapshots/      # Baseline screenshots (auto-generated)
    ├── chromium/
    │   ├── auth-login-tab.png
    │   ├── dashboard-default-state.png
    │   ├── planner-drag-handles-right.png
    │   └── ... (all baseline screenshots)
```

## Running Tests

### Prerequisites

1. **Backend server must be running**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Expo web server must be running**:
   ```bash
   cd mobile
   npm run dev
   # Or: npx expo start --web
   ```

3. **Verify servers are accessible**:
   ```bash
   # Backend health check
   curl http://localhost:3000/health

   # Expo web check
   curl http://localhost:8081
   ```

### Test Commands

```bash
# Run visual regression tests (compare against baseline)
npm run test:visual

# Update baseline screenshots (after intentional UI changes)
npm run test:visual:update

# Run tests with interactive UI (debug mode)
npm run test:visual:ui

# View last test report
npm run test:visual:report
```

### First Time Setup

1. Start backend and mobile servers (see Prerequisites)

2. Generate baseline screenshots:
   ```bash
   npm run test:visual:update
   ```

3. Verify baselines were created:
   ```bash
   ls -la e2e/visual/screens.visual.spec.ts-snapshots/chromium/
   ```

4. Run tests to verify:
   ```bash
   npm run test:visual
   ```

## How It Works

### Screenshot Comparison

Playwright's `toHaveScreenshot()` assertion:
1. Captures current screenshot
2. Compares against baseline (pixel-by-pixel)
3. Fails if diff exceeds threshold:
   - **maxDiffPixels**: 100 pixels (minor rendering differences)
   - **threshold**: 0.2 (20% color difference tolerance)

### Tolerances

The test config (`playwright.visual.config.ts`) allows minor differences:
- Anti-aliasing variations
- Font rendering differences
- Subtle color shifts (< 20%)

### Test Stability

Tests use `waitForStableRender()` helper to ensure:
- Network is idle
- Animations complete
- State updates finish
- No pending layout shifts

## Updating Baselines

### When to Update

✅ **Update baselines when**:
- Intentional UI design changes
- New features added
- Layout improvements
- Color scheme updates

❌ **DON'T update baselines for**:
- Unintentional visual regressions
- Broken layouts
- Missing elements
- Positioning bugs

### How to Update

```bash
# Review current diff first
npm run test:visual

# If changes are intentional, update baselines
npm run test:visual:update

# Verify new baselines
npm run test:visual
```

### Reviewing Changes

When tests fail, review the diff images:

```bash
# Diff images are saved to:
mobile/test-results/
├── screens-visual-spec-ts-auth-screen-login-tab-chromium/
│   ├── auth-login-tab-actual.png       # Current screenshot
│   ├── auth-login-tab-expected.png     # Baseline
│   └── auth-login-tab-diff.png         # Visual diff (red = changes)
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/visual-regression.yml` workflow:

1. **Triggers on**:
   - Pull requests to `main`/`develop`
   - Pushes to `main`/`develop`
   - Manual trigger (`workflow_dispatch`)

2. **Test Execution**:
   - Starts backend server
   - Starts Expo web server
   - Runs visual regression tests

3. **On Failure**:
   - Uploads visual diff screenshots
   - Comments on PR with failure notice
   - Provides link to artifacts

4. **On Success**:
   - Uploads test report
   - Updates baseline snapshots (on main branch)

### Viewing CI Results

1. Go to PR checks
2. Find "Visual Regression Tests" workflow
3. Download artifacts:
   - `visual-regression-report` - HTML test report
   - `visual-diff-screenshots` - Diff images (if failed)
   - `baseline-snapshots` - Current baselines

## Debugging Failed Tests

### Common Failures

**1. "Screenshot comparison failed"**
- **Cause**: Visual regression detected
- **Fix**: Review diff images, update baselines if intentional

**2. "Timeout waiting for selector"**
- **Cause**: Element not rendered in time
- **Fix**: Check if feature was removed/changed

**3. "Network not idle"**
- **Cause**: Backend requests still pending
- **Fix**: Verify backend is running and responsive

**4. "Login failed"**
- **Cause**: Auth system broken or test user exists
- **Fix**: Check backend logs, verify registration works

### Debug Mode

Run tests with UI mode for interactive debugging:

```bash
npm run test:visual:ui
```

Features:
- Step through tests
- Inspect DOM at any point
- View network requests
- See console logs
- Compare screenshots side-by-side

### Verbose Logging

Add debug logging to helpers:

```typescript
// In helpers.ts
export async function loginUser(page: Page): Promise<void> {
  console.log('[DEBUG] Starting login...');
  console.log('[DEBUG] Current URL:', page.url());
  console.log('[DEBUG] Viewport:', page.viewportSize());
  // ... rest of login logic
}
```

## Best Practices

### 1. Keep Tests Stable
- Use `waitForStableRender()` before screenshots
- Disable animations (`animations: 'disabled'`)
- Use consistent viewport size (1280x720)
- Mask dynamic content (timestamps, user IDs)

### 2. Meaningful Baselines
- Name screenshots clearly: `screen-state-detail.png`
- Document what each test validates
- Group related tests in describe blocks

### 3. Update Strategy
- Review all diffs before updating baselines
- Update per-screen, not all at once
- Commit baselines with feature changes

### 4. CI/CD
- Run visual tests on every PR
- Block merges on visual regression failures
- Auto-update baselines on main branch (optional)

## Test Helpers Reference

### `loginUser(page: Page)`
Logs in test user (registers if needed)

### `navigateToTab(page: Page, tabName: string)`
Navigates to specific bottom nav tab

### `waitForStableRender(page: Page)`
Waits for animations and network to stabilize

### `takeScreenshot(page: Page, name: string, options?)`
Captures and compares screenshot against baseline

### `scrollAndWait(page: Page, yOffset: number)`
Scrolls page and waits for render

### `goToHome(page: Page)`
Navigates to Dashboard/Home screen

## Maintenance

### Weekly
- Review failed tests in CI
- Update baselines for approved changes
- Check for flaky tests

### Monthly
- Clean up old baseline snapshots
- Verify test coverage still matches features
- Update test helpers for new UI patterns

### On Feature Changes
- Add new visual tests for new screens
- Update affected baselines
- Document visual behavior

## Performance

### Test Execution Time
- **Single test**: ~3-5 seconds
- **Full suite**: ~2-3 minutes (15 tests)
- **CI execution**: ~5-7 minutes (includes setup)

### Optimization Tips
- Run tests sequentially (already configured)
- Use single browser (Chromium only)
- Reuse login session where possible
- Skip redundant navigation

## Troubleshooting

### "Baseline not found"
```bash
# Generate baselines first
npm run test:visual:update
```

### "Port 8081 already in use"
```bash
# Kill existing Expo process
lsof -ti:8081 | xargs kill -9
npx expo start --web
```

### "Backend not responding"
```bash
# Restart backend
cd backend
npm run dev
curl http://localhost:3000/health
```

### "Screenshots differ significantly"
```bash
# Compare visually
open test-results/*/auth-login-tab-diff.png

# If intentional, update baseline
npm run test:visual:update
```

## Contributing

When adding new visual tests:

1. **Create test in appropriate file**:
   - General screens → `screens.visual.spec.ts`
   - P0/P1 validation → `p0-improvements.visual.spec.ts`

2. **Use helpers for common tasks**:
   ```typescript
   import { loginUser, navigateToTab, takeScreenshot } from './helpers';
   ```

3. **Follow naming convention**:
   ```typescript
   await takeScreenshot(page, 'screen-state-detail');
   // Generates: screen-state-detail.png
   ```

4. **Document what the test validates**:
   ```typescript
   test('P0-007: New feature renders correctly', async ({ page }) => {
     console.log('📸 P0-007: Validating new feature');
     // ... test implementation
   });
   ```

5. **Update this README** with new test coverage

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [FitFlow Pro Testing Strategy](/specs/001-specify-build-fitflow/quickstart.md)
- [P0/P1 Improvement Tracker](/specs/002-p0-p1-improvements/README.md)
