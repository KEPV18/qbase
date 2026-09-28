import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useThrottle, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should update debounced value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });
    
    // Before delay
    expect(result.current).toBe('initial');
    
    // After delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('updated');
  });

  it('should reset timer on value change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    rerender({ value: 'second', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Still first because timer not complete
    expect(result.current).toBe('first');
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe('second');
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value', () => {
    const { result } = renderHook(() => useThrottle('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should throttle updates', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }) => useThrottle(value, interval),
      { initialProps: { value: 'initial', interval: 500 } }
    );

    rerender({ value: 'updated', interval: 500 });
    
    // Immediately after update
    expect(result.current).toBe('initial');
    
    // After interval
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('updated');
  });
});