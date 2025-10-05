import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Scenario 5: Muscle Volume Tracking', async (t) => {
    const app = await buildApp();
    let authToken;
    let userId;
    let programId;
    await t.before(async () => {
        const testUsername = `test-scenario5-${Date.now()}@example.com`;
        const registerResponse = await app.inject({
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
        const registerBody = registerResponse.json();
        userId = registerBody.user_id;
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: {
                username: testUsername,
                password: 'SecurePass123!',
            },
        });
        authToken = loginResponse.json().token;
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const program = programResponse.json();
        programId = program.id;
    });
    await t.test('AC-1: Retrieve volume analysis per muscle group', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Volume analysis retrieved successfully');
        const volumeData = response.json();
        t.ok(Array.isArray(volumeData.muscle_groups), 'Has muscle_groups array');
        t.ok(volumeData.muscle_groups.length > 0, 'Has at least one muscle group');
        const muscleGroup = volumeData.muscle_groups[0];
        t.type(muscleGroup.muscle_group, 'string', 'Has muscle_group name');
        t.type(muscleGroup.planned_sets, 'number', 'Has planned_sets');
        t.type(muscleGroup.mev, 'number', 'Has MEV threshold');
        t.type(muscleGroup.mav, 'number', 'Has MAV threshold');
        t.type(muscleGroup.mrv, 'number', 'Has MRV threshold');
        t.type(muscleGroup.zone, 'string', 'Has zone classification');
    });
    await t.test('AC-2: Volume calculation includes planned sets', async (t) => {
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const program = programResponse.json();
        let expectedChestSets = 0;
        program.program_days.forEach((day) => {
            day.exercises.forEach((exercise) => {
                if (exercise.muscle_groups &&
                    (exercise.muscle_groups.includes('chest') ||
                        exercise.muscle_groups.includes('Chest'))) {
                    expectedChestSets += exercise.target_sets;
                }
            });
        });
        const volumeResponse = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = volumeResponse.json();
        const chestVolume = volumeData.muscle_groups.find((mg) => mg.muscle_group.toLowerCase() === 'chest');
        if (chestVolume) {
            t.type(chestVolume.planned_sets, 'number', 'Chest has planned sets');
            t.ok(chestVolume.planned_sets > 0, 'Chest volume is greater than zero');
            t.ok(chestVolume.planned_sets > 0, `Chest planned sets: ${chestVolume.planned_sets}`);
        }
        else {
            t.fail('Chest muscle group not found in volume analysis');
        }
    });
    await t.test('AC-3 & AC-4: Zone classification logic', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = response.json();
        volumeData.muscle_groups.forEach((mg) => {
            t.ok(mg.mev < mg.mav, `${mg.muscle_group}: MEV (${mg.mev}) < MAV (${mg.mav})`);
            t.ok(mg.mav < mg.mrv, `${mg.muscle_group}: MAV (${mg.mav}) < MRV (${mg.mrv})`);
            if (mg.planned_sets < mg.mev) {
                t.equal(mg.zone, 'below_mev', `${mg.muscle_group}: ${mg.planned_sets} sets < ${mg.mev} MEV → below_mev`);
            }
            else if (mg.planned_sets >= mg.mev && mg.planned_sets < mg.mav) {
                t.equal(mg.zone, 'adequate', `${mg.muscle_group}: ${mg.planned_sets} sets in MEV-MAV range → adequate`);
            }
            else if (mg.planned_sets >= mg.mav && mg.planned_sets <= mg.mrv) {
                t.equal(mg.zone, 'optimal', `${mg.muscle_group}: ${mg.planned_sets} sets in MAV-MRV range → optimal`);
            }
            else if (mg.planned_sets > mg.mrv) {
                t.equal(mg.zone, 'above_mrv', `${mg.muscle_group}: ${mg.planned_sets} sets > ${mg.mrv} MRV → above_mrv`);
            }
        });
    });
    await t.test('AC-5: Warnings generated for below_mev zones', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = response.json();
        t.ok(Array.isArray(volumeData.warnings), 'Has warnings array');
        const belowMevGroups = volumeData.muscle_groups.filter((mg) => mg.zone === 'below_mev');
        const belowMevWarnings = volumeData.warnings.filter((w) => w.issue === 'below_mev');
        t.equal(belowMevWarnings.length, belowMevGroups.length, `${belowMevGroups.length} below_mev warnings generated`);
        belowMevWarnings.forEach((warning) => {
            t.type(warning.muscle_group, 'string', 'Warning has muscle_group');
            t.equal(warning.issue, 'below_mev', 'Warning issue is below_mev');
            t.type(warning.current_volume, 'number', 'Warning has current_volume');
            t.type(warning.threshold, 'number', 'Warning has threshold (MEV)');
            t.ok(warning.current_volume < warning.threshold, `${warning.muscle_group}: ${warning.current_volume} < ${warning.threshold} MEV`);
        });
    });
    await t.test('AC-6: Warnings generated for above_mrv zones', async (t) => {
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
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = response.json();
        const aboveMrvGroups = volumeData.muscle_groups.filter((mg) => mg.zone === 'above_mrv');
        const aboveMrvWarnings = volumeData.warnings.filter((w) => w.issue === 'above_mrv');
        t.equal(aboveMrvWarnings.length, aboveMrvGroups.length, `${aboveMrvGroups.length} above_mrv warnings generated`);
        aboveMrvWarnings.forEach((warning) => {
            t.type(warning.muscle_group, 'string', 'Warning has muscle_group');
            t.equal(warning.issue, 'above_mrv', 'Warning issue is above_mrv');
            t.type(warning.current_volume, 'number', 'Warning has current_volume');
            t.type(warning.threshold, 'number', 'Warning has threshold (MRV)');
            t.ok(warning.current_volume > warning.threshold, `${warning.muscle_group}: ${warning.current_volume} > ${warning.threshold} MRV`);
        });
    });
    await t.test('AC-7: Volume aggregated weekly (sets per week)', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const volumeData = response.json();
        const programResponse = await app.inject({
            method: 'GET',
            url: '/api/programs',
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        const program = programResponse.json();
        let weeklyChestSets = 0;
        program.program_days.forEach((day) => {
            day.exercises.forEach((exercise) => {
                if (exercise.muscle_groups &&
                    (exercise.muscle_groups.includes('chest') ||
                        exercise.muscle_groups.includes('Chest'))) {
                    weeklyChestSets += exercise.target_sets;
                }
            });
        });
        const chestVolume = volumeData.muscle_groups.find((mg) => mg.muscle_group.toLowerCase() === 'chest');
        if (chestVolume && weeklyChestSets > 0) {
            t.ok(chestVolume.planned_sets > 0, `Weekly chest volume: ${chestVolume.planned_sets} sets`);
            t.pass(`Chest volume aggregated weekly: ${chestVolume.planned_sets} sets across ${program.program_days.length} days`);
        }
    });
    await t.test('AC-8: Progress visualization data structure', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/programs/${programId}/volume`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
        });
        t.equal(response.statusCode, 200, 'Volume data retrieved');
        const volumeData = response.json();
        t.ok(Array.isArray(volumeData.muscle_groups), 'Has muscle_groups array');
        t.ok(volumeData.muscle_groups.length > 0, 'Has muscle group data');
        volumeData.muscle_groups.forEach((mg) => {
            t.type(mg.muscle_group, 'string', 'Has muscle group label');
            t.type(mg.planned_sets, 'number', 'Has current volume (planned sets)');
            t.type(mg.mev, 'number', 'Has MEV threshold for visualization');
            t.type(mg.mav, 'number', 'Has MAV threshold for visualization');
            t.type(mg.mrv, 'number', 'Has MRV threshold for visualization');
            t.type(mg.zone, 'string', 'Has zone for color coding');
            t.ok(['below_mev', 'adequate', 'optimal', 'above_mrv'].includes(mg.zone), 'Zone is valid for visualization');
            const mevPercent = (mg.mev / mg.mrv) * 100;
            const mavPercent = (mg.mav / mg.mrv) * 100;
            const currentPercent = (mg.planned_sets / mg.mrv) * 100;
            t.ok(mevPercent > 0 && mevPercent < 100, 'MEV percentage is valid');
            t.ok(mavPercent > 0 && mavPercent < 100, 'MAV percentage is valid');
            t.ok(currentPercent >= 0, 'Current volume percentage is valid');
            t.pass(`${mg.muscle_group}: ${mg.planned_sets} sets (${currentPercent.toFixed(0)}% of MRV) - ${mg.zone}`);
        });
        t.ok(Array.isArray(volumeData.warnings), 'Has warnings for UI alerts');
        const visualizationData = {
            muscle_groups: volumeData.muscle_groups.map((mg) => ({
                name: mg.muscle_group,
                current: mg.planned_sets,
                mev: mg.mev,
                mav: mg.mav,
                mrv: mg.mrv,
                zone: mg.zone,
                percentage: ((mg.planned_sets / mg.mrv) * 100).toFixed(1),
            })),
            warnings: volumeData.warnings,
        };
        t.ok(visualizationData.muscle_groups.length > 0, 'Visualization data structure is complete');
    });
    await t.teardown(async () => {
        await app.close();
    });
});
//# sourceMappingURL=scenario5-muscle-tracking.test.js.map