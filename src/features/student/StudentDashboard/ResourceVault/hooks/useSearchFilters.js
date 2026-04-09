import { useState, useEffect } from 'react';

export function useSearchFilters(initialFilter = 'ALL', debounceDelay = 300) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceDelay]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    activeFilter,
    setActiveFilter
  };
}
