import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { AnimatePresence } from 'framer-motion';

import Sidebar from './layout/Sidebar';
import DashboardShell from './layout/DashboardShell';
import AntigravityCanvas from './background/AntigravityCanvas';
import FloatingKanji from './background/FloatingKanji';

// We only need these two hooks now!
import { useDashboardNavigation } from './hooks/useDashboardNavigation';
import { useDashboardHomeEffects } from './hooks/useDashboardHomeEffects';
import { useStickyState } from '@/hooks/useStickyState';

import DashboardHome from './DashboardHome/DashboardHome';
import LiveClassrooms from './LiveClassrooms/LiveClassrooms';
import TeacherBatches from './TeacherBatches/TeacherBatches';
import TestSeriesManager from './TestSeriesManager/TestSeriesManager';
import ControlUnit from './ControlUnit/ControlUnit';

export default function TeacherDashboard() {

  const { isDarkMode, toggleTheme } = useTheme();

  // 1. Data Hook (Acts as the single source of truth)
  const dashboardState = useDashboardHomeEffects();

  // 2. Extract ONLY what the outer shell needs (Notice we grab currentUser from here!)
  const { currentUser } = dashboardState;
  
  // 3. UI Navigation Hook
  const { 
    activeTab, 
    handleNavigate, 
    isSidebarOpen, 
    toggleSidebar, 
    closeSidebar,
    isDesktopSidebarCollapsed,
    setIsDesktopSidebarCollapsed,
     
  } = useDashboardNavigation('dashboard');

  // Router Map for dynamic tab loading
  const renderactiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome key="dashboard" {...dashboardState} />;
      case 'live':
        return <LiveClassrooms key="live" />;
      case 'materials':
        return <TeacherBatches key="materials" />;
      case 'students':
      case 'exams':
        return <TestSeriesManager key="exams"  />;
      case 'control_unit':
        return <ControlUnit key="control_unit" />;
      default:
        return <DashboardHome key="dashboard" {...dashboardState} />;
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-[#0A0F1C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      {/* Dynamic Backgrounds */}
      <AntigravityCanvas />
      <FloatingKanji activeTab={activeTab} />

      {/* Structural Sidebar */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
        setIsDesktopSidebarCollapsed={setIsDesktopSidebarCollapsed}
      />

      {/* Main Orchestrator Shell */}
      <DashboardShell 
        toggleSidebar={toggleSidebar}
      >
        <AnimatePresence mode="wait">
          {renderactiveTab()}
        </AnimatePresence>
      </DashboardShell>
    </div>
  );
}