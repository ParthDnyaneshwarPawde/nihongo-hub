import React from 'react';
import TopNav from './TopNav';

// The wrapper for any active tab content guaranteeing scroll limits and Antigravity constraints
export default function DashboardShell({ isDarkMode, toggleDarkMode, toggleSidebar, children }) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden relative z-10">
      <TopNav 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
        toggleSidebar={toggleSidebar} 
      />
      <div className="flex-1 overflow-y-auto h-screen custom-scrollbar">
        {children}
      </div>
    </main>
  );
}
