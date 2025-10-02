import { stmtCreateWorkout, stmtGetWorkoutsByUser, stmtGetWorkoutsByUserDateRange, stmtUpdateWorkoutStatus, db, } from '../database/db.js';
export function createWorkout(userId, programDayId, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    const result = stmtCreateWorkout.run(userId, programDayId, date);
    const workoutId = result.lastInsertRowid;
    const workout = db
        .prepare('SELECT * FROM workouts WHERE id = ?')
        .get(workoutId);
    return workout;
}
function getProgramExercises(programDayId) {
    return db
        .prepare(`SELECT pe.*, e.name as exercise_name
       FROM program_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.program_day_id = ?
       ORDER BY pe.order_index ASC`)
        .all(programDayId);
}
export function listWorkouts(userId, startDate, endDate) {
    let workouts;
    if (startDate && endDate) {
        workouts = stmtGetWorkoutsByUserDateRange.all(userId, startDate, endDate);
    }
    else if (startDate) {
        const allWorkouts = stmtGetWorkoutsByUser.all(userId);
        workouts = allWorkouts.filter((w) => w.date >= startDate);
    }
    else if (endDate) {
        const allWorkouts = stmtGetWorkoutsByUser.all(userId);
        workouts = allWorkouts.filter((w) => w.date <= endDate);
    }
    else {
        workouts = stmtGetWorkoutsByUser.all(userId);
    }
    return workouts.map((workout) => ({
        ...workout,
        exercises: getProgramExercises(workout.program_day_id),
    }));
}
export function updateWorkoutStatus(workoutId, status, totalVolumeKg, averageRir) {
    const completedAt = status === 'completed' ? Date.now() : null;
    stmtUpdateWorkoutStatus.run(status, completedAt, totalVolumeKg ?? null, averageRir ?? null, workoutId);
    const workout = db
        .prepare('SELECT * FROM workouts WHERE id = ?')
        .get(workoutId);
    return workout;
}
//# sourceMappingURL=workoutService.js.map