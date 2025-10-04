import { db } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import * as programExerciseService from '../services/programExerciseService.js';
function validateUserOwnership(programExerciseId, userId) {
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
function validateProgramDayOwnership(programDayId, userId) {
    const stmt = db.prepare(`
    SELECT pd.id
    FROM program_days pd
    JOIN programs p ON pd.program_id = p.id
    WHERE pd.id = ? AND p.user_id = ?
  `);
    const result = stmt.get(programDayId, userId);
    return result !== undefined;
}
export default async function programExerciseRoutes(fastify) {
    fastify.get('/program-exercises', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const query = request.query;
            const filters = {};
            if (query.program_day_id) {
                const programDayId = parseInt(query.program_day_id, 10);
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
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to list program exercises',
            });
        }
    });
    fastify.post('/program-exercises', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const body = request.body;
            if (!body.program_day_id || !body.exercise_id || body.target_sets === undefined || !body.target_rep_range || body.target_rir === undefined) {
                return reply.status(400).send({
                    error: 'Missing required fields: program_day_id, exercise_id, target_sets, target_rep_range, target_rir',
                });
            }
            if (body.target_sets < 1 || body.target_sets > 10) {
                return reply.status(400).send({
                    error: 'target_sets must be between 1 and 10',
                });
            }
            if (!/^\d+-\d+$/.test(body.target_rep_range)) {
                return reply.status(400).send({
                    error: 'target_rep_range must be in format "N-M" (e.g., "8-12")',
                });
            }
            if (body.target_rir < 0 || body.target_rir > 4) {
                return reply.status(400).send({
                    error: 'target_rir must be between 0 and 4',
                });
            }
            if (!validateProgramDayOwnership(body.program_day_id, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program day not found',
                });
            }
            const result = programExerciseService.createProgramExercise({
                program_day_id: body.program_day_id,
                exercise_id: body.exercise_id,
                target_sets: body.target_sets,
                target_rep_range: body.target_rep_range,
                target_rir: body.target_rir,
                order_index: body.order_index,
            });
            return reply.status(201).send(result);
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({
                    error: error.message,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to create program exercise',
            });
        }
    });
    fastify.get('/program-exercises/:id', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const params = request.params;
            const programExerciseId = parseInt(params.id, 10);
            if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program exercise not found',
                });
            }
            const exercises = programExerciseService.getProgramExercises({});
            const programExercise = exercises.find((ex) => ex.id === programExerciseId);
            if (!programExercise) {
                return reply.status(404).send({
                    error: 'Program exercise not found',
                });
            }
            return reply.status(200).send(programExercise);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to get program exercise',
            });
        }
    });
    fastify.patch('/program-exercises/:id', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const params = request.params;
            const body = request.body;
            const programExerciseId = parseInt(params.id, 10);
            if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program exercise not found',
                });
            }
            if (body.target_sets !== undefined && (body.target_sets < 1 || body.target_sets > 10)) {
                return reply.status(400).send({
                    error: 'target_sets must be between 1 and 10',
                });
            }
            if (body.target_rep_range !== undefined && !/^\d+-\d+$/.test(body.target_rep_range)) {
                return reply.status(400).send({
                    error: 'target_rep_range must be in format "N-M" (e.g., "8-12")',
                });
            }
            if (body.target_rir !== undefined && (body.target_rir < 0 || body.target_rir > 4)) {
                return reply.status(400).send({
                    error: 'target_rir must be between 0 and 4',
                });
            }
            const result = programExerciseService.updateProgramExercise(programExerciseId, body);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({
                    error: error.message,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to update program exercise',
            });
        }
    });
    fastify.delete('/program-exercises/:id', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const params = request.params;
            const programExerciseId = parseInt(params.id, 10);
            if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program exercise not found',
                });
            }
            const result = programExerciseService.deleteProgramExercise(programExerciseId);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({
                    error: error.message,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to delete program exercise',
            });
        }
    });
    fastify.put('/program-exercises/:id/swap', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const params = request.params;
            const body = request.body;
            const programExerciseId = parseInt(params.id, 10);
            if (!body.new_exercise_id) {
                return reply.status(400).send({
                    error: 'Missing required field: new_exercise_id',
                });
            }
            if (!validateUserOwnership(programExerciseId, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program exercise not found',
                });
            }
            const result = programExerciseService.swapExercise(programExerciseId, body.new_exercise_id);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error.message?.includes('not found')) {
                return reply.status(404).send({
                    error: error.message,
                });
            }
            if (error.message?.includes('incompatible')) {
                return reply.status(400).send({
                    error: error.message,
                });
            }
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to swap exercise',
            });
        }
    });
    fastify.patch('/program-exercises/batch-reorder', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const body = request.body;
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
            if (!validateProgramDayOwnership(body.program_day_id, authenticatedUser.userId)) {
                return reply.status(404).send({
                    error: 'Program day not found',
                });
            }
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
                if (!validateUserOwnership(item.program_exercise_id, authenticatedUser.userId)) {
                    return reply.status(403).send({
                        error: `Access denied to program exercise ${item.program_exercise_id}`,
                    });
                }
            }
            const result = programExerciseService.reorderExercises(body.program_day_id, body.exercise_order);
            return reply.status(200).send(result);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Failed to reorder exercises',
            });
        }
    });
}
//# sourceMappingURL=program-exercises.js.map