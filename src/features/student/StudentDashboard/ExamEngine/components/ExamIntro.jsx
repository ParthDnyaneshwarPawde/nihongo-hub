import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, PlayCircle, Clock, FileText, Target, CheckSquare, Square, ShieldAlert } from 'lucide-react';

export default function ExamIntro({ examConfig, totalQuestions, onStart, isDarkMode }) {
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(null); // null means not started

  // Handle the 3-2-1 Countdown Logic
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Small delay after 0 to show the "Grab your pen!" text before firing the engine
      const timer = setTimeout(() => onStart(), 1200);
      return () => clearTimeout(timer);
    }
  }, [countdown, onStart]);

  const handleInitiate = () => {
    if (agreed) setCountdown(3);
  };

  // 🚨 THE COUNTDOWN SCREEN
  if (countdown !== null) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center overflow-hidden ${isDarkMode ? 'bg-[#0B1121] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center"
          >
            {countdown > 0 ? (
              <h1 className="text-[12rem] font-black leading-none bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl">
                {countdown}
              </h1>
            ) : (
              <h1 className="text-6xl md:text-8xl font-black text-center px-4 bg-gradient-to-br from-emerald-400 to-teal-600 bg-clip-text text-transparent drop-shadow-2xl">
                Grab your pen!
              </h1>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 🚨 THE PRE-FLIGHT CHECKLIST SCREEN
  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-3xl w-full p-8 md:p-12 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#151E2E] border-slate-800 shadow-black/50' : 'bg-white border-slate-200 shadow-indigo-900/5'}`}
      >
        
        {/* Header section */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center rotate-3 mb-6">
            <AlertCircle size={36} className="-rotate-3" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">{examConfig?.title || "Assessment Ready"}</h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            {examConfig?.description || "Please review the assessment details and instructions before beginning your session."}
          </p>
        </div>

        {/* Exam Info Grid */}
        <div className={`grid grid-cols-3 gap-4 p-6 rounded-2xl mb-8 border ${isDarkMode ? 'bg-slate-900/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col items-center justify-center text-center border-r border-slate-500/20 last:border-0">
            <FileText size={24} className="text-indigo-500 mb-2" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Questions</span>
            <span className="text-xl font-black">{totalQuestions}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center border-r border-slate-500/20 last:border-0">
            <Clock size={24} className="text-rose-500 mb-2" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Time Limit</span>
            <span className="text-xl font-black">{examConfig?.duration ? `${examConfig.duration}` : 'Untimed'}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center border-r border-slate-500/20 last:border-0">
            <Target size={24} className="text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Passing Score</span>
            <span className="text-xl font-black">{examConfig?.passPercentage || 80}%</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-10 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <ShieldAlert size={16} /> Important Instructions
          </h3>
          <ul className={`space-y-3 text-sm font-medium p-6 rounded-2xl ${isDarkMode ? 'bg-rose-500/5 text-rose-200/80' : 'bg-rose-50 text-rose-800/80'}`}>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Once started, the timer cannot be paused.</li>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Do not switch tabs or minimize the window. Tab switches are recorded and flagged.</li>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Ensure a stable internet connection before proceeding.</li>
            <li className="flex gap-3"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" /> Second attempts on questions will yield only 50% of the points.</li>
          </ul>
        </div>

        {/* Agreement & Action */}
        <div className="mt-auto flex flex-col sm:flex-row items-center gap-6 pt-6 border-t border-slate-500/20">
          <button 
            onClick={() => setAgreed(!agreed)} 
            className="flex items-center gap-3 text-left flex-1 group"
          >
            <div className={`shrink-0 transition-colors ${agreed ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-400'}`}>
              {agreed ? <CheckSquare size={28} /> : <Square size={28} />}
            </div>
            <span className={`text-sm font-medium transition-colors ${agreed ? (isDarkMode ? 'text-slate-200' : 'text-slate-900') : 'text-slate-500'}`}>
              I have read the instructions and confirm that I am ready to begin the assessment in a proctored environment.
            </span>
          </button>
          
          <button 
            onClick={handleInitiate} 
            disabled={!agreed}
            className={`shrink-0 px-8 py-4 font-black text-lg rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${
              agreed 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95' 
                : 'bg-slate-500/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            Start Engine <PlayCircle size={20} />
          </button>
        </div>

      </motion.div>
    </div>
  );
}