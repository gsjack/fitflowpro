import { get1RMProgression, getVolumeTrends, getConsistencyMetrics, } from '../services/analyticsService.js';
import { authenticateJWT } from '../middleware/auth.js';
const oneRMProgressionSchema = {
    schema: {
        querystring: {
            type: 'object',
            required: ['exercise_id', 'start_date', 'end_date'],
            properties: {
                exercise_id: {
                    type: 'string',
                    description: 'Exercise ID',
                },
                start_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'Start date (YYYY-MM-DD)',
                },
                end_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'End date (YYYY-MM-DD)',
                },
            },
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        date: { type: 'string' },
                        estimated_1rm: { type: 'number' },
                    },
                },
            },
        },
    },
};
const volumeTrendsSchema = {
    schema: {
        querystring: {
            type: 'object',
            required: ['muscle_group', 'start_date', 'end_date'],
            properties: {
                muscle_group: {
                    type: 'string',
                    description: 'Muscle group name (e.g., chest, back_lats)',
                },
                start_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'Start date (YYYY-MM-DD)',
                },
                end_date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'End date (YYYY-MM-DD)',
                },
            },
        },
        response: {
            200: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        week: { type: 'string' },
                        total_sets: { type: 'number' },
                        mev: { type: 'number' },
                        mav: { type: 'number' },
                        mrv: { type: 'number' },
                    },
                },
            },
        },
    },
};
const consistencyMetricsSchema = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    adherence_rate: { type: 'number' },
                    avg_session_duration: { type: 'number' },
                    total_workouts: { type: 'number' },
                },
            },
        },
    },
};
export default async function analyticsRoutes(fastify) {
    fastify.get('/analytics/1rm-progression', {
        ...oneRMProgressionSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { exercise_id, start_date, end_date } = request.query;
            const authenticatedUser = request.user;
            const exerciseId = parseInt(exercise_id, 10);
            if (isNaN(exerciseId)) {
                return reply.status(400).send({
                    error: 'Invalid exercise_id',
                });
            }
            const progression = get1RMProgression(authenticatedUser.userId, exerciseId, start_date, end_date);
            return reply.status(200).send(progression);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve 1RM progression',
            });
        }
    });
    fastify.get('/analytics/volume-trends', {
        ...volumeTrendsSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { muscle_group, start_date, end_date } = request.query;
            const authenticatedUser = request.user;
            const trends = getVolumeTrends(authenticatedUser.userId, muscle_group, start_date, end_date);
            return reply.status(200).send(trends);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve volume trends',
            });
        }
    });
    fastify.get('/analytics/consistency', {
        ...consistencyMetricsSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const metrics = getConsistencyMetrics(authenticatedUser.userId);
            return reply.status(200).send(metrics);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve consistency metrics',
            });
        }
    });
}
//# sourceMappingURL=analytics.js.map