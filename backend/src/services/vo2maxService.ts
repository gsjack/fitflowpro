/**
 * VO2max Service
 *
 * Business logic for cardio session tracking with Norwegian 4x4 protocol:
 * - Creating VO2max sessions with Cooper formula estimation
 * - Filtering sessions by date range and protocol
 * - Tracking VO2max progression over time
 */

import { db } from '../database/db.js';

/**
 * VO2max session interface matching database schema
 */
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

/**
 * Extended VO2max session with workout details (for queries with JOIN)
 */
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
  // From workout join
  user_id: number;
  date: string;
  status?: string;
}

/**
 * VO2max session creation data
 */
export interface VO2maxSessionData {
  workout_id: number;
  user_id: number; // For age lookup in Cooper formula
  protocol_type: 'norwegian_4x4' | 'zone2';
  duration_minutes: number;
  intervals_completed?: number;
  average_heart_rate?: number;
  peak_heart_rate?: number;
  estimated_vo2max?: number; // Optional - will be calculated if not provided
}

/**
 * VO2max session filter options
 */
export interface VO2maxSessionFilters {
  user_id: number;
  start_date?: string;
  end_date?: string;
  protocol_type?: 'norwegian_4x4' | 'zone2';
  limit?: number;
  offset?: number;
}

/**
 * VO2max progression data point
 */
export interface VO2maxProgressionPoint {
  date: string;
  estimated_vo2max: number;
  protocol: string;
}

/**
 * Estimate VO2max using Cooper Formula
 *
 * Cooper Formula: VO2max = 15.3 × (max_hr / resting_hr)
 *
 * This is a simplified estimation that uses maximum heart rate (220 - age)
 * and assumes a standard resting heart rate of 60 bpm.
 *
 * @param age - User's age in years
 * @param averageHR - Average heart rate during session (optional, not used in Cooper formula)
 * @returns Estimated VO2max in ml/kg/min, clamped to physiological range 20-80
 */
export function estimateVO2max(age: number, _averageHR?: number): number {
  const maxHR = 220 - age;
  const restingHR = 60; // Standard assumption

  // Cooper Formula
  const vo2max = 15.3 * (maxHR / restingHR);

  // Clamp to physiological range: 20.0 - 80.0 ml/kg/min
  return Math.max(20.0, Math.min(80.0, vo2max));
}

/**
 * Validate VO2max session input data
 *
 * Enforces physiological constraints per Migration 003:
 * - Duration: 10-120 minutes (600-7200 seconds)
 * - Heart rate: 60-220 bpm
 * - VO2max: 20-80 ml/kg/min
 * - Norwegian 4x4: 4 intervals max
 *
 * @param data - Session data to validate
 * @throws Error if validation fails
 */
function validateSessionData(data: VO2maxSessionData): void {
  // Validate duration (10-120 minutes)
  if (data.duration_minutes < 10 || data.duration_minutes > 120) {
    throw new Error('Duration must be between 10 and 120 minutes');
  }

  // Validate average heart rate if provided
  if (data.average_heart_rate !== undefined && data.average_heart_rate !== null) {
    if (data.average_heart_rate < 60 || data.average_heart_rate > 220) {
      throw new Error('Average heart rate must be between 60 and 220 bpm');
    }
  }

  // Validate peak heart rate if provided
  if (data.peak_heart_rate !== undefined && data.peak_heart_rate !== null) {
    if (data.peak_heart_rate < 60 || data.peak_heart_rate > 220) {
      throw new Error('Peak heart rate must be between 60 and 220 bpm');
    }
  }

  // Validate estimated VO2max if provided
  if (data.estimated_vo2max !== undefined && data.estimated_vo2max !== null) {
    if (data.estimated_vo2max < 20.0 || data.estimated_vo2max > 80.0) {
      throw new Error('Estimated VO2max must be between 20.0 and 80.0 ml/kg/min');
    }
  }

  // Validate Norwegian 4x4 intervals
  if (data.protocol_type === 'norwegian_4x4') {
    if (data.intervals_completed !== undefined && data.intervals_completed !== null) {
      if (data.intervals_completed < 0 || data.intervals_completed > 4) {
        throw new Error('Norwegian 4x4 protocol allows 0-4 intervals');
      }
    }

    // Norwegian 4x4 should be 28-32 minutes (4 × [4min work + 3min rest])
    // Allow some flexibility but warn if duration is unusual
    if (data.duration_minutes < 20 || data.duration_minutes > 40) {
      console.warn(
        `[VO2max] Norwegian 4x4 duration ${data.duration_minutes} minutes is outside typical range (28-32 minutes)`
      );
    }
  } else if (data.protocol_type === 'zone2') {
    // Zone 2 should be continuous, 45-120 minutes
    if (data.duration_minutes < 30) {
      console.warn(
        `[VO2max] Zone 2 duration ${data.duration_minutes} minutes is shorter than typical range (45-120 minutes)`
      );
    }
  }
}

/**
 * Create a new VO2max session with automatic VO2max estimation
 *
 * If estimated_vo2max is not provided and average_heart_rate is available,
 * the service will auto-calculate estimated_vo2max using the Cooper formula.
 *
 * @param data - VO2max session creation data
 * @returns The created VO2max session ID
 */
export function createVO2maxSession(data: VO2maxSessionData): number {
  // Validate input data
  validateSessionData(data);

  // Convert protocol type to database format
  const protocol: '4x4' | 'zone2' = data.protocol_type === 'norwegian_4x4' ? '4x4' : 'zone2';

  // Convert duration from minutes to seconds
  const durationSeconds = data.duration_minutes * 60;

  // Auto-calculate estimated_vo2max if not provided and HR available
  let estimatedVO2max = data.estimated_vo2max;

  if (estimatedVO2max === undefined && data.average_heart_rate !== undefined) {
    // Get user's age for Cooper formula
    const user = db.prepare('SELECT id, age FROM users WHERE id = ?').get(data.user_id) as
      | { id: number; age: number }
      | undefined;

    if (user && user.age) {
      estimatedVO2max = estimateVO2max(user.age, data.average_heart_rate);
      console.log(
        `[VO2max] Auto-calculated VO2max: ${estimatedVO2max.toFixed(1)} ml/kg/min ` +
          `(age=${user.age}, HR=${data.average_heart_rate})`
      );
    } else {
      console.warn(`[VO2max] Cannot calculate VO2max: user age not available`);
    }
  }

  // Insert VO2max session
  const result = db
    .prepare(
      `INSERT INTO vo2max_sessions (
        workout_id, protocol, duration_seconds, intervals_completed,
        average_hr, peak_hr, estimated_vo2max, synced, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .run(
      data.workout_id,
      protocol,
      durationSeconds,
      data.intervals_completed ?? null,
      data.average_heart_rate ?? null,
      data.peak_heart_rate ?? null,
      estimatedVO2max ?? null,
      Date.now()
    );

  const sessionId = result.lastInsertRowid as number;

  console.log(
    `[VO2max] Session created: id=${sessionId}, workout=${data.workout_id}, ` +
      `protocol=${protocol}, duration=${data.duration_minutes}min, VO2max=${estimatedVO2max?.toFixed(1) ?? 'N/A'}`
  );

  return sessionId;
}

/**
 * Get VO2max sessions with optional filtering
 *
 * Supports filtering by:
 * - Date range (start_date, end_date)
 * - Protocol type (norwegian_4x4, zone2)
 * - Pagination (limit, offset)
 *
 * @param filters - Filter options
 * @returns Array of VO2max sessions with workout and user data
 */
export function getVO2maxSessions(filters: VO2maxSessionFilters): VO2maxSessionWithDetails[] {
  const { user_id, start_date, end_date, protocol_type, limit = 50, offset = 0 } = filters;

  // Enforce maximum limit of 200
  const effectiveLimit = Math.min(limit, 200);

  // Build query with filters
  let query = `
    SELECT
      v.*,
      w.date,
      w.user_id,
      w.status
    FROM vo2max_sessions v
    JOIN workouts w ON v.workout_id = w.id
    WHERE w.user_id = ?
  `;

  const params: (string | number)[] = [user_id];

  // Add date range filters
  if (start_date) {
    query += ` AND w.date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND w.date <= ?`;
    params.push(end_date);
  }

  // Add protocol filter (convert to database format)
  if (protocol_type) {
    const dbProtocol = protocol_type === 'norwegian_4x4' ? '4x4' : 'zone2';
    query += ` AND v.protocol = ?`;
    params.push(dbProtocol);
  }

  // Add ordering and pagination
  query += ` ORDER BY w.date DESC LIMIT ? OFFSET ?`;
  params.push(effectiveLimit, offset);

  const sessions = db.prepare(query).all(...params) as VO2maxSessionWithDetails[];

  return sessions;
}

/**
 * Get VO2max progression over time for a user
 *
 * Returns all VO2max estimates ordered by date, allowing tracking
 * of cardiovascular fitness improvements.
 *
 * @param userId - User ID
 * @param startDate - Optional start date filter (YYYY-MM-DD)
 * @param endDate - Optional end date filter (YYYY-MM-DD)
 * @returns Array of progression data points
 */
export function getVO2maxProgression(
  userId: number,
  startDate?: string,
  endDate?: string
): VO2maxProgressionPoint[] {
  let query = `
    SELECT
      w.date,
      v.estimated_vo2max,
      v.protocol
    FROM vo2max_sessions v
    JOIN workouts w ON v.workout_id = w.id
    WHERE w.user_id = ?
      AND v.estimated_vo2max IS NOT NULL
  `;

  const params: (string | number)[] = [userId];

  if (startDate) {
    query += ` AND w.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND w.date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY w.date ASC`;

  const results = db.prepare(query).all(...params) as Array<{
    date: string;
    estimated_vo2max: number;
    protocol: string;
  }>;

  return results.map((row) => ({
    date: row.date,
    estimated_vo2max: row.estimated_vo2max,
    protocol: row.protocol,
  }));
}

/**
 * Get a single VO2max session by ID
 *
 * @param sessionId - VO2max session ID
 * @param userId - User ID (for ownership validation)
 * @returns VO2max session or null if not found
 */
export function getVO2maxSessionById(sessionId: number, userId: number): VO2maxSessionWithDetails | null {
  const session = db
    .prepare(
      `
      SELECT
        v.*,
        w.date,
        w.user_id,
        w.status
      FROM vo2max_sessions v
      JOIN workouts w ON v.workout_id = w.id
      WHERE v.id = ? AND w.user_id = ?
    `
    )
    .get(sessionId, userId) as VO2maxSessionWithDetails | undefined;

  return session || null;
}
