import React from 'react';
import { motion } from 'framer-motion';

export default function ChoiceInterface({ currentQ, currentState, settings, telemetry, toggleOption, isDarkMode, fontClasses }) {
  if (!currentQ || !currentState) return null;

  const hasAnswered = currentState.status !== 'idle';
  const showStats = hasAnswered && settings.showPeerStats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
      {currentQ.options.map((opt, idx) => {
        const isSelected = currentState.selectedOptions.includes(opt.id);
        const isMulti = currentQ.type === 'multiple_choice';
        
        // Base classes
        let btnClass = isDarkMode ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
        let letterBg = isDarkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500';

        // State classes
        if (isSelected) {
          if (!hasAnswered) {
            btnClass = isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-indigo-50 border-indigo-500 text-indigo-900';
            letterBg = 'bg-indigo-600 text-white';
          } else if (opt.isCorrect) {
            btnClass = isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100' : 'bg-emerald-50 border-emerald-500 text-emerald-900';
            letterBg = 'bg-emerald-500 text-white';
          } else {
            btnClass = isDarkMode ? 'bg-rose-500/10 border-rose-500 text-rose-100' : 'bg-rose-50 border-rose-500 text-rose-900';
            letterBg = 'bg-rose-500 text-white';
          }
        }

        return (
          <button
            key={opt.id}
            disabled={hasAnswered}
            onClick={() => {
              toggleOption(opt.id, isMulti);
              telemetry.recordOptionClick(opt.id, opt.text);
            }}
            onMouseEnter={() => telemetry.handleMouseEnter(opt.id)}
            onMouseLeave={() => telemetry.handleMouseLeave(opt.id)}
            className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all flex items-center min-h-[80px] text-left ${btnClass}`}
          >
            {showStats && <motion.div initial={{ width: 0 }} animate={{ width: `${opt.peerStat || 0}%` }} className={`absolute left-0 top-0 bottom-0 ${isDarkMode ? 'bg-slate-600/20' : 'bg-slate-200/50'}`} />}
            <span className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 mr-4 ${letterBg}`}>
              {['A', 'B', 'C', 'D', 'E', 'F'][idx]}
            </span>
            <span className={`relative z-10 font-bold flex-1 ${fontClasses}`}>{opt.text}</span>
            {showStats && <span className="relative z-10 text-xs font-black ml-3 text-slate-500">{opt.peerStat || 0}%</span>}
          </button>
        );
      })}
    </div>
  );
}