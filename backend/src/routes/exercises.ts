/**
 * Exercise Library Routes
 *
 * Endpoints for filtering and retrieving exercises
 */

import { FastifyInstance } from 'fastify';
import { getExercises, getExerciseById, ExerciseFilters } from '../services/exerciseService.js';
import { authenticateJWT } from '../middleware/auth.js';

/**
 * Query parameters for GET /api/exercises
 */
interface ExerciseQueryParams {
  muscle_group?: string;
  equipment?: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight';
  movement_pattern?: 'compound' | 'isolation';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Route parameters for GET /api/exercises/:id
 */
interface ExerciseParams {
  id: string;
}

/**
 * Register exercise routes
 */
export default async function exerciseRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/exercises
   *
   * Get exercises with optional filtering
   */
  fastify.get(
    '/',
    {
      preHandler: authenticateJWT,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            muscle_group: {
              type: 'string',
              description: 'Filter by muscle group (chest, lats, quads, etc.)',
            },
            equipment: {
              type: 'string',
              enum: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
              description: 'Filter by equipment type',
            },
            movement_pattern: {
              type: 'string',
              enum: ['compound', 'isolation'],
              description: 'Filter by movement pattern',
            },
            difficulty: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              description: 'Filter by difficulty level',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                    primary_muscle_group: { type: 'string' },
                    secondary_muscle_groups: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    equipment: { type: 'string' },
                    movement_pattern: { type: 'string' },
                    difficulty: { type: 'string' },
                    default_sets: { type: 'number' },
                    default_reps: { type: 'string' },
                    default_rir: { type: 'number' },
                    description: { type: 'string' },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { muscle_group, equipment, movement_pattern, difficulty } =
        request.query as ExerciseQueryParams;
      try {
        const filters: ExerciseFilters = {
          muscle_group,
          equipment,
          movement_pattern,
          difficulty,
        };

        const exercises = getExercises(filters);

        return reply.status(200).send({
          exercises,
          count: exercises.length,
        });
      } catch (error: unknown) {
        // Handle validation errors (e.g., invalid muscle_group)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Invalid muscle_group')) {
          return reply.status(400).send({
            error: errorMessage,
          });
        }

        // Handle unexpected errors
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve exercises',
        });
      }
    }
  );

  /**
   * GET /api/exercises/:id
   *
   * Get exercise details by ID
   */
  fastify.get(
    '/:id',
    {
      preHandler: authenticateJWT,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Exercise ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              primary_muscle_group: { type: 'string' },
              secondary_muscle_groups: {
                type: 'array',
                items: { type: 'string' },
              },
              equipment: { type: 'string' },
              movement_pattern: { type: 'string' },
              difficulty: { type: 'string' },
              default_sets: { type: 'number' },
              default_reps: { type: 'string' },
              default_rir: { type: 'number' },
              description: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as ExerciseParams;
      try {
        const exerciseId = parseInt(id, 10);

        if (isNaN(exerciseId)) {
          return reply.status(400).send({
            error: 'Invalid exercise ID',
          });
        }

        const exercise = getExerciseById(exerciseId);

        if (!exercise) {
          return reply.status(404).send({
            error: 'Exercise not found',
          });
        }

        return reply.status(200).send(exercise);
      } catch (error: unknown) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Failed to retrieve exercise',
        });
      }
    }
  );
}
