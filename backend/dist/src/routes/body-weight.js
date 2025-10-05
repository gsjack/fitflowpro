import * as bodyWeightService from '../services/bodyWeightService.js';
import { authenticateJWT } from '../middleware/auth.js';
import { db } from '../database/db.js';
export default async function bodyWeightRoutes(fastify) {
    fastify.post('/body-weight', {
        preHandler: authenticateJWT,
        schema: {
            body: {
                type: 'object',
                required: ['weight_kg'],
                properties: {
                    weight_kg: { type: 'number', minimum: 30, maximum: 300 },
                    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                    notes: { type: 'string', maxLength: 500 }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const { weight_kg, date, notes } = request.body;
            const entry = bodyWeightService.logBodyWeight(db, {
                user_id: userId,
                weight_kg,
                date,
                notes
            });
            reply.code(201).send({
                id: entry.id,
                weight_kg: entry.weight_kg,
                date: entry.date,
                notes: entry.notes,
                created_at: entry.created_at
            });
        }
        catch (error) {
            request.log.error(error);
            if (error instanceof Error) {
                return reply.code(400).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/body-weight', {
        preHandler: authenticateJWT,
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'string', pattern: '^\\d+$' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const limit = request.query.limit ? parseInt(request.query.limit, 10) : 30;
            const entries = bodyWeightService.getBodyWeightHistory(db, userId, limit);
            reply.send(entries);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.delete('/body-weight/:id', {
        preHandler: authenticateJWT,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', pattern: '^\\d+$' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const id = parseInt(request.params.id, 10);
            bodyWeightService.deleteBodyWeight(db, userId, id);
            reply.code(204).send();
        }
        catch (error) {
            request.log.error(error);
            if (error instanceof Error && error.message === 'Body weight entry not found') {
                return reply.code(404).send({ error: error.message });
            }
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
    fastify.get('/body-weight/latest', {
        preHandler: authenticateJWT
    }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const latest = bodyWeightService.getLatestBodyWeight(db, userId);
            if (!latest) {
                return reply.send({ latest: null, week_change: null, month_change: null });
            }
            const weekChange = bodyWeightService.getWeightChange(db, userId, 7);
            const monthChange = bodyWeightService.getWeightChange(db, userId, 30);
            reply.send({
                latest,
                week_change: weekChange,
                month_change: monthChange
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=body-weight.js.map