import { useState } from 'react';

export function useDashboardNavigation(initialTab = 'dashboard') {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Auto close sidebar on mobile
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  return { activeTab, isSidebarOpen, handleNavigate, toggleSidebar, closeSidebar, openSidebar, isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed };
}
