/**
 * Async Hook
 *
 * Generic async operation state management with loading/error/success states.
 * Useful for API calls, database operations, and any async functions.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseAsyncReturn<T> {
  loading: boolean;
  error: Error | null;
  value: T | null;
  execute: () => Promise<T | null>;
  reset: () => void;
}

export interface UseAsyncOptions {
  immediate?: boolean;
}

/**
 * Hook for managing async operation state
 *
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount (default: true)
 *
 * @example
 * const loadData = useAsync(() => api.getData(), false);
 * await loadData.execute();
 */
export function useAsync<T>(asyncFunction: () => Promise<T>, immediate = true): UseAsyncReturn<T> {
  const [loading, setLoading] = useState(immediate);
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();

      if (isMountedRef.current) {
        setValue(result);
        setLoading(false);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (isMountedRef.current) {
        setError(error);
        setLoading(false);
      }

      return null;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setLoading(false);
    setValue(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [execute, immediate]);

  return { loading, error, value, execute, reset };
}
