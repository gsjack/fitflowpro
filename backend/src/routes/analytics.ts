/**
 * Analytics Routes (T050-T052)
 *
 * Endpoints for 1RM progression, volume trends, and consistency metrics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  get1RMProgression,
  getVolumeTrends,
  getConsistencyMetrics,
} from '../services/analyticsService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Query params for 1RM progression
 */
interface OneRMProgressionQuery {
  exercise_id: string;
  start_date: string;
  end_date: string;
}

/**
 * Query params for volume trends
 */
interface VolumeTrendsQuery {
  muscle_group: string;
  start_date: string;
  end_date: string;
}

/**
 * Schema for 1RM progression endpoint
 */
const oneRMProgressionSchema = {
  schema: {
    querystring: {
      type: 'object',
      required: ['exercise_id', 'start_date', 'end_date'],
      properties: {
        exercise_id: {
          type: 'string',
          description: 'Exercise ID',
        },
        start_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Start date (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'End date (YYYY-MM-DD)',
        },
      },
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            estimated_1rm: { type: 'number' },
          },
        },
      },
    },
  },
};

/**
 * Schema for volume trends endpoint
 */
const volumeTrendsSchema = {
  schema: {
    querystring: {
      type: 'object',
      required: ['muscle_group', 'start_date', 'end_date'],
      properties: {
        muscle_group: {
          type: 'string',
          description: 'Muscle group name (e.g., chest, back_lats)',
        },
        start_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Start date (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'End date (YYYY-MM-DD)',
        },
      },
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            week: { type: 'string' },
            total_sets: { type: 'number' },
            mev: { type: 'number' },
            mav: { type: 'number' },
            mrv: { type: 'number' },
          },
        },
      },
    },
  },
};

/**
 * Schema for consistency metrics endpoint
 */
const consistencyMetricsSchema = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          adherence_rate: { type: 'number' },
          avg_session_duration: { type: 'number' },
          total_workouts: { type: 'number' },
        },
      },
    },
  },
};

/**
 * Register analytics routes
 */
export default async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/analytics/1rm-progression (T050)
   *
   * Get estimated 1RM progression for an exercise over time
   *
   * Query params:
   * - exercise_id: Exercise ID
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   *
   * Returns: Array of {date, estimated_1rm}
   */
  fastify.get<{ Querystring: OneRMProgressionQuery }>(
    '/analytics/1rm-progression',
    {
      ...oneRMProgressionSchema,
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Querystring: OneRMProgressionQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { exercise_id, start_date, end_date } = request.query;
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Convert exercise_id to number
        const exerciseId = parseInt(exercise_id, 10);
        if (isNaN(exerciseId)) {
          return reply.status(400).send({
            error: 'Invalid exercise_id',
          });
        }

        // Call analytics service
        const progression = get1RMProgression(
          authenticatedUser.userId,
          exerciseId,
          start_date,
          end_date
        );

        return reply.status(200).send(progression);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve 1RM progression',
        });
      }
    }
  );

  /**
   * GET /api/analytics/volume-trends (T051)
   *
   * Get volume trends for a muscle group over time with MEV/MAV/MRV landmarks
   *
   * Query params:
   * - muscle_group: Muscle group name (e.g., chest, back_lats)
   * - start_date: Start date (YYYY-MM-DD)
   * - end_date: End date (YYYY-MM-DD)
   *
   * Returns: Array of {week, total_sets, mev, mav, mrv}
   */
  fastify.get<{ Querystring: VolumeTrendsQuery }>(
    '/analytics/volume-trends',
    {
      ...volumeTrendsSchema,
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Querystring: VolumeTrendsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { muscle_group, start_date, end_date } = request.query;
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Call analytics service
        const trends = getVolumeTrends(
          authenticatedUser.userId,
          muscle_group,
          start_date,
          end_date
        );

        return reply.status(200).send(trends);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve volume trends',
        });
      }
    }
  );

  /**
   * GET /api/analytics/consistency (T052)
   *
   * Get consistency metrics for the authenticated user
   *
   * Returns: {adherence_rate, avg_session_duration, total_workouts}
   */
  fastify.get(
    '/analytics/consistency',
    {
      ...consistencyMetricsSchema,
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Call analytics service
        const metrics = getConsistencyMetrics(authenticatedUser.userId);

        return reply.status(200).send(metrics);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve consistency metrics',
        });
      }
    }
  );
}
