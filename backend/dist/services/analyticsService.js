import { stmt1RMProgression, stmtVolumeTrends, stmtConsistencyMetrics, } from '../database/db.js';
const VOLUME_LANDMARKS = {
    chest: { mev: 8, mav: 14, mrv: 22 },
    back_lats: { mev: 10, mav: 16, mrv: 26 },
    back_traps: { mev: 6, mav: 12, mrv: 20 },
    shoulders_front: { mev: 4, mav: 8, mrv: 14 },
    shoulders_side: { mev: 8, mav: 16, mrv: 26 },
    shoulders_rear: { mev: 8, mav: 14, mrv: 22 },
    biceps: { mev: 6, mav: 12, mrv: 20 },
    triceps: { mev: 6, mav: 12, mrv: 22 },
    quads: { mev: 8, mav: 14, mrv: 24 },
    hamstrings: { mev: 6, mav: 12, mrv: 20 },
    glutes: { mev: 6, mav: 12, mrv: 20 },
    calves: { mev: 8, mav: 14, mrv: 22 },
    abs: { mev: 8, mav: 16, mrv: 28 },
};
export function get1RMProgression(userId, exerciseId, startDate, endDate) {
    const results = stmt1RMProgression.all(userId, exerciseId, startDate, endDate);
    return results.map((row) => ({
        date: row.date,
        estimated_1rm: Math.round(row.estimated_1rm * 10) / 10,
    }));
}
export function getVolumeTrends(userId, muscleGroup, startDate, endDate) {
    const results = stmtVolumeTrends.all(userId, startDate, endDate, muscleGroup);
    const landmarks = VOLUME_LANDMARKS[muscleGroup] || { mev: 0, mav: 0, mrv: 0 };
    return results.map((row) => ({
        week: row.week,
        total_sets: row.total_sets,
        mev: landmarks.mev,
        mav: landmarks.mav,
        mrv: landmarks.mrv,
    }));
}
export function getConsistencyMetrics(userId) {
    const result = stmtConsistencyMetrics.get(userId);
    const adherenceRate = result.total_workouts > 0 ? result.completed_workouts / result.total_workouts : 0;
    return {
        adherence_rate: Math.round(adherenceRate * 1000) / 1000,
        avg_session_duration: result.avg_session_duration || 0,
        total_workouts: result.total_workouts,
    };
}
//# sourceMappingURL=analyticsService.js.map