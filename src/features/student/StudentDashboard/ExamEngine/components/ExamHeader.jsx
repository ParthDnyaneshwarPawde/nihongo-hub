import React, { useState } from 'react';
import { X, Clock, Sun, Moon, Edit3, Settings as SettingsIcon, Bookmark, AlertTriangle, Play, StickyNote } from 'lucide-react'; // 🚨 Added StickyNote
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamHeader({ 
  examConfig, 
  currentQ, 
  currentIndex, 
  totalQuestions, 
  timeSpent, 
  timerIsCritical, 
  isDarkMode, 
  toggleTheme, 
  onOpenSettings, 
  onExit,
  isTimerRunning,
  onStartTimer,
  onOpenNotes,   // 🚨 NEW PROP
  hasAttempted   // 🚨 NEW PROP
}) {
  const [showQuitModal, setShowQuitModal] = useState(false);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const handleConfirmQuit = () => {
    setShowQuitModal(false);
    onExit();
  };

  return (
    <>
      {/* 🚨 UPGRADE: Quit Confirmation Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-md w-full p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-indigo-900/10'}`}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Are you sure you want to quit?
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  If you leave now, your assessment will be <strong className="text-rose-500">auto-submitted</strong> with your current progress. You cannot undo this action.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setShowQuitModal(false)}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmQuit}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                >
                  Quit & Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Progress Bar */}
      <div className="h-1.5 bg-slate-800/50 w-full overflow-hidden shrink-0 relative z-30">
        <motion.div 
          className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
          initial={{ width: 0 }} 
          animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} 
          transition={{ type: "spring", stiffness: 50, damping: 20 }} 
        />
      </div>

      <header className={`shrink-0 h-16 px-4 lg:px-6 flex items-center justify-between border-b relative z-20 ${isDarkMode ? 'border-slate-800 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
        
        {/* Left Section: Exit & Title */}
        <div className="flex items-center gap-3 w-1/3">
          <button 
            onClick={() => setShowQuitModal(true)} 
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-500/10 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="hidden sm:block h-6 w-px mx-1 bg-slate-500/30"></div>
          <h1 className="font-bold text-sm truncate hidden sm:block text-slate-500">
            {examConfig?.title} &gt;&gt; {currentQ?.type?.toUpperCase()}
          </h1>
        </div>

        {/* Center Section: Vibrating Timer + Start Button */}
        <div className="flex items-center justify-center gap-3 w-1/3">
          <motion.div 
            // 🚨 Only vibrate if the timer is actually running
            animate={timerIsCritical && isTimerRunning ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
            transition={{ repeat: timerIsCritical && isTimerRunning ? Infinity : 0, duration: 0.4, ease: "easeInOut", repeatDelay: 1 }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm text-sm font-black tracking-widest transition-colors duration-300 ${
              !isTimerRunning 
                ? isDarkMode ? 'bg-slate-800/50 text-slate-500 border-slate-700/50' : 'bg-slate-100 text-slate-400 border-slate-200'
                : timerIsCritical 
                  ? isDarkMode 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_10px_rgba(225,29,72,0.2)]'
                    : 'bg-rose-100 text-rose-600 border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)]'
                  : isDarkMode
                    ? 'bg-transparent text-slate-400 border-slate-700'
                    : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            <Clock size={14} className={timerIsCritical && isTimerRunning ? 'animate-pulse' : ''} /> 
            {formatTime(timeSpent)}
          </motion.div>

          {/* 🚨 THE START BUTTON: Only shows if timer is NOT running */}
          {!isTimerRunning && (
            <button
              onClick={onStartTimer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Play size={12} fill="currentColor" />
              Start
            </button>
          )}
        </div>

        {/* Right Section: Controls */}
        <div className="flex items-center justify-end gap-1 w-1/3 text-slate-500">
          
          {/* 🚨 THE NEW NOTES BUTTON */}
          {hasAttempted && (
            <button 
              onClick={onOpenNotes} 
              className={`flex items-center gap-1.5 px-3 py-1.5 mr-1 rounded-full border transition-all animate-in zoom-in duration-300 active:scale-95 ${
                isDarkMode 
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {/* Note: Make sure Edit3 is in your lucide-react imports at the top! */}
              <Edit3 size={14} strokeWidth={2.5} />
              <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:block">Notes</span>
            </button>
          )}

          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors">
            <Bookmark size={18} />
          </button>
          <button onClick={onOpenSettings} className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors">
            <SettingsIcon size={18} />
          </button>
        </div>
        
      </header>
    </>
  );
}