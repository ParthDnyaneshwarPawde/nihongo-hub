import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, Volume2, Lock, Radio, RotateCcw } from 'lucide-react';

export default function MediaPlayer({ id, mediaUrl, mediaType, isDarkMode }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 🚨 PERSISTENCE KEY: Unique to this question ID
  const storageKey = `audio_locked_${id}`;
  
  // Initialize state from localStorage so refreshing doesn't bypass the lock
  const [hasPlayed, setHasPlayed] = useState(() => {
    if (!id) return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  // THE PARSER: Extracts URL from NHPlayOnce wrapper
  const input = mediaUrl ? mediaUrl.trim() : '';
  const playOnceMatch = input.match(/NHPlayOnce\s*\(\s*(.*)\s*\)/i);
  const isLimited = !!playOnceMatch;
  const safeUrl = isLimited ? playOnceMatch[1].trim() : input;

  // YOUTUBE DETECTION
  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = getYouTubeId(safeUrl);
  const finalMediaType = ytId ? 'video' : mediaType;

  // SYNC: When moving to a new question or refreshing
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    
    // Check localStorage again whenever the ID changes
    if (id) {
      const locked = localStorage.getItem(storageKey) === 'true';
      setHasPlayed(locked);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (videoRef.current && !ytId) {
      videoRef.current.load();
    }
  }, [id, safeUrl, ytId, storageKey]);

  const togglePlay = () => {
    // 🚨 NO-PAUSE + REFRESH PROTECT: Block if playing or already locked
    if (isLimited && (isPlaying || hasPlayed)) return;

    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);

      // 🚨 LOCK IMMEDIATELY: Write to disk as soon as it starts
      if (isLimited && id) {
        setHasPlayed(true);
        localStorage.setItem(storageKey, 'true');
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (isLimited) {
      setProgress(100);
      setHasPlayed(true); 
    } else {
      setProgress(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  if (!safeUrl || finalMediaType === 'none' || finalMediaType === 'image') return null;

  // --- YOUTUBE / NATIVE VIDEO ---
  if (ytId || finalMediaType === 'video') {
    return (
      <div className={`mt-6 w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border shadow-lg flex justify-center ${isDarkMode ? 'border-slate-800 bg-[#050505]' : 'border-slate-300 bg-black'}`}>
        {ytId ? (
          <iframe 
            className="w-full h-auto min-h-[250px] sm:min-h-[350px] aspect-video object-contain" 
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} 
            title="YouTube video player" 
            frameBorder="0" 
            allowFullScreen
          ></iframe>
        ) : (
          <video 
            ref={videoRef} 
            controls 
            playsInline 
            preload="auto" 
            className="w-full h-auto max-h-[350px] aspect-video object-contain"
          >
            <source src={safeUrl} type={safeUrl.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4'} />
          </video>
        )}
      </div>
    );
  }

  // --- AUDIO PLAYER (WITH PERSISTENT LOCKING) ---
  if (finalMediaType === 'audio') {
    const isLocked = isLimited && hasPlayed && !isPlaying;
    const isUnstoppable = isLimited && isPlaying;

    return (
      <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-5 w-full max-w-2xl mx-auto transition-all ${isLocked ? 'opacity-60 grayscale' : ''} ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <audio 
          ref={audioRef} 
          src={safeUrl} 
          onTimeUpdate={handleTimeUpdate} 
          onEnded={handleEnded} 
          className="hidden" 
        />
        
        <button 
          onClick={togglePlay} 
          disabled={isLocked || isUnstoppable}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0 ${isLocked ? 'bg-slate-500 cursor-not-allowed' : isUnstoppable ? 'bg-amber-500 animate-pulse cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'} text-white`}
        >
          {isLocked ? (
            <Lock size={20} />
          ) : isUnstoppable ? (
            <Radio size={22} />
          ) : (
            <PlayCircle size={24} className="ml-1" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
               {isUnstoppable ? "Live Playing" : isLocked ? "Playback Locked" : isLimited ? "Exam Prompt" : "Study Audio"}
             </span>
             {isLimited && (
               <span className={`text-[10px] font-bold italic ${isLocked ? 'text-rose-500' : 'text-amber-500'}`}>
                 {isLocked ? "Finished" : isUnstoppable ? "No pausing" : "Plays once"}
               </span>
             )}
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ease-linear ${isUnstoppable ? 'bg-amber-500' : isLocked ? 'bg-slate-400' : 'bg-indigo-500'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {!isLocked && !isPlaying && progress > 0 && !isLimited && (
          <button 
            onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0; setProgress(0); }} 
            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        )}
        <Volume2 size={20} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
      </div>
    );
  }

  return null;
}