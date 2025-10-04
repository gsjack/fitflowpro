import { stmtCreateAuditLog } from '../database/db.js';
export function logAuthEvent(userId, eventType, ipAddress, timestamp, details) {
    stmtCreateAuditLog.run(userId, eventType, ipAddress, timestamp, details ?? null);
}
export function logDataExport(userId, exportType, timestamp, ipAddress) {
    const details = JSON.stringify({ export_type: exportType });
    stmtCreateAuditLog.run(userId, 'data_export', ipAddress ?? 'unknown', timestamp, details);
}
export function logAccountDeletion(userId, timestamp, ipAddress, reason) {
    const details = JSON.stringify({ reason: reason ?? 'user_initiated' });
    stmtCreateAuditLog.run(userId, 'account_deletion', ipAddress ?? 'unknown', timestamp, details);
}
export function getAuditLogsByUser(userId, limit = 100) {
    const stmt = stmtCreateAuditLog.database.prepare(`
    SELECT * FROM audit_logs
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
    return stmt.all(userId, limit);
}
export function getAuditLogsByDateRange(startTimestamp, endTimestamp, limit = 100) {
    const stmt = stmtCreateAuditLog.database.prepare(`
    SELECT * FROM audit_logs
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);
    return stmt.all(startTimestamp, endTimestamp, limit);
}
//# sourceMappingURL=auditService.js.map