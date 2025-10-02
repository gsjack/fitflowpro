/**
 * Recovery Database Service (T044) - API-ONLY MODE
 *
 * Provides recovery assessment tracking via backend API.
 * All operations communicate directly with the server.
 *
 * Auto-regulation logic (FR-009):
 * - Score 12-15: No adjustment (good recovery)
 * - Score 9-11: Reduce 1 set per exercise
 * - Score 6-8: Reduce 2 sets per exercise
 * - Score 3-5: Rest day recommended
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecoveryAssessment } from '../../database/db';

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
 * Calculate volume adjustment based on total recovery score
 * Implements FR-009 auto-regulation logic
 * @param totalScore Sum of sleep_quality + muscle_soreness + mental_motivation (3-15 range)
 * @returns Volume adjustment recommendation
 */
function calculateVolumeAdjustment(
  totalScore: number
): 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day' {
  if (totalScore >= 12) {
    return 'none'; // Good recovery (12-15)
  } else if (totalScore >= 9) {
    return 'reduce_1_set'; // Moderate recovery (9-11)
  } else if (totalScore >= 6) {
    return 'reduce_2_sets'; // Poor recovery (6-8)
  } else {
    return 'rest_day'; // Very poor recovery (3-5)
  }
}

/**
 * Create a new recovery assessment
 * @param userId User ID
 * @param date Assessment date (ISO format YYYY-MM-DD)
 * @param sleepQuality Sleep quality score (1-5 scale)
 * @param muscleSoreness Muscle soreness score (1-5 scale)
 * @param mentalMotivation Mental motivation score (1-5 scale)
 * @returns Promise resolving to assessment object with total_score and volume_adjustment
 */
export async function createAssessment(
  userId: number,
  date: string,
  sleepQuality: number,
  muscleSoreness: number,
  mentalMotivation: number
): Promise<{
  id: number;
  total_score: number;
  volume_adjustment: 'none' | 'reduce_1_set' | 'reduce_2_sets' | 'rest_day';
}> {
  // Validate input ranges (1-5 scale per FR-008)
  if (
    sleepQuality < 1 ||
    sleepQuality > 5 ||
    muscleSoreness < 1 ||
    muscleSoreness > 5 ||
    mentalMotivation < 1 ||
    mentalMotivation > 5
  ) {
    throw new Error('All recovery scores must be between 1 and 5');
  }

  // Calculate total score (3-15 range)
  const totalScore = sleepQuality + muscleSoreness + mentalMotivation;

  // Determine volume adjustment per FR-009
  const volumeAdjustment = calculateVolumeAdjustment(totalScore);

  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(`${API_BASE_URL}/api/recovery-assessments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        date,
        sleep_quality: sleepQuality,
        muscle_soreness: muscleSoreness,
        mental_motivation: mentalMotivation,
        total_score: totalScore,
        volume_adjustment: volumeAdjustment,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    console.log('[RecoveryDB] Assessment created via API:', {
      id: result.id,
      totalScore,
      volumeAdjustment,
    });

    return {
      id: result.id,
      total_score: totalScore,
      volume_adjustment: volumeAdjustment,
    };
  } catch (error) {
    console.error('[RecoveryDB] Error creating assessment:', error);
    throw error;
  }
}

/**
 * Get today's recovery assessment for a user
 * @param userId User ID
 * @returns Promise resolving to today's assessment or null if not found
 */
export async function getTodayAssessment(userId: number): Promise<RecoveryAssessment | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      console.log('[RecoveryDB] No auth token found');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/recovery-assessments/${userId}/today`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      console.log('[RecoveryDB] No assessment found for today');
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const assessment = await response.json();
    console.log('[RecoveryDB] Fetched today\'s assessment from API:', assessment);
    return assessment;
  } catch (error) {
    console.error('[RecoveryDB] Error fetching today\'s assessment:', error);
    return null;
  }
}

/**
 * Get recovery assessment by date
 * @param userId User ID
 * @param date Assessment date (ISO format YYYY-MM-DD)
 * @returns Promise resolving to assessment or null if not found
 */
export async function getAssessmentByDate(
  userId: number,
  date: string
): Promise<RecoveryAssessment | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      console.log('[RecoveryDB] No auth token found');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/recovery-assessments/${userId}?date=${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const assessment = await response.json();
    return assessment;
  } catch (error) {
    console.error('[RecoveryDB] Error fetching assessment by date:', error);
    return null;
  }
}

/**
 * Get most recent recovery assessment within past N days
 * Used when today's assessment is missing (FR-009 fallback)
 * @param userId User ID
 * @param maxDaysAgo Maximum days to look back (default 3 per spec)
 * @returns Promise resolving to most recent assessment or null
 */
export async function getRecentAssessment(
  userId: number,
  maxDaysAgo: number = 3
): Promise<RecoveryAssessment | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDaysAgo);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  try {
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      console.log('[RecoveryDB] No auth token found');
      return null;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/recovery-assessments/${userId}?since=${cutoffDateStr}&limit=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const assessments = await response.json();
    return assessments.length > 0 ? assessments[0] : null;
  } catch (error) {
    console.error('[RecoveryDB] Error fetching recent assessment:', error);
    return null;
  }
}
