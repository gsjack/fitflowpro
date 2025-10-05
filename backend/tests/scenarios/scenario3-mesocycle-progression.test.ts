/**
 * Scenario 3: Mesocycle Progression Validation
 *
 * Tests the mesocycle phase advancement logic from Scenario 3
 * (Track and Analyze Progression) in quickstart.md
 *
 * Acceptance Criteria (10 total):
 * 1. Program starts in MEV phase
 * 2. Can advance from MEV to MAV automatically
 * 3. Volume increases by ~20% when advancing MEV→MAV
 * 4. Can advance from MAV to MRV automatically
 * 5. Volume increases by ~15% when advancing MAV→MRV
 * 6. Can advance from MRV to Deload
 * 7. Volume decreases by ~50% when advancing to Deload
 * 8. All exercises in program updated atomically during phase advancement
 * 9. Can manually specify target phase (skip phases)
 * 10. Phase transitions follow proper progression logic (MEV→MAV→MRV→Deload→MEV)
 */

import tap from 'tap';
import buildApp from '../../src/server.js';

tap.test('Scenario 3: Mesocycle Progression', async (t) => {
  const app = await buildApp();

  // Setup: Create test user and get auth token
  let authToken: string;

  await t.before(async () => {
    const testUsername = `test-scenario3-${Date.now()}@example.com`;

    // Register user
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const _registerBody = registerResponse.json();

    // Login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    authToken = loginResponse.json().token;

    // Get user's program
    const programResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const program = programResponse.json();
  });

  // AC-1: Program starts in MEV phase
  await t.test('AC-1: Program starts in MEV phase', async (t) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    t.equal(response.statusCode, 200, 'Returns 200 OK');
    const program = response.json();

    t.equal(program.mesocycle_phase, 'mev', 'Program starts in MEV phase');
    t.type(program.mesocycle_week, 'number', 'Has mesocycle_week');
  });

  // AC-2: Advance from MEV to MAV automatically
  await t.test('AC-2: Advance MEV→MAV automatically', async (t) => {
    // Get initial volume for comparison
    const beforeResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const beforeProgram = beforeResponse.json();
    t.equal(beforeProgram.mesocycle_phase, 'mev', 'Currently in MEV phase');

    // Advance phase automatically (manual: false)
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${programId}/advance-phase`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        manual: false,
      },
    });

    t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
    const advanceResult = advanceResponse.json();

    t.equal(advanceResult.previous_phase, 'mev', 'Previous phase was MEV');
    t.equal(advanceResult.new_phase, 'mav', 'New phase is MAV');
    t.type(advanceResult.volume_multiplier, 'number', 'Has volume multiplier');
    t.type(advanceResult.exercises_updated, 'number', 'Has exercises updated count');
  });

  // AC-3: Volume increases by ~20% when advancing MEV→MAV
  await t.test('AC-3: Volume increases ~20% for MEV→MAV', async (t) => {
    // Reset to MEV phase by creating a new user
    const testUsername = `test-volume-mev-${Date.now()}@example.com`;
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    const newAuthToken = loginResponse.json().token;

    // Get initial program
    const beforeResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const beforeProgram = beforeResponse.json();
    const newProgramId = beforeProgram.id;

    // Calculate total sets before
    let totalSetsBefore = 0;
    beforeProgram.program_days.forEach((day: any) => {
      day.exercises.forEach((exercise: any) => {
        totalSetsBefore += exercise.target_sets;
      });
    });

    // Advance from MEV to MAV
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${newProgramId}/advance-phase`,
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
      payload: {
        manual: false,
      },
    });

    const advanceResult = advanceResponse.json();

    // Verify volume multiplier is around 1.20 (±0.05)
    t.ok(
      advanceResult.volume_multiplier >= 1.15 && advanceResult.volume_multiplier <= 1.25,
      `Volume multiplier ${advanceResult.volume_multiplier} is ~1.20 (within 1.15-1.25 range)`
    );

    // Get updated program
    const afterResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const afterProgram = afterResponse.json();

    // Calculate total sets after
    let totalSetsAfter = 0;
    afterProgram.program_days.forEach((day: any) => {
      day.exercises.forEach((exercise: any) => {
        totalSetsAfter += exercise.target_sets;
      });
    });

    // Verify actual volume increase
    const actualIncrease = totalSetsAfter / totalSetsBefore;
    t.ok(
      actualIncrease >= 1.1 && actualIncrease <= 1.3,
      `Actual volume increase ${actualIncrease.toFixed(2)}x is reasonable`
    );
  });

  // AC-4 & AC-5: Advance MAV→MRV with ~15% volume increase
  await t.test('AC-4 & AC-5: Advance MAV→MRV with ~15% volume increase', async (t) => {
    // Use existing program that's already in MAV phase
    const beforeResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const beforeProgram = beforeResponse.json();

    // If not in MAV, advance to MAV first
    if (beforeProgram.mesocycle_phase !== 'mav') {
      await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          manual: true,
          target_phase: 'mav',
        },
      });
    }

    // Now advance from MAV to MRV
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${programId}/advance-phase`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        manual: false,
      },
    });

    t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
    const advanceResult = advanceResponse.json();

    t.equal(advanceResult.previous_phase, 'mav', 'Previous phase was MAV');
    t.equal(advanceResult.new_phase, 'mrv', 'New phase is MRV');

    // Verify volume multiplier is around 1.15 (±0.05)
    t.ok(
      advanceResult.volume_multiplier >= 1.10 && advanceResult.volume_multiplier <= 1.20,
      `Volume multiplier ${advanceResult.volume_multiplier} is ~1.15 (within 1.10-1.20 range)`
    );
  });

  // AC-6 & AC-7: Advance MRV→Deload with ~50% volume decrease
  await t.test('AC-6 & AC-7: Advance MRV→Deload with ~50% volume decrease', async (t) => {
    // Ensure we're in MRV phase
    const beforeResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    const beforeProgram = beforeResponse.json();

    if (beforeProgram.mesocycle_phase !== 'mrv') {
      await app.inject({
        method: 'PATCH',
        url: `/api/programs/${programId}/advance-phase`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          manual: true,
          target_phase: 'mrv',
        },
      });
    }

    // Now advance from MRV to Deload
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${programId}/advance-phase`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        manual: true,
        target_phase: 'deload',
      },
    });

    t.equal(advanceResponse.statusCode, 200, 'Phase advancement succeeds');
    const advanceResult = advanceResponse.json();

    t.equal(advanceResult.previous_phase, 'mrv', 'Previous phase was MRV');
    t.equal(advanceResult.new_phase, 'deload', 'New phase is Deload');

    // Verify volume multiplier is around 0.5 (50% reduction)
    t.ok(
      advanceResult.volume_multiplier <= 0.6,
      `Volume multiplier ${advanceResult.volume_multiplier} reduces volume by ~50%`
    );
    t.ok(
      advanceResult.volume_multiplier >= 0.4,
      `Volume multiplier ${advanceResult.volume_multiplier} is at least 40%`
    );
  });

  // AC-8: All exercises updated atomically
  await t.test('AC-8: All exercises updated atomically', async (t) => {
    // Create a fresh user to test atomic updates
    const testUsername = `test-atomic-${Date.now()}@example.com`;
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    const newAuthToken = loginResponse.json().token;

    // Get program
    const programResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const program = programResponse.json();
    const newProgramId = program.id;

    // Count total exercises before
    let totalExercisesBefore = 0;
    program.program_days.forEach((day: any) => {
      totalExercisesBefore += day.exercises.length;
    });

    // Advance phase
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${newProgramId}/advance-phase`,
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
      payload: {
        manual: false,
      },
    });

    const advanceResult = advanceResponse.json();

    // Verify exercises_updated matches total exercise count
    t.equal(
      advanceResult.exercises_updated,
      totalExercisesBefore,
      'All exercises were updated atomically'
    );

    // Verify all exercises were actually updated
    const afterResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const afterProgram = afterResponse.json();

    let totalExercisesAfter = 0;
    afterProgram.program_days.forEach((day: any) => {
      totalExercisesAfter += day.exercises.length;
    });

    t.equal(
      totalExercisesAfter,
      totalExercisesBefore,
      'Exercise count remains the same (no exercises lost)'
    );
  });

  // AC-9: Manual phase targeting
  await t.test('AC-9: Manually specify target phase', async (t) => {
    // Create a fresh user
    const testUsername = `test-manual-${Date.now()}@example.com`;
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    const newAuthToken = loginResponse.json().token;

    // Get program (should start in MEV)
    const programResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const program = programResponse.json();
    const newProgramId = program.id;
    t.equal(program.mesocycle_phase, 'mev', 'Starts in MEV phase');

    // Manually jump to MRV (skipping MAV)
    const advanceResponse = await app.inject({
      method: 'PATCH',
      url: `/api/programs/${newProgramId}/advance-phase`,
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
      payload: {
        manual: true,
        target_phase: 'mrv',
      },
    });

    t.equal(advanceResponse.statusCode, 200, 'Manual phase advancement succeeds');
    const advanceResult = advanceResponse.json();

    t.equal(advanceResult.previous_phase, 'mev', 'Previous phase was MEV');
    t.equal(advanceResult.new_phase, 'mrv', 'New phase is MRV (skipped MAV)');
  });

  // AC-10: Phase progression logic
  await t.test('AC-10: Proper phase progression sequence', async (t) => {
    // Create a fresh user to test full cycle
    const testUsername = `test-progression-${Date.now()}@example.com`;
    const _registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 30,
        weight_kg: 80,
        experience_level: 'intermediate',
      },
    });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
      },
    });

    const newAuthToken = loginResponse.json().token;

    // Get program
    const programResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const program = programResponse.json();
    const newProgramId = program.id;

    // Test progression: MEV → MAV → MRV → Deload
    const expectedProgression = [
      { from: 'mev', to: 'mav' },
      { from: 'mav', to: 'mrv' },
      { from: 'mrv', to: 'deload' },
    ];

    for (const step of expectedProgression) {
      const advanceResponse = await app.inject({
        method: 'PATCH',
        url: `/api/programs/${newProgramId}/advance-phase`,
        headers: {
          authorization: `Bearer ${newAuthToken}`,
        },
        payload: {
          manual: false,
        },
      });

      const advanceResult = advanceResponse.json();
      t.equal(advanceResult.previous_phase, step.from, `Advancing from ${step.from}`);
      t.equal(advanceResult.new_phase, step.to, `Advancing to ${step.to}`);
    }

    // Verify final state is Deload
    const finalResponse = await app.inject({
      method: 'GET',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${newAuthToken}`,
      },
    });

    const finalProgram = finalResponse.json();
    t.equal(finalProgram.mesocycle_phase, 'deload', 'Final phase is Deload');
  });

  await t.teardown(async () => {
    await app.close();
  });
});
