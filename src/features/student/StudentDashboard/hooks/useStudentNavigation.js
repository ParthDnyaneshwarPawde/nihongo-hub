import { useState } from 'react';
// 🚨 Import our custom memory hook
import { useStickyState } from '@hooks/useStickyState'; // Adjust path if needed

// Pass batchId so the browser remembers their place PER course!
export function useStudentNavigation(batchId = 'global') {
  
  // ✅ UPGRADED: Remembers which tab they were on (unique to this batch/course)
  const [activeTab, setActiveTab] = useStickyState('learn', `student-tab-${batchId}`);
  
  // ✅ UPGRADED: Remembers their desktop layout preference globally
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useStickyState(false, 'student-desktop-sidebar-pref');

  // NORMAL STATE: Mobile menus & dropdowns should always reset to closed on page load
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Auto-close mobile menu on selection
  };

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isCourseMenuOpen,
    setIsCourseMenuOpen,
    isDesktopSidebarCollapsed,
    setIsDesktopSidebarCollapsed,
    handleTabClick
  };
}