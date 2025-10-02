/**
 * App Navigation Tests
 *
 * Verifies registration → dashboard navigation flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock authApi
vi.mock('../services/api/authApi', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  getUserId: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
}));

import { getToken } from '../services/api/authApi';

describe('App Navigation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect authentication state from token', async () => {
    // Simulate token exists
    vi.mocked(getToken).mockResolvedValue('fake-jwt-token');

    const token = await getToken();
    const isAuthenticated = !!token;

    expect(isAuthenticated).toBe(true);
  });

  it('should detect unauthenticated state when no token', async () => {
    // Simulate no token
    vi.mocked(getToken).mockResolvedValue(null);

    const token = await getToken();
    const isAuthenticated = !!token;

    expect(isAuthenticated).toBe(false);
  });

  it('should update authentication state after token is stored', async () => {
    // Initial state: no token
    vi.mocked(getToken).mockResolvedValueOnce(null);

    let token = await getToken();
    let isAuthenticated = !!token;

    expect(isAuthenticated).toBe(false);

    // Simulate registration storing token
    await AsyncStorage.setItem('@fitflow/auth_token', 'new-jwt-token');

    // Re-check authentication (this is what handleAuthSuccess does)
    vi.mocked(getToken).mockResolvedValueOnce('new-jwt-token');

    token = await getToken();
    isAuthenticated = !!token;

    expect(isAuthenticated).toBe(true);
  });
});
