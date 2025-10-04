import tap from 'tap';
import { getExercises, getExerciseById } from '../../src/services/exerciseService.js';
tap.test('Exercise Service Unit Tests', async (t) => {
    await t.test('getExercises()', async (t) => {
        await t.test('should return all exercises without filters', async (t) => {
            const exercises = getExercises();
            t.equal(exercises.length, 70, 'Returns all 70 seeded exercises');
            t.ok(exercises[0].id, 'Exercises have IDs');
            t.ok(exercises[0].name, 'Exercises have names');
            t.ok(Array.isArray(exercises[0].secondary_muscle_groups), 'secondary_muscle_groups is parsed array');
        });
        await t.test('should filter by muscle_group (primary)', async (t) => {
            const exercises = getExercises({ muscle_group: 'chest' });
            t.ok(exercises.length > 0, 'Returns at least one chest exercise');
            t.ok(exercises.every((ex) => ex.primary_muscle_group === 'chest' ||
                ex.secondary_muscle_groups.includes('chest')), 'All exercises target chest');
        });
        await t.test('should filter by muscle_group (secondary)', async (t) => {
            const exercises = getExercises({ muscle_group: 'triceps' });
            t.ok(exercises.length > 0, 'Returns at least one exercise with triceps');
            t.ok(exercises.every((ex) => ex.primary_muscle_group === 'triceps' ||
                ex.secondary_muscle_groups.includes('triceps')), 'All exercises target triceps');
        });
        await t.test('should filter by equipment', async (t) => {
            const exercises = getExercises({ equipment: 'barbell' });
            t.ok(exercises.length > 0, 'Returns at least one barbell exercise');
            t.ok(exercises.every((ex) => ex.equipment === 'barbell'), 'All exercises use barbell');
        });
        await t.test('should filter by movement_pattern', async (t) => {
            const exercises = getExercises({ movement_pattern: 'compound' });
            t.ok(exercises.length > 0, 'Returns at least one compound exercise');
            t.ok(exercises.every((ex) => ex.movement_pattern === 'compound'), 'All exercises are compound');
        });
        await t.test('should filter by difficulty', async (t) => {
            const exercises = getExercises({ difficulty: 'beginner' });
            t.ok(exercises.length > 0, 'Returns at least one beginner exercise');
            t.ok(exercises.every((ex) => ex.difficulty === 'beginner'), 'All exercises are beginner');
        });
        await t.test('should combine multiple filters', async (t) => {
            const exercises = getExercises({
                equipment: 'barbell',
                movement_pattern: 'compound',
            });
            t.ok(exercises.length > 0, 'Returns at least one compound barbell exercise');
            t.ok(exercises.every((ex) => ex.equipment === 'barbell'), 'All use barbell');
            t.ok(exercises.every((ex) => ex.movement_pattern === 'compound'), 'All are compound');
        });
        await t.test('should return empty array for no matches', async (t) => {
            const exercises = getExercises({
                muscle_group: 'abs',
                equipment: 'barbell',
            });
            t.ok(Array.isArray(exercises), 'Returns array');
        });
        await t.test('should throw error for invalid muscle_group', async (t) => {
            t.throws(() => getExercises({ muscle_group: 'invalid' }), /Invalid muscle_group/, 'Throws error for invalid muscle group');
        });
    });
    await t.test('getExerciseById()', async (t) => {
        await t.test('should return exercise by ID', async (t) => {
            const exercise = getExerciseById(1);
            t.ok(exercise, 'Returns exercise');
            t.equal(exercise?.id, 1, 'Correct ID');
            t.type(exercise?.name, 'string', 'Has name');
            t.type(exercise?.primary_muscle_group, 'string', 'Has primary muscle group');
            t.ok(Array.isArray(exercise?.secondary_muscle_groups), 'secondary_muscle_groups is array');
            t.type(exercise?.description, 'string', 'Has description');
            t.type(exercise?.equipment, 'string', 'Has equipment');
            t.type(exercise?.movement_pattern, 'string', 'Has movement pattern');
        });
        await t.test('should return undefined for non-existent ID', async (t) => {
            const exercise = getExerciseById(99999);
            t.notOk(exercise, 'Returns undefined');
        });
        await t.test('should parse secondary_muscle_groups correctly', async (t) => {
            const allExercises = getExercises({ movement_pattern: 'isolation' });
            t.ok(allExercises.length > 0, 'At least one isolation exercise exists');
            const isolationExercise = allExercises[0];
            const exercise = getExerciseById(isolationExercise.id);
            t.ok(exercise, 'Returns exercise');
            t.ok(Array.isArray(exercise?.secondary_muscle_groups), 'secondary_muscle_groups is array');
            t.equal(exercise?.movement_pattern, 'isolation', 'Exercise is isolation movement');
        });
    });
});
//# sourceMappingURL=exerciseService.test.js.map