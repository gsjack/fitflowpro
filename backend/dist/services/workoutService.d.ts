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
export declare function createWorkout(userId: number, programDayId: number, date: string): Workout;
export declare function listWorkouts(userId: number, startDate?: string, endDate?: string): any[];
export declare function updateWorkoutStatus(workoutId: number, status: 'not_started' | 'in_progress' | 'completed' | 'cancelled', totalVolumeKg?: number, averageRir?: number): Workout;
//# sourceMappingURL=workoutService.d.ts.map