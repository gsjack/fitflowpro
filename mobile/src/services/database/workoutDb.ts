/**
 * Workout Database Service (API-only)
 *
 * All operations use backend API at http://localhost:3000
 * No SQLite usage - backend is the source of truth.
 *
 * Performance targets:
 * - API responses: p95 < 200ms (FR-040)
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

const API_BASE_URL = process.env.FITFLOW_API_URL || getDefaultApiUrl();
const TOKEN_STORAGE_KEY = '@fitflow/auth_token';

/**
 * Workout interface
 */
export interface Workout {
  id: number;
  user_id: number;
  program_day_id: number;
  date: string;
  started_at: number | null;
  completed_at: number | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  total_volume_kg: number | null;
  average_rir: number | null;
  synced: number;
  day_name?: string | null;
  day_type?: 'strength' | 'vo2max' | null;
  exercises?: any[];
}

/**
 * Set interface
 */
export interface Set {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number;
  timestamp: number;
  notes: string | null;
  synced: number;
}

/**
 * Get auth token from storage
 */
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Create a new workout session via API
 * @param userId User ID
 * @param programDayId Program day ID
 * @param date Workout date (ISO format YYYY-MM-DD)
 * @returns Promise resolving to workout ID
 */
export async function createWorkout(
  userId: number,
  programDayId: number,
  date: string
): Promise<number> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('[workoutDb] Creating workout via API:', { programDayId, date });

  const response = await fetch(`${API_BASE_URL}/api/workouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_day_id: programDayId,
      date,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[workoutDb] Failed to create workout:', response.status, error);
    throw new Error(`Failed to create workout: ${response.status}`);
  }

  const workout = await response.json();
  console.log('[workoutDb] Workout created:', workout.id);
  return workout.id;
}

/**
 * Get workouts for a user within a date range
 * @param userId User ID
 * @param startDate Optional start date (ISO format)
 * @param endDate Optional end date (ISO format)
 * @returns Promise resolving to array of workouts
 */
export async function getWorkouts(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<Workout[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[workoutDb] No auth token found');
    return [];
  }

  let url = `${API_BASE_URL}/api/workouts?`;
  if (startDate) url += `start_date=${startDate}&`;
  if (endDate) url += `end_date=${endDate}&`;

  console.log('[workoutDb] Fetching workouts from API:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[workoutDb] Failed to fetch workouts:', response.status);
    return [];
  }

  const workouts = await response.json();
  console.log('[workoutDb] Fetched workouts from API:', workouts.length, 'workouts');
  return workouts;
}

/**
 * Get a specific workout by ID via API
 * @param workoutId Workout ID
 * @returns Promise resolving to workout or null
 */
export async function getWorkoutById(workoutId: number): Promise<Workout | null> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[workoutDb] No auth token found');
    return null;
  }

  console.log('[workoutDb] Fetching workout by ID:', workoutId);

  const response = await fetch(`${API_BASE_URL}/api/workouts?workout_id=${workoutId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[workoutDb] Failed to fetch workout:', response.status);
    return null;
  }

  const workouts = await response.json();
  return workouts.length > 0 ? workouts[0] : null;
}

/**
 * Update workout status and metrics via API
 * @param workoutId Workout ID
 * @param status New status
 * @param totalVolumeKg Optional total volume in kg
 * @param averageRir Optional average RIR
 * @returns Promise resolving when complete
 */
export async function updateWorkoutStatus(
  workoutId: number,
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled',
  totalVolumeKg?: number,
  averageRir?: number
): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('[workoutDb] Updating workout status via API:', { workoutId, status });

  const response = await fetch(`${API_BASE_URL}/api/workouts/${workoutId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[workoutDb] Failed to update workout status:', response.status, error);
    throw new Error(`Failed to update workout status: ${response.status}`);
  }

  console.log('[workoutDb] Workout status updated successfully');
}

/**
 * Log a set for a workout via API
 * @param workoutId Workout ID
 * @param exerciseId Exercise ID
 * @param setNumber Set number (1-indexed)
 * @param weightKg Weight in kilograms
 * @param reps Number of repetitions
 * @param rir Reps in reserve (0-4)
 * @param notes Optional notes
 * @returns Promise resolving to set ID
 */
export async function logSet(
  workoutId: number,
  exerciseId: number,
  setNumber: number,
  weightKg: number,
  reps: number,
  rir: number,
  notes?: string
): Promise<number> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const startTime = Date.now();

  console.log('[workoutDb] Logging set via API:', {
    workoutId,
    exerciseId,
    setNumber,
    weightKg,
    reps,
    rir,
  });

  const response = await fetch(`${API_BASE_URL}/api/sets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_number: setNumber,
      weight_kg: weightKg,
      reps,
      rir,
      timestamp: Date.now(),
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[workoutDb] Failed to log set:', response.status, error);
    throw new Error(`Failed to log set: ${response.status}`);
  }

  const set = await response.json();
  const duration = Date.now() - startTime;

  console.log(`[workoutDb] Set logged in ${duration}ms:`, set.id);

  // Warn if exceeding performance target
  if (duration > 200) {
    console.warn(`[WorkoutDB] Slow API response: ${duration}ms (target: < 200ms)`);
  }

  return set.id;
}

/**
 * Get all sets for a workout via API
 * @param workoutId Workout ID
 * @returns Promise resolving to array of sets
 */
export async function getSetsForWorkout(workoutId: number): Promise<Set[]> {
  const token = await getAuthToken();
  if (!token) {
    console.log('[workoutDb] No auth token found');
    return [];
  }

  console.log('[workoutDb] Fetching sets for workout:', workoutId);

  const response = await fetch(`${API_BASE_URL}/api/sets?workout_id=${workoutId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[workoutDb] Failed to fetch sets:', response.status);
    return [];
  }

  const sets = await response.json();
  console.log('[workoutDb] Fetched sets from API:', sets.length, 'sets');
  return sets;
}

/**
 * Get sets for a specific exercise in a workout
 * @param workoutId Workout ID
 * @param exerciseId Exercise ID
 * @returns Promise resolving to array of sets
 */
export async function getSetsForExercise(workoutId: number, exerciseId: number): Promise<Set[]> {
  const sets = await getSetsForWorkout(workoutId);
  return sets.filter((set) => set.exercise_id === exerciseId);
}

/**
 * Delete a set via API
 * @param setId Set ID
 * @returns Promise resolving when complete
 */
export async function deleteSet(setId: number): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  console.log('[workoutDb] Deleting set via API:', setId);

  const response = await fetch(`${API_BASE_URL}/api/sets/${setId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[workoutDb] Failed to delete set:', response.status, error);
    throw new Error(`Failed to delete set: ${response.status}`);
  }

  console.log('[workoutDb] Set deleted successfully');
}

/**
 * Calculate total volume for a workout
 * @param workoutId Workout ID
 * @returns Promise resolving to total volume in kg
 */
export async function calculateWorkoutVolume(workoutId: number): Promise<number> {
  const sets = await getSetsForWorkout(workoutId);
  return sets.reduce((total, set) => total + set.weight_kg * set.reps, 0);
}

/**
 * Calculate average RIR for a workout
 * @param workoutId Workout ID
 * @returns Promise resolving to average RIR
 */
export async function calculateAverageRir(workoutId: number): Promise<number> {
  const sets = await getSetsForWorkout(workoutId);
  if (sets.length === 0) return 0;
  const totalRir = sets.reduce((total, set) => total + set.rir, 0);
  return totalRir / sets.length;
}

/**
 * Get today's workout for a user
 * @param userId User ID
 * @returns Promise resolving to workout or null
 */
export async function getTodayWorkout(userId: number): Promise<Workout | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const token = await getAuthToken();
  if (!token) {
    console.log('[workoutDb] No auth token found');
    return null;
  }

  console.log('[workoutDb] Fetching today\'s workout:', today);

  const response = await fetch(`${API_BASE_URL}/api/workouts?start_date=${today}&end_date=${today}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[workoutDb] Failed to fetch today\'s workout:', response.status);
    return null;
  }

  const workouts = await response.json();
  console.log('[workoutDb] Fetched workouts from API:', workouts);
  return workouts.length > 0 ? workouts[0] : null;
}

/**
 * Get in-progress workout for a user
 * @param userId User ID
 * @returns Promise resolving to workout or null
 */
export async function getInProgressWorkout(userId: number): Promise<Workout | null> {
  const workouts = await getWorkouts(userId);
  const inProgressWorkouts = workouts.filter((w) => w.status === 'in_progress');
  return inProgressWorkouts.length > 0 ? inProgressWorkouts[0] : null;
}
