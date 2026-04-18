import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ExamFooter({ currentIndex, totalQuestions, currentState, onPrevious, onCheck, onNext, onClear, isDarkMode }) {
  const isIdle = currentState?.status === 'idle';
  const hasSelection = currentState?.selectedOptions.length > 0;

  return (
    <footer className={`shrink-0 p-4 lg:p-6 border-t flex justify-between items-center relative z-20 ${isDarkMode ? 'border-slate-800 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
      <button onClick={onPrevious} disabled={currentIndex === 0} className={`px-6 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors disabled:opacity-30 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
        <ChevronLeft size={18} /> Previous
      </button>

      <div className="flex items-center gap-3 lg:gap-4">
        
        {/* 🚨 NEW: Clear Response Button (Only shows if unattempted AND something is selected) */}
        {isIdle && hasSelection && (
          <button 
            onClick={onClear} 
            className={`hidden sm:flex px-6 py-3.5 border rounded-xl font-black text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
          >
            Clear Response
          </button>
        )}

        {isIdle && (
          <button onClick={onCheck} disabled={!hasSelection} className="px-8 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 active:scale-95 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">
            Check Answer
          </button>
        )}

        <button onClick={onNext} className={`px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 ${!isIdle ? 'bg-indigo-600 text-white hover:bg-indigo-500' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
          {currentIndex < totalQuestions - 1 ? <>Next <ChevronRight size={18} /></> : 'Finish Assessment'}
        </button>
      </div>
    </footer>
  );
}