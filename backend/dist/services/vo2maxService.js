import { db } from '../database/db.js';
export function estimateVO2max(age, _averageHR) {
    const maxHR = 220 - age;
    const restingHR = 60;
    const vo2max = 15.3 * (maxHR / restingHR);
    return Math.max(20.0, Math.min(80.0, vo2max));
}
function validateSessionData(data) {
    if (data.duration_minutes < 10 || data.duration_minutes > 120) {
        throw new Error('Duration must be between 10 and 120 minutes');
    }
    if (data.average_heart_rate !== undefined && data.average_heart_rate !== null) {
        if (data.average_heart_rate < 60 || data.average_heart_rate > 220) {
            throw new Error('Average heart rate must be between 60 and 220 bpm');
        }
    }
    if (data.peak_heart_rate !== undefined && data.peak_heart_rate !== null) {
        if (data.peak_heart_rate < 60 || data.peak_heart_rate > 220) {
            throw new Error('Peak heart rate must be between 60 and 220 bpm');
        }
    }
    if (data.estimated_vo2max !== undefined && data.estimated_vo2max !== null) {
        if (data.estimated_vo2max < 20.0 || data.estimated_vo2max > 80.0) {
            throw new Error('Estimated VO2max must be between 20.0 and 80.0 ml/kg/min');
        }
    }
    if (data.protocol_type === 'norwegian_4x4') {
        if (data.intervals_completed !== undefined && data.intervals_completed !== null) {
            if (data.intervals_completed < 0 || data.intervals_completed > 4) {
                throw new Error('Norwegian 4x4 protocol allows 0-4 intervals');
            }
        }
        if (data.duration_minutes < 20 || data.duration_minutes > 40) {
            console.warn(`[VO2max] Norwegian 4x4 duration ${data.duration_minutes} minutes is outside typical range (28-32 minutes)`);
        }
    }
    else if (data.protocol_type === 'zone2') {
        if (data.duration_minutes < 30) {
            console.warn(`[VO2max] Zone 2 duration ${data.duration_minutes} minutes is shorter than typical range (45-120 minutes)`);
        }
    }
}
export function createVO2maxSession(data) {
    validateSessionData(data);
    const protocol = data.protocol_type === 'norwegian_4x4' ? '4x4' : 'zone2';
    const durationSeconds = data.duration_minutes * 60;
    let estimatedVO2max = data.estimated_vo2max;
    if (estimatedVO2max === undefined && data.average_heart_rate !== undefined) {
        const user = db
            .prepare('SELECT id, age FROM users WHERE id = ?')
            .get(data.user_id);
        if (user && user.age) {
            estimatedVO2max = estimateVO2max(user.age, data.average_heart_rate);
            console.log(`[VO2max] Auto-calculated VO2max: ${estimatedVO2max.toFixed(1)} ml/kg/min ` +
                `(age=${user.age}, HR=${data.average_heart_rate})`);
        }
        else {
            console.warn(`[VO2max] Cannot calculate VO2max: user age not available`);
        }
    }
    const result = db
        .prepare(`INSERT INTO vo2max_sessions (
        workout_id, protocol, duration_seconds, intervals_completed,
        average_hr, peak_hr, estimated_vo2max, synced, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`)
        .run(data.workout_id, protocol, durationSeconds, data.intervals_completed ?? null, data.average_heart_rate ?? null, data.peak_heart_rate ?? null, estimatedVO2max ?? null, Date.now());
    const sessionId = result.lastInsertRowid;
    console.log(`[VO2max] Session created: id=${sessionId}, workout=${data.workout_id}, ` +
        `protocol=${protocol}, duration=${data.duration_minutes}min, VO2max=${estimatedVO2max?.toFixed(1) ?? 'N/A'}`);
    return sessionId;
}
export function getVO2maxSessions(filters) {
    const { user_id, start_date, end_date, protocol_type, limit = 50, offset = 0 } = filters;
    const effectiveLimit = Math.min(limit, 200);
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
    const params = [user_id];
    if (start_date) {
        query += ` AND w.date >= ?`;
        params.push(start_date);
    }
    if (end_date) {
        query += ` AND w.date <= ?`;
        params.push(end_date);
    }
    if (protocol_type) {
        const dbProtocol = protocol_type === 'norwegian_4x4' ? '4x4' : 'zone2';
        query += ` AND v.protocol = ?`;
        params.push(dbProtocol);
    }
    query += ` ORDER BY w.date DESC LIMIT ? OFFSET ?`;
    params.push(effectiveLimit, offset);
    const sessions = db.prepare(query).all(...params);
    return sessions;
}
export function getVO2maxProgression(userId, startDate, endDate) {
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
    const params = [userId];
    if (startDate) {
        query += ` AND w.date >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        query += ` AND w.date <= ?`;
        params.push(endDate);
    }
    query += ` ORDER BY w.date ASC`;
    const results = db.prepare(query).all(...params);
    return results.map((row) => ({
        date: row.date,
        estimated_vo2max: row.estimated_vo2max,
        protocol: row.protocol,
    }));
}
export function getVO2maxSessionById(sessionId, userId) {
    const session = db
        .prepare(`
      SELECT
        v.*,
        w.date,
        w.user_id,
        w.status
      FROM vo2max_sessions v
      JOIN workouts w ON v.workout_id = w.id
      WHERE v.id = ? AND w.user_id = ?
    `)
        .get(sessionId, userId);
    return session || null;
}
//# sourceMappingURL=vo2maxService.js.map