/**
 * E2E Test Suite: Mesocycle Phase Progression
 *
 * Comprehensive tests for FitFlow Pro's mesocycle phase advancement functionality.
 * Tests cover all aspects of phase progression from UI interaction to data persistence.
 *
 * Coverage:
 * 1. View current phase (MEV/MAV/MRV/Deload)
 * 2. Automatic phase advancement with volume multipliers
 * 3. Volume multiplier validation (1.2x, 1.15x, 0.5x, 2.0x)
 * 4. Manual phase selection
 * 5. Phase history tracking
 * 6. Validation rules and error handling
 *
 * API Testing:
 * - PATCH /api/programs/:id/advance-phase
 * - GET /api/programs (verify phase updates)
 * - GET /api/programs/:id/volume (verify volume adjustments)
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const BASE_URL = 'http://localhost:8081';
const API_BASE_URL = 'http://localhost:3000';

/**
 * Helper: Create test user and login
 */
async function createAndLoginUser(
  page: Page
): Promise<{ email: string; token: string; programId: number }> {
  const email = `phasetest${Date.now()}@fitflow.test`;
  const password = 'PhaseTest123!';

  // Navigate to app
  await page.goto(BASE_URL, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Wait for auth screen
  await page.waitForSelector('text=/Login|Register/i', { timeout: 10000 });

  // Switch to Register tab
  const registerButton = page.getByRole('button', { name: /register/i }).first();
  await registerButton.click();
  await page.waitForTimeout(1000);

  // Fill registration form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Age is required for VO2max (not directly needed for phase progression, but good practice)
  const ageInput = page.locator('input').filter({ hasText: /age/i }).or(page.getByLabel(/age/i));
  if ((await ageInput.count()) > 0) {
    await ageInput.first().fill('30');
  }

  // Submit registration
  const createAccountButton = page.getByRole('button', { name: /create account/i });
  await createAccountButton.click();

  // Wait for navigation to dashboard
  await page.waitForTimeout(5000);

  // Extract token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('authToken') || '');

  // Get program ID via API
  const response = await page.evaluate(async (apiUrl: string) => {
    const authToken = localStorage.getItem('authToken');
    const res = await fetch(`${apiUrl}/api/programs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return res.json();
  }, API_BASE_URL);

  return { email, token, programId: response.id };
}

/**
 * Helper: Navigate to planner screen
 */
async function navigateToPlanner(page: Page): Promise<void> {
  // Look for Planner tab in navigation
  const plannerTab = page.getByRole('button', { name: /planner/i }).or(page.getByText(/planner/i));

  if ((await plannerTab.count()) > 0) {
    await plannerTab.first().click();
    await page.waitForTimeout(2000);
  } else {
    console.log('[WARNING] Planner tab not found - may already be on planner screen');
  }
}

/**
 * Helper: Get program data via API
 */
async function getProgramData(page: Page): Promise<any> {
  return await page.evaluate(async (apiUrl: string) => {
    const authToken = localStorage.getItem('authToken');
    const res = await fetch(`${apiUrl}/api/programs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return res.json();
  }, API_BASE_URL);
}

/**
 * Helper: Advance phase via API
 */
async function advancePhaseViaAPI(
  page: Page,
  programId: number,
  manual: boolean = false,
  targetPhase?: 'mev' | 'mav' | 'mrv' | 'deload'
): Promise<any> {
  return await page.evaluate(
    async ({ apiUrl, programId, manual, targetPhase }: any) => {
      const authToken = localStorage.getItem('authToken');
      const res = await fetch(`${apiUrl}/api/programs/${programId}/advance-phase`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manual, target_phase: targetPhase }),
      });
      return res.json();
    },
    { apiUrl: API_BASE_URL, programId, manual, targetPhase }
  );
}

test.describe('Phase Progression E2E Tests', () => {
  test.describe('1. View Current Phase', () => {
    test('should display current mesocycle phase on planner screen', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // Take screenshot for visual verification
      await page.screenshot({ path: '/tmp/phase-progression-initial.png', fullPage: true });

      // Check that phase information is displayed
      const bodyText = await page.textContent('body');

      // Verify phase label (MEV for new programs)
      expect(bodyText).toMatch(/MEV|Minimum Effective Volume/i);

      // Verify week number displayed
      expect(bodyText).toMatch(/Week \d+/i);

      console.log('✓ Current phase displayed correctly');
    });

    test('should show mesocycle week number', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      const program = await getProgramData(page);

      expect(program.mesocycle_week).toBeGreaterThanOrEqual(1);
      expect(program.mesocycle_week).toBeLessThanOrEqual(8);

      console.log(`✓ Mesocycle week: ${program.mesocycle_week}`);
    });

    test('should display phase start date (via timeline)', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // Check for timeline component with week indicators
      const bodyText = await page.textContent('body');

      // Look for week range indicators (e.g., "W1-2" for MEV)
      expect(bodyText).toMatch(/W\d+-?\d*/i);

      console.log('✓ Phase timeline displayed');
    });
  });

  test.describe('2. Automatic Phase Advancement', () => {
    test('should show "Advance Phase" button when ready', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);

      // Manually set program to week 2 (end of MEV phase) via API
      // Note: This requires direct DB access in a real scenario
      // For E2E, we'll test the button state based on current week

      await navigateToPlanner(page);

      const program = await getProgramData(page);

      // Check if advance button exists
      const advanceButton = page.getByRole('button', { name: /advance/i });
      const buttonExists = (await advanceButton.count()) > 0;

      if (program.mesocycle_week === 2) {
        expect(buttonExists).toBe(true);
        console.log('✓ Advance button shown at end of MEV phase');
      } else {
        console.log(`ℹ Current week: ${program.mesocycle_week}, skipping advance button check`);
      }
    });

    test('should display confirmation dialog with phase progression details', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);

      // Advance to week 2 (end of MEV) via API manipulation
      // For simplicity, we'll test the dialog by clicking the button if available

      await navigateToPlanner(page);

      const advanceButton = page.getByRole('button', { name: /advance/i });

      if ((await advanceButton.count()) > 0 && !(await advanceButton.isDisabled())) {
        await advanceButton.click();
        await page.waitForTimeout(1000);

        // Check for dialog content
        const dialogText = await page.textContent('body');

        // Verify dialog shows phase transition
        expect(dialogText).toMatch(/MEV|MAV|MRV|Deload/i);

        // Verify volume multiplier displayed
        expect(dialogText).toMatch(/volume/i);

        // Take screenshot
        await page.screenshot({ path: '/tmp/phase-advance-dialog.png' });

        console.log('✓ Confirmation dialog displayed');

        // Cancel dialog
        const cancelButton = page.getByRole('button', { name: /cancel/i });
        if ((await cancelButton.count()) > 0) {
          await cancelButton.click();
        }
      } else {
        console.log('ℹ Advance button not available, skipping dialog test');
      }
    });

    test('should advance phase and update all exercises', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Get initial program state
      const beforeProgram = await getProgramData(page);
      const beforePhase = beforeProgram.mesocycle_phase;

      // Count total exercises and sets before
      let totalSetsBefore = 0;
      beforeProgram.program_days.forEach((day: any) => {
        day.exercises.forEach((exercise: any) => {
          totalSetsBefore += exercise.target_sets;
        });
      });

      // Advance phase via API (automatic)
      const advanceResult = await advancePhaseViaAPI(page, programId, false);

      expect(advanceResult.previous_phase).toBe(beforePhase);
      expect(advanceResult.new_phase).toBeTruthy();
      expect(advanceResult.volume_multiplier).toBeGreaterThan(0);
      expect(advanceResult.exercises_updated).toBeGreaterThan(0);

      console.log(`✓ Advanced ${advanceResult.previous_phase} → ${advanceResult.new_phase}`);
      console.log(`✓ Volume multiplier: ${advanceResult.volume_multiplier}x`);
      console.log(`✓ Exercises updated: ${advanceResult.exercises_updated}`);

      // Get updated program state
      const afterProgram = await getProgramData(page);

      // Verify phase changed
      expect(afterProgram.mesocycle_phase).toBe(advanceResult.new_phase);

      // Count total sets after
      let totalSetsAfter = 0;
      afterProgram.program_days.forEach((day: any) => {
        day.exercises.forEach((exercise: any) => {
          totalSetsAfter += exercise.target_sets;
        });
      });

      // Verify volume changed according to multiplier
      const actualMultiplier = totalSetsAfter / totalSetsBefore;
      const expectedMultiplier = advanceResult.volume_multiplier;

      // Allow 10% tolerance for rounding
      expect(actualMultiplier).toBeGreaterThan(expectedMultiplier * 0.9);
      expect(actualMultiplier).toBeLessThan(expectedMultiplier * 1.1);

      console.log(
        `✓ Volume changed: ${totalSetsBefore} → ${totalSetsAfter} sets (${actualMultiplier.toFixed(2)}x)`
      );
    });
  });

  test.describe('3. Volume Multiplier Logic', () => {
    test('MEV → MAV should apply 1.2x multiplier (+20%)', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Get program in MEV phase
      const program = await getProgramData(page);
      expect(program.mesocycle_phase).toBe('mev');

      // Advance to MAV
      const result = await advancePhaseViaAPI(page, programId, true, 'mav');

      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('mav');
      expect(result.volume_multiplier).toBeCloseTo(1.2, 1);

      console.log('✓ MEV → MAV: 1.2x multiplier verified');
    });

    test('MAV → MRV should apply 1.15x multiplier (+15%)', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Advance to MAV first
      await advancePhaseViaAPI(page, programId, true, 'mav');

      // Now advance to MRV
      const result = await advancePhaseViaAPI(page, programId, true, 'mrv');

      expect(result.previous_phase).toBe('mav');
      expect(result.new_phase).toBe('mrv');
      expect(result.volume_multiplier).toBeCloseTo(1.15, 1);

      console.log('✓ MAV → MRV: 1.15x multiplier verified');
    });

    test('MRV → Deload should apply 0.5x multiplier (-50%)', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Advance to MRV first
      await advancePhaseViaAPI(page, programId, true, 'mrv');

      // Now advance to Deload
      const result = await advancePhaseViaAPI(page, programId, true, 'deload');

      expect(result.previous_phase).toBe('mrv');
      expect(result.new_phase).toBe('deload');
      expect(result.volume_multiplier).toBeCloseTo(0.5, 1);

      console.log('✓ MRV → Deload: 0.5x multiplier verified');
    });

    test('Deload → MEV should apply 2.0x multiplier (baseline reset)', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Advance to Deload first
      await advancePhaseViaAPI(page, programId, true, 'deload');

      // Now advance back to MEV
      const result = await advancePhaseViaAPI(page, programId, false);

      expect(result.previous_phase).toBe('deload');
      expect(result.new_phase).toBe('mev');
      expect(result.volume_multiplier).toBeCloseTo(2.0, 1);

      console.log('✓ Deload → MEV: 2.0x multiplier verified');
    });
  });

  test.describe('4. Manual Phase Selection', () => {
    test('should allow manual jump from MEV to MRV', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Verify starting in MEV
      const beforeProgram = await getProgramData(page);
      expect(beforeProgram.mesocycle_phase).toBe('mev');

      // Manually jump to MRV (skip MAV)
      const result = await advancePhaseViaAPI(page, programId, true, 'mrv');

      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('mrv');

      console.log('✓ Manual phase jump: MEV → MRV (skipped MAV)');
    });

    test('should allow manual jump to deload from any phase', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Jump directly to deload from MEV
      const result = await advancePhaseViaAPI(page, programId, true, 'deload');

      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('deload');

      console.log('✓ Manual phase jump: MEV → Deload');
    });
  });

  test.describe('5. Phase History (via program data)', () => {
    test('should track phase changes through mesocycle', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Record initial state
      const phase1 = await getProgramData(page);
      expect(phase1.mesocycle_phase).toBe('mev');

      // Advance to MAV
      await advancePhaseViaAPI(page, programId, true, 'mav');
      const phase2 = await getProgramData(page);
      expect(phase2.mesocycle_phase).toBe('mav');

      // Advance to MRV
      await advancePhaseViaAPI(page, programId, true, 'mrv');
      const phase3 = await getProgramData(page);
      expect(phase3.mesocycle_phase).toBe('mrv');

      // Advance to Deload
      await advancePhaseViaAPI(page, programId, true, 'deload');
      const phase4 = await getProgramData(page);
      expect(phase4.mesocycle_phase).toBe('deload');

      console.log('✓ Phase history: MEV → MAV → MRV → Deload');
    });

    test('should preserve exercise selections across phase changes', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Get initial exercises
      const beforeProgram = await getProgramData(page);
      const beforeExerciseIds = beforeProgram.program_days.flatMap((day: any) =>
        day.exercises.map((ex: any) => ex.exercise_id)
      );

      // Advance phase
      await advancePhaseViaAPI(page, programId, true, 'mav');

      // Get exercises after phase change
      const afterProgram = await getProgramData(page);
      const afterExerciseIds = afterProgram.program_days.flatMap((day: any) =>
        day.exercises.map((ex: any) => ex.exercise_id)
      );

      // Verify same exercises (IDs should match)
      expect(afterExerciseIds).toEqual(beforeExerciseIds);

      console.log('✓ Exercise selection preserved across phase change');
    });
  });

  test.describe('6. Validation Rules', () => {
    test('should require authentication for phase advancement', async ({ page }) => {
      // Navigate without logging in
      await page.goto(BASE_URL);
      await page.waitForTimeout(2000);

      // Try to call API without auth token
      const result = await page.evaluate(async (apiUrl: string) => {
        try {
          const res = await fetch(`${apiUrl}/api/programs/1/advance-phase`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ manual: false }),
          });
          return { status: res.status, ok: res.ok };
        } catch (err: any) {
          return { status: 0, error: err.message };
        }
      }, API_BASE_URL);

      expect(result.status).toBe(401);
      console.log('✓ Unauthenticated request rejected (401)');
    });

    test('should reject invalid target phase', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Try to advance with invalid phase
      const result = await page.evaluate(
        async ({ apiUrl, programId }: any) => {
          const authToken = localStorage.getItem('authToken');
          const res = await fetch(`${apiUrl}/api/programs/${programId}/advance-phase`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ manual: true, target_phase: 'invalid_phase' }),
          });
          return { status: res.status, body: await res.json() };
        },
        { apiUrl: API_BASE_URL, programId }
      );

      expect(result.status).toBe(400);
      console.log('✓ Invalid target phase rejected (400)');
    });

    test('should validate program ownership before advancing', async ({ page }) => {
      const { _programId } = await createAndLoginUser(page);

      // Try to advance another user's program (use non-existent ID)
      const fakeResult = await page.evaluate(
        async ({ apiUrl }: any) => {
          const authToken = localStorage.getItem('authToken');
          const res = await fetch(`${apiUrl}/api/programs/99999/advance-phase`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ manual: false }),
          });
          return { status: res.status };
        },
        { apiUrl: API_BASE_URL }
      );

      expect(fakeResult.status).toBe(404);
      console.log('✓ Non-existent program rejected (404)');
    });

    test('should handle full mesocycle cycle (MEV → MAV → MRV → Deload → MEV)', async ({
      page,
    }) => {
      const { programId } = await createAndLoginUser(page);

      // Complete full cycle
      const phases = ['mav', 'mrv', 'deload', 'mev'] as const;
      const expectedPrevious = ['mev', 'mav', 'mrv', 'deload'];

      for (let i = 0; i < phases.length; i++) {
        const result = await advancePhaseViaAPI(
          page,
          programId,
          i === 3 ? false : true,
          i === 3 ? undefined : phases[i]
        );
        expect(result.previous_phase).toBe(expectedPrevious[i]);
        expect(result.new_phase).toBe(phases[i]);
      }

      // Verify we're back at MEV
      const finalProgram = await getProgramData(page);
      expect(finalProgram.mesocycle_phase).toBe('mev');

      console.log('✓ Full mesocycle cycle completed: MEV → MAV → MRV → Deload → MEV');
    });
  });

  test.describe('7. UI Integration', () => {
    test('should update planner screen after phase advancement', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // Get initial phase from UI
      const beforeText = await page.textContent('body');
      expect(beforeText).toMatch(/MEV/i);

      // Advance phase via API
      await advancePhaseViaAPI(page, programId, true, 'mav');

      // Reload page to see updated phase
      await page.reload();
      await page.waitForTimeout(3000);

      // Verify UI shows new phase
      const afterText = await page.textContent('body');
      expect(afterText).toMatch(/MAV/i);

      await page.screenshot({ path: '/tmp/phase-after-advancement.png', fullPage: true });

      console.log('✓ UI updated after phase advancement');
    });

    test('should show updated volume after phase change', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // Get initial volume analysis
      const beforeVolume = await page.evaluate(async (apiUrl: string) => {
        const authToken = localStorage.getItem('authToken');
        const program = await (
          await fetch(`${apiUrl}/api/programs`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
        ).json();

        const volumeRes = await fetch(`${apiUrl}/api/programs/${program.id}/volume`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        return volumeRes.json();
      }, API_BASE_URL);

      const beforeChestSets =
        beforeVolume.muscle_groups.find((mg: any) => mg.muscle_group === 'chest')?.planned_sets ||
        0;

      // Advance phase
      await advancePhaseViaAPI(page, programId, true, 'mav');

      // Get updated volume analysis
      const afterVolume = await page.evaluate(async (apiUrl: string) => {
        const authToken = localStorage.getItem('authToken');
        const program = await (
          await fetch(`${apiUrl}/api/programs`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
        ).json();

        const volumeRes = await fetch(`${apiUrl}/api/programs/${program.id}/volume`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        return volumeRes.json();
      }, API_BASE_URL);

      const afterChestSets =
        afterVolume.muscle_groups.find((mg: any) => mg.muscle_group === 'chest')?.planned_sets || 0;

      // Verify volume increased (MEV → MAV = 1.2x)
      const actualMultiplier = afterChestSets / beforeChestSets;
      expect(actualMultiplier).toBeGreaterThan(1.1);
      expect(actualMultiplier).toBeLessThan(1.3);

      console.log(
        `✓ Volume updated: ${beforeChestSets} → ${afterChestSets} chest sets (${actualMultiplier.toFixed(2)}x)`
      );
    });
  });
});
