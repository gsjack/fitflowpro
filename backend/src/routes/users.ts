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

  /**
   * PATCH /api/users/me
   *
   * Update current authenticated user's profile
   * Allows updating: age, weight_kg, experience_level
   *
   * Requires JWT authentication
   */
  fastify.patch(
    '/users/me',
    {
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const updates = request.body as {
          age?: number;
          weight_kg?: number;
          experience_level?: string;
        };

        // Build dynamic UPDATE query
        const fields: string[] = [];
        const values: (number | string)[] = [];

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

        // Always update updated_at timestamp
        fields.push('updated_at = ?');
        values.push(Date.now());

        if (fields.length === 1) {
          // No fields to update besides updated_at
          return reply.status(400).send({
            error: 'No fields to update',
          });
        }

        // Add user ID to values array (for WHERE clause)
        values.push(authenticatedUser.userId);

        // Execute UPDATE query
        const updateQuery = `
          UPDATE users
          SET ${fields.join(', ')}
          WHERE id = ?
        `;

        db.prepare(updateQuery).run(...values);

        // Fetch updated user data
        const updatedUser = db
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
        };

        return reply.status(200).send(updatedUser);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to update user profile',
        });
      }
    }
  );
}
