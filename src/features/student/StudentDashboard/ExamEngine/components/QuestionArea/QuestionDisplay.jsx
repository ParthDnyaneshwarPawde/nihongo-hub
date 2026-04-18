import React from 'react';
import { PlayCircle, Volume2 } from 'lucide-react';

export default function QuestionDisplay({ currentQ, fontClasses, isDarkMode }) {
  if (!currentQ) return null;

  return (
    <div className={`space-y-6 rounded-3xl p-6 lg:p-10 border transition-colors shadow-sm ${isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200'}`}>
      <h2 className={`${fontClasses} font-bold leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        {currentQ.prompt}
      </h2>
      
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