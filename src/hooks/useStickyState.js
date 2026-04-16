import { useState, useEffect } from 'react';

export function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    // On first load, check if we have a saved value in memory
    const stickyValue = window.sessionStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    // Whenever the value changes, instantly back it up to memory
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}