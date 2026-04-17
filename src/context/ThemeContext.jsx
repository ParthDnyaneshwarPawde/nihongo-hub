import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 2. Check the browser's memory first. Default to true (Dark Mode).
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('nihongo-hub-theme');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 3. Every time isDarkMode changes, save it back to memory!
  useEffect(() => {
    localStorage.setItem('nihongo-hub-theme', JSON.stringify(isDarkMode));
    
    // This tells Tailwind CSS to use your dark: classes
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 4. The toggle function
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 5. Export a simple hook to use in all your pages
export const useTheme = () => useContext(ThemeContext);