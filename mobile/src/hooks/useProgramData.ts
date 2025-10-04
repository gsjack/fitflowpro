/**
 * Program Data Hook
 *
 * TanStack Query hook for managing program data with optimistic updates.
 * Replaces manual loadProgramData() pattern to prevent scroll position reset.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProgram, Program } from '../services/api/programApi';
import {
  getProgramVolumeAnalysis,
  ProgramVolumeAnalysis,
} from '../services/api/analyticsApi';
import {
  swapExercise as swapExerciseApi,
  reorderExercises as reorderExercisesApi,
  updateProgramExercise as updateProgramExerciseApi,
  deleteProgramExercise as deleteProgramExerciseApi,
  addProgramExercise as addProgramExerciseApi,
  ReorderItem,
  CreateProgramExerciseRequest,
  UpdateProgramExerciseRequest,
  ProgramExerciseResponse,
} from '../services/api/programExerciseApi';

export interface UseProgramDataReturn {
  program: Program | null;
  volumeAnalysis: ProgramVolumeAnalysis | null;
  isLoading: boolean;
  swapExercise: (
    programExerciseId: number,
    newExerciseId: number
  ) => Promise<ProgramExerciseResponse>;
  reorderExercises: (
    programDayId: number,
    newOrder: ReorderItem[]
  ) => Promise<void>;
  updateExercise: (
    programExerciseId: number,
    updates: UpdateProgramExerciseRequest
  ) => Promise<ProgramExerciseResponse>;
  deleteExercise: (programExerciseId: number) => Promise<void>;
  addExercise: (
    request: CreateProgramExerciseRequest
  ) => Promise<ProgramExerciseResponse>;
}

export function useProgramData(): UseProgramDataReturn {
  const queryClient = useQueryClient();

  // Fetch program data
  const programQuery = useQuery({
    queryKey: ['program'],
    queryFn: getUserProgram,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  // Fetch volume analysis
  const volumeQuery = useQuery({
    queryKey: ['volumeAnalysis'],
    queryFn: getProgramVolumeAnalysis,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation: Reorder exercises
  const reorderMutation = useMutation({
    mutationFn: ({
      programDayId,
      newOrder,
    }: {
      programDayId: number;
      newOrder: ReorderItem[];
    }) => reorderExercisesApi(programDayId, newOrder),
    onMutate: async ({ programDayId, newOrder }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['program'] });

      // Snapshot previous value
      const previousProgram = queryClient.getQueryData<Program>(['program']);

      // Optimistically update cache
      if (previousProgram) {
        queryClient.setQueryData<Program>(['program'], (old) => {
          if (!old) return old;

          return {
            ...old,
            program_days: old.program_days.map((day) => {
              if (day.id !== programDayId) return day;

              // Reorder exercises based on newOrder
              const reorderedExercises = [...day.exercises].sort((a, b) => {
                const aOrder =
                  newOrder.find((item) => item.program_exercise_id === a.id)
                    ?.new_order_index ?? a.order_index;
                const bOrder =
                  newOrder.find((item) => item.program_exercise_id === b.id)
                    ?.new_order_index ?? b.order_index;
                return aOrder - bOrder;
              });

              return {
                ...day,
                exercises: reorderedExercises.map((ex, index) => ({
                  ...ex,
                  order_index: index,
                })),
              };
            }),
          };
        });
      }

      return { previousProgram };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousProgram) {
        queryClient.setQueryData(['program'], context.previousProgram);
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['program'] });
    },
  });

  // Mutation: Swap exercise
  const swapMutation = useMutation({
    mutationFn: ({
      programExerciseId,
      newExerciseId,
    }: {
      programExerciseId: number;
      newExerciseId: number;
    }) => swapExerciseApi(programExerciseId, newExerciseId),
    onMutate: async ({ programExerciseId, newExerciseId }) => {
      await queryClient.cancelQueries({ queryKey: ['program'] });
      const previousProgram = queryClient.getQueryData<Program>(['program']);

      // Note: We can't fully optimistically update swap because we don't have
      // the new exercise details (name, muscle groups, etc.) in the client cache.
      // We'll just invalidate immediately after success.

      return { previousProgram };
    },
    onError: (_, __, context) => {
      if (context?.previousProgram) {
        queryClient.setQueryData(['program'], context.previousProgram);
      }
    },
    onSuccess: () => {
      // Invalidate both program and volume (swap affects volume)
      queryClient.invalidateQueries({ queryKey: ['program'] });
      queryClient.invalidateQueries({ queryKey: ['volumeAnalysis'] });
    },
  });

  // Mutation: Update exercise (sets/reps/RIR)
  const updateMutation = useMutation({
    mutationFn: ({
      programExerciseId,
      updates,
    }: {
      programExerciseId: number;
      updates: UpdateProgramExerciseRequest;
    }) => updateProgramExerciseApi(programExerciseId, updates),
    onMutate: async ({ programExerciseId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['program'] });
      const previousProgram = queryClient.getQueryData<Program>(['program']);

      // Optimistically update cache
      if (previousProgram) {
        queryClient.setQueryData<Program>(['program'], (old) => {
          if (!old) return old;

          return {
            ...old,
            program_days: old.program_days.map((day) => ({
              ...day,
              exercises: day.exercises.map((ex) => {
                if (ex.id !== programExerciseId) return ex;

                return {
                  ...ex,
                  target_sets: updates.target_sets ?? ex.target_sets,
                  target_rep_range:
                    updates.target_rep_range ?? ex.target_rep_range,
                  target_rir: updates.target_rir ?? ex.target_rir,
                };
              }),
            })),
          };
        });
      }

      return { previousProgram };
    },
    onError: (_, __, context) => {
      if (context?.previousProgram) {
        queryClient.setQueryData(['program'], context.previousProgram);
      }
    },
    onSuccess: () => {
      // Invalidate volume analysis (sets changed)
      queryClient.invalidateQueries({ queryKey: ['volumeAnalysis'] });
      queryClient.invalidateQueries({ queryKey: ['program'] });
    },
  });

  // Mutation: Delete exercise
  const deleteMutation = useMutation({
    mutationFn: (programExerciseId: number) =>
      deleteProgramExerciseApi(programExerciseId),
    onMutate: async (programExerciseId) => {
      await queryClient.cancelQueries({ queryKey: ['program'] });
      const previousProgram = queryClient.getQueryData<Program>(['program']);

      // Optimistically remove exercise
      if (previousProgram) {
        queryClient.setQueryData<Program>(['program'], (old) => {
          if (!old) return old;

          return {
            ...old,
            program_days: old.program_days.map((day) => ({
              ...day,
              exercises: day.exercises.filter(
                (ex) => ex.id !== programExerciseId
              ),
            })),
          };
        });
      }

      return { previousProgram };
    },
    onError: (_, __, context) => {
      if (context?.previousProgram) {
        queryClient.setQueryData(['program'], context.previousProgram);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program'] });
      queryClient.invalidateQueries({ queryKey: ['volumeAnalysis'] });
    },
  });

  // Mutation: Add exercise
  const addMutation = useMutation({
    mutationFn: (request: CreateProgramExerciseRequest) =>
      addProgramExerciseApi(request),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['program'] });
      const previousProgram = queryClient.getQueryData<Program>(['program']);

      // Note: Can't fully optimistically add because we don't have exercise details
      // (name, muscle groups, etc.) without fetching. Just invalidate after success.

      return { previousProgram };
    },
    onError: (_, __, context) => {
      if (context?.previousProgram) {
        queryClient.setQueryData(['program'], context.previousProgram);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program'] });
      queryClient.invalidateQueries({ queryKey: ['volumeAnalysis'] });
    },
  });

  return {
    program: programQuery.data ?? null,
    volumeAnalysis: volumeQuery.data ?? null,
    isLoading: programQuery.isLoading || volumeQuery.isLoading,
    swapExercise: async (programExerciseId: number, newExerciseId: number) => {
      return swapMutation.mutateAsync({ programExerciseId, newExerciseId });
    },
    reorderExercises: async (programDayId: number, newOrder: ReorderItem[]) => {
      await reorderMutation.mutateAsync({ programDayId, newOrder });
    },
    updateExercise: async (
      programExerciseId: number,
      updates: UpdateProgramExerciseRequest
    ) => {
      return updateMutation.mutateAsync({ programExerciseId, updates });
    },
    deleteExercise: async (programExerciseId: number) => {
      await deleteMutation.mutateAsync(programExerciseId);
    },
    addExercise: async (request: CreateProgramExerciseRequest) => {
      return addMutation.mutateAsync(request);
    },
  };
}
