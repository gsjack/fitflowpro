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
    fastify.patch('/users/me', {
        preHandler: authenticateJWT,
        schema: {
            body: {
                type: 'object',
                properties: {
                    age: { type: 'number', minimum: 13, maximum: 120 },
                    weight_kg: { type: 'number', minimum: 20, maximum: 300 },
                    experience_level: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced'],
                    },
                },
                additionalProperties: false,
            },
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
            const updates = request.body;
            const fields = [];
            const values = [];
            if (updates.age !== undefined) {
                fields.push('age = ?');
                values.push(updates.age);
            }
            if (updates.weight_kg !== undefined) {
                fields.push('weight_kg = ?');
                values.push(updates.weight_kg);
            }
            if (updates.experience_level !== undefined) {
                fields.push('experience_level = ?');
                values.push(updates.experience_level);
            }
            fields.push('updated_at = ?');
            values.push(Date.now());
            if (fields.length === 1) {
                return reply.status(400).send({
                    error: 'No fields to update',
                });
            }
            values.push(authenticatedUser.userId);
            const updateQuery = `
          UPDATE users
          SET ${fields.join(', ')}
          WHERE id = ?
        `;
            db.prepare(updateQuery).run(...values);
            const updatedUser = db
                .prepare(`
            SELECT id, username, age, weight_kg, experience_level, created_at, updated_at
            FROM users
            WHERE id = ?
          `)
                .get(authenticatedUser.userId);
            return reply.status(200).send(updatedUser);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to update user profile',
            });
        }
    });
}
//# sourceMappingURL=users.js.map