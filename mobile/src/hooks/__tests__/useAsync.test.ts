/**
 * useAsync Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  it('should initialize with loading state when immediate=true', () => {
    const asyncFn = jest.fn(async () => 'test-result');
    const { result } = renderHook(() => useAsync(asyncFn, true));

    expect(result.current.loading).toBe(true);
    expect(result.current.value).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should not execute immediately when immediate=false', () => {
    const asyncFn = jest.fn(async () => 'test-result');
    const { result } = renderHook(() => useAsync(asyncFn, false));

    expect(result.current.loading).toBe(false);
    expect(asyncFn).not.toHaveBeenCalled();
  });

  it('should execute async function and set value on success', async () => {
    const asyncFn = jest.fn(async () => 'test-result');
    const { result } = renderHook(() => useAsync(asyncFn, false));

    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.value).toBe('test-result');
      expect(result.current.error).toBe(null);
    });
  });

  it('should set error on async function failure', async () => {
    const error = new Error('Test error');
    const asyncFn = jest.fn(async () => {
      throw error;
    });
    const { result } = renderHook(() => useAsync(asyncFn, false));

    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.value).toBe(null);
      expect(result.current.error).toBe(error);
    });
  });

  it('should reset state', async () => {
    const asyncFn = jest.fn(async () => 'test-result');
    const { result } = renderHook(() => useAsync(asyncFn, false));

    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.value).toBe('test-result');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.value).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle non-Error thrown values', async () => {
    const asyncFn = jest.fn(async () => {
      throw 'string error';
    });
    const { result } = renderHook(() => useAsync(asyncFn, false));

    await act(async () => {
      await result.current.execute();
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');
    });
  });

  it('should not update state after unmount', async () => {
    const asyncFn = jest.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('delayed-result'), 100);
        })
    );
    const { result, unmount } = renderHook(() => useAsync(asyncFn, false));

    act(() => {
      void result.current.execute();
    });

    // Unmount before async operation completes
    unmount();

    // Wait for async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    // State should not have been updated (no error thrown)
    // Test passes if no "Can't perform a React state update on an unmounted component" warning
  });
});
