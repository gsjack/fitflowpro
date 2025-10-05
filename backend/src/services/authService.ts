/**
 * Authentication Service
 *
 * Implements user registration and login with bcrypt password hashing
 * and JWT token generation (30-day expiration per justified constitutional violation)
 */

import bcrypt from 'bcrypt';
import { stmtGetUserByUsername, stmtCreateUser } from '../database/db.js';
import { createDefaultProgram } from './programService.js';
import { BCRYPT_COST, JWT_EXPIRATION } from '../utils/constants.js';

// Re-export for backward compatibility
export { JWT_EXPIRATION };

/**
 * User interface (excluding password_hash for security)
 */
export interface User {
  id: number;
  username: string;
  age?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  created_at: number;
  updated_at: number;
}

/**
 * Registration response
 */
export interface RegisterResponse {
  user_id: number;
  userId: number; // Alias for compatibility
  username: string;
  token: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Register a new user
 *
 * @param username - User's email address (used as username)
 * @param password - Plain text password (will be hashed with bcrypt cost=12)
 * @param age - Optional user age (13-100)
 * @param weight_kg - Optional user weight in kg (30-300)
 * @param experience_level - Optional experience level
 * @param jwtSign - Fastify JWT sign function
 * @returns Object containing user_id and JWT token
 * @throws Error if username already exists or database error occurs
 */
export async function registerUser(
  username: string,
  password: string,
  age: number | undefined,
  weight_kg: number | undefined,
  experience_level: 'beginner' | 'intermediate' | 'advanced' | undefined,
  jwtSign: (payload: { userId: number; username: string }) => string
): Promise<RegisterResponse> {
  // Check if username already exists
  const existingUser = stmtGetUserByUsername.get(username) as User | undefined;
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Hash password with bcrypt (cost=12)
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);

  // Insert user into database
  const now = Date.now();
  const result = stmtCreateUser.run(
    username,
    password_hash,
    age ?? null,
    weight_kg ?? null,
    experience_level ?? null,
    now,
    now
  );

  const user_id = result.lastInsertRowid as number;

  // Create default 6-day Renaissance Periodization program for new user
  try {
    createDefaultProgram(user_id);
  } catch (error) {
    // Log error but don't fail registration - user can still use the app
    console.error(`Failed to create default program for user ${user_id}:`, error);
  }

  // Generate JWT token with 30-day expiration
  const token = jwtSign({
    userId: user_id,
    username,
  });

  return {
    user_id,
    userId: user_id, // Alias for compatibility
    username,
    token,
  };
}

/**
 * Login existing user
 *
 * @param username - User's email address
 * @param password - Plain text password
 * @param jwtSign - Fastify JWT sign function
 * @returns Object containing JWT token and user data
 * @throws Error if credentials are invalid
 */
export async function loginUser(
  username: string,
  password: string,
  jwtSign: (payload: { userId: number; username: string }) => string
): Promise<LoginResponse> {
  // Get user by username
  const user = stmtGetUserByUsername.get(username) as
    | (User & { password_hash: string })
    | undefined;

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password with bcrypt
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = jwtSign({
    userId: user.id,
    username: user.username,
  });

  // Return user data (excluding password_hash)
  const { password_hash, ...userData } = user;

  return {
    token,
    user: userData,
  };
}
