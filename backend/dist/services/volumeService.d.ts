export interface MuscleGroupVolumeTracking {
    muscle_group: string;
    completed_sets: number;
    planned_sets: number;
    remaining_sets: number;
    mev: number;
    mav: number;
    mrv: number;
    completion_percentage: number;
    zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv' | 'on_track';
    warning: string | null;
}
export interface CurrentWeekVolume {
    week_start: string;
    week_end: string;
    muscle_groups: MuscleGroupVolumeTracking[];
}
export interface HistoricalVolume {
    muscle_group: string;
    completed_sets: number;
    mev: number;
    mav: number;
    mrv: number;
}
export interface VolumeTrendsResponse {
    weeks: Array<{
        week_start: string;
        muscle_groups: HistoricalVolume[];
    }>;
}
export interface ProgramVolumeAnalysis {
    program_id: number;
    mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload';
    muscle_groups: Array<{
        muscle_group: string;
        planned_weekly_sets: number;
        mev: number;
        mav: number;
        mrv: number;
        zone: 'below_mev' | 'adequate' | 'optimal' | 'above_mrv';
        warning: string | null;
    }>;
}
export declare function getCurrentWeekVolume(userId: number): CurrentWeekVolume;
export declare function getVolumeHistory(userId: number, weeks?: number, muscleGroupFilter?: string): VolumeTrendsResponse;
export declare function getProgramVolumeAnalysis(userId: number): ProgramVolumeAnalysis | null;
//# sourceMappingURL=volumeService.d.ts.map