import { useState } from 'react';
// 🚨 Import our new custom memory hook
import { useStickyState } from '@hooks/useStickyState'; // Adjust the path if they are in different folders

export function useDashboardNavigation(initialTab = 'dashboard') {
  
  // ✅ UPGRADED: React now remembers what tab they were on!
  const [activeTab, setActiveTab] = useStickyState(initialTab, 'teacher-dash-tab');
  
  // ✅ UPGRADED: React remembers if they prefer the sidebar collapsed!
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useStickyState(false, 'teacher-dash-sidebar-state');

  // NORMAL: We keep mobile menu state standard so it resets safely
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Auto close sidebar on mobile
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  return { 
    activeTab, 
    isSidebarOpen, 
    handleNavigate, 
    toggleSidebar, 
    closeSidebar, 
    openSidebar, 
    isDesktopSidebarCollapsed, 
    setIsDesktopSidebarCollapsed 
  };
}