import React from 'react';
import { motion } from 'framer-motion';

export default function ChoiceInterface({ currentQ, currentState, settings, telemetry, toggleOption, isDarkMode, fontClasses }) {
  if (!currentQ || !currentState) return null;

  // 🚨 UPGRADE: Fallback for text size if undefined
  const textSizeClass = fontClasses || 'text-xl';

  const hasAnswered = currentState.status === 'completed';
  const isAttempt1Failed = currentState.status === 'attempt1_failed';
  
  // 🚨 UPGRADE: Safe fallbacks for settings
  const showStats = hasAnswered && (settings?.showPeerStats ?? true);
  const delayCorrectAnswer = settings?.delayCorrectAnswer ?? false;
  
  // Calculate total votes dynamically for real-time peer stats sync
  const totalVotes = currentQ.options.reduce((sum, o) => sum + (o.count || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
      {currentQ.options.map((opt, idx) => {
        const isSelected = currentState.selectedOptions.includes(opt.id);
        const isMulti = currentQ.type === 'multiple_choice';
        
        // Base classes
        let btnClass = isDarkMode ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
        let letterBg = isDarkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500';

        // 🚨 UPGRADE: Advanced State Classes handling both "completed" and "attempt1_failed"
        if (hasAnswered || isAttempt1Failed) {
          if (isSelected && opt.isCorrect) {
            // 1. Picked the correct answer -> Green
            btnClass = isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100' : 'bg-emerald-50 border-emerald-500 text-emerald-900';
            letterBg = 'bg-emerald-500 text-white';
          } else if (!isSelected && opt.isCorrect && !delayCorrectAnswer && hasAnswered) {
            // 2. Missed the correct answer -> Orange (Hides if delayed OR if still on attempt 1)
            btnClass = isDarkMode ? 'bg-orange-500/10 border-orange-500 text-orange-200' : 'bg-orange-50 border-orange-500 text-orange-900';
            letterBg = 'bg-orange-500 text-white';
          } else if (isSelected && !opt.isCorrect) {
            // 3. Picked the wrong answer -> Red
            btnClass = isDarkMode ? 'bg-rose-500/10 border-rose-500 text-rose-100' : 'bg-rose-50 border-rose-500 text-rose-900';
            letterBg = 'bg-rose-500 text-white';
          }
        } else if (isSelected) {
          // Standard selection color when still taking the test
          btnClass = isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-indigo-50 border-indigo-500 text-indigo-900';
          letterBg = 'bg-indigo-600 text-white';
        }

        // Dynamically calculate the display stat using live counts (or fallback to peerStat if provided)
        const displayStat = opt.peerStat !== undefined 
          ? opt.peerStat 
          : (totalVotes > 0 ? Math.round(((opt.count || 0) / totalVotes) * 100) : 0);

        return (
          <button
            key={opt.id}
            disabled={hasAnswered || (isAttempt1Failed && isSelected)} // Disable wrong choices on second attempt
            onClick={() => {
              toggleOption(opt.id, isMulti);
              telemetry.recordOptionClick(opt.id, opt.text);
            }}
            onMouseEnter={() => telemetry.handleMouseEnter(opt.id)}
            onMouseLeave={() => telemetry.handleMouseLeave(opt.id)}
            className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all flex items-center min-h-[80px] text-left ${btnClass}`}
          >
            {showStats && (
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${displayStat}%` }} 
                className={`absolute left-0 top-0 bottom-0 ${isDarkMode ? 'bg-slate-600/20' : 'bg-slate-200/50'}`} 
              />
            )}
            <span className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 mr-4 ${letterBg}`}>
              {['A', 'B', 'C', 'D', 'E', 'F'][idx]}
            </span>
            <span className={`relative z-10 font-bold flex-1 ${textSizeClass}`}>{opt.text}</span>
            {showStats && (
              <span className="relative z-10 text-xs font-black ml-3 text-slate-500">
                {displayStat}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}