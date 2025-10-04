import { stmtCreateWorkout, stmtGetWorkoutsByUser, stmtGetWorkoutsByUserDateRange, stmtUpdateWorkoutStatus, stmtUpdateWorkoutProgramDay, stmtGetWorkoutById, stmtValidateProgramDayOwnership, db, } from '../database/db.js';
export function createWorkout(userId, programDayId, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    const result = stmtCreateWorkout.run(userId, programDayId, date);
    const workoutId = result.lastInsertRowid;
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    return workout;
}
function getProgramExercises(programDayId) {
    return db
        .prepare(`SELECT pe.*, e.name as exercise_name, e.video_url
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
export function updateWorkoutStatus(userId, workoutId, status, programDayId, totalVolumeKg, averageRir) {
    const currentWorkout = stmtGetWorkoutById.get(workoutId);
    if (!currentWorkout) {
        throw new Error(`Workout with ID ${workoutId} not found`);
    }
    if (currentWorkout.user_id !== userId) {
        throw new Error('Not authorized to update this workout');
    }
    if (programDayId !== undefined) {
        if (currentWorkout.status !== 'not_started') {
            throw new Error(`Cannot change program_day_id: workout status is "${currentWorkout.status}". Only "not_started" workouts can be reassigned.`);
        }
        const programDay = stmtValidateProgramDayOwnership.get(programDayId, userId);
        if (!programDay) {
            throw new Error(`Invalid program_day_id ${programDayId}: does not exist or does not belong to user's program`);
        }
        stmtUpdateWorkoutProgramDay.run(programDayId, workoutId);
    }
    if (status !== undefined) {
        let startedAt;
        let completedAt;
        if (status === 'not_started') {
            startedAt = null;
            completedAt = null;
        }
        else if (status === 'in_progress') {
            startedAt = currentWorkout.started_at || Date.now();
            completedAt = currentWorkout.completed_at;
        }
        else if (status === 'completed') {
            startedAt = currentWorkout.started_at;
            completedAt = currentWorkout.completed_at || Date.now();
        }
        else {
            startedAt = currentWorkout.started_at;
            completedAt = currentWorkout.completed_at;
        }
        stmtUpdateWorkoutStatus.run(status, startedAt, completedAt, totalVolumeKg ?? null, averageRir ?? null, workoutId);
    }
    const workout = stmtGetWorkoutById.get(workoutId);
    return workout;
}
//# sourceMappingURL=workoutService.js.map