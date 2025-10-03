/**
 * Recovery Assessment Routes
 *
 * REST endpoints for daily recovery check-in and auto-regulation:
 * - POST /api/recovery-assessments - Submit daily 3-question assessment
 * - GET /api/recovery-assessments/:userId/today - Get today's assessment
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAssessment } from '../services/recoveryService.js';
import { authenticateJWT } from '../middleware/auth.js';
import { db } from '../database/db.js';

/**
 * Recovery assessment request body interface
 */
interface CreateAssessmentBody {
  date: string;
  sleep_quality: number;
  muscle_soreness: number;
  mental_motivation: number;
}

/**
 * Recovery assessment request schema
 */
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

/**
 * Register recovery assessment routes
 */
export default async function recoveryRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/recovery-assessments
   *
   * Create a daily recovery assessment for auto-regulation
   *
   * Calculates total score from 3 subscores (sleep, soreness, motivation)
   * and determines volume adjustment per FR-009:
   * - 12-15: No adjustment
   * - 9-11: Reduce by 1 set per exercise
   * - 6-8: Reduce by 2 sets per exercise
   * - 3-5: Rest day recommended
   *
   * Validation rules (per FR-008):
   * - date: ISO format YYYY-MM-DD
   * - sleep_quality: 1-5
   * - muscle_soreness: 1-5
   * - mental_motivation: 1-5
   *
   * Requires JWT authentication
   */
  fastify.post<{ Body: CreateAssessmentBody }>(
    '/recovery-assessments',
    {
      ...createAssessmentSchema,
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Body: CreateAssessmentBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { date, sleep_quality, muscle_soreness, mental_motivation } = request.body;

        // Get authenticated user ID
        // @ts-expect-error - jwtVerify attaches user to request
        const userId = request.user.userId;

        // Create recovery assessment
        const result = createAssessment(
          userId,
          date,
          sleep_quality,
          muscle_soreness,
          mental_motivation
        );

        return reply.status(201).send(result);
      } catch (error) {
        // Handle validation errors
        if (
          error instanceof Error &&
          (error.message.includes('must be between') ||
            error.message.includes('must be in ISO format'))
        ) {
          return reply.status(400).send({
            error: error.message,
          });
        }

        // Handle database errors
        if (
          error instanceof Error &&
          error.message.includes('FOREIGN KEY constraint failed')
        ) {
          return reply.status(400).send({
            error: 'Invalid user_id',
          });
        }

        // Handle unique constraint violations (duplicate assessment for date)
        if (
          error instanceof Error &&
          error.message.includes('UNIQUE constraint failed')
        ) {
          return reply.status(400).send({
            error: 'Recovery assessment already exists for this date',
          });
        }

        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create recovery assessment',
        });
      }
    }
  );

  /**
   * GET /api/recovery-assessments/:userId/today
   *
   * Get today's recovery assessment for a user
   * Returns 404 if no assessment found for today
   *
   * Requires JWT authentication
   */
  fastify.get<{ Params: { userId: string } }>(
    '/recovery-assessments/:userId/today',
    {
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = parseInt(request.params.userId);

        // Get authenticated user ID
        // @ts-expect-error - jwtVerify attaches user to request
        const authUserId = request.user.userId;

        // Verify user can only access their own data
        if (userId !== authUserId) {
          return reply.status(403).send({
            error: 'Forbidden: Cannot access other users data',
          });
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Query database
        const assessment = db
          .prepare(
            `SELECT * FROM recovery_assessments
             WHERE user_id = ? AND date = ?`
          )
          .get(userId, today);

        if (!assessment) {
          return reply.status(404).send({
            error: 'No assessment found for today',
          });
        }

        return reply.status(200).send(assessment);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to fetch recovery assessment',
        });
      }
    }
  );
}
