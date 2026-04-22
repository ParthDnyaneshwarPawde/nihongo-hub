import React, { useState, useEffect } from 'react';
import { AlertCircle, HelpCircle, Eye, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'; 
import MediaPlayer from './MediaPlayer';

export default function PostAttemptFeedback({ currentQ, currentState, settings, markHintViewed, setStudentDifficulty, isDarkMode }) {
  const solutionMode = settings?.solutionMode ?? false;
  const [isExpanded, setIsExpanded] = useState(solutionMode);

  useEffect(() => { setIsExpanded(solutionMode); }, [solutionMode, currentQ?.id]);

  if (!currentQ || !currentState) return null;

  const isCompleted = currentState.status === 'completed';
  const isFailedFirstTry = currentState.status === 'attempt1_failed';
  
  if (!isCompleted && !isFailedFirstTry) return null;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
      {isCompleted && !currentState.isCorrect && currentState.isPartial && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 font-bold text-sm ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
          <AlertTriangle size={20} /> Partially Correct: You missed some options or selected incorrect ones.
        </div>
      )}
      {isFailedFirstTry && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 font-bold text-sm ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
          <AlertTriangle size={20} /> Incorrect. Review the question and click "Attempt Again" below for your final try!
        </div>
      )}
      {currentQ.hint && isFailedFirstTry && !currentState.hintViewed && (
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
      {isCompleted && (
        <div className={`border rounded-3xl overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-indigo-100 shadow-xl shadow-indigo-100/50'}`}>
          {!isExpanded ? (
            <button onClick={() => setIsExpanded(true)} className={`w-full p-6 flex items-center justify-between font-bold transition-colors ${isDarkMode ? 'text-indigo-400 hover:bg-slate-800/60' : 'text-indigo-600 hover:bg-indigo-50/50'}`}>
              <span className="flex items-center gap-2"><Eye size={18} /> View Official Solution & Explanation</span><ChevronDown size={20} />
            </button>
          ) : (
            <div className="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2 text-indigo-500 font-black tracking-widest uppercase text-[10px]"><AlertCircle size={16} /> Official Solution</h4>
                {!solutionMode && (
                  <button onClick={() => setIsExpanded(false)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}><ChevronUp size={16} /></button>
                )}
              </div>
              
              {/* 🚨 THE UPGRADED YOUTUBE/MEDIA DETECTOR */}
              {(() => {
                const explicitUrl = currentQ.officialSolution?.videoUrl || currentQ.officialSolution?.mediaUrl || currentQ.solutionVideoUrl || currentQ.solutionMediaUrl;
                const mediaLink = explicitUrl || currentQ.mediaUrl;
                if (!mediaLink) return null;

                let dType = 'none';
                const cleanUrl = mediaLink.split('?')[0].toLowerCase();
                
                // Identify the exact type so it never guesses wrong. Now includes YouTube support.
                if (cleanUrl.match(/\.(mp4|webm|mov)$/) || cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                  dType = 'video';
                }
                else if (cleanUrl.match(/\.(mp3|wav|ogg|aac|m4a)$/)) dType = 'audio';
                else if (cleanUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) || cleanUrl.includes('unsplash.com')) dType = 'image';
                else dType = currentQ.mediaType;

                // Don't show the image again in the solution unless it's a specific new solution image
                if (dType === 'image' && !explicitUrl) return null;

                if (dType === 'image' && explicitUrl) {
                  return (
                    <div className="mb-6 flex justify-center">
                      <img src={explicitUrl} alt="Solution Visual" className="max-h-[300px] rounded-xl border object-contain shadow-sm" loading="lazy" />
                    </div>
                  );
                }
                
                // Now passes the clean YouTube or mp4 link down to the shared component
                return (
                  <div className="mb-6">
                    <MediaPlayer mediaUrl={mediaLink} mediaType={dType} isDarkMode={isDarkMode} />
                  </div>
                );
              })()}

              <p className={`leading-relaxed font-medium text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentQ.explanation}
              </p>
            </div>
          )}

          <div className={`px-6 py-5 border-t ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <p className="text-xs font-bold text-slate-500 mb-3">How difficult was this for you?</p>
            <div className="flex gap-2">
              {['easy', 'mid', 'hard', 'tough'].map(level => (
                <button key={level} onClick={() => setStudentDifficulty(currentQ.id, level)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${currentState.studentDifficulty === level ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}