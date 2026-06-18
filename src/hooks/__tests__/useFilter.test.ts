import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilter } from '../useFilter';

describe('useFilter', () => {
  const mockData = [
    { id: 1, name: 'F-08 Order Form', category: 'Sales' },
    { id: 2, name: 'F-11 Product Spec', category: 'Quality' },
    { id: 3, name: 'F-19 Risk Assessment', category: 'Risk' },
    { id: 4, name: 'F-28 CAPA Record', category: 'Quality' },
    { id: 5, name: 'F-29 Audit Report', category: 'Audit' },
  ];

  it('should return all data when no search query', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name', 'category'],
    }));

    expect(result.current.filteredData).toHaveLength(5);
    expect(result.current.totalCount).toBe(5);
  });

  it('should filter data based on search query', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name', 'category'],
    }));

    act(() => {
      result.current.setSearchQuery('Quality');
    });

    expect(result.current.filteredData).toHaveLength(2);
    expect(result.current.filteredCount).toBe(2);
  });

  it('should filter case-insensitively', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name'],
    }));

    act(() => {
      result.current.setSearchQuery('f-08');
    });

    expect(result.current.filteredData).toHaveLength(1);
    expect(result.current.filteredData[0].name).toBe('F-08 Order Form');
  });

  it('should sort data ascending', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name'],
    }));

    act(() => {
      result.current.setSortBy('name');
      result.current.setSortOrder('asc');
    });

    expect(result.current.filteredData[0].name).toBe('F-08 Order Form');
  });

  it('should sort data descending', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name'],
    }));

    act(() => {
      result.current.setSortBy('name');
      result.current.setSortOrder('desc');
    });

    expect(result.current.filteredData[0].name).toBe('F-29 Audit Report');
  });

  it('should reset filters', () => {
    const { result } = renderHook(() => useFilter({
      data: mockData,
      searchKeys: ['name'],
    }));

    act(() => {
      result.current.setSearchQuery('Audit');
    });

    expect(result.current.filteredData).toHaveLength(1);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filteredData).toHaveLength(5);
  });
});