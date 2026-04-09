import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingKanji({ isDarkMode, activeTab }) {
  // Determine which Kanji to show based on the active tab
  const getKanji = () => {
    switch (activeTab) {
      case 'dashboard':
        return '指揮'; // Command
      case 'live':
        return '生'; // Live
      case 'students':
        return '学生'; // Student
      case 'materials':
        return '資源'; // Resources
      default:
        return '先生'; // Sensei
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: isDarkMode ? 0.02 : 0.04, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1, y: -50 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className={`fixed right-[-10%] top-[10%] text-[400px] lg:text-[700px] font-black select-none pointer-events-none z-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
      >
        {getKanji()}
      </motion.div>
    </AnimatePresence>
  );
}
