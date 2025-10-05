import tap from 'tap';
import buildApp from '../../src/server.js';

/**
 * Program Exercise Editor API Contract Tests (T009-T013)
 *
 * These tests validate API compliance with /specs/002-actual-gaps-ultrathink/contracts/program-exercises.yaml
 *
 * TDD Requirement: These tests MUST FAIL initially as no implementation exists yet.
 * Constitution: Test-First Development (Principle I) - NON-NEGOTIABLE
 *
 * Endpoints tested:
 * - T009: POST /api/program-exercises (add exercise to program)
 * - T010: PATCH /api/program-exercises/:id (modify sets/reps/RIR)
 * - T011: DELETE /api/program-exercises/:id (remove exercise)
 * - T012: PUT /api/program-exercises/:id/swap (swap to compatible exercise)
 * - T013: PATCH /api/program-exercises/batch-reorder (drag-and-drop reordering)
 */

tap.test('Program Exercise Editor Endpoints Contract Tests', async (t) => {
  const app = await buildApp();

  // Test data IDs (populated in before hook)
  let authToken: string;
  let programId: number;
  let programDayId: number;
  let chestExerciseId: number; // Barbell Bench Press or similar
  let alternativeChestExerciseId: number; // Dumbbell Bench Press or similar
  let backExerciseId: number; // For incompatible swap test
  let programExerciseId: number; // Created in T009 test

  await t.before(async () => {
    // Create test user and get auth token
    const testUsername = `test-program-exercises-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: testUsername,
        password: 'SecurePass123!',
        age: 28,
        weight_kg: 75,
        experience_level: 'intermediate'
      }
    });

    registerResponse.json();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecurePass123!'
      }
    });

    authToken = loginResponse.json().token;

    // Get exercise IDs from seeded database
    const exercisesResponse = await app.inject({
      method: 'GET',
      url: '/api/exercises?muscle_group=chest&equipment=barbell',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    chestExerciseId = exercisesResponse.json().exercises[0]?.id || 1;

    const altExercisesResponse = await app.inject({
      method: 'GET',
      url: '/api/exercises?muscle_group=chest&equipment=dumbbell',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    alternativeChestExerciseId = altExercisesResponse.json().exercises[0]?.id || 2;

    const backExercisesResponse = await app.inject({
      method: 'GET',
      url: '/api/exercises?muscle_group=back',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    backExerciseId = backExercisesResponse.json().exercises[0]?.id || 10;

    // Create test program and program day
    // Note: This assumes POST /api/programs endpoint exists (from T006-T008)
    // If it doesn't exist yet, these calls will fail, which is expected in TDD
    const programResponse = await app.inject({
      method: 'POST',
      url: '/api/programs',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        name: 'Test Push/Pull/Legs',
        phase: 'mav',
        start_date: '2025-10-03'
      }
    });

    programId = programResponse.json().program_id || 1;

    const programDayResponse = await app.inject({
      method: 'POST',
      url: '/api/program-days',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        program_id: programId,
        name: 'Push Day',
        day_of_week: 1
      }
    });

    programDayId = programDayResponse.json().program_day_id || 1;
  });

  // T009: Contract test POST /api/program-exercises
  await t.test('T009: POST /api/program-exercises', async (t) => {
    await t.test('should add exercise to program day (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created');
      const body = response.json();
      t.type(body.program_exercise_id, 'number', 'Returns program_exercise_id');
      t.ok(body.volume_warning === null || typeof body.volume_warning === 'string', 'Returns volume_warning (nullable)');

      // Store for later tests
      programExerciseId = body.program_exercise_id;
    });

    await t.test('should allow duplicate exercises for drop sets (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId, // Same exercise as before
          target_sets: 2,
          target_rep_range: '12-15',
          target_rir: 1
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created (allows duplicates)');
      const body = response.json();
      t.type(body.program_exercise_id, 'number', 'Returns program_exercise_id');
    });

    await t.test('should return volume warning when exceeding MRV (201)', async (t) => {
      // Add many exercises to push volume over MRV
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(app.inject({
          method: 'POST',
          url: '/api/program-exercises',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: {
            program_day_id: programDayId,
            exercise_id: chestExerciseId,
            target_sets: 4,
            target_rep_range: '8-12',
            target_rir: 2
          }
        }));
      }

      const responses = await Promise.all(promises);
      const lastResponse = responses[responses.length - 1];
      const body = lastResponse?.json();

      // Should warn about exceeding MRV (Chest MRV ~22 sets, we've added 4+2+6*4=30 sets)
      t.ok(body?.volume_warning?.includes('MRV') || body?.volume_warning?.includes('exceeds'), 'Returns volume warning for MRV');
    });

    await t.test('should accept optional order_index (201)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 3,
          target_rep_range: '6-10',
          target_rir: 3,
          order_index: 0 // Insert at beginning
        }
      });

      t.equal(response.statusCode, 201, 'Returns 201 Created');
      const body = response.json();
      t.type(body.program_exercise_id, 'number', 'Returns program_exercise_id');
    });

    await t.test('should return 400 for invalid target_sets (< 1)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 0, // Invalid
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_sets (> 10)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 15, // Invalid
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_rep_range format', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: 'invalid', // Should be "N-M" format
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_rir (< 0)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: -1 // Invalid
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_rir (> 4)', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 5 // Invalid (RIR scale is 0-4)
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for missing required fields', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId
          // Missing exercise_id, target_sets, target_rep_range, target_rir
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for non-existent program_day_id', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: 99999, // Non-existent
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for non-existent exercise_id', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: 99999, // Non-existent
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T010: Contract test PATCH /api/program-exercises/:id
  await t.test('T010: PATCH /api/program-exercises/:id', async (t) => {
    await t.test('should update target_sets (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_sets: 5
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.updated, true, 'Returns updated=true');
      t.ok(body.volume_warning === null || typeof body.volume_warning === 'string', 'Returns volume_warning (nullable)');
    });

    await t.test('should update target_rep_range (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_rep_range: '6-10'
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.updated, true, 'Returns updated=true');
    });

    await t.test('should update target_rir (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_rir: 1
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.updated, true, 'Returns updated=true');
    });

    await t.test('should update multiple fields at once (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_sets: 3,
          target_rep_range: '10-15',
          target_rir: 2
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.updated, true, 'Returns updated=true');
    });

    await t.test('should return 400 for invalid target_sets', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_sets: 0 // Invalid
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_rep_range format', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_rep_range: 'abc' // Invalid format
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid target_rir', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_rir: 10 // Invalid (> 4)
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for non-existent program_exercise_id', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/99999',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          target_sets: 4
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/program-exercises/${programExerciseId}`,
        payload: {
          target_sets: 4
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T012: Contract test PUT /api/program-exercises/:id/swap
  await t.test('T012: PUT /api/program-exercises/:id/swap', async (t) => {
    await t.test('should swap exercise with compatible alternative (200)', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/program-exercises/${programExerciseId}/swap`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          new_exercise_id: alternativeChestExerciseId
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.swapped, true, 'Returns swapped=true');
      t.type(body.old_exercise_name, 'string', 'Returns old_exercise_name');
      t.type(body.new_exercise_name, 'string', 'Returns new_exercise_name');
      t.not(body.old_exercise_name, body.new_exercise_name, 'Exercise names are different');
    });

    await t.test('should return 400 for incompatible muscle groups', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/program-exercises/${programExerciseId}/swap`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          new_exercise_id: backExerciseId // Back exercise (incompatible with chest)
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
      t.ok(body.error.includes('incompatible') || body.error.includes('muscle'), 'Error mentions incompatibility');
    });

    await t.test('should return 400 for missing new_exercise_id', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/program-exercises/${programExerciseId}/swap`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {}
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for non-existent program_exercise_id', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/program-exercises/99999/swap',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          new_exercise_id: alternativeChestExerciseId
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 for non-existent new_exercise_id', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/program-exercises/${programExerciseId}/swap`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          new_exercise_id: 99999
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/program-exercises/${programExerciseId}/swap`,
        payload: {
          new_exercise_id: alternativeChestExerciseId
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T013: Contract test PATCH /api/program-exercises/batch-reorder
  await t.test('T013: PATCH /api/program-exercises/batch-reorder', async (t) => {
    // Create additional program exercises for reordering tests
    let exerciseId1: number;
    let exerciseId2: number;
    let exerciseId3: number;

    await t.before(async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });
      exerciseId1 = response1.json().program_exercise_id;

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: alternativeChestExerciseId,
          target_sets: 3,
          target_rep_range: '10-15',
          target_rir: 2
        }
      });
      exerciseId2 = response2.json().program_exercise_id;

      const response3 = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 2,
          target_rep_range: '12-15',
          target_rir: 1
        }
      });
      exerciseId3 = response3.json().program_exercise_id;
    });

    await t.test('should reorder exercises (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_order: [
            { program_exercise_id: exerciseId3, new_order_index: 0 },
            { program_exercise_id: exerciseId1, new_order_index: 1 },
            { program_exercise_id: exerciseId2, new_order_index: 2 }
          ]
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.ok(body.reordered === true || body.success === true, 'Returns success indicator');
    });

    await t.test('should handle partial reordering (200)', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_order: [
            { program_exercise_id: exerciseId1, new_order_index: 0 }
            // Only reorder one exercise
          ]
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
    });

    await t.test('should return 400 for missing program_day_id', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          exercise_order: [
            { program_exercise_id: exerciseId1, new_order_index: 0 }
          ]
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for missing exercise_order', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for invalid exercise_order format', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_order: 'invalid' // Should be array
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 400 for negative order_index', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_order: [
            { program_exercise_id: exerciseId1, new_order_index: -1 }
          ]
        }
      });

      t.equal(response.statusCode, 400, 'Returns 400 Bad Request');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/program-exercises/batch-reorder',
        payload: {
          program_day_id: programDayId,
          exercise_order: [
            { program_exercise_id: exerciseId1, new_order_index: 0 }
          ]
        }
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  // T011: Contract test DELETE /api/program-exercises/:id
  // (Placed last to avoid deleting test data needed by other tests)
  await t.test('T011: DELETE /api/program-exercises/:id', async (t) => {
    let deletableExerciseId: number;

    await t.before(async () => {
      // Create a fresh exercise to delete
      const response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: programDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });
      deletableExerciseId = response.json().program_exercise_id;
    });

    await t.test('should delete program exercise (200)', async (t) => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/program-exercises/${deletableExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 200, 'Returns 200 OK');
      const body = response.json();
      t.equal(body.deleted, true, 'Returns deleted=true');
      t.ok(body.volume_warning === null || typeof body.volume_warning === 'string', 'Returns volume_warning (nullable)');
    });

    await t.test('should return volume warning when dropping below MEV (200)', async (t) => {
      // First, create a minimal program day with only MEV volume
      const minimalDayResponse = await app.inject({
        method: 'POST',
        url: '/api/program-days',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_id: programId,
          name: 'Minimal Chest Day',
          day_of_week: 3
        }
      });

      const minimalDayId = minimalDayResponse.json().program_day_id;

      // Add exercises up to just above MEV (Chest MEV ~8 sets)
      await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: minimalDayId,
          exercise_id: chestExerciseId,
          target_sets: 5,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      const exercise2Response = await app.inject({
        method: 'POST',
        url: '/api/program-exercises',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          program_day_id: minimalDayId,
          exercise_id: chestExerciseId,
          target_sets: 4,
          target_rep_range: '8-12',
          target_rir: 2
        }
      });

      // Delete one exercise to drop below MEV
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/program-exercises/${exercise2Response.json().program_exercise_id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(deleteResponse.statusCode, 200, 'Returns 200 OK');
      const body = deleteResponse.json();
      t.ok(body.volume_warning?.includes('MEV') || body.volume_warning?.includes('below'), 'Returns volume warning for MEV');
    });

    await t.test('should return 404 for non-existent program_exercise_id', async (t) => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/program-exercises/99999',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 404 when deleting already deleted exercise', async (t) => {
      // Try to delete the same exercise again
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/program-exercises/${deletableExerciseId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      t.equal(response.statusCode, 404, 'Returns 404 Not Found');
      const body = response.json();
      t.ok(body.error, 'Returns error message');
    });

    await t.test('should return 401 without authentication', async (t) => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/program-exercises/1'
      });

      t.equal(response.statusCode, 401, 'Returns 401 Unauthorized');
    });
  });

  await t.teardown(async () => {
    await app.close();
  });
});
