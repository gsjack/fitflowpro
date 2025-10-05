import { stmt1RMProgression, stmtVolumeTrends, stmtConsistencyMetrics } from '../database/db.js';
import { VOLUME_LANDMARKS } from '../utils/constants.js';
import { roundToDecimals } from '../utils/calculations.js';
export function get1RMProgression(userId, exerciseId, startDate, endDate) {
    const results = stmt1RMProgression.all(userId, exerciseId, startDate, endDate);
    return results.map((row) => ({
        date: row.date,
        estimated_1rm: roundToDecimals(row.estimated_1rm, 1),
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
        adherence_rate: roundToDecimals(adherenceRate, 3),
        avg_session_duration: result.avg_session_duration || 0,
        total_workouts: result.total_workouts,
    };
}
//# sourceMappingURL=analyticsService.js.map