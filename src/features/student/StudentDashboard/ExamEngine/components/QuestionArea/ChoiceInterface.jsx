import React from 'react';
import { motion } from 'framer-motion';
import MediaPlayer from './MediaPlayer';

export default function ChoiceInterface({ currentQ, currentState, settings, telemetry, toggleOption, isDarkMode, fontClasses }) {
  if (!currentQ || !currentState) return null;

  const textSizeClass = fontClasses || 'text-xl';
  const hasAnswered = currentState.status === 'completed';
  const isAttempt1Failed = currentState.status === 'attempt1_failed';
  
  const shouldShowResults = hasAnswered || isAttempt1Failed;
  const showStats = shouldShowResults && (settings?.showPeerStats ?? true);
  
  const totalVotes = (currentQ.options || []).reduce((sum, o) => 
    sum + (o.count || o.votes || o.votedCount || 0), 0
  );
  
  const qType = (currentQ.type || '').toLowerCase();
  const isMulti = qType.includes('multiple') || qType.includes('multi');

  // 🚨 UNIVERSAL MEDIA DETECTOR: Detects Link Types for Options
  const getMediaType = (opt) => {
    const url = (opt.imageUrl || opt.mediaUrl || opt.image_url || opt.videoUrl || opt.audioUrl || opt.text || "").trim();
    if (!url.startsWith('http')) return { type: 'text', url: null };

    const lowerUrl = url.toLowerCase();
    const cleanUrl = lowerUrl.split('?')[0].split('#')[0];

    if (cleanUrl.match(/\.(mp4|webm|mov)$/) || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return { type: 'video', url };
    }
    if (cleanUrl.match(/\.(mp3|wav|ogg|aac|m4a)$/)) {
      return { type: 'audio', url };
    }
    if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || lowerUrl.includes('unsplash.com')) {
      return { type: 'image', url };
    }
    return { type: 'text', url: null };
  };

  const hasAnyMedia = (currentQ.options || []).some(opt => getMediaType(opt).type !== 'text');

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 w-full`}>
      {(currentQ.options || []).map((opt, idx) => {
        // 🚨 THE CRASH FIX:
        const isSelected = (currentState?.selectedOptions || []).includes(opt.id);
        
        const media = getMediaType(opt);
        const isTextOnly = media.type === 'text';
        
        const isOptCorrect = 
          currentQ.correctOptions?.some(id => String(id) === String(opt.id)) || 
          opt.isCorrect === true || 
          opt.isCorrect === 'true';
        
        // Base Styling (Now with Hover Effects)
        let btnClass = isDarkMode 
          ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-indigo-400/50 hover:bg-slate-800/80' 
          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md';

        let letterBg = isDarkMode 
          ? 'bg-slate-700/50 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400' 
          : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600';

        // Feedback Styling
        if (shouldShowResults) {
          if (isSelected && isOptCorrect) {
            btnClass = isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100' : 'bg-emerald-50 border-emerald-500 text-emerald-900';
            letterBg = 'bg-emerald-500 text-white';
          } 
          else if (isSelected && !isOptCorrect) {
            btnClass = isDarkMode ? 'bg-rose-500/10 border-rose-500 text-rose-100' : 'bg-rose-50 border-rose-500 text-rose-900';
            letterBg = 'bg-rose-500 text-white';
          } 
          else if (!isSelected && isOptCorrect && hasAnswered) {
            btnClass = 'border-amber-500 text-amber-500';
            letterBg = 'bg-amber-500 text-white';
          }
        } else if (isSelected) {
          btnClass = isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100' : 'bg-indigo-50 border-indigo-500 text-indigo-900';
          letterBg = 'bg-indigo-600 text-white';
        }

        const displayStat = totalVotes > 0 ? Math.round(((opt.count || 0) / totalVotes) * 100) : 0;
        const displayText = (media.type !== 'text' && opt.text === media.url) ? null : opt.text;

        return (
          <button
            key={opt.id}
            disabled={shouldShowResults} 
            
            // 🚨 TELEMETRY: Hooking up the hover timers
            onMouseEnter={() => {
              if (telemetry?.handleMouseEnter) telemetry.handleMouseEnter(opt.id);
            }}
            onMouseLeave={() => {
              if (telemetry?.handleMouseLeave) telemetry.handleMouseLeave(opt.id);
            }}

            onClick={() => {
              // Ensure we log the hover time if they click before moving the mouse away
              if (telemetry?.handleMouseLeave) telemetry.handleMouseLeave(opt.id);
              
              toggleOption(opt.id, isMulti);
              if (telemetry?.recordOptionClick) telemetry.recordOptionClick(opt.id, opt.text || "Option");
            }}
            
            className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 text-left flex flex-col p-5 ${isTextOnly ? 'min-h-[80px]' : 'min-h-[160px]'} ${btnClass} ${isAttempt1Failed && isSelected && !isOptCorrect ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="flex items-center gap-4 w-full relative z-10">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${letterBg}`}>
                {['A', 'B', 'C', 'D', 'E', 'F'][idx]}
              </span>
              {displayText && <span className={`font-bold flex-1 leading-snug ${textSizeClass}`}>{displayText}</span>}
            </div>

            {/* Media Rendering Block */}
            {media.type !== 'text' && (
              <div 
                className="w-full mt-4 relative z-20 pointer-events-auto" 
                onClick={(e) => e.stopPropagation()} 
              >
                {media.type === 'image' ? (
                  <img src={media.url} alt="Visual Option" className="max-h-40 w-auto mx-auto object-contain rounded-xl border dark:border-slate-700 shadow-sm" loading="lazy" />
                ) : (
                  <MediaPlayer mediaUrl={media.url} mediaType={media.type} isDarkMode={isDarkMode} />
                )}
              </div>
            )}

            {/* Peer Stats View */}
            {showStats && (
              <div className="mt-auto pt-4 w-full flex items-center gap-3 opacity-60">
                <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${displayStat}%` }} className="h-full bg-current" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">{displayStat}%</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}