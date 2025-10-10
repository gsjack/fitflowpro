/**
 * Set Logging Routes
 *
 * REST endpoints for exercise set tracking:
 * - POST /api/sets - Log individual exercise set with weight, reps, RIR
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logSet, getSetsForWorkout, deleteSet } from '../services/setService.js';
import { authenticateJWT } from '../middleware/auth.js';

/**
 * Log set request body interface
 */
interface LogSetBody {
  workout_id: number;
  exercise_id: number;
  set_number?: number;
  weight_kg: number;
  reps: number;
  rir: number;
  timestamp?: number | string;
  localId?: number;
  notes?: string;
}

/**
 * Log set request schema
 */
const logSetSchema = {
  schema: {
    body: {
      type: 'object',
      required: [
        'workout_id',
        'exercise_id',
        'weight_kg',
        'reps',
        'rir',
      ],
      properties: {
        workout_id: {
          type: 'integer',
          description: 'ID of the workout session',
        },
        exercise_id: {
          type: 'integer',
          description: 'ID of the exercise being performed',
        },
        set_number: {
          type: 'integer',
          minimum: 1,
          description: 'Set number within the workout (1, 2, 3, etc.)',
        },
        weight_kg: {
          type: 'number',
          minimum: 0,
          maximum: 500,
          description: 'Weight lifted in kilograms (0-500)',
        },
        reps: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Number of repetitions completed (1-50)',
        },
        rir: {
          type: 'integer',
          minimum: 0,
          maximum: 4,
          description: 'Reps in Reserve (0-4)',
        },
        timestamp: {
          oneOf: [
            { type: 'integer' },
            { type: 'string', format: 'date-time' },
          ],
          description: 'UTC milliseconds when set was completed (or ISO 8601 string)',
        },
        localId: {
          type: 'integer',
          description: 'Optional local ID from mobile app for deduplication',
        },
        notes: {
          type: 'string',
          maxLength: 500,
          description: 'Optional notes about the set (max 500 chars)',
        },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          localId: { type: ['number', 'null'] },
          synced: { type: 'boolean' },
          estimated_1rm: { type: 'number' },
          weight_kg: { type: 'number' },
          reps: { type: 'number' },
          rir: { type: 'number' },
        },
      },
    },
  },
};

/**
 * Register set logging routes
 */
export default async function setRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/sets
   *
   * Fetch sets for a workout session
   * Query param: workout_id (required)
   *
   * Requires JWT authentication
   */
  fastify.get<{ Querystring: { workout_id?: string } }>(
    '/sets',
    { preHandler: authenticateJWT },
    async (
      request: FastifyRequest<{ Querystring: { workout_id?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const workoutId = request.query.workout_id;

        if (!workoutId) {
          return reply.status(400).send({
            error: 'workout_id query parameter is required',
          });
        }

        const sets = getSetsForWorkout(parseInt(workoutId));

        return reply.status(200).send(sets);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to fetch sets',
        });
      }
    }
  );

  /**
   * POST /api/sets
   *
   * Log an exercise set for a workout session
   * Implements idempotent sync via localId deduplication
   *
   * Validation rules (per FR-005):
   * - weight_kg: 0-500
   * - reps: 1-50
   * - rir: 0-4
   * - notes: max 500 characters
   *
   * Requires JWT authentication
   */
  fastify.post<{ Body: LogSetBody }>(
    '/sets',
    {
      ...logSetSchema,
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest<{ Body: LogSetBody }>, reply: FastifyReply) => {
      try {
        const {
          workout_id,
          exercise_id,
          set_number,
          weight_kg,
          reps,
          rir,
          timestamp,
          localId,
          notes,
        } = request.body;

        // Log the set
        const result = logSet(
          workout_id,
          exercise_id,
          set_number,
          weight_kg,
          reps,
          rir,
          timestamp,
          localId,
          notes
        );

        return reply.status(201).send(result);
      } catch (error) {
        // Handle validation errors
        if (
          error instanceof Error &&
          (error.message.includes('must be between') ||
            error.message.includes('must be 500 characters'))
        ) {
          return reply.status(400).send({
            error: error.message,
          });
        }

        // Handle database errors
        if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
          return reply.status(400).send({
            error: 'Invalid workout_id or exercise_id',
          });
        }

        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to log set',
        });
      }
    }
  );

  /**
   * DELETE /api/sets/:id
   *
   * Delete a specific set by ID
   * Used when cancelling workouts to remove logged sets
   *
   * Requires JWT authentication
   */
  fastify.delete<{ Params: { id: string } }>(
    '/sets/:id',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const setId = parseInt(request.params.id, 10);

        if (isNaN(setId)) {
          return reply.status(400).send({
            error: 'Invalid set ID',
          });
        }

        const deleted = deleteSet(setId);

        if (!deleted) {
          return reply.status(404).send({
            error: 'Set not found',
          });
        }

        return reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to delete set',
        });
      }
    }
  );
}
