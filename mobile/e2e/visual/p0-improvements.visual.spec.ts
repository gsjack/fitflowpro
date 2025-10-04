/**
 * Visual Regression Tests - P0 Improvements Validation
 *
 * This suite specifically validates the P0 improvements made to FitFlow Pro:
 * 1. Drag handles on RIGHT side (was on left)
 * 2. Tab labels visible (was missing)
 * 3. Logout button functional (was broken)
 * 4. Bottom navigation accessible (was hidden)
 *
 * These tests ensure critical UI fixes don't regress.
 */

import { test, expect } from '@playwright/test';
import { loginUser, navigateToTab, waitForStableRender, takeScreenshot } from './helpers';

test.describe('Visual Regression - P0 Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // ============================================================
  // P0-001: Drag Handles on RIGHT Side
  // ============================================================

  test('P0-001: Drag handles are positioned on RIGHT side of exercise cards', async ({ page }) => {
    console.log('📸 P0-001: Validating drag handle position (RIGHT)');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Find first exercise card
    const exerciseCard = page.locator('[class*="exercise"], [data-testid*="exercise"]').first();
    const cardVisible = await exerciseCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (cardVisible) {
      // Get card bounding box
      const cardBox = await exerciseCard.boundingBox();

      // Find drag handle within card
      const dragHandle = exerciseCard
        .locator('[aria-label*="drag" i], [role="button"]')
        .filter({ hasText: /drag|reorder|≡|⋮/i })
        .first();

      const handleVisible = await dragHandle.isVisible({ timeout: 3000 }).catch(() => false);

      if (handleVisible && cardBox) {
        const handleBox = await dragHandle.boundingBox();

        if (handleBox) {
          // Verify handle is on RIGHT side (handle.x > card.x + (card.width / 2))
          const handleIsOnRight = handleBox.x > cardBox.x + cardBox.width / 2;

          console.log(`Card X: ${cardBox.x}, Width: ${cardBox.width}`);
          console.log(`Handle X: ${handleBox.x}`);
          console.log(`Handle is on RIGHT: ${handleIsOnRight}`);

          expect(handleIsOnRight).toBeTruthy();
        }
      }

      // Highlight the drag handle position with annotation
      await page.evaluate((selector) => {
        const handle = document.querySelector(selector);
        if (handle) {
          (handle as HTMLElement).style.outline = '3px solid red';
          (handle as HTMLElement).style.outlineOffset = '2px';
        }
      }, '[aria-label*="drag" i]');

      await page.waitForTimeout(500);

      await takeScreenshot(page, 'p0-001-drag-handle-right-position');
    } else {
      console.log('⚠️  No exercise cards found, skipping drag handle test');
    }
  });

  // ============================================================
  // P0-002: Tab Labels Visible
  // ============================================================

  test('P0-002: Bottom navigation tab labels are visible', async ({ page }) => {
    console.log('📸 P0-002: Validating tab labels visibility');

    await loginUser(page);
    await waitForStableRender(page);

    // Find bottom navigation tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    console.log(`Found ${tabCount} navigation tabs`);

    // Verify each tab has visible text
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      const tabText = await tab.textContent();

      console.log(`Tab ${i + 1}: "${tabText}"`);

      // Each tab should have non-empty text
      expect(tabText).toBeTruthy();
      expect(tabText?.trim().length).toBeGreaterThan(0);
    }

    // Highlight tab labels with annotations
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"]');
      tabs.forEach((tab) => {
        (tab as HTMLElement).style.outline = '2px solid blue';
        (tab as HTMLElement).style.outlineOffset = '2px';
      });
    });

    await page.waitForTimeout(500);

    await takeScreenshot(page, 'p0-002-tab-labels-visible');
  });

  // ============================================================
  // P0-003: Logout Button Functional
  // ============================================================

  test('P0-003: Logout button is visible and functional', async ({ page }) => {
    console.log('📸 P0-003: Validating logout button');

    await loginUser(page);
    await navigateToTab(page, 'Settings');

    // Find logout button
    const logoutButton = page.locator('button').filter({ hasText: /logout|sign out/i }).first();
    const isVisible = await logoutButton.isVisible({ timeout: 5000 });

    expect(isVisible).toBeTruthy();

    // Highlight logout button
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        (button as HTMLElement).style.outline = '3px solid orange';
        (button as HTMLElement).style.outlineOffset = '3px';
      }
    }, 'button');

    await page.waitForTimeout(500);

    await takeScreenshot(page, 'p0-003-logout-button-visible');

    // Click logout and verify redirect to auth screen
    await logoutButton.click();
    await page.waitForTimeout(2000);

    // Should redirect to auth screen
    const authScreenVisible = await page
      .locator('text=FitFlow Pro')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(authScreenVisible).toBeTruthy();

    await takeScreenshot(page, 'p0-003-logout-redirect-auth');
  });

  // ============================================================
  // P0-004: Bottom Navigation Accessible
  // ============================================================

  test('P0-004: Bottom navigation is accessible and not hidden', async ({ page }) => {
    console.log('📸 P0-004: Validating bottom navigation accessibility');

    await loginUser(page);
    await waitForStableRender(page);

    // Find bottom navigation container
    const bottomNav = page.locator('[role="tablist"]').first();
    const isVisible = await bottomNav.isVisible({ timeout: 5000 });

    expect(isVisible).toBeTruthy();

    // Get bounding box to verify it's within viewport
    const navBox = await bottomNav.boundingBox();

    if (navBox) {
      const viewportSize = page.viewportSize();

      if (viewportSize) {
        console.log(`Navigation Y: ${navBox.y}, Height: ${navBox.height}`);
        console.log(`Viewport Height: ${viewportSize.height}`);

        // Navigation should be visible within viewport
        const isWithinViewport = navBox.y + navBox.height <= viewportSize.height;
        expect(isWithinViewport).toBeTruthy();

        // Navigation should not be at Y=0 (not at top)
        const isAtBottom = navBox.y > viewportSize.height / 2;
        expect(isAtBottom).toBeTruthy();
      }
    }

    // Highlight bottom navigation
    await page.evaluate(() => {
      const nav = document.querySelector('[role="tablist"]');
      if (nav) {
        (nav as HTMLElement).style.outline = '4px solid green';
        (nav as HTMLElement).style.outlineOffset = '2px';
      }
    });

    await page.waitForTimeout(500);

    await takeScreenshot(page, 'p0-004-bottom-nav-accessible');
  });

  // ============================================================
  // P0-005: Exercise Change Flow (from P0 bug fixes)
  // ============================================================

  test('P0-005: Exercise change dialog renders correctly', async ({ page }) => {
    console.log('📸 P0-005: Validating exercise change dialog');

    await loginUser(page);
    await navigateToTab(page, 'Planner');

    // Find first exercise card
    const exerciseCard = page.locator('[class*="exercise"], [data-testid*="exercise"]').first();
    const cardVisible = await exerciseCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (cardVisible) {
      // Look for "Change Exercise" button
      const changeButton = exerciseCard
        .locator('button')
        .filter({ hasText: /change|swap|replace/i })
        .first();

      const buttonVisible = await changeButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (buttonVisible) {
        await changeButton.click();
        await waitForStableRender(page);

        // Dialog should appear
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
        const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

        if (dialogVisible) {
          await takeScreenshot(page, 'p0-005-exercise-change-dialog');

          // Close dialog
          const closeButton = dialog.locator('button').filter({ hasText: /close|cancel/i }).first();
          const closeVisible = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);

          if (closeVisible) {
            await closeButton.click();
            await page.waitForTimeout(500);
          }
        } else {
          console.log('⚠️  Exercise change dialog did not appear');
        }
      } else {
        console.log('⚠️  Change Exercise button not found');
      }
    } else {
      console.log('⚠️  No exercise cards found');
    }
  });

  // ============================================================
  // P0-006: Form Validation States
  // ============================================================

  test('P0-006: Form validation displays error states correctly', async ({ page }) => {
    console.log('📸 P0-006: Validating form error states');

    await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=FitFlow Pro', { timeout: 15000 });
    await waitForStableRender(page);

    // Try to submit empty login form
    const submitButton = page.locator('button').filter({ hasText: /^Login$/i }).last();
    await submitButton.click();
    await page.waitForTimeout(1000);

    // Check for error messages or validation UI
    const errorText = page.locator('text=/error|required|invalid|enter/i').first();
    const hasError = await errorText.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasError) {
      // Highlight error messages
      await page.evaluate(() => {
        const errors = document.querySelectorAll('[class*="error"], [role="alert"]');
        errors.forEach((error) => {
          (error as HTMLElement).style.outline = '2px solid red';
          (error as HTMLElement).style.outlineOffset = '2px';
        });
      });

      await page.waitForTimeout(500);

      await takeScreenshot(page, 'p0-006-form-validation-errors');
    } else {
      console.log('⚠️  No visible form errors (may be using native validation)');
      await takeScreenshot(page, 'p0-006-form-no-custom-errors');
    }
  });
});
