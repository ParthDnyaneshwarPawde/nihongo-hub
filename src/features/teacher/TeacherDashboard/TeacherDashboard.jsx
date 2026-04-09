import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import Sidebar from './layout/Sidebar';
import DashboardShell from './layout/DashboardShell';
import AntigravityCanvas from './background/AntigravityCanvas';
import FloatingKanji from './background/FloatingKanji';

import { useDashboardNavigation } from './hooks/useDashboardNavigation';
import { useSenseiProfile } from './hooks/useSenseiProfile';

import DashboardHome from './DashboardHome/DashboardHome';
import LiveClassrooms from './LiveClassrooms/LiveClassrooms';
import TeacherBatches from './TeacherBatches/TeacherBatches';

export default function TeacherDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { currentUser } = useSenseiProfile();
  const { 
    activeTab, 
    handleNavigate, 
    isSidebarOpen, 
    toggleSidebar, 
    closeSidebar 
  } = useDashboardNavigation('dashboard');

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Router Map for dynamic tab loading
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome key="dashboard" isDarkMode={isDarkMode} />;
      case 'live':
        return <LiveClassrooms key="live" isDarkMode={isDarkMode} />;
      case 'materials':
        return <TeacherBatches key="materials" isDarkMode={isDarkMode} />;
      case 'students':
      case 'exams':
        return (
          <div key={activeTab} className="p-10 text-center animate-in fade-in">
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Under Construction</h2>
            <p className="text-slate-500 text-sm">Module {activeTab} is currently being rebuilt.</p>
          </div>
        );
      default:
        return <DashboardHome key="dashboard" isDarkMode={isDarkMode} />;
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      {/* Dynamic Backgrounds */}
      <AntigravityCanvas isDarkMode={isDarkMode} />
      <FloatingKanji isDarkMode={isDarkMode} activeTab={activeTab} />

      {/* Structural Sidebar */}
      <Sidebar 
        isDarkMode={isDarkMode}
        isSidebarOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        currentUser={currentUser}
      />

      {/* Main Orchestrator Shell */}
      <DashboardShell 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        toggleSidebar={toggleSidebar}
      >
        {/* Dynamic Transition Wrapper */}
        <AnimatePresence mode="wait">
          {renderActiveTab()}
        </AnimatePresence>
      </DashboardShell>
    </div>
  );
}