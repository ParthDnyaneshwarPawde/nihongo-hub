import React from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Trash2, CheckCircle2, Loader2, RotateCcw, Eye } from 'lucide-react'; 

export default function ExamFooter({ currentIndex, totalQuestions, currentState, onPrevious, onCheck, onNext, isNextLoading, onClear, hasHint, onShowHint, isDarkMode, onAttemptAgain, onShowAnswer }) { 
  const canAttempt = currentState?.status !== 'completed';
  const isAttempt1Failed = currentState?.status === 'attempt1_failed';
  const hasSelection = currentState?.selectedOptions?.length > 0;

  return (
    <footer className={`shrink-0 p-3 sm:p-4 lg:p-6 border-t flex justify-between items-center relative z-20 ${isDarkMode ? 'border-slate-800 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
      
      {/* Previous Button: Icon only on mobile */}
      <button 
        onClick={onPrevious} 
        disabled={currentIndex === 0 || isNextLoading} 
        className={`px-3 sm:px-6 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors disabled:opacity-30 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
      >
        <ChevronLeft size={18} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        
        {/* Hint Button */}
        {hasHint && (
          <button 
            onClick={onShowHint} 
            disabled={isNextLoading}
            className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-3.5 border rounded-xl font-black text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 shadow-sm'}`}
            title="Hint"
          >
            <Lightbulb size={18} />
            <span className="hidden sm:inline">Hint</span>
          </button>
        )}

        {/* Clear Response Button */}
        {canAttempt && !isAttempt1Failed && hasSelection && (
          <button 
            onClick={onClear} 
            disabled={isNextLoading}
            className={`flex items-center justify-center px-3 sm:px-6 py-3.5 border rounded-xl font-black text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
            title="Clear Response"
          >
            <Trash2 size={18} className="sm:hidden" />
            <span className="hidden sm:inline">Clear Response</span>
          </button>
        )}

        {/* Check Answer OR Attempt Again Block */}
        {isAttempt1Failed ? (
          <div className="flex items-center gap-2">
            {/* 🚨 NEW: Show Answer Button */}
            <button 
              onClick={onShowAnswer} 
              disabled={isNextLoading} 
              className={`px-4 sm:px-6 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title="Give up and show the answer"
            >
              <Eye size={18} className="sm:hidden" />
              <span className="hidden sm:inline">Show Answer</span>
            </button>

            <button 
              onClick={onAttemptAgain} 
              disabled={isNextLoading} 
              className="px-4 sm:px-8 py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-400 shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <RotateCcw size={18} className="sm:hidden" />
              <span className="hidden sm:inline">Attempt Again</span>
              <span className="sm:hidden">Retry</span>
            </button>
          </div>
        ) : canAttempt ? (
          <button 
            onClick={onCheck} 
            disabled={!hasSelection || isNextLoading} 
            className="px-4 sm:px-8 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 active:scale-95 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <CheckCircle2 size={18} className="sm:hidden" />
            <span className="hidden sm:inline">Check Answer</span>
            <span className="sm:hidden">Check</span>
          </button>
        ) : null}

        {/* Next/Finish Button */}
        <button 
          onClick={onNext} 
          disabled={isNextLoading}
          className={`px-4 sm:px-8 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isNextLoading ? 'opacity-70 cursor-wait' : ''
          } ${!canAttempt ? 'bg-indigo-600 text-white hover:bg-indigo-500' : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}
        >
          {isNextLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">
                {currentIndex < totalQuestions - 1 ? 'Next' : 'Finish Assessment'}
              </span>
              <span className="sm:hidden">
                 {currentIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
              </span>
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}