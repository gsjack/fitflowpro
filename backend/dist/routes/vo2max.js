import { createVO2maxSession, getVO2maxSessions, getVO2maxSessionById, getVO2maxProgression, } from '../services/vo2maxService.js';
import { authenticateJWT } from '../middleware/auth.js';
import { db } from '../database/db.js';
const createSessionSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['date', 'duration_minutes', 'protocol_type'],
            properties: {
                workout_id: { type: 'integer' },
                date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
                duration_minutes: {
                    type: 'integer',
                    minimum: 10,
                    maximum: 120,
                },
                protocol_type: {
                    type: 'string',
                    enum: ['norwegian_4x4', 'zone2'],
                },
                average_heart_rate: {
                    type: 'integer',
                    minimum: 60,
                    maximum: 220,
                },
                peak_heart_rate: {
                    type: 'integer',
                    minimum: 60,
                    maximum: 220,
                },
                estimated_vo2max: {
                    type: 'number',
                    minimum: 20.0,
                    maximum: 80.0,
                },
                intervals_completed: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 4,
                },
                rpe: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                },
                notes: {
                    type: 'string',
                    maxLength: 500,
                },
            },
        },
    },
};
const listSessionsSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                start_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
                end_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
                protocol_type: {
                    type: 'string',
                    enum: ['norwegian_4x4', 'zone2'],
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                },
                offset: {
                    type: 'integer',
                    minimum: 0,
                },
            },
        },
    },
};
const progressionSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                start_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
                end_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                },
            },
        },
    },
};
const updateSessionSchema = {
    schema: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' },
            },
        },
        body: {
            type: 'object',
            minProperties: 1,
            properties: {
                duration_minutes: {
                    type: 'integer',
                    minimum: 10,
                    maximum: 120,
                },
                average_heart_rate: {
                    type: 'integer',
                    minimum: 60,
                    maximum: 220,
                },
                peak_heart_rate: {
                    type: 'integer',
                    minimum: 60,
                    maximum: 220,
                },
                estimated_vo2max: {
                    type: 'number',
                    minimum: 20.0,
                    maximum: 80.0,
                },
                intervals_completed: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 4,
                },
                rpe: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                },
                notes: {
                    type: 'string',
                    maxLength: 500,
                },
                completion_status: {
                    type: 'string',
                    enum: ['completed', 'incomplete'],
                },
            },
        },
    },
};
function transformSessionToResponse(row) {
    return {
        id: row.id,
        user_id: row.user_id,
        workout_id: row.workout_id,
        date: row.date,
        duration_minutes: Math.floor(row.duration_seconds / 60),
        protocol_type: row.protocol === '4x4' ? 'norwegian_4x4' : 'zone2',
        average_heart_rate: row.average_hr,
        peak_heart_rate: row.peak_hr,
        estimated_vo2max: row.estimated_vo2max,
        intervals_completed: row.intervals_completed,
        rpe: row.rpe,
        completion_status: row.completion_status || 'incomplete',
        notes: row.notes,
        created_at: row.created_at,
    };
}
export default async function vo2maxRoutes(fastify) {
    fastify.post('/vo2max-sessions', {
        ...createSessionSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const { workout_id, date, duration_minutes, protocol_type, average_heart_rate, peak_heart_rate, estimated_vo2max, intervals_completed, rpe, notes, } = request.body;
            let workoutId = workout_id;
            if (!workoutId) {
                const vo2maxDay = db
                    .prepare(`
              SELECT pd.id
              FROM program_days pd
              JOIN programs p ON pd.program_id = p.id
              WHERE p.user_id = ? AND pd.day_type = 'vo2max'
              LIMIT 1
            `)
                    .get(authenticatedUser.userId);
                if (!vo2maxDay) {
                    return reply.status(400).send({
                        error: 'No VO2max program day found. Please create a program with VO2max days first.',
                    });
                }
                const workoutResult = db
                    .prepare(`
              INSERT INTO workouts (user_id, program_day_id, date, status, synced)
              VALUES (?, ?, ?, 'completed', 1)
            `)
                    .run(authenticatedUser.userId, vo2maxDay.id, date);
                workoutId = workoutResult.lastInsertRowid;
            }
            else {
                const workout = db.prepare('SELECT user_id FROM workouts WHERE id = ?').get(workoutId);
                if (!workout || workout.user_id !== authenticatedUser.userId) {
                    return reply.status(403).send({
                        error: 'Not authorized to access this workout',
                    });
                }
            }
            let completionStatus = 'incomplete';
            if (protocol_type === 'norwegian_4x4') {
                if (intervals_completed === 4) {
                    completionStatus = 'completed';
                }
            }
            else {
                if (duration_minutes >= 45) {
                    completionStatus = 'completed';
                }
            }
            const sessionData = {
                workout_id: workoutId,
                user_id: authenticatedUser.userId,
                protocol_type,
                duration_minutes,
                intervals_completed,
                average_heart_rate,
                peak_heart_rate,
                estimated_vo2max,
            };
            const sessionId = createVO2maxSession(sessionData);
            db.prepare(`
          UPDATE vo2max_sessions
          SET rpe = ?, notes = ?, completion_status = ?, created_at = ?
          WHERE id = ?
        `).run(rpe ?? null, notes ?? null, completionStatus, Date.now(), sessionId);
            const createdSession = db
                .prepare(`
            SELECT v.*, w.date, w.user_id
            FROM vo2max_sessions v
            JOIN workouts w ON v.workout_id = w.id
            WHERE v.id = ?
          `)
                .get(sessionId);
            const response = transformSessionToResponse(createdSession);
            return reply.status(201).send({
                session_id: sessionId,
                estimated_vo2max: response.estimated_vo2max,
                completion_status: response.completion_status,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('must be between') ||
                    error.message.includes('Invalid') ||
                    error.message.includes('ABORT')) {
                    return reply.status(400).send({
                        error: error.message,
                    });
                }
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to create VO2max session',
            });
        }
    });
    fastify.get('/vo2max-sessions', {
        ...listSessionsSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const { start_date, end_date, protocol_type, limit = 50, offset = 0 } = request.query;
            const filters = {
                user_id: authenticatedUser.userId,
                start_date,
                end_date,
                protocol_type,
                limit: Math.min(limit, 200),
                offset,
            };
            const sessions = getVO2maxSessions(filters);
            const transformedSessions = sessions.map(transformSessionToResponse);
            const totalCount = db
                .prepare(`
            SELECT COUNT(*) as count
            FROM vo2max_sessions v
            JOIN workouts w ON v.workout_id = w.id
            WHERE w.user_id = ?
          `)
                .get(authenticatedUser.userId);
            const hasMore = offset + transformedSessions.length < totalCount.count;
            return reply.status(200).send({
                sessions: transformedSessions,
                count: transformedSessions.length,
                has_more: hasMore,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to list VO2max sessions',
            });
        }
    });
    fastify.get('/vo2max-sessions/progression', {
        ...progressionSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const { start_date, end_date } = request.query;
            const progression = getVO2maxProgression(authenticatedUser.userId, start_date, end_date);
            const transformedProgression = progression.map((point) => ({
                date: point.date,
                estimated_vo2max: point.estimated_vo2max,
                protocol_type: point.protocol === '4x4' ? 'norwegian_4x4' : 'zone2',
            }));
            return reply.status(200).send({
                sessions: transformedProgression,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to get VO2max progression',
            });
        }
    });
    fastify.get('/vo2max-sessions/:id', {
        preHandler: authenticateJWT,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const sessionId = parseInt(request.params.id, 10);
            const authenticatedUser = request.user;
            const session = getVO2maxSessionById(sessionId, authenticatedUser.userId);
            if (!session) {
                return reply.status(404).send({
                    error: 'VO2max session not found',
                });
            }
            const response = transformSessionToResponse(session);
            return reply.status(200).send(response);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to get VO2max session',
            });
        }
    });
    fastify.patch('/vo2max-sessions/:id', {
        ...updateSessionSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const sessionId = parseInt(request.params.id, 10);
            const authenticatedUser = request.user;
            const session = getVO2maxSessionById(sessionId, authenticatedUser.userId);
            if (!session) {
                return reply.status(404).send({
                    error: 'VO2max session not found',
                });
            }
            const { duration_minutes, average_heart_rate, peak_heart_rate, estimated_vo2max, intervals_completed, rpe, notes, completion_status, } = request.body;
            const updates = [];
            const params = [];
            if (duration_minutes !== undefined) {
                updates.push('duration_seconds = ?');
                params.push(duration_minutes * 60);
            }
            if (average_heart_rate !== undefined) {
                updates.push('average_hr = ?');
                params.push(average_heart_rate);
            }
            if (peak_heart_rate !== undefined) {
                updates.push('peak_hr = ?');
                params.push(peak_heart_rate);
            }
            if (estimated_vo2max !== undefined) {
                updates.push('estimated_vo2max = ?');
                params.push(estimated_vo2max);
            }
            if (intervals_completed !== undefined) {
                updates.push('intervals_completed = ?');
                params.push(intervals_completed);
            }
            if (rpe !== undefined) {
                updates.push('rpe = ?');
                params.push(rpe);
            }
            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes);
            }
            if (completion_status !== undefined) {
                updates.push('completion_status = ?');
                params.push(completion_status);
            }
            if (updates.length === 0) {
                return reply.status(400).send({
                    error: 'No fields to update',
                });
            }
            params.push(sessionId);
            const query = `
          UPDATE vo2max_sessions
          SET ${updates.join(', ')}
          WHERE id = ?
        `;
            db.prepare(query).run(...params);
            const updatedSession = getVO2maxSessionById(sessionId, authenticatedUser.userId);
            const response = transformSessionToResponse(updatedSession);
            return reply.status(200).send(response);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('must be between') || error.message.includes('ABORT')) {
                    return reply.status(400).send({
                        error: error.message,
                    });
                }
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to update VO2max session',
            });
        }
    });
}
//# sourceMappingURL=vo2max.js.map