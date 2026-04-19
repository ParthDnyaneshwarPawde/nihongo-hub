import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X, Lock, CheckCircle2, Zap, Sparkles, Target, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { calculateRank, RANKS_CONFIG } from '@/utils/rankLogic';

// 🚨 FIREBASE IMPORTS FOR REAL-TIME XP
import { auth, db } from '@services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function StudentRankWidget({ isCollapsed }) {
  const { isDarkMode } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realXp, setRealXp] = useState(0);

  // --- ZEN MODE (HIDE/SHOW PREFERENCE) ---
  const [isVisible, setIsVisible] = useState(() => {
    // Load preference from local storage (default to true)
    return localStorage.getItem('showRankWidget') !== 'false';
  });

  const toggleVisibility = (e) => {
    e.stopPropagation(); // Don't open the modal when clicking the eye
    const newValue = !isVisible;
    setIsVisible(newValue);
    localStorage.setItem('showRankWidget', newValue.toString());
  };

  // --- REAL-TIME XP SYNC ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Listen directly to the user's document for instant XP updates
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            // Force the exact 'xp' field from the database
            setRealXp(docSnap.data().xp || 0); 
          }
        });
        return () => unsubscribeDoc();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Calculate dynamic rank details based on LIVE XP
  const rank = calculateRank(realXp);
  const isHighTier = rank.rankIndex >= 6; 

  const groupedTiers = RANKS_CONFIG.reduce((acc, curr) => {
    if (!acc[curr.tier]) acc[curr.tier] = [];
    acc[curr.tier].push(curr);
    return acc;
  }, {});

  // ==========================================
  // HIDDEN STATE UI (ZEN MODE)
  // ==========================================
  if (!isVisible) {
    return (
      <div 
        onClick={toggleVisibility}
        className={`cursor-pointer p-3 rounded-2xl border flex items-center justify-center gap-3 transition-all duration-300 opacity-60 hover:opacity-100 ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }`}
        title="Show Rank Widget"
      >
        <Eye size={18} />
        {!isCollapsed && <span className="text-xs font-bold uppercase tracking-widest">Reveal Rank</span>}
      </div>
    );
  }

  return (
    <>
      {/* ========================================== */}
      {/* 1. THE SIDEBAR WIDGET (COMPACT & GAMIFIED) */}
      {/* ========================================== */}
      <motion.div 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer relative group"
      >
        {isCollapsed ? (
          // --- COLLAPSED VIEW ---
          <div 
            className={`hidden md:flex p-3 rounded-2xl flex-col items-center justify-center gap-1 border transition-all duration-500 relative`}
            style={{ 
              backgroundColor: isDarkMode ? `${rank.color}15` : `${rank.color}10`,
              borderColor: `${rank.color}40`,
              boxShadow: `0 4px 15px ${rank.color}20`
            }}
            title={`${rank.name} | ${rank.currentXP.toLocaleString()} XP`}
          >
            <Trophy size={18} style={{ color: rank.color }} className={isHighTier ? "animate-pulse drop-shadow-lg" : "drop-shadow-sm"} />
            <span className={`text-[9px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {rank.currentXP >= 1000 ? `${(rank.currentXP / 1000).toFixed(1)}K` : rank.currentXP}
            </span>
          </div>
        ) : (
          // --- EXPANDED VIEW (COMPACTED HEIGHT) ---
          <div 
            className={`p-4 rounded-[1.5rem] border transition-all duration-500 relative overflow-hidden`}
            style={{ 
              backgroundColor: isDarkMode ? '#0B1120' : '#ffffff',
              borderColor: isDarkMode ? `${rank.color}40` : `${rank.color}30`,
              boxShadow: isDarkMode ? `0 10px 30px -10px ${rank.color}25` : `0 10px 20px -10px ${rank.color}30`
            }}
          >
            {/* Hide Button (Appears on Hover - Transparent & Subtle) */}
            <button 
              onClick={toggleVisibility}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-lg opacity-0 group-hover:opacity-30 hover:!opacity-100 transition-all duration-300 bg-black/10 text-slate-500 dark:text-white/70 hover:bg-black/20 dark:hover:bg-black/40 hover:text-slate-900 dark:hover:text-white backdrop-blur-sm"
              title="Hide Widget"
            >
              <EyeOff size={14} />
            </button>

            {/* Ambient Gamified Glows */}
            <div className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: rank.color }}></div>
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-40 pointer-events-none transition-all group-hover:scale-125" style={{ backgroundColor: rank.color }}></div>
            
            {/* Watermark Kanji */}
            <div className="absolute -right-2 -bottom-4 text-[60px] font-black opacity-[0.05] dark:opacity-[0.08] pointer-events-none select-none rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110" style={{ color: rank.color }}>
              {rank.kanji}
            </div>

            {/* Top Row: Rank Info & XP */}
            <div className="flex justify-between items-end mb-3 relative z-10 pr-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                  <Trophy size={12} style={{ color: rank.color }} className={isHighTier ? "animate-pulse" : ""} />
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] bg-gradient-to-r ${rank.gradient} bg-clip-text text-transparent`}>
                    {rank.tier} • {rank.level}
                  </span>
                </div>
                <h4 className={`text-base font-black tracking-tight flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {rank.name}
                  {isHighTier && <Sparkles size={12} style={{ color: rank.color }} />}
                </h4>
              </div>
              
              <div className="flex flex-col items-end">
                <span className={`text-lg font-black leading-none tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {rank.currentXP >= 1000 ? `${(rank.currentXP / 1000).toFixed(1)}K` : rank.currentXP}
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Total XP</span>
              </div>
            </div>

            {/* Bottom Row: Ultra-thin Progress Bar */}
            <div className="relative z-10">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                <span>Next Level</span>
                <span style={{ color: rank.color }}>{Math.round(rank.percentage)}%</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} shadow-inner`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${rank.percentage}%` }}
                  className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${rank.gradient} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ filter: 'blur(1px)', transform: 'translateY(-30%)' }}></div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ========================================== */}
      {/* 2. THE ROADMAP MODAL                       */}
      {/* ========================================== */}
      {isModalOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6">
            {/* Dark Blur Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}
              style={{ boxShadow: `0 0 100px -20px ${rank.color}40` }}
            >
              
              {/* Modal Header & Hero Banner */}
              <div className="p-6 md:p-8 border-b shrink-0 flex justify-between items-start relative overflow-hidden" style={{ borderColor: isDarkMode ? '#1E293B' : '#F1F5F9' }}>
                <div className="absolute top-0 right-0 w-full h-96 rounded-full blur-[100px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/4" style={{ backgroundColor: rank.color }}></div>
                
                <div className="relative z-10">
                  <h2 className={`text-2xl md:text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    The Warrior's Path
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r ${rank.gradient} shadow-lg`}>
                      Current: {rank.name} {rank.level}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                      {rank.kanji} Mastery
                    </span>
                  </div>
                </div>
                
                <button onClick={() => setIsModalOpen(false)} className={`relative z-10 p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                  <X size={20} />
                </button>
              </div>

              {/* Stats Banner */}
              <div className="px-6 md:px-8 py-4 shrink-0 flex flex-wrap items-center justify-between gap-4" style={{ backgroundColor: isDarkMode ? `${rank.color}10` : `${rank.color}05` }}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${rank.gradient} text-white shadow-lg`}>
                    <Zap size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <p className={`text-xl md:text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rank.currentXP.toLocaleString()}</p>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Total XP Earned</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg md:text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{rank.xpRemaining.toLocaleString()}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    To {RANKS_CONFIG[Math.min(rank.rankIndex + 1, RANKS_CONFIG.length - 1)].name}
                  </p>
                </div>
              </div>

              {/* Scrollable Timeline */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative">
                {/* The Vertical Path Line */}
                <div className={`absolute left-[31px] md:left-[63px] top-10 bottom-10 w-1 rounded-full ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}></div>
                
                <div className="space-y-10 relative z-10">
                  {Object.entries(groupedTiers).map(([tierName, ranks]) => (
                    <div key={tierName} className="relative">
                      
                      {/* Tier Header */}
                      <div className="flex items-center gap-4 mb-6 ml-16 md:ml-24">
                        <h3 className={`text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] px-3 py-1.5 md:px-4 rounded-full border ${isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 shadow-sm'}`}>
                          {tierName} Tier
                        </h3>
                        <div className={`flex-1 h-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                      </div>
                      
                      {/* Ranks inside the Tier */}
                      <div className="space-y-4">
                        {ranks.map((r) => {
                          const isCompleted = rank.currentXP >= r.maxXP;
                          const isCurrent = rank.name === r.name;
                          const isLocked = rank.currentXP < r.minXP;

                          return (
                            <div 
                              key={r.name} 
                              className={`relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex items-center gap-4 md:gap-5 transition-all border`}
                              style={{
                                borderColor: isCurrent ? `${r.color}50` : isCompleted ? `${r.color}30` : `${r.color}15`,
                                backgroundColor: isCurrent ? (isDarkMode ? '#151E2E' : '#ffffff') : isCompleted ? `${r.color}08` : `${r.color}03`,
                                boxShadow: isCurrent ? `0 20px 40px -15px ${r.color}40` : 'none'
                              }}
                            >
                              {/* Status Icon Node */}
                              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.25rem] flex items-center justify-center shrink-0 z-10 border-4 transition-all duration-500 ${isCurrent ? 'animate-bounce-slow' : ''}`}
                                style={{ 
                                  backgroundColor: isCurrent ? `${r.color}20` : isCompleted ? `${r.color}15` : `${r.color}0A`,
                                  borderColor: isCurrent ? r.color : isCompleted ? `${r.color}50` : `${r.color}20`,
                                  color: isCurrent || isCompleted ? r.color : `${r.color}70`,
                                  boxShadow: isCurrent ? `0 0 20px ${r.color}40` : 'none'
                                }}
                              >
                                {isCompleted ? <CheckCircle2 size={20} strokeWidth={3} className="md:w-6 md:h-6" /> : isCurrent ? <Trophy size={20} className="md:w-6 md:h-6" fill="currentColor" fillOpacity={0.3}/> : <Lock size={18} className="md:w-5 md:h-5" />}
                              </div>

                              {/* Rank Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className={`text-base md:text-xl font-black truncate flex items-center gap-2 md:gap-3 ${isCurrent ? (isDarkMode ? 'text-white' : 'text-slate-900') : isCompleted ? (isDarkMode ? 'text-slate-200' : 'text-slate-800') : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                                    {r.name} 
                                    <span className={`text-xs md:text-base font-black ${isCurrent || isCompleted ? '' : 'opacity-40'}`} style={{ color: isCurrent || isCompleted ? r.color : undefined }}>{r.kanji}</span>
                                  </h4>
                                  
                                  {isCurrent && (
                                    <span className={`hidden sm:inline-flex px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white shadow-md shrink-0 bg-gradient-to-r ${r.gradient}`}>
                                      Current
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isCurrent ? '' : 'text-slate-500'}`} style={{ color: isCurrent ? r.color : undefined }}>
                                    <Target size={12} />
                                    {r.minXP.toLocaleString()} - {r.maxXP.toLocaleString()} XP
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}