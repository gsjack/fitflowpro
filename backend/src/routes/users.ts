/**
 * User Routes
 *
 * REST endpoints for user profile management:
 * - GET /api/users/me - Get current authenticated user's profile
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../database/db.js';

/**
 * Register user routes
 */
export default async function userRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/users/me
   *
   * Get current authenticated user's profile
   * Returns user data excluding password_hash
   *
   * Requires JWT authentication
   */
  fastify.get(
    '/users/me',
    {
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Fetch user data from database
        const user = db
          .prepare(
            `
            SELECT id, username, age, weight_kg, experience_level, created_at, updated_at
            FROM users
            WHERE id = ?
          `
          )
          .get(authenticatedUser.userId) as {
          id: number;
          username: string;
          age: number | null;
          weight_kg: number | null;
          experience_level: string | null;
          created_at: number;
          updated_at: number;
        } | undefined;

        if (!user) {
          return reply.status(404).send({
            error: 'User not found',
          });
        }

        return reply.status(200).send(user);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to fetch user data',
        });
      }
    }
  );
}
