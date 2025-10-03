import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Authentication API Client for FitFlow Pro
 *
 * Handles user registration, login, and account deletion.
 * Manages JWT token storage and automatic header injection.
 *
 * Base URL is configurable via FITFLOW_API_URL environment variable.
 * Default: http://localhost:3000 (web/iOS) or http://10.0.2.2:3000 (Android emulator)
 */

// Environment configuration
// Platform-specific API URLs:
// - Web: localhost:3000 (same origin)
// - Android: 10.0.2.2:3000 (emulator special IP for host machine)
// - iOS: localhost:3000 (simulator can access host's localhost)
const getDefaultApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = process.env.FITFLOW_API_URL || getDefaultApiUrl();
const TOKEN_STORAGE_KEY = '@fitflow/auth_token';

/**
 * Registration request payload
 */
export interface RegisterRequest {
  username: string; // Email format
  password: string; // Min 8 characters
  age?: number; // 13-100
  weight_kg?: number; // 30-300
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Registration response
 */
export interface RegisterResponse {
  user_id: number;
  token: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * User object returned in login response
 */
export interface User {
  id: number;
  username: string;
  age?: number;
  weight_kg?: number;
  experience_level?: string;
  created_at: number; // Unix timestamp
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Store JWT token in AsyncStorage
 */
async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
}

/**
 * Retrieve JWT token from AsyncStorage
 */
export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Remove JWT token from AsyncStorage
 */
export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Create authenticated Axios instance with JWT header injection
 */
async function createAuthenticatedClient(): Promise<AxiosInstance> {
  const token = await getToken();

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 10000, // 10 second timeout
  });
}

/**
 * Base Axios instance without authentication
 */
const baseClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Register a new user account
 *
 * @param username - Email address (validated as email format)
 * @param password - Password (minimum 8 characters)
 * @param age - User age (13-100, optional)
 * @param weight_kg - User weight in kg (30-300, optional)
 * @param experience_level - Training experience level (optional)
 * @returns Registration response with user_id and JWT token
 * @throws Error if registration fails (400 validation, 409 duplicate username)
 */
export async function register(
  username: string,
  password: string,
  age?: number,
  weight_kg?: number,
  experience_level?: 'beginner' | 'intermediate' | 'advanced'
): Promise<RegisterResponse> {
  const payload: RegisterRequest = {
    username,
    password,
    ...(age !== undefined ? { age } : {}),
    ...(weight_kg !== undefined ? { weight_kg } : {}),
    ...(experience_level !== undefined ? { experience_level } : {}),
  };

  const response = await baseClient.post<RegisterResponse>('/api/auth/register', payload);

  // Store token immediately after successful registration
  await storeToken(response.data.token);

  return response.data;
}

/**
 * Login with existing credentials
 *
 * @param username - Email address
 * @param password - Password
 * @returns Login response with JWT token and user object
 * @throws Error if login fails (401 invalid credentials, 400 validation)
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  console.log('[authApi] login called with username:', username);
  console.log('[authApi] API_BASE_URL:', API_BASE_URL);

  const payload: LoginRequest = {
    username,
    password,
  };

  console.log('[authApi] Posting to /api/auth/login...');
  const response = await baseClient.post<LoginResponse>('/api/auth/login', payload);
  console.log('[authApi] Login response:', response.status, response.data);

  // Store token immediately after successful login
  await storeToken(response.data.token);
  console.log('[authApi] Token stored successfully');

  return response.data;
}

/**
 * Delete user account (irreversible)
 *
 * Requires authentication. User can only delete their own account.
 * Cascade deletes all associated data (workouts, sets, recovery assessments, etc.).
 *
 * @throws Error if deletion fails (401 unauthorized, 404 user not found)
 */
export async function deleteAccount(): Promise<void> {
  const client = await createAuthenticatedClient();

  // Extract user ID from stored token (JWT payload)
  const token = await getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Decode JWT to get user ID (simple base64 decode of payload)
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.userId;

  // DELETE /api/users/:id endpoint
  await client.delete(`/api/users/${userId}`);

  // Clear token after successful deletion
  await clearToken();
}

/**
 * Get current user ID from JWT token
 *
 * Decodes the JWT token stored in AsyncStorage and extracts the userId.
 *
 * @returns User ID or null if not authenticated
 */
export async function getUserId(): Promise<number | null> {
  const token = await getToken();

  if (!token) {
    return null;
  }

  try {
    // Decode JWT payload (base64 decode of middle section)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch (error) {
    console.error('[authApi] Failed to decode token:', error);
    return null;
  }
}

/**
 * Authenticated API client factory
 *
 * Creates an Axios instance with JWT token automatically injected in Authorization header.
 * Use this for all authenticated API calls (workouts, sets, analytics, etc.).
 *
 * @returns Axios instance with authentication headers
 * @throws Error if no token is stored (user not logged in)
 *
 * @example
 * const client = await getAuthenticatedClient();
 * const workouts = await client.get('/api/workouts');
 */
export async function getAuthenticatedClient(): Promise<AxiosInstance> {
  const token = await getToken();

  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });
}
