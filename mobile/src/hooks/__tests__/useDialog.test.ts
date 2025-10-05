/**
 * useDialog Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react-native';
import { useDialog } from '../useDialog';

describe('useDialog', () => {
  it('should initialize with default state (closed)', () => {
    const { result } = renderHook(() => useDialog());

    expect(result.current.visible).toBe(false);
  });

  it('should initialize with custom initial state', () => {
    const { result } = renderHook(() => useDialog(true));

    expect(result.current.visible).toBe(true);
  });

  it('should open dialog', () => {
    const { result } = renderHook(() => useDialog());

    act(() => {
      result.current.open();
    });

    expect(result.current.visible).toBe(true);
  });

  it('should close dialog', () => {
    const { result } = renderHook(() => useDialog(true));

    act(() => {
      result.current.close();
    });

    expect(result.current.visible).toBe(false);
  });

  it('should toggle dialog state', () => {
    const { result } = renderHook(() => useDialog(false));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.visible).toBe(false);
  });

  it('should handle multiple open calls', () => {
    const { result } = renderHook(() => useDialog());

    act(() => {
      result.current.open();
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.open();
    });

    expect(result.current.visible).toBe(true);
  });

  it('should handle multiple close calls', () => {
    const { result } = renderHook(() => useDialog(true));

    act(() => {
      result.current.close();
    });

    expect(result.current.visible).toBe(false);

    act(() => {
      result.current.close();
    });

    expect(result.current.visible).toBe(false);
  });
});
