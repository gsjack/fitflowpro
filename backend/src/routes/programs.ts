/**
 * Program Routes (T050-T054)
 *
 * REST endpoints for training program management:
 * - GET /api/programs - Get user's active program with full structure
 * - PATCH /api/programs/:id/advance-phase - Advance mesocycle phase with volume adjustment
 * - GET /api/programs/:id/volume - Get program volume analysis per muscle group
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getUserProgram,
  getProgramDays,
  getProgramDayExercises,
  advancePhase,
  createDefaultProgram,
} from '../services/programService.js';
import { getProgramVolumeAnalysis } from '../services/volumeService.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Advance phase request body interface
 */
interface AdvancePhaseBody {
  manual?: boolean;
  target_phase?: 'mev' | 'mav' | 'mrv' | 'deload';
}

/**
 * GET /api/programs schema
 */
const getProgramsSchema = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          user_id: { type: 'number' },
          name: { type: 'string' },
          mesocycle_week: { type: 'number' },
          mesocycle_phase: {
            type: 'string',
            enum: ['mev', 'mav', 'mrv', 'deload'],
          },
          created_at: { type: 'number' },
          program_days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                program_id: { type: 'number' },
                day_of_week: { type: 'number' },
                day_name: { type: 'string' },
                day_type: {
                  type: 'string',
                  enum: ['strength', 'vo2max'],
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
                      target_sets: { type: 'number' },
                      target_rep_range: { type: 'string' },
                      target_rir: { type: 'number' },
                      muscle_groups: { type: 'string' },
                      equipment: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      404: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
};

/**
 * PATCH /api/programs/:id/advance-phase schema
 */
const advancePhaseSchema = {
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
        manual: { type: 'boolean' },
        target_phase: {
          type: 'string',
          enum: ['mev', 'mav', 'mrv', 'deload'],
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          previous_phase: { type: 'string' },
          new_phase: { type: 'string' },
          volume_multiplier: { type: 'number' },
          exercises_updated: { type: 'number' },
        },
      },
    },
  },
};

/**
 * GET /api/programs/:id/volume schema
 */
const getVolumeSchema = {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          muscle_groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                muscle_group: { type: 'string' },
                planned_sets: { type: 'number' },
                mev: { type: 'number' },
                mav: { type: 'number' },
                mrv: { type: 'number' },
                zone: {
                  type: 'string',
                  enum: ['below_mev', 'adequate', 'optimal', 'above_mrv'],
                },
              },
            },
          },
          warnings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                muscle_group: { type: 'string' },
                issue: {
                  type: 'string',
                  enum: ['below_mev', 'above_mrv'],
                },
                current_volume: { type: 'number' },
                threshold: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Register program routes
 */
export default async function programRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/programs
   *
   * Create a new default program for the user
   * Uses the 6-day Renaissance Periodization split
   *
   * Requires JWT authentication
   * Returns the newly created program ID
   */
  fastify.post(
    '/programs',
    { preHandler: authenticateJWT },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Check if user already has a program
        const existingProgram = getUserProgram(authenticatedUser.userId);

        if (existingProgram) {
          return reply.status(409).send({
            error: 'Conflict',
            message: 'User already has an active program',
            program_id: existingProgram.id,
          });
        }

        // Create default program
        const programId = createDefaultProgram(authenticatedUser.userId);

        // Get the created program with full structure
        const program = getUserProgram(authenticatedUser.userId);

        if (!program) {
          throw new Error('Failed to retrieve created program');
        }

        const programDays = getProgramDays(program.id);

        const programDaysWithExercises = programDays.map((day) => {
          const exercises = getProgramDayExercises(day.id);

          const transformedExercises = exercises.map((ex) => ({
            id: ex.id,
            program_day_id: ex.program_day_id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            target_sets: ex.sets,
            target_rep_range: ex.reps,
            target_rir: ex.rir,
            muscle_groups: ex.muscle_groups,
            equipment: ex.equipment,
          }));

          return {
            ...day,
            exercises: transformedExercises,
          };
        });

        const response = {
          ...program,
          program_days: programDaysWithExercises,
        };

        return reply.status(201).send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create program',
        });
      }
    }
  );

  /**
   * GET /api/programs
   *
   * Get the authenticated user's active program with full structure
   * (program days and exercises nested)
   *
   * Returns 404 if user has no active program
   * Requires JWT authentication
   */
  fastify.get(
    '/programs',
    {
      ...getProgramsSchema,
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Get user's active program
        const program = getUserProgram(authenticatedUser.userId);

        if (!program) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'No active program found for user',
          });
        }

        // Get program days
        const programDays = getProgramDays(program.id);

        // Get exercises for each program day
        const programDaysWithExercises = programDays.map((day) => {
          const exercises = getProgramDayExercises(day.id);

          // Transform to match contract schema
          const transformedExercises = exercises.map((ex) => ({
            id: ex.id,
            program_day_id: ex.program_day_id,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index,
            target_sets: ex.sets, // Contract uses target_sets
            target_rep_range: ex.reps, // Contract uses target_rep_range
            target_rir: ex.rir, // Contract uses target_rir
            muscle_groups: ex.muscle_groups,
            equipment: ex.equipment,
          }));

          return {
            ...day,
            exercises: transformedExercises,
          };
        });

        // Build full response
        const response = {
          ...program,
          program_days: programDaysWithExercises,
        };

        return reply.status(200).send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve program',
        });
      }
    }
  );

  /**
   * PATCH /api/programs/:id/advance-phase
   *
   * Advance program to next mesocycle phase with automatic volume adjustment
   *
   * Phase progression: mev → mav → mrv → deload → mev (repeats)
   * Volume multipliers:
   * - MEV → MAV: 1.2x (+20%)
   * - MAV → MRV: 1.15x (+15%)
   * - MRV → Deload: 0.5x (-50%)
   * - Deload → MEV: 2.0x (reset to baseline)
   *
   * Requires JWT authentication
   * Validates user owns the program before modification
   */
  fastify.patch<{
    Params: { id: string };
    Body: AdvancePhaseBody;
  }>(
    '/programs/:id/advance-phase',
    {
      ...advancePhaseSchema,
      preHandler: authenticateJWT,
    },
    async (request, reply) => {
      try {
        const programId = parseInt(request.params.id, 10);
        const { manual, target_phase } = request.body;
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Validate manual mode
        if (manual === true && !target_phase) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'target_phase is required when manual=true',
          });
        }

        // Validate target_phase
        if (target_phase && !['mev', 'mav', 'mrv', 'deload'].includes(target_phase)) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Invalid target_phase: ${target_phase}`,
          });
        }

        // Verify program exists and belongs to user
        const program = getUserProgram(authenticatedUser.userId);

        if (!program) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Program not found',
          });
        }

        if (program.id !== programId) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Program not found',
          });
        }

        // Advance phase
        const result = advancePhase(programId, manual || false, target_phase);

        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof Error) {
          // Handle validation errors
          if (
            error.message.includes('required') ||
            error.message.includes('Invalid') ||
            error.message.includes('not found')
          ) {
            return reply.status(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to advance phase',
        });
      }
    }
  );

  /**
   * GET /api/programs/:id/volume
   *
   * Get volume analysis for the program (planned sets per muscle group)
   * Classifies volume zones based on MEV/MAV/MRV landmarks
   *
   * Zones:
   * - below_mev: Planned sets < MEV (insufficient for growth)
   * - adequate: MEV ≤ planned < MAV (adequate stimulus)
   * - optimal: MAV ≤ planned ≤ MRV (optimal range)
   * - above_mrv: Planned > MRV (risk of overtraining)
   *
   * Requires JWT authentication
   * Validates user owns the program
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/programs/:id/volume',
    {
      ...getVolumeSchema,
      preHandler: authenticateJWT,
    },
    async (request, reply) => {
      try {
        const programId = parseInt(request.params.id, 10);
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Verify program exists and belongs to user
        const program = getUserProgram(authenticatedUser.userId);

        if (!program) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Program not found',
          });
        }

        if (program.id !== programId) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Program not found',
          });
        }

        // Get volume analysis
        const volumeAnalysis = getProgramVolumeAnalysis(authenticatedUser.userId);

        if (!volumeAnalysis) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'No program found for volume analysis',
          });
        }

        // Transform to match contract schema
        const muscleGroups = volumeAnalysis.muscle_groups.map((mg) => ({
          muscle_group: mg.muscle_group,
          planned_sets: mg.planned_weekly_sets,
          mev: mg.mev,
          mav: mg.mav,
          mrv: mg.mrv,
          zone: mg.zone,
        }));

        // Generate warnings
        const warnings = volumeAnalysis.muscle_groups
          .filter((mg) => mg.zone === 'below_mev' || mg.zone === 'above_mrv')
          .map((mg) => ({
            muscle_group: mg.muscle_group,
            issue: mg.zone as 'below_mev' | 'above_mrv',
            current_volume: mg.planned_weekly_sets,
            threshold: mg.zone === 'below_mev' ? mg.mev : mg.mrv,
          }));

        return reply.status(200).send({
          muscle_groups: muscleGroups,
          warnings,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve volume analysis',
        });
      }
    }
  );
}
