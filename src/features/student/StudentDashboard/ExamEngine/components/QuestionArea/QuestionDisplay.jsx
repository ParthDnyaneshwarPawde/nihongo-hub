import React from 'react';
import { PlayCircle, Volume2 } from 'lucide-react';

export default function QuestionDisplay({ currentQ, currentIndex, totalQuestions, fontClasses, isDarkMode }) {
  if (!currentQ) return null;

  // 🚨 THE FIX: Added 'negativePoints' to the checks and used Math.abs()
  // This ensures that even if your DB stores it as "-1", it will cleanly format as "-1" instead of "--1"
  const rawPenalty = currentQ.negativePoints || currentQ.negativeMarks || currentQ.penalty || 0;
  const penalty = Math.abs(Number(rawPenalty));
  
  // 🚨 UPGRADE: Fallback just in case fontClasses is undefined
  const textSizeClass = fontClasses || 'text-xl';

  return (
    <div className={`space-y-6 rounded-3xl p-6 lg:p-10 border transition-colors shadow-sm ${isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200'}`}>
      
      {/* Subtle, clean header mimicking the reference image */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2 pb-4 border-b border-slate-200 dark:border-slate-800/60">
        
        {/* Left: Subtle Question Number & Topic */}
        <div className={`text-sm font-semibold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Q {currentIndex !== undefined ? currentIndex + 1 : '?'} 
          <span className="mx-3 opacity-30">|</span> 
          <span className="font-medium text-xs uppercase tracking-wider">{currentQ.topic || 'General'}</span>
        </div>

        {/* 🚨 UPGRADE: Points & Penalty Badge (+4 / -1 Format) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>
            +{currentQ.points || 1}
          </span>
          {penalty > 0 && (
            <>
              <span className={`opacity-40 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</span>
              <span className={isDarkMode ? 'text-rose-400' : 'text-rose-600'}>
                -{penalty}
              </span>
            </>
          )}
        </div>
      </div>

      {/* The Question Prompt (Now shines without distractions and respects Settings text size!) */}
      <h2 className={`${textSizeClass} font-bold leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        {currentQ.prompt}
      </h2>
      
      {/* The Media Player (Audio) */}
      {currentQ.mediaType === 'audio' && (
        <div className={`p-4 rounded-2xl border flex items-center gap-5 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <button className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 shrink-0"><PlayCircle size={24} className="ml-1" /></button>
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-1/3 rounded-full"></div></div>
          <Volume2 size={20} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
        </div>
      )}
    </div>
  );
}