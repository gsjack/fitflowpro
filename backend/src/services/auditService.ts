/**
 * Audit Logging Service
 *
 * Implements security audit logging for authentication events, data exports, and account deletions
 * Constitutional requirement: Security First (V) - audit logging
 */

import { stmtCreateAuditLog } from '../database/db.js';

/**
 * Event types for audit logging
 */
export type AuditEventType =
  | 'auth_login'
  | 'auth_register'
  | 'auth_logout'
  | 'data_export'
  | 'account_deletion';

/**
 * Log authentication event (login, register, logout)
 *
 * @param userId - User ID who performed the action
 * @param eventType - Type of authentication event
 * @param ipAddress - IP address of the request
 * @param timestamp - Event timestamp (UTC milliseconds)
 * @param details - Optional additional context (JSON string)
 */
export function logAuthEvent(
  userId: number,
  eventType: 'auth_login' | 'auth_register' | 'auth_logout',
  ipAddress: string,
  timestamp: number,
  details?: string
): void {
  stmtCreateAuditLog.run(
    userId,
    eventType,
    ipAddress,
    timestamp,
    details ?? null
  );
}

/**
 * Log data export event
 *
 * @param userId - User ID who performed the export
 * @param exportType - Type of data exported (e.g., 'csv_workouts', 'csv_analytics', 'database')
 * @param timestamp - Event timestamp (UTC milliseconds)
 * @param ipAddress - Optional IP address of the request
 */
export function logDataExport(
  userId: number,
  exportType: string,
  timestamp: number,
  ipAddress?: string
): void {
  const details = JSON.stringify({ export_type: exportType });
  stmtCreateAuditLog.run(
    userId,
    'data_export',
    ipAddress ?? 'unknown',
    timestamp,
    details
  );
}

/**
 * Log account deletion event
 *
 * @param userId - User ID of the account being deleted
 * @param timestamp - Event timestamp (UTC milliseconds)
 * @param ipAddress - Optional IP address of the request
 * @param reason - Optional reason for deletion (e.g., 'user_initiated', 'admin_action')
 */
export function logAccountDeletion(
  userId: number,
  timestamp: number,
  ipAddress?: string,
  reason?: string
): void {
  const details = JSON.stringify({ reason: reason ?? 'user_initiated' });
  stmtCreateAuditLog.run(
    userId,
    'account_deletion',
    ipAddress ?? 'unknown',
    timestamp,
    details
  );
}

/**
 * Get audit logs for a specific user
 *
 * @param userId - User ID to retrieve logs for
 * @param limit - Maximum number of logs to retrieve (default: 100)
 * @returns Array of audit log entries
 */
export function getAuditLogsByUser(userId: number, limit: number = 100) {
  const stmt = stmtCreateAuditLog.database.prepare(`
    SELECT * FROM audit_logs
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  return stmt.all(userId, limit);
}

/**
 * Get all audit logs within a date range
 *
 * @param startTimestamp - Start of date range (UTC milliseconds)
 * @param endTimestamp - End of date range (UTC milliseconds)
 * @param limit - Maximum number of logs to retrieve (default: 100)
 * @returns Array of audit log entries
 */
export function getAuditLogsByDateRange(
  startTimestamp: number,
  endTimestamp: number,
  limit: number = 100
) {
  const stmt = stmtCreateAuditLog.database.prepare(`
    SELECT * FROM audit_logs
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  return stmt.all(startTimestamp, endTimestamp, limit);
}
