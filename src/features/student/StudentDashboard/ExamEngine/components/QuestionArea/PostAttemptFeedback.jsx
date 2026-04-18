import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

export default function PostAttemptFeedback({ currentQ, currentState, settings, markHintViewed, setStudentDifficulty, isDarkMode }) {
  if (!currentQ || !currentState) return null;

  const showExplanation = (currentState.status === 'completed' || (currentState.status === 'attempt1_failed' && currentQ.secondAttempt)) || settings.solutionMode;
  
  if (!showExplanation) return null;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
      
      {/* HINT SYSTEM */}
      {currentQ.hint && currentState.status === 'attempt1_failed' && !currentState.hintViewed && (
        <button onClick={() => markHintViewed(currentQ.id)} className="w-full p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 font-bold text-sm hover:bg-cyan-500/20 transition-colors">
          View Teacher's Hint
        </button>
      )}

      {currentState.hintViewed && (
        <div className="p-6 rounded-2xl border border-cyan-500/50 bg-cyan-500/10">
          <h4 className="flex items-center gap-2 text-cyan-600 font-black tracking-widest uppercase text-[10px] mb-2"><HelpCircle size={14} /> Hint</h4>
          <p className="text-cyan-800 dark:text-cyan-300 font-medium">{currentQ.hint}</p>
        </div>
      )}

      {/* OFFICIAL SOLUTION */}
      <div className={`p-6 lg:p-8 border rounded-3xl ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-indigo-100 shadow-xl shadow-indigo-100/50'}`}>
        <h4 className="flex items-center gap-2 text-indigo-500 font-black tracking-widest uppercase text-[10px] mb-4"><AlertCircle size={16} /> Official Solution</h4>
        <p className={`leading-relaxed font-medium text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentQ.explanation}</p>
        
        {/* STUDENT DIFFICULTY RATING */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 mb-3">How difficult was this for you?</p>
          <div className="flex gap-2">
            {['easy', 'mid', 'hard', 'tough'].map(level => (
              <button 
                key={level} 
                onClick={() => setStudentDifficulty(currentQ.id, level)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${currentState.studentDifficulty === level ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}