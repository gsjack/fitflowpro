/**
 * User Profile API Client
 * Handles user profile retrieval and updates
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface UserProfile {
  id: number;
  username: string;
  age: number | null;
  weight_kg: number | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  created_at: number;
  updated_at: number;
}

export interface UpdateProfileParams {
  age?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Get current user's profile
 */
export async function getUserProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }

  return response.json();
}

/**
 * Update current user's profile
 */
export async function updateUserProfile(
  token: string,
  updates: UpdateProfileParams
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user profile');
  }

  return response.json();
}
