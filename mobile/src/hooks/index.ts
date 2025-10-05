/**
 * Custom Hooks Index
 *
 * Central export file for all custom hooks.
 */

export { useAsync } from './useAsync';
export type { UseAsyncReturn, UseAsyncOptions } from './useAsync';

export { useDialog } from './useDialog';
export type { UseDialogReturn } from './useDialog';

export { useProgramData } from './useProgramData';
export type { UseProgramDataReturn } from './useProgramData';

export { useRecoveryAssessment } from './useRecoveryAssessment';
export type { UseRecoveryAssessmentReturn } from './useRecoveryAssessment';

export { useSnackbar } from './useSnackbar';
export type { UseSnackbarReturn, SnackbarType } from './useSnackbar';

export { useWorkoutSwap } from './useWorkoutSwap';
export type { UseWorkoutSwapReturn, UseWorkoutSwapOptions, ProgramDay } from './useWorkoutSwap';

export { useWorkoutSession } from './useWorkoutSession';
export type { UseWorkoutSessionReturn } from './useWorkoutSession';

export { useVO2maxSession } from './useVO2maxSession';
export type {
  UseVO2maxSessionReturn,
  HeartRateZone,
  WorkoutPhaseZones,
  SessionData,
} from './useVO2maxSession';
