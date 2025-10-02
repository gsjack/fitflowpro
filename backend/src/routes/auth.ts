/**
 * Authentication Routes
 *
 * Endpoints for user registration, login, and account deletion
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerUser, loginUser } from '../services/authService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { stmtDeleteUser } from '../database/db.js';
import { logAuthEvent, logAccountDeletion } from '../services/auditService.js';

/**
 * Registration request schema
 */
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
          token: { type: 'string' },
        },
      },
    },
  },
};

/**
 * Login request schema
 */
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

/**
 * Registration request body interface
 */
interface RegisterBody {
  username: string;
  password: string;
  age?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Login request body interface
 */
interface LoginBody {
  username: string;
  password: string;
}

/**
 * Delete user route params interface
 */
interface DeleteUserParams {
  id: string;
}

/**
 * Register authentication routes
 */
export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/register
   *
   * Register a new user with email (username), password, and optional profile data
   * Returns user_id and JWT token on success
   */
  fastify.post<{ Body: RegisterBody }>(
    '/auth/register',
    registerSchema,
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const { username, password, age, weight_kg, experience_level } = request.body;

        // Call authentication service
        const result = await registerUser(
          username,
          password,
          age,
          weight_kg,
          experience_level,
          (payload) => fastify.jwt.sign(payload)
        );

        // Log successful registration
        const ipAddress = request.ip || 'unknown';
        const timestamp = Date.now();
        logAuthEvent(result.user_id, 'auth_register', ipAddress, timestamp);

        return reply.status(201).send(result);
      } catch (error) {
        // Handle duplicate username error
        if (error instanceof Error && error.message === 'Username already exists') {
          return reply.status(409).send({
            error: 'Username already exists',
          });
        }

        // Generic error
        fastify.log.error(error);
        return reply.status(400).send({
          error: 'Registration failed',
        });
      }
    }
  );

  /**
   * POST /api/auth/login
   *
   * Login with username (email) and password
   * Returns JWT token and user data on success
   */
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    loginSchema,
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        const { username, password } = request.body;

        // Call authentication service
        const result = await loginUser(
          username,
          password,
          (payload) => fastify.jwt.sign(payload)
        );

        // Log successful login
        const ipAddress = request.ip || 'unknown';
        const timestamp = Date.now();
        logAuthEvent(result.user.id, 'auth_login', ipAddress, timestamp);

        return reply.status(200).send(result);
      } catch (error) {
        // Handle invalid credentials error
        if (error instanceof Error && error.message === 'Invalid credentials') {
          return reply.status(401).send({
            error: 'Invalid credentials',
          });
        }

        // Generic error
        fastify.log.error(error);
        return reply.status(401).send({
          error: 'Login failed',
        });
      }
    }
  );

  /**
   * DELETE /api/users/:id
   *
   * Delete user account (requires JWT authentication)
   * User can only delete their own account
   * Cascade deletes all related data: workouts, sets, recovery assessments, programs
   * Returns 204 No Content on success
   */
  fastify.delete<{ Params: DeleteUserParams }>(
    '/users/:id',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest<{ Params: DeleteUserParams }>, reply: FastifyReply) => {
      try {
        const userId = parseInt(request.params.id, 10);
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Validate user ID
        if (isNaN(userId)) {
          return reply.status(400).send({
            error: 'Invalid user ID',
          });
        }

        // Users can only delete their own account
        if (authenticatedUser.userId !== userId) {
          return reply.status(403).send({
            error: 'Forbidden - You can only delete your own account',
          });
        }

        // Log deletion to audit log before deleting user
        const auditTimestamp = Date.now();
        const ipAddress = request.ip || 'unknown';
        logAccountDeletion(userId, auditTimestamp, ipAddress, 'user_initiated');

        // Delete user (cascade delete handled by database foreign keys)
        // ON DELETE CASCADE will remove:
        // - workouts → sets (via workout_id FK)
        // - recovery_assessments
        // - vo2max_sessions (via workout_id FK)
        // - programs
        // - active_sessions
        // - audit_logs
        const result = stmtDeleteUser.run(userId);

        if (result.changes === 0) {
          return reply.status(404).send({
            error: 'User not found',
          });
        }

        // Return 204 No Content on success (no body)
        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to delete user account',
        });
      }
    }
  );
}
