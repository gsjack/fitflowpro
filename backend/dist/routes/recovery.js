import { createAssessment } from '../services/recoveryService.js';
import { authenticateJWT } from '../middleware/auth.js';
const createAssessmentSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['date', 'sleep_quality', 'muscle_soreness', 'mental_motivation'],
            properties: {
                date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'Assessment date in ISO format (YYYY-MM-DD)',
                },
                sleep_quality: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    description: 'Sleep quality rating (1-5 scale)',
                },
                muscle_soreness: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    description: 'Muscle soreness rating (1-5 scale)',
                },
                mental_motivation: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    description: 'Mental motivation rating (1-5 scale)',
                },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    total_score: { type: 'number' },
                    volume_adjustment: {
                        type: 'string',
                        enum: ['none', 'reduce_1_set', 'reduce_2_sets', 'rest_day'],
                    },
                },
            },
        },
    },
};
export default async function recoveryRoutes(fastify) {
    fastify.post('/recovery-assessments', {
        ...createAssessmentSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { date, sleep_quality, muscle_soreness, mental_motivation } = request.body;
            const userId = request.user.userId;
            const result = createAssessment(userId, date, sleep_quality, muscle_soreness, mental_motivation);
            return reply.status(201).send(result);
        }
        catch (error) {
            if (error instanceof Error &&
                (error.message.includes('must be between') ||
                    error.message.includes('must be in ISO format'))) {
                return reply.status(400).send({
                    error: error.message,
                });
            }
            if (error instanceof Error &&
                error.message.includes('FOREIGN KEY constraint failed')) {
                return reply.status(400).send({
                    error: 'Invalid user_id',
                });
            }
            if (error instanceof Error &&
                error.message.includes('UNIQUE constraint failed')) {
                return reply.status(400).send({
                    error: 'Recovery assessment already exists for this date',
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to create recovery assessment',
            });
        }
    });
}
//# sourceMappingURL=recovery.js.map