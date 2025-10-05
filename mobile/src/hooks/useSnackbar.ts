/**
 * Snackbar Hook
 *
 * Unified snackbar state management for success/error/info messages.
 * Eliminates duplicate snackbar logic across components.
 */

import { useState, useCallback } from 'react';

export type SnackbarType = 'success' | 'error' | 'info';

export interface UseSnackbarReturn {
  visible: boolean;
  message: string;
  type: SnackbarType;
  show: (msg: string, msgType?: SnackbarType) => void;
  hide: () => void;
}

/**
 * Hook for managing snackbar state
 *
 * @example
 * const snackbar = useSnackbar();
 * snackbar.show('Workout completed!', 'success');
 */
export function useSnackbar(): UseSnackbarReturn {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SnackbarType>('info');

  const show = useCallback((msg: string, msgType: SnackbarType = 'info') => {
    setMessage(msg);
    setType(msgType);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, message, type, show, hide };
}
