import { logSet, getSetsForWorkout } from '../services/setService.js';
import { authenticateJWT } from '../middleware/auth.js';
const logSetSchema = {
    schema: {
        body: {
            type: 'object',
            required: [
                'workout_id',
                'exercise_id',
                'set_number',
                'weight_kg',
                'reps',
                'rir',
                'timestamp',
            ],
            properties: {
                workout_id: {
                    type: 'integer',
                    description: 'ID of the workout session',
                },
                exercise_id: {
                    type: 'integer',
                    description: 'ID of the exercise being performed',
                },
                set_number: {
                    type: 'integer',
                    minimum: 1,
                    description: 'Set number within the workout (1, 2, 3, etc.)',
                },
                weight_kg: {
                    type: 'number',
                    minimum: 0,
                    maximum: 500,
                    description: 'Weight lifted in kilograms (0-500)',
                },
                reps: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 50,
                    description: 'Number of repetitions completed (1-50)',
                },
                rir: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 4,
                    description: 'Reps in Reserve (0-4)',
                },
                timestamp: {
                    type: 'integer',
                    description: 'UTC milliseconds when set was completed',
                },
                localId: {
                    type: 'integer',
                    description: 'Optional local ID from mobile app for deduplication',
                },
                notes: {
                    type: 'string',
                    maxLength: 500,
                    description: 'Optional notes about the set (max 500 chars)',
                },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    localId: { type: ['number', 'null'] },
                    synced: { type: 'boolean' },
                    estimated_1rm: { type: 'number' },
                    weight_kg: { type: 'number' },
                    reps: { type: 'number' },
                    rir: { type: 'number' },
                },
            },
        },
    },
};
export default async function setRoutes(fastify) {
    fastify.get('/sets', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const workoutId = request.query.workout_id;
            if (!workoutId) {
                return reply.status(400).send({
                    error: 'workout_id query parameter is required',
                });
            }
            const sets = getSetsForWorkout(parseInt(workoutId));
            return reply.status(200).send(sets);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to fetch sets',
            });
        }
    });
    fastify.post('/sets', {
        ...logSetSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const { workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, localId, notes, } = request.body;
            const result = logSet(workout_id, exercise_id, set_number, weight_kg, reps, rir, timestamp, localId, notes);
            return reply.status(201).send(result);
        }
        catch (error) {
            if (error instanceof Error &&
                (error.message.includes('must be between') ||
                    error.message.includes('must be 500 characters'))) {
                return reply.status(400).send({
                    error: error.message,
                });
            }
            if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
                return reply.status(400).send({
                    error: 'Invalid workout_id or exercise_id',
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to log set',
            });
        }
    });
}
//# sourceMappingURL=sets.js.map