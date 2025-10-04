import { authenticateJWT } from '../middleware/auth.js';
import { db } from '../database/db.js';
export default async function userRoutes(fastify) {
    fastify.get('/users/me', {
        preHandler: authenticateJWT,
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        username: { type: 'string' },
                        age: { type: ['number', 'null'] },
                        weight_kg: { type: ['number', 'null'] },
                        experience_level: {
                            type: ['string', 'null'],
                            enum: ['beginner', 'intermediate', 'advanced', null],
                        },
                        created_at: { type: 'number' },
                        updated_at: { type: 'number' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const user = db
                .prepare(`
            SELECT id, username, age, weight_kg, experience_level, created_at, updated_at
            FROM users
            WHERE id = ?
          `)
                .get(authenticatedUser.userId);
            if (!user) {
                return reply.status(404).send({
                    error: 'User not found',
                });
            }
            return reply.status(200).send(user);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to fetch user data',
            });
        }
    });
}
//# sourceMappingURL=users.js.map