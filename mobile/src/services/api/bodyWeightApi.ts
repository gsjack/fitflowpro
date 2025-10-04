/**
 * Body Weight API Client
 * Handles body weight tracking and history
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface BodyWeightEntry {
  id: number;
  user_id: number;
  weight_kg: number;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  notes?: string;
  created_at: number;
}

export interface LogBodyWeightParams {
  weight_kg: number;
  date?: string; // Optional, defaults to today
  notes?: string;
}

export interface LatestWeightResponse {
  latest: BodyWeightEntry | null;
  week_change: {
    weight_change_kg: number;
    percentage_change: number;
  } | null;
  month_change: {
    weight_change_kg: number;
    percentage_change: number;
  } | null;
}

/**
 * Log body weight entry
 */
export async function logBodyWeight(
  token: string,
  data: LogBodyWeightParams
): Promise<BodyWeightEntry> {
  const response = await fetch(`${API_BASE_URL}/api/body-weight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to log body weight');
  }

  return response.json();
}

/**
 * Get body weight history
 */
export async function getBodyWeightHistory(
  token: string,
  limit: number = 30
): Promise<BodyWeightEntry[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/body-weight?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch body weight history');
  }

  return response.json();
}

/**
 * Delete body weight entry
 */
export async function deleteBodyWeight(
  token: string,
  id: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/body-weight/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete body weight entry');
  }
}

/**
 * Get latest body weight with change stats
 */
export async function getLatestBodyWeight(
  token: string
): Promise<LatestWeightResponse> {
  const response = await fetch(`${API_BASE_URL}/api/body-weight/latest`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch latest body weight');
  }

  return response.json();
}
