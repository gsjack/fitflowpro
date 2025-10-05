/**
 * Dialog Hook
 *
 * Manages dialog/modal visibility state with open/close/toggle methods.
 * Eliminates boilerplate for modal state management.
 */

import { useState, useCallback } from 'react';

export interface UseDialogReturn {
  visible: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing dialog visibility state
 *
 * @param initialVisible - Initial visibility state (default: false)
 *
 * @example
 * const deleteDialog = useDialog();
 * <Dialog visible={deleteDialog.visible} onDismiss={deleteDialog.close}>
 */
export function useDialog(initialVisible = false): UseDialogReturn {
  const [visible, setVisible] = useState(initialVisible);

  const open = useCallback(() => {
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  return { visible, open, close, toggle };
}
