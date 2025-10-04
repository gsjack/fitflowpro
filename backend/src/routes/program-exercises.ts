/**
 * Program Exercise Routes (T055-T061)
 *
 * REST endpoints for managing program exercises:
 * - GET /api/program-exercises - List with optional filters
 * - POST /api/program-exercises - Add exercise to program day
 * - GET /api/program-exercises/:id - Get single program exercise
 * - PATCH /api/program-exercises/:id - Update sets/reps/RIR
 * - DELETE /api/program-exercises/:id - Remove exercise
 * - PUT /api/program-exercises/:id/swap - Swap exercise
 * - PATCH /api/program-exercises/batch-reorder - Reorder exercises
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import * as programExerciseService from '../services/programExerciseService.js';

/**
 * Validate user ownership of program exercise (via program_days -> programs -> user_id)
 */
function validateUserOwnership(programExerciseId: number, userId: number): boolean {
  const stmt = db.prepare(`
    SELECT pe.id
    FROM program_exercises pe
    JOIN program_days pd ON pe.program_day_id = pd.id
    JOIN programs p ON pd.program_id = p.id
    WHERE pe.id = ? AND p.user_id = ?
  `);

  const result = stmt.get(programExerciseId, userId);
  return result !== undefined;
}

/**
 * Validate user ownership of program day
 */
function validateProgramDayOwnership(programDayId: number, userId: number): boolean {
  const stmt = db.prepare(`
    SELECT pd.id
    FROM program_days pd
    JOIN programs p ON pd.program_id = p.id
    WHERE pd.id = ? AND p.user_id = ?
  `);

  const result = stmt.get(programDayId, userId);
  return result !== undefined;
}

/**
 * Request body for creating program exercise
 */
interface CreateProgramExerciseRequest {
  program_day_id: number;
  exercise_id: number;
  target_sets: number;
  target_rep_range: string;
  target_rir: number;
  order_index?: number;
}

/**
 * Request body for updating program exercise
 */
interface UpdateProgramExerciseRequest {
  target_sets?: number;
  target_rep_range?: string;
  target_rir?: number;
}

/**
 * Request body for swapping exercise
 */
interface SwapExerciseRequest {
  new_exercise_id: number;
}

/**
 * Request body for batch reorder
 */
interface BatchReorderRequest {
  program_day_id: number;
  exercise_order: Array<{
    program_exercise_id: number;
    new_order_index: number;
  }>;
}

/**
 * Register program exercise routes
 */
export default async function programExerciseRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/program-exercises
   *
   * List program exercises with optional filters
   * Query params: program_day_id, exercise_id
   *
   * Requires JWT authentication
   */
  fastify.get(
    '/program-exercises',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const query = request.query as { program_day_id?: string; exercise_id?: string };

        // Build filters
        const filters: { program_day_id?: number; exercise_id?: number } = {};

        if (query.program_day_id) {
          const programDayId = parseInt(query.program_day_id, 10);

          // Validate user owns this program day
          if (!validateProgramDayOwnership(programDayId, authenticatedUser.userId)) {
            return reply.status(403).send({
              error: 'Access denied to this program day',
            });
          }

          filters.program_day_id = programDayId;
        }

        if (query.exercise_id) {
          filters.exercise_id = parseInt(query.exercise_id, 10);
        }

        const exercises = programExerciseService.getProgramExercises(filters);

        return reply.status(200).send({ exercises });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to list program exercises',
        });
      }
    }
  );

  /**
   * POST /api/program-exercises
   *
   * Add exercise to program day with volume warning
   *
   * Body: { program_day_id, exercise_id, target_sets, target_rep_range, target_rir, order_index? }
   * Response: { program_exercise_id, volume_warning? }
   *
   * Requires JWT authentication
   */
  fastify.post(
    '/program-exercises',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const body = request.body as CreateProgramExerciseRequest;

        // Validate required fields
        if (
          !body.program_day_id ||
          !body.exercise_id ||
          body.target_sets === undefined ||
          !body.target_rep_range ||
          body.target_rir === undefined
        ) {
          return reply.status(400).send({
            error:
              'Missing required fields: program_day_id, exercise_id, target_sets, target_rep_range, target_rir',
          });
        }

        // Validate target_sets
        if (body.target_sets < 1 || body.target_sets > 10) {
          return reply.status(400).send({
            error: 'target_sets must be between 1 and 10',
          });
        }

        // Validate target_rep_range format (N-M)
        if (!/^\d+-\d+$/.test(body.target_rep_range)) {
          return reply.status(400).send({
            error: 'target_rep_range must be in format "N-M" (e.g., "8-12")',
          });
        }

        // Validate target_rir
        if (body.target_rir < 0 || body.target_rir > 4) {
          return reply.status(400).send({
            error: 'target_rir must be between 0 and 4',
          });
        }

        // Validate user owns this program day
        if (!validateProgramDayOwnership(body.program_day_id, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program day not found',
          });
        }

        // Call service (this will throw if exercise_id or program_day_id doesn't exist)
        const result = programExerciseService.createProgramExercise({
          program_day_id: body.program_day_id,
          exercise_id: body.exercise_id,
          target_sets: body.target_sets,
          target_rep_range: body.target_rep_range,
          target_rir: body.target_rir,
          order_index: body.order_index,
        });

        return reply.status(201).send(result);
      } catch (error: unknown) {
        // Check for specific error messages from service
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: errorMessage,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create program exercise',
        });
      }
    }
  );

  /**
   * GET /api/program-exercises/:id
   *
   * Get single program exercise
   *
   * Requires JWT authentication
   */
  fastify.get(
    '/program-exercises/:id',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const params = request.params as { id: string };
        const programExerciseId = parseInt(params.id, 10);

        // Validate user ownership
        if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program exercise not found',
          });
        }

        // Get program exercise
        const exercises = programExerciseService.getProgramExercises({});
        const programExercise = exercises.find((ex) => ex.id === programExerciseId);

        if (!programExercise) {
          return reply.status(404).send({
            error: 'Program exercise not found',
          });
        }

        return reply.status(200).send(programExercise);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get program exercise',
        });
      }
    }
  );

  /**
   * PATCH /api/program-exercises/:id
   *
   * Update sets/reps/RIR with volume warning
   *
   * Body: { target_sets?, target_rep_range?, target_rir? }
   * Response: { updated: true, volume_warning? }
   *
   * Requires JWT authentication
   */
  fastify.patch(
    '/program-exercises/:id',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const params = request.params as { id: string };
        const body = request.body as UpdateProgramExerciseRequest;
        const programExerciseId = parseInt(params.id, 10);

        // Validate user ownership
        if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program exercise not found',
          });
        }

        // Validate target_sets if provided
        if (body.target_sets !== undefined && (body.target_sets < 1 || body.target_sets > 10)) {
          return reply.status(400).send({
            error: 'target_sets must be between 1 and 10',
          });
        }

        // Validate target_rep_range format if provided
        if (body.target_rep_range !== undefined && !/^\d+-\d+$/.test(body.target_rep_range)) {
          return reply.status(400).send({
            error: 'target_rep_range must be in format "N-M" (e.g., "8-12")',
          });
        }

        // Validate target_rir if provided
        if (body.target_rir !== undefined && (body.target_rir < 0 || body.target_rir > 4)) {
          return reply.status(400).send({
            error: 'target_rir must be between 0 and 4',
          });
        }

        // Call service
        const result = programExerciseService.updateProgramExercise(programExerciseId, body);

        return reply.status(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: errorMessage,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to update program exercise',
        });
      }
    }
  );

  /**
   * DELETE /api/program-exercises/:id
   *
   * Remove exercise with volume warning
   *
   * Response: { deleted: true, volume_warning? }
   *
   * Requires JWT authentication
   */
  fastify.delete(
    '/program-exercises/:id',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const params = request.params as { id: string };
        const programExerciseId = parseInt(params.id, 10);

        // Validate user ownership
        if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program exercise not found',
          });
        }

        // Call service
        const result = programExerciseService.deleteProgramExercise(programExerciseId);

        return reply.status(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: errorMessage,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to delete program exercise',
        });
      }
    }
  );

  /**
   * PUT /api/program-exercises/:id/swap
   *
   * Swap exercise with compatible alternative (preserve order_index)
   *
   * Body: { new_exercise_id }
   * Response: { swapped: true, old_exercise_name, new_exercise_name, volume_warning? }
   *
   * Requires JWT authentication
   */
  fastify.put(
    '/program-exercises/:id/swap',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const params = request.params as { id: string };
        const body = request.body as SwapExerciseRequest;
        const programExerciseId = parseInt(params.id, 10);

        // Validate required fields
        if (!body.new_exercise_id) {
          return reply.status(400).send({
            error: 'Missing required field: new_exercise_id',
          });
        }

        // Validate user ownership
        if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program exercise not found',
          });
        }

        // Call service (this will throw if incompatible or not found)
        const result = programExerciseService.swapExercise(programExerciseId, body.new_exercise_id);

        return reply.status(200).send(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('not found')) {
          return reply.status(404).send({
            error: errorMessage,
          });
        }

        if (errorMessage.includes('incompatible')) {
          return reply.status(400).send({
            error: errorMessage,
          });
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to swap exercise',
        });
      }
    }
  );

  /**
   * PATCH /api/program-exercises/batch-reorder
   *
   * Reorder multiple exercises atomically (drag-and-drop)
   *
   * Body: { program_day_id, exercise_order: [{ program_exercise_id, new_order_index }] }
   * Response: { reordered: true }
   *
   * Requires JWT authentication
   */
  fastify.patch(
    '/program-exercises/batch-reorder',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const body = request.body as BatchReorderRequest;

        // Validate required fields
        if (!body.program_day_id) {
          return reply.status(400).send({
            error: 'Missing required field: program_day_id',
          });
        }

        if (!body.exercise_order || !Array.isArray(body.exercise_order)) {
          return reply.status(400).send({
            error: 'Missing or invalid field: exercise_order (must be array)',
          });
        }

        // Validate user owns this program day
        if (!validateProgramDayOwnership(body.program_day_id, authenticatedUser.userId)) {
          return reply.status(404).send({
            error: 'Program day not found',
          });
        }

        // Validate exercise_order items
        for (const item of body.exercise_order) {
          if (!item.program_exercise_id || item.new_order_index === undefined) {
            return reply.status(400).send({
              error: 'Each exercise_order item must have program_exercise_id and new_order_index',
            });
          }

          if (item.new_order_index < 0) {
            return reply.status(400).send({
              error: 'new_order_index must be non-negative',
            });
          }

          // Validate user owns each program exercise
          if (!validateUserOwnership(item.program_exercise_id, authenticatedUser.userId)) {
            return reply.status(403).send({
              error: `Access denied to program exercise ${item.program_exercise_id}`,
            });
          }
        }

        // Call service
        const result = programExerciseService.reorderExercises(
          body.program_day_id,
          body.exercise_order
        );

        return reply.status(200).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to reorder exercises',
        });
      }
    }
  );
}
