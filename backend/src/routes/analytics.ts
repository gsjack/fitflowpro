/**
 * Analytics Routes (T050-T052)
 *
 * Endpoints for 1RM progression, volume trends, and consistency metrics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  get1RMProgression,
  getConsistencyMetrics,
} from '../services/analyticsService.js';
import {
  getCurrentWeekVolume,
  getVolumeHistory,
  getProgramVolumeAnalysis,
} from '../services/volumeService.js';
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

  /**
   * GET /api/analytics/volume-current-week (T017)
   *
   * Get current week volume tracking with completed and planned sets
   *
   * Returns: {week_start, week_end, muscle_groups: [{muscle_group, completed_sets, planned_sets, ...}]}
   */
  fastify.get(
    '/analytics/volume-current-week',
    {
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Call volume service
        const volumeData = getCurrentWeekVolume(authenticatedUser.userId);

        return reply.status(200).send(volumeData);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve current week volume',
        });
      }
    }
  );

  /**
   * GET /api/analytics/volume-trends (T018)
   *
   * Get historical volume trends over multiple weeks
   *
   * Query params:
   * - weeks: Number of weeks (default: 8, max: 52)
   * - muscle_group: Optional filter for specific muscle group
   *
   * Returns: {weeks: [{week_start, muscle_groups: [{muscle_group, completed_sets, mev, mav, mrv}]}]}
   */
  fastify.get<{ Querystring: { weeks?: string; muscle_group?: string } }>(
    '/analytics/volume-trends',
    {
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Querystring: { weeks?: string; muscle_group?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const { weeks: weeksParam, muscle_group } = request.query;

        // Parse weeks parameter
        let weeks = 8; // Default
        if (weeksParam) {
          weeks = parseInt(weeksParam, 10);
          if (isNaN(weeks) || weeks < 1) {
            return reply.status(400).send({
              error: 'Invalid weeks parameter. Must be a positive number.',
            });
          }
          if (weeks > 52) {
            return reply.status(400).send({
              error: 'Weeks parameter exceeds maximum of 52',
            });
          }
        }

        // Validate muscle_group parameter
        if (muscle_group) {
          const validMuscleGroups = [
            'chest', 'back', 'shoulders', 'quads', 'hamstrings',
            'glutes', 'biceps', 'triceps', 'calves', 'abs',
            'back_lats', 'back_traps', 'shoulders_front', 'shoulders_side', 'shoulders_rear',
            'front_delts', 'side_delts', 'rear_delts'
          ];

          if (!validMuscleGroups.includes(muscle_group)) {
            return reply.status(400).send({
              error: 'Invalid muscle_group parameter',
            });
          }
        }

        // Call volume service
        const volumeHistory = getVolumeHistory(authenticatedUser.userId, weeks, muscle_group);

        return reply.status(200).send(volumeHistory);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve volume trends',
        });
      }
    }
  );

  /**
   * GET /api/analytics/program-volume-analysis (T019)
   *
   * Get program volume analysis for active program
   *
   * Returns: {program_id, mesocycle_phase, muscle_groups: [{muscle_group, planned_weekly_sets, zone, ...}]}
   */
  fastify.get(
    '/analytics/program-volume-analysis',
    {
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Call volume service
        const programAnalysis = getProgramVolumeAnalysis(authenticatedUser.userId);

        if (!programAnalysis) {
          return reply.status(404).send({
            error: 'No active program found for user',
          });
        }

        return reply.status(200).send(programAnalysis);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve program volume analysis',
        });
      }
    }
  );
}
