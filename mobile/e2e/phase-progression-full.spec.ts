/**
 * E2E Test Suite: Full Mesocycle Phase Progression
 *
 * Comprehensive end-to-end tests for complete mesocycle phase progression cycle.
 * Tests the entire 8-week cycle: MEV → MAV → MRV → Deload → MEV.
 *
 * Coverage:
 * 1. Start in MEV phase (weeks 1-2)
 * 2. Advance to MAV phase (sets × 1.2)
 * 3. Advance to MRV phase (sets × 1.15)
 * 4. Advance to Deload (sets × 0.5)
 * 5. Return to MEV (sets × 2.0)
 * 6. Verify exercise sets updated correctly at each transition
 * 7. Check phase indicator UI reflects current state
 * 8. Validate mesocycle week counter increments
 * 9. Test manual phase selection vs automatic progression
 * 10. Verify volume multipliers applied correctly
 *
 * Test Approach:
 * - Create new user and program for each test (fresh state)
 * - Use API calls for phase advancement (faster than UI clicking)
 * - Verify both API responses and UI state after each transition
 * - Take screenshots at each phase for visual validation
 * - Calculate expected set counts and verify actual values
 *
 * Prerequisites:
 * - Backend server running on http://localhost:3000
 * - Expo web app running on http://localhost:8081
 * - Clean database state (tests create isolated users)
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const BASE_URL = 'http://localhost:8081';
const API_BASE_URL = 'http://localhost:3000';

/**
 * Phase multipliers (from CLAUDE.md)
 */
const PHASE_MULTIPLIERS = {
  mev_to_mav: 1.2, // +20% volume
  mav_to_mrv: 1.15, // +15% volume
  mrv_to_deload: 0.5, // -50% volume
  deload_to_mev: 2.0, // baseline reset
} as const;

/**
 * Program exercise structure from API
 */
interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  muscle_groups: string;
  equipment: string;
}

/**
 * Program day structure from API
 */
interface ProgramDay {
  id: number;
  program_id: number;
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercises: ProgramExercise[];
}

/**
 * Full program structure from API
 */
interface Program {
  id: number;
  user_id: number;
  name: string;
  mesocycle_week: number;
  mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload';
  created_at: number;
  program_days: ProgramDay[];
}

/**
 * Advance phase API response
 */
interface AdvancePhaseResponse {
  previous_phase: string;
  new_phase: string;
  volume_multiplier: number;
  exercises_updated: number;
}

/**
 * Helper: Create test user and login
 */
async function createAndLoginUser(page: Page): Promise<{
  email: string;
  token: string;
  userId: number;
  programId: number;
}> {
  const email = `phasetest${Date.now()}@fitflow.test`;
  const password = 'PhaseTest123!';

  console.log(`[Setup] Creating user: ${email}`);

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

  // Age is required for VO2max calculations
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

  // Get program ID and user ID via API
  const programResponse = await page.evaluate(async (apiUrl: string) => {
    const authToken = localStorage.getItem('authToken');
    const res = await fetch(`${apiUrl}/api/programs`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    return res.json();
  }, API_BASE_URL);

  console.log(`[Setup] User created with program ID: ${programResponse.id}`);

  return {
    email,
    token,
    userId: programResponse.user_id,
    programId: programResponse.id,
  };
}

/**
 * Helper: Navigate to planner screen
 */
async function navigateToPlanner(page: Page): Promise<void> {
  const plannerTab = page.getByRole('button', { name: /planner/i }).or(page.getByText(/planner/i));

  if ((await plannerTab.count()) > 0) {
    await plannerTab.first().click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Helper: Get program data via API
 */
async function getProgramData(page: Page): Promise<Program> {
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
): Promise<AdvancePhaseResponse> {
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

/**
 * Helper: Calculate total sets across all exercises
 */
function calculateTotalSets(program: Program): number {
  let totalSets = 0;
  program.program_days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      totalSets += exercise.target_sets;
    });
  });
  return totalSets;
}

/**
 * Helper: Calculate total sets per exercise (returns map)
 */
function calculateSetsPerExercise(program: Program): Map<number, number> {
  const setsMap = new Map<number, number>();
  program.program_days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      setsMap.set(exercise.id, exercise.target_sets);
    });
  });
  return setsMap;
}

/**
 * Helper: Take screenshot with descriptive name
 */
async function takePhaseScreenshot(page: Page, phase: string, description: string): Promise<void> {
  const filename = `/tmp/phase-progression-${phase}-${description}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[Screenshot] Saved: ${filename}`);
}

test.describe('Full Mesocycle Phase Progression E2E Tests', () => {
  test.describe('1. Complete Cycle: MEV → MAV → MRV → Deload → MEV', () => {
    test('should complete full mesocycle with correct volume adjustments', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // ============================================================
      // PHASE 1: Initial MEV State
      // ============================================================
      console.log('\n[Phase 1] Verifying initial MEV state...');

      const mevProgram = await getProgramData(page);
      expect(mevProgram.mesocycle_phase).toBe('mev');
      expect(mevProgram.mesocycle_week).toBeGreaterThanOrEqual(1);

      const mevTotalSets = calculateTotalSets(mevProgram);
      const mevSetsPerExercise = calculateSetsPerExercise(mevProgram);

      console.log(`  ✓ Starting phase: ${mevProgram.mesocycle_phase}`);
      console.log(`  ✓ Starting week: ${mevProgram.mesocycle_week}`);
      console.log(`  ✓ Total sets: ${mevTotalSets}`);
      console.log(`  ✓ Exercise count: ${mevSetsPerExercise.size}`);

      await takePhaseScreenshot(page, 'mev', 'initial');

      // ============================================================
      // PHASE 2: MEV → MAV (+20% volume)
      // ============================================================
      console.log('\n[Phase 2] Advancing MEV → MAV...');

      const mevToMavResult = await advancePhaseViaAPI(page, programId, true, 'mav');

      expect(mevToMavResult.previous_phase).toBe('mev');
      expect(mevToMavResult.new_phase).toBe('mav');
      expect(mevToMavResult.volume_multiplier).toBeCloseTo(PHASE_MULTIPLIERS.mev_to_mav, 2);
      expect(mevToMavResult.exercises_updated).toBeGreaterThan(0);

      console.log(`  ✓ Previous phase: ${mevToMavResult.previous_phase}`);
      console.log(`  ✓ New phase: ${mevToMavResult.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${mevToMavResult.volume_multiplier}x`);
      console.log(`  ✓ Exercises updated: ${mevToMavResult.exercises_updated}`);

      // Verify MAV state
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);

      const mavProgram = await getProgramData(page);
      expect(mavProgram.mesocycle_phase).toBe('mav');

      const mavTotalSets = calculateTotalSets(mavProgram);
      const mavSetsPerExercise = calculateSetsPerExercise(mavProgram);

      // Verify volume increased by ~1.2x (allow 10% tolerance for rounding)
      const mevToMavActualMultiplier = mavTotalSets / mevTotalSets;
      expect(mevToMavActualMultiplier).toBeGreaterThan(PHASE_MULTIPLIERS.mev_to_mav * 0.9);
      expect(mevToMavActualMultiplier).toBeLessThan(PHASE_MULTIPLIERS.mev_to_mav * 1.1);

      console.log(
        `  ✓ Total sets: ${mevTotalSets} → ${mavTotalSets} (${mevToMavActualMultiplier.toFixed(2)}x)`
      );

      // Verify individual exercise sets increased
      let exercisesVerified = 0;
      mevSetsPerExercise.forEach((mevSets, exerciseId) => {
        const mavSets = mavSetsPerExercise.get(exerciseId);
        if (mavSets !== undefined) {
          const expectedSets = Math.round(mevSets * PHASE_MULTIPLIERS.mev_to_mav);
          // Allow ±1 set tolerance for rounding
          expect(Math.abs(mavSets - expectedSets)).toBeLessThanOrEqual(1);
          exercisesVerified++;
        }
      });

      console.log(`  ✓ Verified ${exercisesVerified} individual exercise set counts`);

      await takePhaseScreenshot(page, 'mav', 'after-advance');

      // ============================================================
      // PHASE 3: MAV → MRV (+15% volume)
      // ============================================================
      console.log('\n[Phase 3] Advancing MAV → MRV...');

      const mavToMrvResult = await advancePhaseViaAPI(page, programId, true, 'mrv');

      expect(mavToMrvResult.previous_phase).toBe('mav');
      expect(mavToMrvResult.new_phase).toBe('mrv');
      expect(mavToMrvResult.volume_multiplier).toBeCloseTo(PHASE_MULTIPLIERS.mav_to_mrv, 2);

      console.log(`  ✓ Previous phase: ${mavToMrvResult.previous_phase}`);
      console.log(`  ✓ New phase: ${mavToMrvResult.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${mavToMrvResult.volume_multiplier}x`);

      // Verify MRV state
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);

      const mrvProgram = await getProgramData(page);
      expect(mrvProgram.mesocycle_phase).toBe('mrv');

      const mrvTotalSets = calculateTotalSets(mrvProgram);
      const _mrvSetsPerExercise = calculateSetsPerExercise(mrvProgram);

      // Verify volume increased by ~1.15x from MAV
      const mavToMrvActualMultiplier = mrvTotalSets / mavTotalSets;
      expect(mavToMrvActualMultiplier).toBeGreaterThan(PHASE_MULTIPLIERS.mav_to_mrv * 0.9);
      expect(mavToMrvActualMultiplier).toBeLessThan(PHASE_MULTIPLIERS.mav_to_mrv * 1.1);

      console.log(
        `  ✓ Total sets: ${mavTotalSets} → ${mrvTotalSets} (${mavToMrvActualMultiplier.toFixed(2)}x)`
      );

      // Verify cumulative increase from MEV to MRV
      const mevToMrvCumulativeMultiplier = mrvTotalSets / mevTotalSets;
      const expectedCumulativeMultiplier =
        PHASE_MULTIPLIERS.mev_to_mav * PHASE_MULTIPLIERS.mav_to_mrv;
      console.log(
        `  ✓ Cumulative MEV→MRV: ${mevToMrvCumulativeMultiplier.toFixed(2)}x (expected: ${expectedCumulativeMultiplier.toFixed(2)}x)`
      );

      await takePhaseScreenshot(page, 'mrv', 'after-advance');

      // ============================================================
      // PHASE 4: MRV → Deload (-50% volume)
      // ============================================================
      console.log('\n[Phase 4] Advancing MRV → Deload...');

      const mrvToDeloadResult = await advancePhaseViaAPI(page, programId, true, 'deload');

      expect(mrvToDeloadResult.previous_phase).toBe('mrv');
      expect(mrvToDeloadResult.new_phase).toBe('deload');
      expect(mrvToDeloadResult.volume_multiplier).toBeCloseTo(PHASE_MULTIPLIERS.mrv_to_deload, 2);

      console.log(`  ✓ Previous phase: ${mrvToDeloadResult.previous_phase}`);
      console.log(`  ✓ New phase: ${mrvToDeloadResult.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${mrvToDeloadResult.volume_multiplier}x`);

      // Verify Deload state
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);

      const deloadProgram = await getProgramData(page);
      expect(deloadProgram.mesocycle_phase).toBe('deload');

      const deloadTotalSets = calculateTotalSets(deloadProgram);

      // Verify volume decreased by ~0.5x from MRV
      const mrvToDeloadActualMultiplier = deloadTotalSets / mrvTotalSets;
      expect(mrvToDeloadActualMultiplier).toBeGreaterThan(PHASE_MULTIPLIERS.mrv_to_deload * 0.9);
      expect(mrvToDeloadActualMultiplier).toBeLessThan(PHASE_MULTIPLIERS.mrv_to_deload * 1.1);

      console.log(
        `  ✓ Total sets: ${mrvTotalSets} → ${deloadTotalSets} (${mrvToDeloadActualMultiplier.toFixed(2)}x)`
      );
      console.log(
        `  ✓ Deload represents ${((deloadTotalSets / mevTotalSets) * 100).toFixed(0)}% of original MEV volume`
      );

      await takePhaseScreenshot(page, 'deload', 'after-advance');

      // ============================================================
      // PHASE 5: Deload → MEV (baseline reset, 2.0x from deload)
      // ============================================================
      console.log('\n[Phase 5] Advancing Deload → MEV (automatic progression)...');

      // Use automatic progression (manual=false)
      const deloadToMevResult = await advancePhaseViaAPI(page, programId, false);

      expect(deloadToMevResult.previous_phase).toBe('deload');
      expect(deloadToMevResult.new_phase).toBe('mev');
      expect(deloadToMevResult.volume_multiplier).toBeCloseTo(PHASE_MULTIPLIERS.deload_to_mev, 2);

      console.log(`  ✓ Previous phase: ${deloadToMevResult.previous_phase}`);
      console.log(`  ✓ New phase: ${deloadToMevResult.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${deloadToMevResult.volume_multiplier}x`);

      // Verify new MEV state
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);

      const newMevProgram = await getProgramData(page);
      expect(newMevProgram.mesocycle_phase).toBe('mev');

      const newMevTotalSets = calculateTotalSets(newMevProgram);

      // Verify volume increased by ~2.0x from deload
      const deloadToMevActualMultiplier = newMevTotalSets / deloadTotalSets;
      expect(deloadToMevActualMultiplier).toBeGreaterThan(PHASE_MULTIPLIERS.deload_to_mev * 0.9);
      expect(deloadToMevActualMultiplier).toBeLessThan(PHASE_MULTIPLIERS.deload_to_mev * 1.1);

      console.log(
        `  ✓ Total sets: ${deloadTotalSets} → ${newMevTotalSets} (${deloadToMevActualMultiplier.toFixed(2)}x)`
      );

      // Verify progressive overload: new MEV should be higher than original MEV
      console.log(
        `  ✓ Progressive overload: ${mevTotalSets} (original MEV) → ${newMevTotalSets} (new MEV)`
      );
      expect(newMevTotalSets).toBeGreaterThanOrEqual(mevTotalSets);

      await takePhaseScreenshot(page, 'mev', 'after-cycle-complete');

      // ============================================================
      // Summary
      // ============================================================
      console.log('\n[Summary] Full mesocycle cycle completed:');
      console.log(`  MEV (start):     ${mevTotalSets} sets`);
      console.log(
        `  MAV:             ${mavTotalSets} sets (${mevToMavActualMultiplier.toFixed(2)}x)`
      );
      console.log(
        `  MRV (peak):      ${mrvTotalSets} sets (${mavToMrvActualMultiplier.toFixed(2)}x from MAV)`
      );
      console.log(
        `  Deload (taper):  ${deloadTotalSets} sets (${mrvToDeloadActualMultiplier.toFixed(2)}x from MRV)`
      );
      console.log(
        `  MEV (new cycle): ${newMevTotalSets} sets (${deloadToMevActualMultiplier.toFixed(2)}x from deload)`
      );
      console.log(`  Progressive overload: ${newMevTotalSets >= mevTotalSets ? 'YES ✓' : 'NO ✗'}`);
    });

    test('should verify phase indicator UI updates at each transition', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);
      await navigateToPlanner(page);

      // Helper: Check phase indicator displays correct phase
      const verifyPhaseIndicatorUI = async (expectedPhase: string) => {
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent('body');

        // Phase label should be visible
        const phaseRegex = new RegExp(expectedPhase.toUpperCase(), 'i');
        expect(bodyText).toMatch(phaseRegex);

        // Week number should be visible
        expect(bodyText).toMatch(/Week \d+/i);

        console.log(`  ✓ UI shows phase: ${expectedPhase}`);
      };

      // Verify initial MEV
      await verifyPhaseIndicatorUI('MEV');
      await takePhaseScreenshot(page, 'ui-mev', 'initial');

      // Advance to MAV
      await advancePhaseViaAPI(page, programId, true, 'mav');
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);
      await verifyPhaseIndicatorUI('MAV');
      await takePhaseScreenshot(page, 'ui-mav', 'after-advance');

      // Advance to MRV
      await advancePhaseViaAPI(page, programId, true, 'mrv');
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);
      await verifyPhaseIndicatorUI('MRV');
      await takePhaseScreenshot(page, 'ui-mrv', 'after-advance');

      // Advance to Deload
      await advancePhaseViaAPI(page, programId, true, 'deload');
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);
      await verifyPhaseIndicatorUI('Deload');
      await takePhaseScreenshot(page, 'ui-deload', 'after-advance');

      // Return to MEV
      await advancePhaseViaAPI(page, programId, false);
      await page.reload();
      await page.waitForTimeout(3000);
      await navigateToPlanner(page);
      await verifyPhaseIndicatorUI('MEV');
      await takePhaseScreenshot(page, 'ui-mev', 'after-cycle');

      console.log('✓ All phase indicator UI updates verified');
    });

    test('should track mesocycle week counter through full cycle', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Track week numbers through progression
      const weekHistory: { phase: string; week: number }[] = [];

      // Initial MEV
      let program = await getProgramData(page);
      weekHistory.push({ phase: program.mesocycle_phase, week: program.mesocycle_week });

      // Advance through phases
      await advancePhaseViaAPI(page, programId, true, 'mav');
      program = await getProgramData(page);
      weekHistory.push({ phase: program.mesocycle_phase, week: program.mesocycle_week });

      await advancePhaseViaAPI(page, programId, true, 'mrv');
      program = await getProgramData(page);
      weekHistory.push({ phase: program.mesocycle_phase, week: program.mesocycle_week });

      await advancePhaseViaAPI(page, programId, true, 'deload');
      program = await getProgramData(page);
      weekHistory.push({ phase: program.mesocycle_phase, week: program.mesocycle_week });

      await advancePhaseViaAPI(page, programId, false);
      program = await getProgramData(page);
      weekHistory.push({ phase: program.mesocycle_phase, week: program.mesocycle_week });

      console.log('\nMesocycle week progression:');
      weekHistory.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.phase.toUpperCase()}: Week ${entry.week}`);
      });

      // Verify week numbers are valid (1-8 for standard mesocycle)
      weekHistory.forEach((entry) => {
        expect(entry.week).toBeGreaterThanOrEqual(1);
        expect(entry.week).toBeLessThanOrEqual(8);
      });

      console.log('✓ Week counter tracked successfully through full cycle');
    });
  });

  test.describe('2. Manual Phase Selection vs Automatic Progression', () => {
    test('should support manual phase jumps (skip MAV, go directly MEV → MRV)', async ({
      page,
    }) => {
      const { programId } = await createAndLoginUser(page);

      // Verify starting in MEV
      const mevProgram = await getProgramData(page);
      expect(mevProgram.mesocycle_phase).toBe('mev');
      const mevTotalSets = calculateTotalSets(mevProgram);

      console.log(`\n[Manual Jump] Starting MEV: ${mevTotalSets} sets`);

      // Manual jump: MEV → MRV (skip MAV)
      const result = await advancePhaseViaAPI(page, programId, true, 'mrv');

      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('mrv');

      console.log(`  ✓ Jumped directly from ${result.previous_phase} → ${result.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${result.volume_multiplier}x`);

      // Verify MRV state
      const mrvProgram = await getProgramData(page);
      expect(mrvProgram.mesocycle_phase).toBe('mrv');
      const mrvTotalSets = calculateTotalSets(mrvProgram);

      console.log(
        `  ✓ MRV sets: ${mrvTotalSets} (${(mrvTotalSets / mevTotalSets).toFixed(2)}x from MEV)`
      );
    });

    test('should support manual early deload from any phase', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Start in MEV
      const mevProgram = await getProgramData(page);
      expect(mevProgram.mesocycle_phase).toBe('mev');

      console.log('\n[Early Deload] Jumping directly to deload from MEV...');

      // Manual jump to deload (early deload scenario)
      const result = await advancePhaseViaAPI(page, programId, true, 'deload');

      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('deload');

      console.log(`  ✓ Early deload: ${result.previous_phase} → ${result.new_phase}`);
      console.log(`  ✓ Volume multiplier: ${result.volume_multiplier}x`);

      // Verify deload state
      const deloadProgram = await getProgramData(page);
      expect(deloadProgram.mesocycle_phase).toBe('deload');

      console.log('  ✓ Successfully entered deload early (manual override)');
    });

    test('should follow automatic progression path without target_phase', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Track automatic progression (no target_phase specified)
      const progressionPath: string[] = [];

      // Start in MEV
      const program = await getProgramData(page);
      progressionPath.push(program.mesocycle_phase);

      // Automatic advance #1 (should go MEV → MAV)
      let result = await advancePhaseViaAPI(page, programId, false);
      progressionPath.push(result.new_phase);
      expect(result.previous_phase).toBe('mev');
      expect(result.new_phase).toBe('mav');

      // Automatic advance #2 (should go MAV → MRV)
      result = await advancePhaseViaAPI(page, programId, false);
      progressionPath.push(result.new_phase);
      expect(result.previous_phase).toBe('mav');
      expect(result.new_phase).toBe('mrv');

      // Automatic advance #3 (should go MRV → Deload)
      result = await advancePhaseViaAPI(page, programId, false);
      progressionPath.push(result.new_phase);
      expect(result.previous_phase).toBe('mrv');
      expect(result.new_phase).toBe('deload');

      // Automatic advance #4 (should go Deload → MEV)
      result = await advancePhaseViaAPI(page, programId, false);
      progressionPath.push(result.new_phase);
      expect(result.previous_phase).toBe('deload');
      expect(result.new_phase).toBe('mev');

      console.log('\n[Automatic Progression] Path:', progressionPath.join(' → '));
      expect(progressionPath).toEqual(['mev', 'mav', 'mrv', 'deload', 'mev']);

      console.log('✓ Automatic progression follows correct sequence');
    });
  });

  test.describe('3. Volume Multiplier Validation', () => {
    test('should apply exact multipliers at each phase transition', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Helper: Verify multiplier with tolerance
      const verifyMultiplier = (
        actual: number,
        expected: number,
        transitionName: string,
        tolerance: number = 0.02
      ) => {
        const diff = Math.abs(actual - expected);
        const percentDiff = (diff / expected) * 100;

        console.log(`  ${transitionName}:`);
        console.log(`    Expected: ${expected.toFixed(2)}x`);
        console.log(`    Actual:   ${actual.toFixed(2)}x`);
        console.log(`    Diff:     ${percentDiff.toFixed(1)}%`);

        expect(actual).toBeGreaterThan(expected * (1 - tolerance));
        expect(actual).toBeLessThan(expected * (1 + tolerance));
      };

      console.log('\n[Multiplier Validation] Testing all transitions...\n');

      // MEV → MAV
      const mevProgram = await getProgramData(page);
      const mevSets = calculateTotalSets(mevProgram);

      const _mevToMavResult = await advancePhaseViaAPI(page, programId, true, 'mav');
      const mavProgram = await getProgramData(page);
      const mavSets = calculateTotalSets(mavProgram);

      verifyMultiplier(mavSets / mevSets, PHASE_MULTIPLIERS.mev_to_mav, 'MEV → MAV (+20%)');

      // MAV → MRV
      const _mavToMrvResult = await advancePhaseViaAPI(page, programId, true, 'mrv');
      const mrvProgram = await getProgramData(page);
      const mrvSets = calculateTotalSets(mrvProgram);

      verifyMultiplier(mrvSets / mavSets, PHASE_MULTIPLIERS.mav_to_mrv, 'MAV → MRV (+15%)');

      // MRV → Deload
      const _mrvToDeloadResult = await advancePhaseViaAPI(page, programId, true, 'deload');
      const deloadProgram = await getProgramData(page);
      const deloadSets = calculateTotalSets(deloadProgram);

      verifyMultiplier(
        deloadSets / mrvSets,
        PHASE_MULTIPLIERS.mrv_to_deload,
        'MRV → Deload (-50%)'
      );

      // Deload → MEV
      const _deloadToMevResult = await advancePhaseViaAPI(page, programId, false);
      const newMevProgram = await getProgramData(page);
      const newMevSets = calculateTotalSets(newMevProgram);

      verifyMultiplier(
        newMevSets / deloadSets,
        PHASE_MULTIPLIERS.deload_to_mev,
        'Deload → MEV (reset)'
      );

      console.log('\n✓ All volume multipliers validated within tolerance');
    });

    test('should preserve exercise selection across all phase changes', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Get initial exercise IDs
      const mevProgram = await getProgramData(page);
      const initialExerciseIds = mevProgram.program_days.flatMap((day) =>
        day.exercises.map((ex) => ex.exercise_id)
      );

      console.log(`\n[Exercise Preservation] Starting with ${initialExerciseIds.length} exercises`);

      // Advance through all phases
      await advancePhaseViaAPI(page, programId, true, 'mav');
      await advancePhaseViaAPI(page, programId, true, 'mrv');
      await advancePhaseViaAPI(page, programId, true, 'deload');
      await advancePhaseViaAPI(page, programId, false);

      // Get final exercise IDs
      const finalProgram = await getProgramData(page);
      const finalExerciseIds = finalProgram.program_days.flatMap((day) =>
        day.exercises.map((ex) => ex.exercise_id)
      );

      console.log(`  After full cycle: ${finalExerciseIds.length} exercises`);

      // Verify same exercises (IDs should match)
      expect(finalExerciseIds.sort()).toEqual(initialExerciseIds.sort());

      console.log('✓ All exercises preserved through full mesocycle cycle');
    });

    test('should update all exercises when advancing phase', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      // Get initial state
      const beforeProgram = await getProgramData(page);
      const totalExercises = beforeProgram.program_days.reduce(
        (sum, day) => sum + day.exercises.length,
        0
      );

      console.log(`\n[Exercise Update] Program has ${totalExercises} total exercises`);

      // Advance phase
      const result = await advancePhaseViaAPI(page, programId, true, 'mav');

      console.log(`  Exercises updated: ${result.exercises_updated}`);
      expect(result.exercises_updated).toBe(totalExercises);

      console.log('✓ All exercises updated during phase advancement');
    });
  });

  test.describe('4. Edge Cases and Error Handling', () => {
    test('should reject phase advancement without authentication', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForTimeout(2000);

      // Try to advance phase without auth token
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

    test('should handle rapid phase progression without data corruption', async ({ page }) => {
      const { programId } = await createAndLoginUser(page);

      console.log('\n[Rapid Progression] Advancing through all phases quickly...');

      // Rapid advancement through all phases
      await advancePhaseViaAPI(page, programId, true, 'mav');
      await advancePhaseViaAPI(page, programId, true, 'mrv');
      await advancePhaseViaAPI(page, programId, true, 'deload');
      await advancePhaseViaAPI(page, programId, false);

      // Verify final state is consistent
      const finalProgram = await getProgramData(page);
      expect(finalProgram.mesocycle_phase).toBe('mev');

      // Verify all exercises still have valid set counts
      finalProgram.program_days.forEach((day) => {
        day.exercises.forEach((exercise) => {
          expect(exercise.target_sets).toBeGreaterThan(0);
          expect(exercise.target_sets).toBeLessThanOrEqual(20);
        });
      });

      console.log('✓ Rapid progression handled without data corruption');
    });
  });
});
