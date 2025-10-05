/**
 * Program Days Routes
 *
 * REST endpoints for viewing training program structure:
 * - GET /api/program-days - List all program days for user's current program
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/db.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Program day response interface
 */
interface ProgramDayResponse {
  id: number;
  program_id: number;
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercise_count: number;
}

/**
 * Program exercise interface
 */
interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: string;
  rir: number;
  exercise_name: string;
  muscle_groups: string;
  equipment: string;
}

/**
 * Recommended program day response interface
 */
interface RecommendedProgramDayResponse {
  id: number;
  program_id: number;
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
  exercises: ProgramExercise[];
}

/**
 * List program days response schema
 */
const listProgramDaysSchema = {
  schema: {
    response: {
      200: {
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
            exercise_count: { type: 'number' },
          },
        },
      },
    },
  },
};

/**
 * Recommended program day response schema
 */
const recommendedProgramDaySchema = {
  schema: {
    response: {
      200: {
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
                order_index: { type: 'number' },
                sets: { type: 'number' },
                reps: { type: 'string' },
                rir: { type: 'number' },
                exercise_name: { type: 'string' },
                muscle_groups: { type: 'string' },
                equipment: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Register program days routes
 */
export default async function programDaysRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/program-days
   *
   * List all program days for the authenticated user's current program
   * Returns each day with its exercise count for easy workout swapping
   *
   * Requires JWT authentication
   */
  fastify.get(
    '/program-days',
    {
      ...listProgramDaysSchema,
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Get user's most recent program
        const programStmt = db.prepare(`
          SELECT id FROM programs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `);
        const program = programStmt.get(authenticatedUser.userId) as { id: number } | undefined;

        if (!program) {
          return reply.status(404).send({
            error: 'No program found for user',
          });
        }

        // Get all program days with exercise counts
        const programDaysStmt = db.prepare(`
          SELECT
            pd.id,
            pd.program_id,
            pd.day_of_week,
            pd.day_name,
            pd.day_type,
            COUNT(pe.id) as exercise_count
          FROM program_days pd
          LEFT JOIN program_exercises pe ON pd.id = pe.program_day_id
          WHERE pd.program_id = ?
          GROUP BY pd.id, pd.program_id, pd.day_of_week, pd.day_name, pd.day_type
          ORDER BY pd.day_of_week
        `);

        const programDays = programDaysStmt.all(program.id) as ProgramDayResponse[];

        return reply.status(200).send(programDays);
      } catch (error) {
        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to list program days',
        });
      }
    }
  );

  /**
   * GET /api/program-days/recommended
   *
   * Get recommended program day for today based on current day of week
   * Returns the program day matching today's weekday with all exercises
   *
   * Requires JWT authentication
   */
  fastify.get(
    '/program-days/recommended',
    {
      ...recommendedProgramDaySchema,
      preHandler: authenticateJWT,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;

        // Get user's most recent program
        const programStmt = db.prepare(`
          SELECT id FROM programs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `);
        const program = programStmt.get(authenticatedUser.userId) as { id: number } | undefined;

        if (!program) {
          return reply.status(404).send({
            error: 'No program found for user',
          });
        }

        // Determine today's day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayOfWeek = new Date().getDay();

        // Sunday is a rest day - no program day scheduled
        if (dayOfWeek === 0) {
          return reply.status(404).send({
            error: 'No program day scheduled for today (rest day)',
          });
        }

        // Map day of week to program day_of_week
        // Monday (1) -> day 1 (Push A)
        // Tuesday (2) -> day 2 (Pull A)
        // Wednesday (3) -> day 3 (VO2max A)
        // Thursday (4) -> day 4 (Push B)
        // Friday (5) -> day 5 (Pull B)
        // Saturday (6) -> day 6 (VO2max B)
        const dayMapping = [0, 1, 2, 3, 4, 5, 6]; // Maps JS day of week to program day_of_week (index 0 unused)
        const targetDayOfWeek = dayMapping[dayOfWeek]!;

        // Get program day for today
        const programDayStmt = db.prepare(`
          SELECT
            id,
            program_id,
            day_of_week,
            day_name,
            day_type
          FROM program_days
          WHERE program_id = ? AND day_of_week = ?
        `);

        const programDay = programDayStmt.get(program.id, targetDayOfWeek) as
          | Omit<RecommendedProgramDayResponse, 'exercises'>
          | undefined;

        if (!programDay) {
          return reply.status(404).send({
            error: 'No program day found for today',
          });
        }

        // Get exercises for this program day
        const exercisesStmt = db.prepare(`
          SELECT
            pe.id,
            pe.program_day_id,
            pe.exercise_id,
            pe.order_index,
            pe.sets,
            pe.reps,
            pe.rir,
            e.name as exercise_name,
            e.muscle_groups,
            e.equipment
          FROM program_exercises pe
          JOIN exercises e ON pe.exercise_id = e.id
          WHERE pe.program_day_id = ?
          ORDER BY pe.order_index
        `);

        const exercises = exercisesStmt.all(programDay.id) as ProgramExercise[];

        const response: RecommendedProgramDayResponse = {
          ...programDay,
          exercises,
        };

        return reply.status(200).send(response);
      } catch (error) {
        // Generic error
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get recommended program day',
        });
      }
    }
  );

  /**
   * POST /api/program-days
   *
   * Create a new program day for a program
   *
   * Requires JWT authentication
   */
  fastify.post<{ Body: { program_id: number; name: string; day_of_week: number } }>(
    '/program-days',
    {
      preHandler: authenticateJWT,
    },
    async (
      request: FastifyRequest<{ Body: { program_id: number; name: string; day_of_week: number } }>,
      reply: FastifyReply
    ) => {
      try {
        const authenticatedUser = (request as AuthenticatedRequest).user;
        const { program_id, name, day_of_week } = request.body;

        // Verify program belongs to user
        const programStmt = db.prepare(`
          SELECT id FROM programs WHERE id = ? AND user_id = ?
        `);
        const program = programStmt.get(program_id, authenticatedUser.userId);

        if (!program) {
          return reply.status(404).send({ error: 'Program not found' });
        }

        // Insert program day
        const insertStmt = db.prepare(`
          INSERT INTO program_days (program_id, day_name, day_of_week, day_type)
          VALUES (?, ?, ?, 'strength')
        `);
        const result = insertStmt.run(program_id, name, day_of_week);

        return reply.status(201).send({
          program_day_id: result.lastInsertRowid,
          program_id,
          name,
          day_of_week
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Failed to create program day',
        });
      }
    }
  );
}
