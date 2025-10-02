export interface OneRMProgressionPoint {
    date: string;
    estimated_1rm: number;
}
export interface VolumeTrendsPoint {
    week: string;
    total_sets: number;
    mev: number;
    mav: number;
    mrv: number;
}
export interface ConsistencyMetrics {
    adherence_rate: number;
    avg_session_duration: number;
    total_workouts: number;
}
export declare function get1RMProgression(userId: number, exerciseId: number, startDate: string, endDate: string): OneRMProgressionPoint[];
export declare function getVolumeTrends(userId: number, muscleGroup: string, startDate: string, endDate: string): VolumeTrendsPoint[];
export declare function getConsistencyMetrics(userId: number): ConsistencyMetrics;
//# sourceMappingURL=analyticsService.d.ts.map