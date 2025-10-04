import { getUserProgram, getProgramDays, getProgramDayExercises, advancePhase, createDefaultProgram, } from '../services/programService.js';
import { getProgramVolumeAnalysis } from '../services/volumeService.js';
import { authenticateJWT } from '../middleware/auth.js';
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
export default async function programRoutes(fastify) {
    fastify.post('/programs', { preHandler: authenticateJWT }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const existingProgram = getUserProgram(authenticatedUser.userId);
            if (existingProgram) {
                return reply.status(409).send({
                    error: 'Conflict',
                    message: 'User already has an active program',
                    program_id: existingProgram.id,
                });
            }
            const programId = createDefaultProgram(authenticatedUser.userId);
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
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to create program',
            });
        }
    });
    fastify.get('/programs', {
        ...getProgramsSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const authenticatedUser = request.user;
            const program = getUserProgram(authenticatedUser.userId);
            if (!program) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'No active program found for user',
                });
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
            return reply.status(200).send(response);
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve program',
            });
        }
    });
    fastify.patch('/programs/:id/advance-phase', {
        ...advancePhaseSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const programId = parseInt(request.params.id, 10);
            const { manual, target_phase } = request.body;
            const authenticatedUser = request.user;
            if (manual === true && !target_phase) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'target_phase is required when manual=true',
                });
            }
            if (target_phase && !['mev', 'mav', 'mrv', 'deload'].includes(target_phase)) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: `Invalid target_phase: ${target_phase}`,
                });
            }
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
            const result = advancePhase(programId, manual || false, target_phase);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('required') ||
                    error.message.includes('Invalid') ||
                    error.message.includes('not found')) {
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
    });
    fastify.get('/programs/:id/volume', {
        ...getVolumeSchema,
        preHandler: authenticateJWT,
    }, async (request, reply) => {
        try {
            const programId = parseInt(request.params.id, 10);
            const authenticatedUser = request.user;
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
            const volumeAnalysis = getProgramVolumeAnalysis(authenticatedUser.userId);
            if (!volumeAnalysis) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'No program found for volume analysis',
                });
            }
            const muscleGroups = volumeAnalysis.muscle_groups.map((mg) => ({
                muscle_group: mg.muscle_group,
                planned_sets: mg.planned_weekly_sets,
                mev: mg.mev,
                mav: mg.mav,
                mrv: mg.mrv,
                zone: mg.zone,
            }));
            const warnings = volumeAnalysis.muscle_groups
                .filter((mg) => mg.zone === 'below_mev' || mg.zone === 'above_mrv')
                .map((mg) => ({
                muscle_group: mg.muscle_group,
                issue: mg.zone,
                current_volume: mg.planned_weekly_sets,
                threshold: mg.zone === 'below_mev' ? mg.mev : mg.mrv,
            }));
            return reply.status(200).send({
                muscle_groups: muscleGroups,
                warnings,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve volume analysis',
            });
        }
    });
}
//# sourceMappingURL=programs.js.map