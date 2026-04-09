import React from 'react';
import { Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ZenToggle({ isDarkMode, onToggle }) {
  return (
    <motion.button 
      onClick={onToggle} 
      className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isDarkMode ? <Zap size={18} className="text-amber-400" /> : <Clock size={18} className="text-slate-600" />}
    </motion.button>
  );
}
