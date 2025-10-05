export interface VO2maxSession {
    id: number;
    workout_id: number;
    protocol: '4x4' | 'zone2';
    duration_seconds: number;
    intervals_completed: number | null;
    average_hr: number | null;
    peak_hr: number | null;
    estimated_vo2max: number | null;
    synced: number;
}
export interface VO2maxSessionWithDetails {
    id: number;
    workout_id: number;
    protocol: string;
    duration_seconds: number;
    intervals_completed: number | null;
    average_hr: number | null;
    peak_hr: number | null;
    estimated_vo2max: number | null;
    synced: number;
    rpe: number | null;
    notes: string | null;
    completion_status: string | null;
    created_at: number;
    user_id: number;
    date: string;
    status?: string;
}
export interface VO2maxSessionData {
    workout_id: number;
    user_id: number;
    protocol_type: 'norwegian_4x4' | 'zone2';
    duration_minutes: number;
    intervals_completed?: number;
    average_heart_rate?: number;
    peak_heart_rate?: number;
    estimated_vo2max?: number;
}
export interface VO2maxSessionFilters {
    user_id: number;
    start_date?: string;
    end_date?: string;
    protocol_type?: 'norwegian_4x4' | 'zone2';
    limit?: number;
    offset?: number;
}
export interface VO2maxProgressionPoint {
    date: string;
    estimated_vo2max: number;
    protocol: string;
}
export declare function estimateVO2max(age: number, _averageHR?: number): number;
export declare function createVO2maxSession(data: VO2maxSessionData): number;
export declare function getVO2maxSessions(filters: VO2maxSessionFilters): VO2maxSessionWithDetails[];
export declare function getVO2maxProgression(userId: number, startDate?: string, endDate?: string): VO2maxProgressionPoint[];
export declare function getVO2maxSessionById(sessionId: number, userId: number): VO2maxSessionWithDetails | null;
//# sourceMappingURL=vo2maxService.d.ts.map