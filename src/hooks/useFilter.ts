import { useState, useMemo, useCallback } from 'react';

export interface UseFilterOptions<T> {
  data: T[];
  searchKeys?: (keyof T)[];
  searchFn?: (item: T, query: string) => boolean;
}

export interface UseFilterReturn<T> {
  filteredData: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string | null;
  setSortBy: (key: string | null) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  resetFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export function useFilter<T>({
  data,
  searchKeys = [],
  searchFn,
}: UseFilterOptions<T>): UseFilterReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      if (searchFn) {
        result = result.filter(item => searchFn(item, query));
      } else if (searchKeys.length > 0) {
        result = result.filter(item =>
          searchKeys.some(key => {
            const value = item[key];
            return value && String(value).toLowerCase().includes(query);
          })
        );
      }
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = a[sortBy as keyof T];
        const bVal = b[sortBy as keyof T];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal < bVal ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, searchKeys, searchFn, sortBy, sortOrder]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSortBy(null);
    setSortOrder('asc');
  }, []);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    resetFilters,
    totalCount: data.length,
    filteredCount: filteredData.length,
  };
}

// Debounced search hook for large datasets
export function useDebouncedSearch<T>(
  data: T[],
  searchKeys: (keyof T)[],
  delay = 300
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce logic
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);
    return () => clearTimeout(timer);
  });

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return data;
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return data.filter(item =>
      searchKeys.some(key => {
        const value = item[key];
        return value && String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, debouncedQuery, searchKeys]);

  return { query, setQuery, results };
}