export interface RecoveryAssessmentResponse {
    total_score: number;
    volume_adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
}
export declare function createAssessment(userId: number, date: string, sleepQuality: number, muscleSoreness: number, mentalMotivation: number): RecoveryAssessmentResponse;
//# sourceMappingURL=recoveryService.d.ts.map