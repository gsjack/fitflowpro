/**
 * useSnackbar Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useSnackbar } from '../useSnackbar';

describe('useSnackbar', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSnackbar());

    expect(result.current.visible).toBe(false);
    expect(result.current.message).toBe('');
    expect(result.current.type).toBe('info');
  });

  it('should show snackbar with message and type', () => {
    const { result } = renderHook(() => useSnackbar());

    act(() => {
      result.current.show('Test message', 'success');
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.message).toBe('Test message');
    expect(result.current.type).toBe('success');
  });

  it('should default to info type when not specified', () => {
    const { result } = renderHook(() => useSnackbar());

    act(() => {
      result.current.show('Info message');
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.message).toBe('Info message');
    expect(result.current.type).toBe('info');
  });

  it('should hide snackbar', () => {
    const { result } = renderHook(() => useSnackbar());

    act(() => {
      result.current.show('Test message', 'error');
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.hide();
    });

    expect(result.current.visible).toBe(false);
    // Message should remain (for fade-out animation)
    expect(result.current.message).toBe('Test message');
  });

  it('should handle multiple show calls', () => {
    const { result } = renderHook(() => useSnackbar());

    act(() => {
      result.current.show('First message', 'info');
    });

    expect(result.current.message).toBe('First message');
    expect(result.current.type).toBe('info');

    act(() => {
      result.current.show('Second message', 'error');
    });

    expect(result.current.message).toBe('Second message');
    expect(result.current.type).toBe('error');
    expect(result.current.visible).toBe(true);
  });
});
