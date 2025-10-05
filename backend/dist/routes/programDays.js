import { db } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';
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
export default async function programDaysRoutes(fastify) {
    fastify.get('/program-days', {
        ...listProgramDaysSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const programStmt = db.prepare(`
          SELECT id FROM programs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `);
            const program = programStmt.get(authenticatedUser.userId);
            if (!program) {
                return reply.status(404).send({
                    error: 'No program found for user',
                });
            }
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
            const programDays = programDaysStmt.all(program.id);
            return reply.status(200).send(programDays);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to list program days',
            });
        }
    });
    fastify.get('/program-days/recommended', {
        ...recommendedProgramDaySchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const programStmt = db.prepare(`
          SELECT id FROM programs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `);
            const program = programStmt.get(authenticatedUser.userId);
            if (!program) {
                return reply.status(404).send({
                    error: 'No program found for user',
                });
            }
            const dayOfWeek = new Date().getDay();
            if (dayOfWeek === 0) {
                return reply.status(404).send({
                    error: 'No program day scheduled for today (rest day)',
                });
            }
            const dayMapping = [0, 1, 2, 3, 4, 5, 6];
            const targetDayOfWeek = dayMapping[dayOfWeek];
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
            const programDay = programDayStmt.get(program.id, targetDayOfWeek);
            if (!programDay) {
                return reply.status(404).send({
                    error: 'No program day found for today',
                });
            }
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
            const exercises = exercisesStmt.all(programDay.id);
            const response = {
                ...programDay,
                exercises,
            };
            return reply.status(200).send(response);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to get recommended program day',
            });
        }
    });
}
//# sourceMappingURL=programDays.js.map