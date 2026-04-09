import React from 'react';
import { Radio } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClassroomHeader({ liveSessionsCount, isDarkMode }) {
  return (
    <motion.div 
      className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-full h-full bg-rose-500 rounded-full animate-ping opacity-60"></div>
            <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_20px_#f43f5e] relative z-10"></div>
          </div>
          <h1 className={`text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${isDarkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-500'}`}>
            Active Grid.
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-[0.3em] uppercase ml-8">Global Live Network</p>
      </div>
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs tracking-widest border backdrop-blur-md shadow-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 shadow-indigo-500/10' : 'bg-white text-indigo-600 border-indigo-100 shadow-indigo-500/5'}`}>
          <Radio size={16} className="animate-pulse" /> {liveSessionsCount} LIVE SESSIONS
        </div>
      </div>
    </motion.div>
  );
}
