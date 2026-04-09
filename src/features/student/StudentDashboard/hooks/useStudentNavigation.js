import { useState } from 'react';

export function useStudentNavigation() {
  const [activeTab, setActiveTab] = useState('learn');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isCourseMenuOpen,
    setIsCourseMenuOpen,
    handleTabClick
  };
}
