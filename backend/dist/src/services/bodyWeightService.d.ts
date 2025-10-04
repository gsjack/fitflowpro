import Database from 'better-sqlite3';
export interface BodyWeightEntry {
    id: number;
    user_id: number;
    weight_kg: number;
    date: string;
    notes?: string;
    created_at: number;
}
export interface LogBodyWeightParams {
    user_id: number;
    weight_kg: number;
    date?: string;
    notes?: string;
}
export declare function logBodyWeight(db: Database.Database, params: LogBodyWeightParams): BodyWeightEntry;
export declare function getBodyWeightHistory(db: Database.Database, user_id: number, limit?: number): BodyWeightEntry[];
export declare function deleteBodyWeight(db: Database.Database, user_id: number, id: number): void;
export declare function getLatestBodyWeight(db: Database.Database, user_id: number): BodyWeightEntry | null;
export declare function getWeightChange(db: Database.Database, user_id: number, days: number): {
    weight_change_kg: number;
    percentage_change: number;
} | null;
//# sourceMappingURL=bodyWeightService.d.ts.map