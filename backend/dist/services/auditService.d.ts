export type AuditEventType = 'auth_login' | 'auth_register' | 'auth_logout' | 'data_export' | 'account_deletion';
export declare function logAuthEvent(userId: number, eventType: 'auth_login' | 'auth_register' | 'auth_logout', ipAddress: string, timestamp: number, details?: string): void;
export declare function logDataExport(userId: number, exportType: string, timestamp: number, ipAddress?: string): void;
export declare function logAccountDeletion(userId: number, timestamp: number, ipAddress?: string, reason?: string): void;
export declare function getAuditLogsByUser(userId: number, limit?: number): unknown[];
export declare function getAuditLogsByDateRange(startTimestamp: number, endTimestamp: number, limit?: number): unknown[];
//# sourceMappingURL=auditService.d.ts.map