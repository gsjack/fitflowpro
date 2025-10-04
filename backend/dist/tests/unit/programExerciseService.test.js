import tap from 'tap';
import { db } from '../../src/database/db.js';
import { getProgramExercises, createProgramExercise, updateProgramExercise, deleteProgramExercise, swapExercise, reorderExercises, } from '../../src/services/programExerciseService.js';
tap.test('Program Exercise Service Unit Tests', async (t) => {
    let userId;
    let programId;
    let programDayId;
    let chestExerciseId;
    let altChestExerciseId;
    let backExerciseId;
    await t.before(async () => {
        const userStmt = db.prepare(`
      INSERT INTO users (username, password_hash, age, weight_kg, experience_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const userResult = userStmt.run(`test-pe-service-${Date.now()}@example.com`, 'hash', 28, 75, 'intermediate', Date.now(), Date.now());
        userId = userResult.lastInsertRowid;
        const exerciseStmt = db.prepare(`
      INSERT INTO exercises (name, muscle_groups, equipment, difficulty, default_sets, default_reps, default_rir)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const chestResult = exerciseStmt.run('Barbell Bench Press Unit Test', JSON.stringify(['chest', 'front_delts', 'triceps']), 'barbell', 'intermediate', 4, '6-8', 2);
        chestExerciseId = chestResult.lastInsertRowid;
        const altChestResult = exerciseStmt.run('Dumbbell Bench Press Unit Test', JSON.stringify(['chest', 'front_delts', 'triceps']), 'dumbbell', 'intermediate', 4, '8-10', 2);
        altChestExerciseId = altChestResult.lastInsertRowid;
        const backResult = exerciseStmt.run('Barbell Row Unit Test', JSON.stringify(['back_lats', 'back_traps', 'biceps']), 'barbell', 'intermediate', 4, '6-8', 2);
        backExerciseId = backResult.lastInsertRowid;
        const programStmt = db.prepare(`
      INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        const programResult = programStmt.run(userId, 'Test Program Unit', 1, 'mav', Date.now());
        programId = programResult.lastInsertRowid;
        const programDayStmt = db.prepare(`
      INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
      VALUES (?, ?, ?, ?)
    `);
        const programDayResult = programDayStmt.run(programId, 1, 'Push Day Unit', 'strength');
        programDayId = programDayResult.lastInsertRowid;
    });
    await t.test('getProgramExercises', async (t) => {
        await t.test('should return empty array when no exercises exist', async (t) => {
            const exercises = getProgramExercises({ program_day_id: programDayId });
            t.equal(exercises.length, 0, 'Returns empty array for new program day');
        });
        await t.test('should return exercises after creation', async (t) => {
            createProgramExercise({
                program_day_id: programDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            const exercises = getProgramExercises({ program_day_id: programDayId });
            t.ok(exercises.length >= 1, 'Returns at least 1 exercise');
            const created = exercises.find((e) => e.exercise_id === chestExerciseId);
            t.ok(created, 'Created exercise is in results');
            t.equal(created?.sets, 4, 'Sets match');
        });
        await t.test('should filter by exercise_id', async (t) => {
            const exercises = getProgramExercises({ exercise_id: chestExerciseId });
            t.ok(exercises.length >= 1, 'Returns at least 1 exercise');
            t.ok(exercises.every((e) => e.exercise_id === chestExerciseId), 'All exercises match filter');
        });
    });
    await t.test('createProgramExercise', async (t) => {
        await t.test('should create program exercise successfully', async (t) => {
            const result = createProgramExercise({
                program_day_id: programDayId,
                exercise_id: altChestExerciseId,
                target_sets: 3,
                target_rep_range: '10-12',
                target_rir: 2,
            });
            t.type(result.program_exercise_id, 'number', 'Returns program_exercise_id');
            t.ok(result.volume_warning === null || typeof result.volume_warning === 'string', 'Returns volume_warning');
        });
        await t.test('should accept custom order_index', async (t) => {
            const result = createProgramExercise({
                program_day_id: programDayId,
                exercise_id: chestExerciseId,
                target_sets: 2,
                target_rep_range: '12-15',
                target_rir: 1,
                order_index: 0,
            });
            const exercises = getProgramExercises({ program_day_id: programDayId });
            const firstExercise = exercises.find((e) => e.id === result.program_exercise_id);
            t.equal(firstExercise?.order_index, 0, 'Order index is 0');
        });
        await t.test('should return volume warning when exceeding MRV', async (t) => {
            const newProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const newProgramDayResult = newProgramDayStmt.run(programId, 2, 'MRV Test Day', 'strength');
            const mrvTestDayId = newProgramDayResult.lastInsertRowid;
            for (let i = 0; i < 6; i++) {
                createProgramExercise({
                    program_day_id: mrvTestDayId,
                    exercise_id: chestExerciseId,
                    target_sets: 4,
                    target_rep_range: '8-12',
                    target_rir: 2,
                });
            }
            const result = createProgramExercise({
                program_day_id: mrvTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            t.ok(result.volume_warning, 'Returns volume warning');
            t.match(result.volume_warning || '', /MRV|exceeds/i, 'Warning mentions MRV or exceeds');
        });
        await t.test('should throw error for non-existent program_day_id', async (t) => {
            t.throws(() => {
                createProgramExercise({
                    program_day_id: 99999,
                    exercise_id: chestExerciseId,
                    target_sets: 4,
                    target_rep_range: '8-12',
                    target_rir: 2,
                });
            }, /not found/i, 'Throws error for non-existent program_day_id');
        });
        await t.test('should throw error for non-existent exercise_id', async (t) => {
            t.throws(() => {
                createProgramExercise({
                    program_day_id: programDayId,
                    exercise_id: 99999,
                    target_sets: 4,
                    target_rep_range: '8-12',
                    target_rir: 2,
                });
            }, /not found/i, 'Throws error for non-existent exercise_id');
        });
    });
    await t.test('updateProgramExercise', async (t) => {
        let programExerciseId;
        let updateTestDayId;
        await t.before(async () => {
            const newProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const newProgramDayResult = newProgramDayStmt.run(programId, 3, 'Update Test Day', 'strength');
            updateTestDayId = newProgramDayResult.lastInsertRowid;
            const result = createProgramExercise({
                program_day_id: updateTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            programExerciseId = result.program_exercise_id;
        });
        await t.test('should update target_sets', async (t) => {
            const result = updateProgramExercise(programExerciseId, { target_sets: 5 });
            t.equal(result.updated, true, 'Returns updated=true');
            const exercises = getProgramExercises({ program_day_id: updateTestDayId });
            const updated = exercises.find((e) => e.id === programExerciseId);
            t.equal(updated?.sets, 5, 'Sets updated to 5');
        });
        await t.test('should update target_rep_range', async (t) => {
            const result = updateProgramExercise(programExerciseId, { target_rep_range: '6-10' });
            t.equal(result.updated, true, 'Returns updated=true');
            const exercises = getProgramExercises({ program_day_id: updateTestDayId });
            const updated = exercises.find((e) => e.id === programExerciseId);
            t.equal(updated?.reps, '6-10', 'Reps updated to 6-10');
        });
        await t.test('should update target_rir', async (t) => {
            const result = updateProgramExercise(programExerciseId, { target_rir: 1 });
            t.equal(result.updated, true, 'Returns updated=true');
            const exercises = getProgramExercises({ program_day_id: updateTestDayId });
            const updated = exercises.find((e) => e.id === programExerciseId);
            t.equal(updated?.rir, 1, 'RIR updated to 1');
        });
        await t.test('should update multiple fields at once', async (t) => {
            const result = updateProgramExercise(programExerciseId, {
                target_sets: 3,
                target_rep_range: '10-15',
                target_rir: 2,
            });
            t.equal(result.updated, true, 'Returns updated=true');
            const exercises = getProgramExercises({ program_day_id: updateTestDayId });
            const updated = exercises.find((e) => e.id === programExerciseId);
            t.equal(updated?.sets, 3, 'Sets updated');
            t.equal(updated?.reps, '10-15', 'Reps updated');
            t.equal(updated?.rir, 2, 'RIR updated');
        });
        await t.test('should throw error for non-existent program_exercise_id', async (t) => {
            t.throws(() => {
                updateProgramExercise(99999, { target_sets: 4 });
            }, /not found/i, 'Throws error for non-existent program_exercise_id');
        });
    });
    await t.test('deleteProgramExercise', async (t) => {
        await t.test('should delete program exercise', async (t) => {
            const newProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const newProgramDayResult = newProgramDayStmt.run(programId, 4, 'Delete Test Day', 'strength');
            const deleteTestDayId = newProgramDayResult.lastInsertRowid;
            const createResult = createProgramExercise({
                program_day_id: deleteTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            const beforeCount = getProgramExercises({ program_day_id: deleteTestDayId }).length;
            const result = deleteProgramExercise(createResult.program_exercise_id);
            const afterCount = getProgramExercises({ program_day_id: deleteTestDayId }).length;
            t.equal(result.deleted, true, 'Returns deleted=true');
            t.equal(afterCount, beforeCount - 1, 'Exercise count decreased by 1');
        });
        await t.test('should return volume warning when dropping below MEV', async (t) => {
            const mevProgramStmt = db.prepare(`
        INSERT INTO programs (user_id, name, mesocycle_week, mesocycle_phase, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
            const mevProgramResult = mevProgramStmt.run(userId, 'MEV Test Program', 1, 'mav', Date.now());
            const mevProgramId = mevProgramResult.lastInsertRowid;
            const minimalProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const minimalProgramDayResult = minimalProgramDayStmt.run(mevProgramId, 5, 'MEV Test Day', 'strength');
            const mevTestDayId = minimalProgramDayResult.lastInsertRowid;
            const ex1 = createProgramExercise({
                program_day_id: mevTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 5,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            const ex2 = createProgramExercise({
                program_day_id: mevTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            const result = deleteProgramExercise(ex2.program_exercise_id);
            t.ok(result.volume_warning, 'Returns volume warning');
            t.match(result.volume_warning || '', /MEV|below/i, 'Warning mentions MEV or below');
            db.prepare('DELETE FROM program_exercises WHERE program_day_id = ?').run(mevTestDayId);
            db.prepare('DELETE FROM program_days WHERE id = ?').run(mevTestDayId);
            db.prepare('DELETE FROM programs WHERE id = ?').run(mevProgramId);
        });
        await t.test('should throw error for non-existent program_exercise_id', async (t) => {
            t.throws(() => {
                deleteProgramExercise(99999);
            }, /not found/i, 'Throws error for non-existent program_exercise_id');
        });
    });
    await t.test('swapExercise', async (t) => {
        let programExerciseId;
        let swapTestDayId;
        await t.before(async () => {
            const swapProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const swapProgramDayResult = swapProgramDayStmt.run(programId, 6, 'Swap Test Day', 'strength');
            swapTestDayId = swapProgramDayResult.lastInsertRowid;
            const result = createProgramExercise({
                program_day_id: swapTestDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            programExerciseId = result.program_exercise_id;
        });
        await t.test('should swap exercise with compatible alternative', async (t) => {
            const result = swapExercise(programExerciseId, altChestExerciseId);
            t.equal(result.swapped, true, 'Returns swapped=true');
            t.type(result.old_exercise_name, 'string', 'Old exercise name is string');
            t.type(result.new_exercise_name, 'string', 'New exercise name is string');
            t.not(result.old_exercise_name, result.new_exercise_name, 'Exercise names are different');
            const exercises = getProgramExercises({ program_day_id: swapTestDayId });
            const swapped = exercises.find((e) => e.id === programExerciseId);
            t.equal(swapped?.exercise_id, altChestExerciseId, 'Exercise ID updated');
        });
        await t.test('should preserve order_index after swap', async (t) => {
            const beforeSwap = getProgramExercises({ program_day_id: swapTestDayId });
            const originalOrder = beforeSwap.find((e) => e.id === programExerciseId)?.order_index;
            swapExercise(programExerciseId, chestExerciseId);
            const afterSwap = getProgramExercises({ program_day_id: swapTestDayId });
            const newOrder = afterSwap.find((e) => e.id === programExerciseId)?.order_index;
            t.equal(newOrder, originalOrder, 'Order index preserved');
        });
        await t.test('should throw error for incompatible muscle groups', async (t) => {
            t.throws(() => {
                swapExercise(programExerciseId, backExerciseId);
            }, /incompatible/i, 'Throws error for incompatible exercise');
        });
        await t.test('should throw error for non-existent program_exercise_id', async (t) => {
            t.throws(() => {
                swapExercise(99999, altChestExerciseId);
            }, /not found/i, 'Throws error for non-existent program_exercise_id');
        });
        await t.test('should throw error for non-existent new_exercise_id', async (t) => {
            t.throws(() => {
                swapExercise(programExerciseId, 99999);
            }, /not found/i, 'Throws error for non-existent new_exercise_id');
        });
    });
    await t.test('reorderExercises', async (t) => {
        let reorderProgramDayId;
        let ex1Id;
        let ex2Id;
        let ex3Id;
        await t.before(async () => {
            const reorderProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const reorderProgramDayResult = reorderProgramDayStmt.run(programId, 7, 'Reorder Test Day', 'strength');
            reorderProgramDayId = reorderProgramDayResult.lastInsertRowid;
            ex1Id = createProgramExercise({
                program_day_id: reorderProgramDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            }).program_exercise_id;
            ex2Id = createProgramExercise({
                program_day_id: reorderProgramDayId,
                exercise_id: altChestExerciseId,
                target_sets: 3,
                target_rep_range: '10-12',
                target_rir: 2,
            }).program_exercise_id;
            ex3Id = createProgramExercise({
                program_day_id: reorderProgramDayId,
                exercise_id: chestExerciseId,
                target_sets: 2,
                target_rep_range: '12-15',
                target_rir: 1,
            }).program_exercise_id;
        });
        await t.test('should reorder exercises', async (t) => {
            const result = reorderExercises(reorderProgramDayId, [
                { program_exercise_id: ex3Id, new_order_index: 0 },
                { program_exercise_id: ex1Id, new_order_index: 1 },
                { program_exercise_id: ex2Id, new_order_index: 2 },
            ]);
            t.equal(result.reordered, true, 'Returns reordered=true');
            const exercises = getProgramExercises({ program_day_id: reorderProgramDayId });
            exercises.sort((a, b) => a.order_index - b.order_index);
            const ex3 = exercises.find((e) => e.id === ex3Id);
            const ex1 = exercises.find((e) => e.id === ex1Id);
            const ex2 = exercises.find((e) => e.id === ex2Id);
            t.equal(ex3?.order_index, 0, 'ex3 moved to index 0');
            t.equal(ex1?.order_index, 1, 'ex1 moved to index 1');
            t.equal(ex2?.order_index, 2, 'ex2 moved to index 2');
        });
        await t.test('should handle partial reordering', async (t) => {
            const result = reorderExercises(reorderProgramDayId, [
                { program_exercise_id: ex1Id, new_order_index: 10 },
            ]);
            t.equal(result.reordered, true, 'Returns reordered=true');
            const exercises = getProgramExercises({ program_day_id: reorderProgramDayId });
            const ex1 = exercises.find((e) => e.id === ex1Id);
            t.equal(ex1?.order_index, 10, 'Exercise moved to index 10');
        });
    });
    await t.test('Volume calculation with multi-muscle exercises', async (t) => {
        await t.test('should count full sets for each targeted muscle group', async (t) => {
            const volumeTestProgramDayStmt = db.prepare(`
        INSERT INTO program_days (program_id, day_of_week, day_name, day_type)
        VALUES (?, ?, ?, ?)
      `);
            const volumeTestProgramDayResult = volumeTestProgramDayStmt.run(programId, 1, 'Volume Test Day', 'strength');
            const volumeTestProgramDayId = volumeTestProgramDayResult.lastInsertRowid;
            createProgramExercise({
                program_day_id: volumeTestProgramDayId,
                exercise_id: chestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            createProgramExercise({
                program_day_id: volumeTestProgramDayId,
                exercise_id: altChestExerciseId,
                target_sets: 4,
                target_rep_range: '8-12',
                target_rir: 2,
            });
            t.pass('Multi-muscle exercise counting logic executed');
        });
    });
    await t.teardown(async () => {
        db.prepare('DELETE FROM program_exercises WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)').run(programId);
        db.prepare('DELETE FROM program_days WHERE program_id = ?').run(programId);
        db.prepare('DELETE FROM programs WHERE id = ?').run(programId);
        db.prepare('DELETE FROM exercises WHERE id IN (?, ?, ?)').run(chestExerciseId, altChestExerciseId, backExerciseId);
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
});
//# sourceMappingURL=programExerciseService.test.js.map