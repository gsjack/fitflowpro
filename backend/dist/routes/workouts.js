import { createWorkout, listWorkouts, updateWorkoutStatus } from '../services/workoutService.js';
import { authenticateJWT } from '../middleware/auth.js';
import { stmtGetWorkoutById, db } from '../database/db.js';
const createWorkoutSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['program_day_id', 'date'],
            properties: {
                program_day_id: {
                    type: 'integer',
                    description: 'ID of the program day (e.g., Push A, Pull A)',
                },
                date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'Date in ISO format (YYYY-MM-DD)',
                },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    user_id: { type: 'number' },
                    program_day_id: { type: 'number' },
                    date: { type: 'string' },
                    started_at: { type: ['number', 'null'] },
                    completed_at: { type: ['number', 'null'] },
                    status: {
                        type: 'string',
                        enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
                    },
                    total_volume_kg: { type: ['number', 'null'] },
                    average_rir: { type: ['number', 'null'] },
                    synced: { type: 'number' },
                },
            },
        },
    },
};
const listWorkoutsSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                start_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'Start date filter (YYYY-MM-DD)',
                },
                end_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'End date filter (YYYY-MM-DD)',
                },
                workout_id: {
                    type: 'integer',
                    description: 'Fetch specific workout by ID',
                },
            },
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        user_id: { type: 'number' },
                        program_day_id: { type: 'number' },
                        date: { type: 'string' },
                        started_at: { type: ['number', 'null'] },
                        completed_at: { type: ['number', 'null'] },
                        status: {
                            type: 'string',
                            enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
                        },
                        total_volume_kg: { type: ['number', 'null'] },
                        average_rir: { type: ['number', 'null'] },
                        synced: { type: 'number' },
                        day_name: { type: ['string', 'null'] },
                        day_type: {
                            type: ['string', 'null'],
                            enum: ['strength', 'vo2max', null],
                        },
                        exercises: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number' },
                                    program_day_id: { type: 'number' },
                                    exercise_id: { type: 'number' },
                                    exercise_name: { type: 'string' },
                                    order_index: { type: 'number' },
                                    sets: { type: 'number' },
                                    reps: { type: 'string' },
                                    rir: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
export default async function workoutRoutes(fastify) {
    fastify.post('/workouts', {
        ...createWorkoutSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { program_day_id, date } = request.body;
            const authenticatedUser = request.user;
            const workout = createWorkout(authenticatedUser.userId, program_day_id, date);
            return reply.status(201).send(workout);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Invalid date')) {
                return reply.status(400).send({
                    error: error.message,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to create workout',
            });
        }
    });
    fastify.get('/workouts', {
        ...listWorkoutsSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { start_date, end_date, workout_id } = request.query;
            const authenticatedUser = request.user;
            if (workout_id !== undefined) {
                const workout = stmtGetWorkoutById.get(workout_id);
                if (!workout) {
                    return reply.status(404).send({ error: 'Workout not found' });
                }
                if (workout.user_id !== authenticatedUser.userId) {
                    return reply.status(403).send({ error: 'Not authorized to access this workout' });
                }
                const programDay = db
                    .prepare('SELECT day_name, day_type FROM program_days WHERE id = ?')
                    .get(workout.program_day_id);
                const exercises = db
                    .prepare(`
            SELECT pe.*, e.name as exercise_name
            FROM program_exercises pe
            JOIN exercises e ON pe.exercise_id = e.id
            WHERE pe.program_day_id = ?
            ORDER BY pe.order_index ASC
          `)
                    .all(workout.program_day_id);
                const workoutWithDetails = {
                    ...workout,
                    day_name: programDay?.day_name || null,
                    day_type: programDay?.day_type || null,
                    exercises,
                };
                return reply.status(200).send([workoutWithDetails]);
            }
            const workouts = listWorkouts(authenticatedUser.userId, start_date, end_date);
            return reply.status(200).send(workouts);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to list workouts',
            });
        }
    });
    fastify.get('/workouts/:id', {
        preHandler: authenticateJWT,
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        try {
            const workoutId = parseInt(request.params.id, 10);
            const authenticatedUser = request.user;
            if (isNaN(workoutId)) {
                return reply.status(400).send({ error: 'Invalid workout ID' });
            }
            const workout = stmtGetWorkoutById.get(workoutId);
            if (!workout) {
                return reply.status(404).send({ error: 'Workout not found' });
            }
            if (workout.user_id !== authenticatedUser.userId) {
                return reply.status(403).send({ error: 'Not authorized to access this workout' });
            }
            const programDay = db
                .prepare('SELECT day_name, day_type FROM program_days WHERE id = ?')
                .get(workout.program_day_id);
            const exercises = db
                .prepare(`
            SELECT pe.*, e.name as exercise_name
            FROM program_exercises pe
            JOIN exercises e ON pe.exercise_id = e.id
            WHERE pe.program_day_id = ?
            ORDER BY pe.order_index ASC
          `)
                .all(workout.program_day_id);
            const workoutWithDetails = {
                ...workout,
                day_name: programDay?.day_name || null,
                day_type: programDay?.day_type || null,
                exercises,
            };
            return reply.status(200).send(workoutWithDetails);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to fetch workout',
            });
        }
    });
    fastify.patch('/workouts/:id', {
        preHandler: authenticateJWT,
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
                    },
                    program_day_id: {
                        type: 'integer',
                        description: 'Change the program day for this workout (only allowed if status is not_started)',
                    },
                },
                minProperties: 1,
            },
        },
    }, async (request, reply) => {
        try {
            const workoutId = parseInt(request.params.id, 10);
            const { status, program_day_id } = request.body;
            const authenticatedUser = request.user;
            const workout = updateWorkoutStatus(authenticatedUser.userId, workoutId, status, program_day_id);
            return reply.status(200).send(workout);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('not allowed') ||
                    error.message.includes('Invalid') ||
                    error.message.includes('does not belong')) {
                    return reply.status(400).send({
                        error: error.message,
                    });
                }
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to update workout',
            });
        }
    });
}
//# sourceMappingURL=workouts.js.map