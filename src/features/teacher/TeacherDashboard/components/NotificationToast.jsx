import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationToast({ isDarkMode, message, isVisible, onClose }) {
  // Placeholder structure mapping for future global toast system
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-2xl z-[100] border backdrop-blur-xl ${isDarkMode ? 'bg-indigo-600/90 border-indigo-500 text-white' : 'bg-white/90 border-slate-200 text-slate-900'}`}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
