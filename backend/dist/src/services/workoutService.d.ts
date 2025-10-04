export interface Workout {
    id: number;
    user_id: number;
    program_day_id: number;
    date: string;
    started_at: number | null;
    completed_at: number | null;
    status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
    total_volume_kg: number | null;
    average_rir: number | null;
    synced: number;
    day_name: string | null;
    day_type: 'strength' | 'vo2max' | null;
}
interface ProgramExerciseWithName {
    id: number;
    program_day_id: number;
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: string;
    rir: number;
    exercise_name: string;
}
export interface WorkoutWithExercises extends Workout {
    exercises: ProgramExerciseWithName[];
}
export declare function createWorkout(userId: number, programDayId: number, date: string): Workout;
export declare function listWorkouts(userId: number, startDate?: string, endDate?: string): WorkoutWithExercises[];
export declare function updateWorkoutStatus(userId: number, workoutId: number, status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled', programDayId?: number, totalVolumeKg?: number, averageRir?: number): Workout;
export {};
//# sourceMappingURL=workoutService.d.ts.map