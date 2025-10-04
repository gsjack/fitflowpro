import { get1RMProgression, getConsistencyMetrics } from '../services/analyticsService.js';
import { getCurrentWeekVolume, getVolumeHistory, getProgramVolumeAnalysis, } from '../services/volumeService.js';
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
    fastify.get('/analytics/volume-current-week', {
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const volumeData = getCurrentWeekVolume(authenticatedUser.userId);
            return reply.status(200).send(volumeData);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve current week volume',
            });
        }
    });
    fastify.get('/analytics/volume-trends', {
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const { weeks: weeksParam, muscle_group } = request.query;
            let weeks = 8;
            if (weeksParam) {
                weeks = parseInt(weeksParam, 10);
                if (isNaN(weeks) || weeks < 1) {
                    return reply.status(400).send({
                        error: 'Invalid weeks parameter. Must be a positive number.',
                    });
                }
                if (weeks > 52) {
                    return reply.status(400).send({
                        error: 'Weeks parameter exceeds maximum of 52',
                    });
                }
            }
            if (muscle_group) {
                const validMuscleGroups = [
                    'chest',
                    'back',
                    'shoulders',
                    'quads',
                    'hamstrings',
                    'glutes',
                    'biceps',
                    'triceps',
                    'calves',
                    'abs',
                    'back_lats',
                    'back_traps',
                    'shoulders_front',
                    'shoulders_side',
                    'shoulders_rear',
                    'front_delts',
                    'side_delts',
                    'rear_delts',
                ];
                if (!validMuscleGroups.includes(muscle_group)) {
                    return reply.status(400).send({
                        error: 'Invalid muscle_group parameter',
                    });
                }
            }
            const volumeHistory = getVolumeHistory(authenticatedUser.userId, weeks, muscle_group);
            return reply.status(200).send(volumeHistory);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve volume trends',
            });
        }
    });
    fastify.get('/analytics/program-volume-analysis', {
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const programAnalysis = getProgramVolumeAnalysis(authenticatedUser.userId);
            if (!programAnalysis) {
                return reply.status(404).send({
                    error: 'No active program found for user',
                });
            }
            return reply.status(200).send(programAnalysis);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to retrieve program volume analysis',
            });
        }
    });
}
//# sourceMappingURL=analytics.js.map