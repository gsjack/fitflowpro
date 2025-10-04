import { registerUser, loginUser } from '../services/authService.js';
import { authenticateJWT } from '../middleware/auth.js';
import { stmtDeleteUser } from '../database/db.js';
import { logAuthEvent, logAccountDeletion } from '../services/auditService.js';
const registerSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
                username: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address (used as username)',
                },
                password: {
                    type: 'string',
                    minLength: 8,
                    description: 'Password (minimum 8 characters)',
                },
                age: {
                    type: 'integer',
                    minimum: 13,
                    maximum: 100,
                    description: 'User age (13-100 years)',
                },
                weight_kg: {
                    type: 'number',
                    minimum: 30,
                    maximum: 300,
                    description: 'User weight in kg (30-300)',
                },
                experience_level: {
                    type: 'string',
                    enum: ['beginner', 'intermediate', 'advanced'],
                    description: 'Training experience level',
                },
            },
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    user_id: { type: 'number' },
                    userId: { type: 'number' },
                    username: { type: 'string' },
                    token: { type: 'string' },
                },
            },
        },
    },
};
const loginSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
                username: {
                    type: 'string',
                    description: 'User email address',
                },
                password: {
                    type: 'string',
                    description: 'User password',
                },
            },
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    token: { type: 'string' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            username: { type: 'string' },
                            age: { type: 'number' },
                            weight_kg: { type: 'number' },
                            experience_level: { type: 'string' },
                            created_at: { type: 'number' },
                            updated_at: { type: 'number' },
                        },
                    },
                },
            },
        },
    },
};
export default async function authRoutes(fastify) {
    fastify.post('/auth/register', registerSchema, async (request, reply) => {
        try {
            const { username, password, age, weight_kg, experience_level } = request.body;
            const result = await registerUser(username, password, age, weight_kg, experience_level, (payload) => fastify.jwt.sign(payload));
            const ipAddress = request.ip || 'unknown';
            const timestamp = Date.now();
            logAuthEvent(result.user_id, 'auth_register', ipAddress, timestamp);
            return reply.status(201).send(result);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Username already exists') {
                return reply.status(409).send({
                    error: 'Username already exists',
                });
            }
            fastify.log.error(error);
            return reply.status(400).send({
                error: 'Registration failed',
            });
        }
    });
    fastify.post('/auth/login', loginSchema, async (request, reply) => {
        try {
            const { username, password } = request.body;
            const result = await loginUser(username, password, (payload) => fastify.jwt.sign(payload));
            const ipAddress = request.ip || 'unknown';
            const timestamp = Date.now();
            logAuthEvent(result.user.id, 'auth_login', ipAddress, timestamp);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Invalid credentials') {
                return reply.status(401).send({
                    error: 'Invalid credentials',
                });
            }
            fastify.log.error(error);
            return reply.status(401).send({
                error: 'Login failed',
            });
        }
    });
    fastify.delete('/users/:id', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const userId = parseInt(request.params.id, 10);
            const authenticatedUser = request.user;
            if (isNaN(userId)) {
                return reply.status(400).send({
                    error: 'Invalid user ID',
                });
            }
            if (authenticatedUser.userId !== userId) {
                return reply.status(403).send({
                    error: 'Forbidden - You can only delete your own account',
                });
            }
            const auditTimestamp = Date.now();
            const ipAddress = request.ip || 'unknown';
            logAccountDeletion(userId, auditTimestamp, ipAddress, 'user_initiated');
            const result = stmtDeleteUser.run(userId);
            if (result.changes === 0) {
                return reply.status(404).send({
                    error: 'User not found',
                });
            }
            return reply.status(204).send();
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to delete user account',
            });
        }
    });
}
//# sourceMappingURL=auth.js.map