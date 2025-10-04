/**
 * Program Database Service (API-only)
 *
 * All operations use backend API at http://localhost:3000
 * No SQLite usage - backend is the source of truth.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration
const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl();
const TOKEN_STORAGE_KEY = '@fitflow/auth_token';

export interface Program {
  id: number;
  user_id: number;
  name: string;
  mesocycle_week: number;
  mesocycle_phase: 'mev' | 'mav' | 'mrv' | 'deload';
  created_at: number;
}

export interface ProgramDay {
  id: number;
  program_id: number;
  day_of_week: number;
  day_name: string;
  day_type: 'strength' | 'vo2max';
}

export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_groups?: string;
  order_index: number;
  sets: number;
  reps: string;
  rir: number;
  video_url?: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_groups: string;
  equipment: string;
  difficulty: string;
  default_sets: number;
  default_reps: string;
  default_rir: number;
  notes?: string;
  video_url?: string;
}

/**
 * Get auth token from storage
 */
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Get exercises for a program day with exercise details
 * NOTE: In API-only mode, exercises are returned with the workout from GET /api/workouts
 * This function is kept for backward compatibility but returns empty array
 * @param programDayId Program day ID
 * @returns Promise resolving to array of program exercises with names
 */
export async function getProgramExercises(programDayId: number): Promise<ProgramExercise[]> {
  console.log('[programDb] getProgramExercises called - exercises should come from workout API');
  // In API-only mode, exercises are included in the workout response
  // This function is deprecated but kept for backward compatibility
  return [];
}

/**
 * Get an exercise by ID via API
 * @param exerciseId Exercise ID
 * @returns Promise resolving to exercise or null
 */
export async function getExerciseById(exerciseId: number): Promise<Exercise | null> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[programDb] No auth token found');
    return null;
  }

  console.log('[programDb] Fetching exercise by ID:', exerciseId);

  const response = await fetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[programDb] Failed to fetch exercise:', response.status);
    return null;
  }

  const exercise = await response.json();
  return exercise;
}

/**
 * Get user's active program via API
 * @param userId User ID
 * @returns Promise resolving to program or null
 */
export async function getUserProgram(userId: number): Promise<Program | null> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[programDb] No auth token found');
    return null;
  }

  console.log('[programDb] Fetching user program');

  const response = await fetch(`${API_BASE_URL}/api/programs`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[programDb] Failed to fetch program:', response.status);
    return null;
  }

  const programs = await response.json();
  return programs.length > 0 ? programs[0] : null;
}

/**
 * Get program days for a program via API
 * @param programId Program ID
 * @returns Promise resolving to array of program days
 */
export async function getProgramDays(programId: number): Promise<ProgramDay[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[programDb] No auth token found');
    return [];
  }

  console.log('[programDb] Fetching program days');

  const response = await fetch(`${API_BASE_URL}/api/program-days?program_id=${programId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[programDb] Failed to fetch program days:', response.status);
    return [];
  }

  const programDays = await response.json();
  return programDays;
}

/**
 * Get all exercises from library via API
 * @returns Promise resolving to array of exercises
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[programDb] No auth token found');
    return [];
  }

  console.log('[programDb] Fetching all exercises');

  const response = await fetch(`${API_BASE_URL}/api/exercises`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[programDb] Failed to fetch exercises:', response.status);
    return [];
  }

  const exercises = await response.json();
  return exercises;
}

/**
 * Search exercises by muscle group and equipment via API
 * @param muscleGroup Optional muscle group filter
 * @param equipment Optional equipment filter
 * @returns Promise resolving to filtered exercises
 */
export async function searchExercises(
  muscleGroup?: string,
  equipment?: string
): Promise<Exercise[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[programDb] No auth token found');
    return [];
  }

  let url = `${API_BASE_URL}/api/exercises?`;
  if (muscleGroup) url += `muscle_group=${muscleGroup}&`;
  if (equipment) url += `equipment=${equipment}&`;

  console.log('[programDb] Searching exercises:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[programDb] Failed to search exercises:', response.status);
    return [];
  }

  const exercises = await response.json();
  return exercises;
}

/**
 * Update program exercise order via API
 * @param exerciseId Program exercise ID
 * @param newOrderIndex New order index
 */
export async function updateExerciseOrder(
  exerciseId: number,
  newOrderIndex: number
): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('[programDb] Updating exercise order:', { exerciseId, newOrderIndex });

  const response = await fetch(`${API_BASE_URL}/api/program-exercises/${exerciseId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order_index: newOrderIndex }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[programDb] Failed to update exercise order:', response.status, error);
    throw new Error(`Failed to update exercise order: ${response.status}`);
  }

  console.log('[programDb] Exercise order updated successfully');
}

/**
 * Swap an exercise in a program day via API
 * @param programExerciseId Program exercise ID to replace
 * @param newExerciseId New exercise ID
 */
export async function swapExercise(
  programExerciseId: number,
  newExerciseId: number
): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('[programDb] Swapping exercise:', { programExerciseId, newExerciseId });

  const response = await fetch(`${API_BASE_URL}/api/program-exercises/${programExerciseId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ exercise_id: newExerciseId }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[programDb] Failed to swap exercise:', response.status, error);
    throw new Error(`Failed to swap exercise: ${response.status}`);
  }

  console.log('[programDb] Exercise swapped successfully');
}
