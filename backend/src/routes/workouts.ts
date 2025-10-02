/**
 * Workout Routes
 *
 * REST endpoints for workout session management:
 * - POST /api/workouts - Create new workout session
 * - GET /api/workouts - List user's workouts with optional date filtering
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWorkout, listWorkouts, updateWorkoutStatus } from '../services/workoutService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Create workout request body interface
 */
interface CreateWorkoutBody {
  program_day_id: number;
  date: string;
}

/**
 * List workouts query parameters interface
 */
interface ListWorkoutsQuery {
  start_date?: string;
  end_date?: string;
}

/**
 * Create workout request schema
 */
const createWorkoutSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['program_day_id', 'date'],
      properties: {
        program_day_id: {
          type: 'integer',
          description: 'ID of the program day (e.g., Push A, Pull A)',
        },
        date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Date in ISO format (YYYY-MM-DD)',
        },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          user_id: { type: 'number' },
          program_day_id: { type: 'number' },
          date: { type: 'string' },
          started_at: { type: ['number', 'null'] },
          completed_at: { type: ['number', 'null'] },
          status: {
            type: 'string',
            enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
          },
          total_volume_kg: { type: ['number', 'null'] },
          average_rir: { type: ['number', 'null'] },
          synced: { type: 'number' },
        },
      },
    },
  },
};

/**
 * List workouts request schema
 */
const listWorkoutsSchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Start date filter (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'End date filter (YYYY-MM-DD)',
        },
      },
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            user_id: { type: 'number' },
            program_day_id: { type: 'number' },
            date: { type: 'string' },
            started_at: { type: ['number', 'null'] },
            completed_at: { type: ['number', 'null'] },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
            },
            total_volume_kg: { type: ['number', 'null'] },
            average_rir: { type: ['number', 'null'] },
            synced: { type: 'number' },
            day_name: { type: ['string', 'null'] },
            day_type: {
              type: ['string', 'null'],
              enum: ['strength', 'vo2max', null],
            },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  program_day_id: { type: 'number' },
                  exercise_id: { type: 'number' },
                  exercise_name: { type: 'string' },
                  order_index: { type: 'number' },
                  sets: { type: 'number' },
                  reps: { type: 'string' },
                  rir: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Register workout routes
 */
export default async function workoutRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workouts
   *
   * Create a new workout session for the authenticated user
   * Returns the created workout object with status=not_started
   *
   * Requires JWT authentication
   */
  fastify.post<{ Body: CreateWorkoutBody }>(
    '/workouts',
    {
      ...createWorkoutSchema,
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Body: CreateWorkoutBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { program_day_id, date } = request.body;
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Create workout for authenticated user
        const workout = createWorkout(
          authenticatedUser.userId,
          program_day_id,
          date
        );

        return reply.status(201).send(workout);
      } catch (error) {
        // Handle validation errors
        if (error instanceof Error && error.message.includes('Invalid date')) {
          return reply.status(400).send({
            error: error.message,
          });
        }

        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create workout',
        });
      }
    }
  );

  /**
   * GET /api/workouts
   *
   * List workouts for the authenticated user
   * Optional query parameters for date filtering:
   * - start_date: Return workouts on or after this date (YYYY-MM-DD)
   * - end_date: Return workouts on or before this date (YYYY-MM-DD)
   *
   * Requires JWT authentication
   */
  fastify.get<{ Querystring: ListWorkoutsQuery }>(
    '/workouts',
    {
      ...listWorkoutsSchema,
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Querystring: ListWorkoutsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { start_date, end_date } = request.query;
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // List workouts for authenticated user with optional date filters
        const workouts = listWorkouts(
          authenticatedUser.userId,
          start_date,
          end_date
        );

        return reply.status(200).send(workouts);
      } catch (error) {
        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to list workouts',
        });
      }
    }
  );

  /**
   * PATCH /api/workouts/:id
   *
   * Update workout status (e.g., mark as completed)
   *
   * Requires JWT authentication
   */
  fastify.patch<{
    Params: { id: string };
    Body: { status: 'not_started' | 'in_progress' | 'completed' | 'cancelled' };
  }>(
    '/workouts/:id',
    {
      preHandler: authenticateJWT,
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
            },
          },
          required: ['status'],
        },
      },
    },
    async (request, reply) => {
      try {
        const workoutId = parseInt(request.params.id, 10);
        const { status } = request.body;

        const workout = updateWorkoutStatus(workoutId, status);
        return reply.status(200).send(workout);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to update workout',
        });
      }
    }
  );
}
