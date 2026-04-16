import React, { useState, useEffect } from 'react';
import { Zap, PlayCircle, ChevronRight, Sparkles, Rocket, Trophy, Target, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuickStats({ level, isDarkMode }) {
  const navigate = useNavigate();
  
  // 1. Expanded Library (Added more "Good AF" variations)
  const greetings = [
    { title: "Your Odyssey Begins.", sub: "The path to JLPT mastery is open. Strike while the iron is hot, Samurai." },
    { title: "The Dojo Awaits.", sub: "Your blade is forged, your mind is set. Step into the arena of knowledge." },
    { title: "Mastery Starts Today.", sub: "Discipline is the bridge between your goals and your ultimate accomplishment." },
    { title: "Rise to the Challenge.", sub: "The language of the rising sun is within your reach. Claim your destiny." },
    { title: "Forge Your Future.", sub: "Every kanji mastered is a step closer to fluency. Keep the flame alive." },
    { title: "Sharpen Your Mind.", sub: "Consistency is the secret of the masters. Let's make today count." }
  ];

  const [greeting, setGreeting] = useState(greetings[0]);

  useEffect(() => {
    // 2. Logic: Pick a random index that isn't the one we saw last time
    const lastIndex = parseInt(localStorage.getItem('heroIndex') || '0');
    
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * greetings.length);
    } while (nextIndex === lastIndex && greetings.length > 1);

    setGreeting(greetings[nextIndex]);
    localStorage.setItem('heroIndex', nextIndex.toString());
  }, []);

  // ... (Keep your progress/theme logic)

  const themeConfig = isFirstTime ? {
    title: "Your Odyssey Begins.",
    sub: "The path to JLPT mastery is open. Strike while the iron is hot, Samurai.",
    badge: "New Enrollment",
    lessonTitle: "Phase 1: Orientation",
    cta: "Begin First Lesson",
    icon: <Rocket className="text-rose-200" size={24} />,
    gradient: "from-rose-500 via-pink-600 to-indigo-700",
    kanji: "始",
    shadow: "shadow-rose-500/20"
  } : {
    title: `Mastering ${level}.`,
    sub: "You're 12% ahead of your weekly target. Your focus is sharp today.",
    badge: "Daily Momentum",
    lessonTitle: "Mastering the 'Water' Radical",
    cta: "Resume Journey",
    icon: <Zap className="text-yellow-200" size={24} fill="currentColor" />,
    gradient: "from-indigo-600 via-violet-600 to-blue-700",
    kanji: "進捗",
    shadow: "shadow-indigo-500/30"
  };

  return (
    <section className="relative w-full">
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 md:gap-12 items-stretch">
        
        {/* LEFT COLUMN: TEXT CONTENT */}

<div className="lg:col-span-2 flex flex-col justify-center space-y-6 md:space-y-8">
  <motion.div
    key={greetingIndex} // Trigger animation on index change
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
  >
    <div className="flex items-center gap-3 mb-4">
       <div className={`h-px w-8 md:w-12 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
       <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">Student Overview</span>
    </div>
    
    {/* DYNAMIC TITLE */}
    <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.95] mb-4 md:mb-6 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-[#1A1F2B]'}`}>
      {currentGreeting.title}
    </h1>
    
    {/* DYNAMIC SUBTITLE */}
    <p className={`text-base md:text-lg lg:text-xl font-medium max-w-xl leading-relaxed opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
      {currentGreeting.sub}
    </p>
  </motion.div>

  {/* MINI STATS BLOCK */}
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4 }}
    className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-8 items-center pt-2"
  >
    <StatItem icon={<Flame size={18}/>} label="Streak" value="12 Days" color="text-orange-500" isDark={isDarkMode} />
    <div className={`hidden sm:block h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
    <StatItem icon={<Trophy size={18}/>} label="Rank" value="Samurai" color="text-indigo-500" isDark={isDarkMode} />
    <div className={`hidden sm:block h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
    <StatItem icon={<Target size={18}/>} label="Goal" value="80%" color="text-emerald-500" isDark={isDarkMode} />
  </motion.div>
</div>

        {/* RIGHT COLUMN: THE "GOOD AF" ACTION CARD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -5 }}
          className={`relative min-h-[320px] sm:min-h-[400px] lg:h-full rounded-[32px] md:rounded-[48px] p-6 sm:p-8 md:p-10 overflow-hidden cursor-pointer group flex flex-col justify-between transition-all duration-300 ${themeConfig.shadow}`}
          onClick={() => navigate('/lecture')}
        >
          {/* Animated Mesh Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${themeConfig.gradient} transition-colors duration-1000`}>
             <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [0, 30, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -right-20 w-64 h-64 md:w-80 md:h-80 bg-white/10 blur-[80px] md:blur-[100px] rounded-full"
             />
             <motion.div 
                animate={{ scale: [1, 1.3, 1], x: [0, -20, 0], y: [0, 30, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -left-20 w-48 h-48 md:w-64 md:h-64 bg-black/20 blur-[60px] md:blur-[80px] rounded-full"
             />
          </div>

          {/* Top Section */}
          <div className="relative z-10 flex justify-between items-start">
            <motion.div className="p-3 md:p-4 bg-white/15 backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-white/20 shadow-2xl">
              {themeConfig.icon}
            </motion.div>
            <div className="px-3 py-1.5 md:px-4 md:py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white">
                {themeConfig.badge}
              </span>
            </div>
          </div>

          {/* Middle Section */}
          <div className="relative z-10 my-6 lg:my-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={themeConfig.lessonTitle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-white/60 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-white/40"></span>
                  {isFirstTime ? "Ready to Deploy" : "Continue Journey"}
                </p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight mb-4 md:mb-6">
                  {themeConfig.lessonTitle}
                </h3>
              </motion.div>
            </AnimatePresence>

            {/* Progress Container */}
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[9px] md:text-[10px] font-bold text-white/80 uppercase">
                  {isFirstTime ? "Curriculum Synced" : `${progress}% Mastered`}
                </span>
                {isFirstTime && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[8px] font-black uppercase">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live
                  </div>
                )}
              </div>
              <div className="h-1.5 md:h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isFirstTime ? "15%" : `${progress}%` }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className={`h-full ${isFirstTime ? 'bg-rose-300' : 'bg-white'} rounded-full`}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="relative z-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 md:py-5 bg-white rounded-xl md:rounded-[24px] shadow-2xl flex items-center justify-center gap-2 md:gap-3 transition-all group/btn overflow-hidden relative"
            >
              <PlayCircle className={`shrink-0 ${isFirstTime ? 'text-rose-600' : 'text-indigo-600'}`} size={20} md={24} fill="currentColor" fillOpacity={0.1}/>
              <span className={`text-base md:text-lg font-black tracking-tight ${isFirstTime ? 'text-rose-600' : 'text-indigo-600'}`}>
                {themeConfig.cta}
              </span>
              <ChevronRight className={`shrink-0 transition-transform group-hover/btn:translate-x-1 ${isFirstTime ? 'text-rose-400' : 'text-indigo-400'}`} size={18} md={20} strokeWidth={3} />
            </motion.button>
          </div>

          {/* Kanji Watermark: Scales for mobile */}
          <div className="absolute -right-4 -bottom-10 md:-right-8 md:-bottom-16 text-[140px] sm:text-[180px] lg:text-[220px] font-black text-white/5 select-none pointer-events-none transition-transform duration-1000 group-hover:scale-110 group-hover:-rotate-6 italic">
            {themeConfig.kanji}
          </div>
        </motion.div>

      </div>
    </section>
  );
}

function StatItem({ icon, label, value, color, isDark }) {
  return (
    <div className="flex items-center gap-2 md:gap-3 group/stat">
      <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all group-hover/stat:scale-110 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white shadow-sm text-slate-500'} ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 opacity-60 truncate">{label}</p>
        <p className={`text-xs md:text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}