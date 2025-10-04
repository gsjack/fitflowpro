# Visual Regression Testing - Quick Start Guide

Get up and running with visual regression tests in 5 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Mobile dependencies installed (`cd mobile && npm install`)
- [ ] Playwright browsers installed (`cd mobile && npx playwright install chromium`)

## Step 1: Start Servers (2 terminals)

### Terminal 1 - Backend Server
```bash
cd /home/asigator/fitness2025/backend
npm run dev

# Wait for: "Server listening at http://0.0.0.0:3000"
```

### Terminal 2 - Mobile Web Server
```bash
cd /home/asigator/fitness2025/mobile
npm run dev

# Wait for: "Metro waiting on exp://..."
# Then visit: http://localhost:8081
```

## Step 2: Verify Servers

```bash
# Backend health check
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Mobile web check
curl -I http://localhost:8081
# Expected: HTTP/1.1 200 OK
```

## Step 3: Generate Baseline Screenshots

```bash
cd /home/asigator/fitness2025/mobile

# First run - creates baseline screenshots
npm run test:visual:update
```

**Expected Output**:
```
Running 15 tests using 1 worker
  ✅ Auth Screen - Login Tab
  ✅ Auth Screen - Register Tab
  ✅ Dashboard Screen - Default State
  ... (all tests pass)

  15 passed (2m)
```

**Baseline screenshots saved to**:
```
mobile/e2e/visual/screens.visual.spec.ts-snapshots/chromium/
├── auth-login-tab.png
├── auth-register-tab.png
├── dashboard-default-state.png
├── planner-drag-handles-right.png
└── ... (15 total screenshots)
```

## Step 4: Run Visual Regression Tests

```bash
# Compare against baselines (should pass on first run)
npm run test:visual
```

**Expected Output**:
```
Running 15 tests using 1 worker
  ✅ Auth Screen - Login Tab (screenshot matches)
  ✅ Auth Screen - Register Tab (screenshot matches)
  ✅ Dashboard Screen - Default State (screenshot matches)
  ... (all tests pass)

  15 passed (2m)
```

## Step 5: Verify P0 Improvements

The tests validate critical P0 fixes:

```bash
# Run P0-specific tests
npm run test:visual -- p0-improvements.visual.spec.ts
```

**P0 Validations**:
- ✅ Drag handles on RIGHT side (not left)
- ✅ Tab labels visible (not hidden)
- ✅ Logout button functional (redirects to auth)
- ✅ Bottom navigation accessible (not hidden)
- ✅ Exercise change dialog renders correctly
- ✅ Form validation shows errors

## Step 6: View Test Report

```bash
# Open HTML report in browser
npm run test:visual:report
```

**Report shows**:
- Test execution timeline
- Screenshot comparisons
- Pass/fail status
- Execution time per test
- Network activity

## Testing Visual Regressions

### Simulate a Visual Regression

1. **Make a UI change** (e.g., move drag handles to left):
   ```typescript
   // In mobile/src/components/planner/ExerciseCard.tsx
   // Change: flexDirection: 'row'
   // To: flexDirection: 'row-reverse'
   ```

2. **Run tests** (should fail):
   ```bash
   npm run test:visual
   ```

3. **Review diff images**:
   ```bash
   open mobile/test-results/*/planner-drag-handles-right-diff.png
   ```

4. **Revert change** and tests pass again

### Update Baselines (Intentional Changes)

When you make intentional UI changes:

```bash
# 1. Review current diff
npm run test:visual

# 2. If changes are intentional, update baselines
npm run test:visual:update

# 3. Verify new baselines
npm run test:visual

# 4. Commit new baselines
git add e2e/visual/screens.visual.spec.ts-snapshots/
git commit -m "Update visual regression baselines for [feature]"
```

## Common Commands

```bash
# Run all visual tests
npm run test:visual

# Update all baselines
npm run test:visual:update

# Run tests with UI (interactive debugging)
npm run test:visual:ui

# View last test report
npm run test:visual:report

# Run specific test file
npm run test:visual -- screens.visual.spec.ts

# Run specific test by name
npm run test:visual -- -g "Planner Screen"
```

## Troubleshooting

### Issue: "Baseline not found"
**Solution**: Generate baselines first
```bash
npm run test:visual:update
```

### Issue: "Timeout waiting for selector"
**Solution**: Verify servers are running
```bash
# Check backend
curl http://localhost:3000/health

# Check mobile
curl http://localhost:8081
```

### Issue: "Screenshot comparison failed"
**Solution**: Review diff images
```bash
# View diff
open mobile/test-results/*/auth-login-tab-diff.png

# If intentional change, update baseline
npm run test:visual:update
```

### Issue: "Port already in use"
**Solution**: Kill existing processes
```bash
# Kill backend
lsof -ti:3000 | xargs kill -9

# Kill mobile
lsof -ti:8081 | xargs kill -9
```

### Issue: "Login failed"
**Solution**: Check backend logs
```bash
# Backend should show:
# POST /api/auth/register 201
# or
# POST /api/auth/login 200
```

## Debug Mode

Use UI mode for interactive debugging:

```bash
npm run test:visual:ui
```

**Features**:
- ⏯️ Step through tests
- 🔍 Inspect DOM at any point
- 🌐 View network requests
- 📋 See console logs
- 🖼️ Compare screenshots side-by-side
- ⏱️ Time travel through test execution

## CI/CD Integration

### Local Pre-Push Check

Before pushing code:

```bash
# Run visual regression tests
npm run test:visual

# All tests should pass ✅
```

### GitHub Actions

Visual regression tests run automatically on:
- Pull requests to `main`/`develop`
- Pushes to `main`/`develop`

**Workflow**: `.github/workflows/visual-regression.yml`

**On PR failure**:
1. Download artifacts from failed CI run
2. Review `visual-diff-screenshots`
3. Either fix regression or update baselines
4. Push changes and re-run CI

## Next Steps

- 📖 Read full [README.md](./README.md) for detailed documentation
- 🧪 Add new visual tests for your features
- 🔄 Integrate into your development workflow
- 🤖 Monitor CI/CD visual regression checks

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run test:visual` | Run visual regression tests |
| `npm run test:visual:update` | Update baseline screenshots |
| `npm run test:visual:ui` | Interactive debug mode |
| `npm run test:visual:report` | View HTML test report |
| `npm run test:visual -- screens.visual.spec.ts` | Run specific test file |
| `npm run test:visual -- -g "Planner"` | Run tests matching pattern |

## Support

- 📚 [Playwright Docs](https://playwright.dev/docs/test-snapshots)
- 📄 [Visual Testing README](./README.md)
- 🔧 [FitFlow Pro Testing Guide](/specs/001-specify-build-fitflow/quickstart.md)
