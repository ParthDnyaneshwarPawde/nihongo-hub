import React from 'react';
import { X, Clock, Sun, Moon, Settings as SettingsIcon, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExamHeader({ examConfig, currentQ, currentIndex, totalQuestions, timeSpent, timerIsCritical, isDarkMode, toggleTheme, onOpenSettings, onExit }) {
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <>
      <div className="h-1.5 bg-slate-800/50 w-full overflow-hidden shrink-0 relative z-30">
        <motion.div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" initial={{ width: 0 }} animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} transition={{ type: "spring", stiffness: 50, damping: 20 }} />
      </div>
      <header className={`shrink-0 h-16 px-4 lg:px-6 flex items-center justify-between border-b relative z-20 ${isDarkMode ? 'border-slate-800 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3 w-1/3">
          <button onClick={onExit} className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-500/10"><X size={20} /></button>
          <div className="hidden sm:block h-6 w-px mx-1 bg-slate-500/30"></div>
          <h1 className="font-bold text-sm truncate hidden sm:block text-slate-500">{examConfig?.title} &gt;&gt; {currentQ?.type?.toUpperCase()}</h1>
        </div>
        <div className="flex items-center justify-center w-1/3">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm text-sm font-black tracking-widest ${timerIsCritical ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse' : 'text-slate-500 border-slate-500/30'}`}>
            <Clock size={14} /> {formatTime(timeSpent)}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 w-1/3 text-slate-500">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-500/10">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className="p-2 rounded-lg hover:bg-slate-500/10"><Bookmark size={18} /></button>
          <button onClick={onOpenSettings} className="p-2 rounded-lg hover:bg-slate-500/10"><SettingsIcon size={18} /></button>
        </div>
      </header>
    </>
  );
}