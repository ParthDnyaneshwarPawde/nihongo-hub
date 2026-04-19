import React from 'react';
import { motion } from 'framer-motion';

export default function ChoiceInterface({ currentQ, currentState, settings, telemetry, toggleOption, isDarkMode, fontClasses }) {
  if (!currentQ || !currentState) return null;

  const textSizeClass = fontClasses || 'text-xl';
  const hasAnswered = currentState.status === 'completed';
  const isAttempt1Failed = currentState.status === 'attempt1_failed';
  
  const showStats = hasAnswered && (settings?.showPeerStats ?? true);
  const delayCorrectAnswer = settings?.delayCorrectAnswer ?? false;
  
  const totalVotes = currentQ.options.reduce((sum, o) => sum + (o.count || 0), 0);
  
  // 🚨 FIX: Handle potential uppercase types from DB
  const qType = (currentQ.type || '').toLowerCase();
  const isMulti = qType.includes('multiple') || qType.includes('multi');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
      {currentQ.options.map((opt, idx) => {
        const isSelected = currentState.selectedOptions.includes(opt.id);
        
        // 🚨 FIX: Bulletproof check for correctness (handles boolean true and string "true")
        // 🚨 THE AGGRESSIVE FIX: Checks IDs (strict and loose) + the boolean flag
        const isOptCorrect = 
          currentQ.correctOptions?.some(id => String(id) === String(opt.id)) || 
          opt.isCorrect === true || 
          opt.isCorrect === 'true';
        
        let btnClass = isDarkMode ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
        let letterBg = isDarkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500';

        if (hasAnswered || isAttempt1Failed) {
  if (isSelected && isOptCorrect) {
    // 1. Correct Selection -> GREEN
    btnClass = isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100' : 'bg-emerald-50 border-emerald-500 text-emerald-900';
    letterBg = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
  } 
  else if (isSelected && !isOptCorrect) {
    // 2. Wrong Selection -> RED
    btnClass = isDarkMode ? 'bg-rose-500/10 border-rose-500 text-rose-100' : 'bg-rose-50 border-rose-500 text-rose-900';
    letterBg = 'bg-rose-500 text-white shadow-md shadow-rose-500/30';
  } 
  else if (!isSelected && isOptCorrect && hasAnswered) {
    // 3. MISSED CORRECT ANSWER -> BOLD AMBER/ORANGE
    // This turns the option orange if it was correct but you didn't click it.
    btnClass = 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400';
    letterBg = 'bg-amber-500 text-white shadow-md shadow-amber-500/40';
  }
} else if (isSelected) {
          // Standard selection color when still taking the test
          btnClass = isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-indigo-50 border-indigo-500 text-indigo-900';
          letterBg = 'bg-indigo-600 text-white';
        }

        const displayStat = opt.peerStat !== undefined 
          ? opt.peerStat 
          : (totalVotes > 0 ? Math.round(((opt.count || 0) / totalVotes) * 100) : 0);

        return (
          <button
            key={opt.id}
            disabled={hasAnswered || isAttempt1Failed} // 🚨 Freezes options until they click 'Attempt Again'
            onClick={() => {
              toggleOption(opt.id, isMulti);
              telemetry.recordOptionClick(opt.id, opt.text);
            }}
            onMouseEnter={() => telemetry.handleMouseEnter(opt.id)}
            onMouseLeave={() => telemetry.handleMouseLeave(opt.id)}
            // 🚨 Subtly grays out the wrong answer during attempt 1 to help focus
            className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all flex items-center min-h-[80px] text-left ${btnClass} ${isAttempt1Failed && isSelected && !isOptCorrect ? 'opacity-50 grayscale' : ''}`}
          >
            {showStats && (
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${displayStat}%` }} 
                className={`absolute left-0 top-0 bottom-0 ${isDarkMode ? 'bg-slate-600/20' : 'bg-slate-200/50'}`} 
              />
            )}
            <span className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 mr-4 transition-all duration-300 ${letterBg}`}>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][idx]}
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