import React from 'react';
import MediaPlayer from './MediaPlayer';

export default function QuestionDisplay({ currentQ, currentIndex, totalQuestions, fontClasses, isDarkMode }) {
  if (!currentQ) return null;

  const rawPenalty = currentQ.negativePoints || currentQ.negativeMarks || currentQ.penalty || 0;
  const penalty = Math.abs(Number(rawPenalty));
  const textSizeClass = fontClasses || 'text-xl';

  return (
    <div className={`space-y-6 rounded-3xl p-6 lg:p-10 border transition-colors shadow-sm ${isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200'}`}>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2 pb-4 border-b border-slate-200 dark:border-slate-800/60">
        <div className={`text-sm font-semibold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Q {currentIndex !== undefined ? currentIndex + 1 : '?'} 
          <span className="mx-3 opacity-30">|</span> 
          <span className="font-medium text-xs uppercase tracking-wider">{currentQ.topic || 'General'}</span>
        </div>

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

      <h2 className={`${textSizeClass} font-bold leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        {currentQ.prompt}
      </h2>
      
      {currentQ.mediaType === 'image' && currentQ.mediaUrl && (
        <div className="mt-6 flex justify-center">
          <img 
            src={currentQ.mediaUrl} 
            alt="Question visual prompt" 
            className={`max-w-full max-h-[400px] object-contain rounded-2xl border shadow-md ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
            loading="lazy"
          />
        </div>
      )}

      {/* 🚨 THE SHARED COMPONENT DOING ALL THE HEAVY LIFTING */}
      <MediaPlayer 
        id={currentQ.id}
        mediaUrl={currentQ.mediaUrl} 
        mediaType={currentQ.mediaType} 
        isDarkMode={isDarkMode} 
      />

    </div>
  );
}