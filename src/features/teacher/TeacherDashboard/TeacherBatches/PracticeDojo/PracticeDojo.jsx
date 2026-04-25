import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Zap, FileText, Headphones, Map, 
  Database, Lock, Unlock, ArrowRight, Sparkles, Layers
} from 'lucide-react';
import { db } from '@services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function PracticeDojo({ batchId }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(null);
  
  // 🚨 NEW UNIFIED STATE FOR FIRESTORE LOCKS
  const [categoryLocks, setCategoryLocks] = useState({});

  const categories = [
    { 
      id: 'vocab', title: 'Vocabulary Engine', subtitle: '3,200 Words • Spaced Repetition', 
      icon: <BookOpen size={28} />, color: 'from-violet-500 to-indigo-600', 
      glow: 'shadow-indigo-500/30', borderGlow: 'hover:border-indigo-500/50', text: 'text-indigo-400', tag: 'TANGO' 
    },
    { 
      id: 'grammar', title: 'Grammar Drills', subtitle: '140 Patterns • Syntax Mapping', 
      icon: <Zap size={28} />, color: 'from-blue-500 to-cyan-500', 
      glow: 'shadow-blue-500/30', borderGlow: 'hover:border-blue-500/50', text: 'text-blue-400', tag: 'BUNPOU' 
    },
    { 
      id: 'reading', title: 'Reading Comprehension', subtitle: 'Weekly Stories • Speed Tracking', 
      icon: <FileText size={28} />, color: 'from-rose-500 to-pink-600', 
      glow: 'shadow-rose-500/30', borderGlow: 'hover:border-rose-500/50', text: 'text-rose-400', tag: 'DOKKAI' 
    },
    { 
      id: 'listening', title: 'Audio Immersion', subtitle: 'Native Drills • Pitch Accent', 
      icon: <Headphones size={28} />, color: 'from-emerald-400 to-teal-600', 
      glow: 'shadow-emerald-500/30', borderGlow: 'hover:border-emerald-500/50', text: 'text-emerald-400', tag: 'CHOUKAI' 
    },
  ];

  // 🚨 FETCH LOCK STATUS ON LOAD
  useEffect(() => {
    const fetchLocks = async () => {
      if (!batchId) return;
      const locks = {};
      
      await Promise.all(categories.map(async (cat) => {
        const catRef = doc(db, `batches/${batchId}/self_practice/${cat.id}`);
        const snap = await getDoc(catRef);
        
        if (snap.exists()) {
          const data = snap.data();
          locks[cat.id] = {
            isLocked: data.isLocked || false,
            isQuestionBankLocked: data.isQuestionBankLocked !== false // Default to true if undefined
          };
        } else {
          locks[cat.id] = { isLocked: false, isQuestionBankLocked: true };
        }
      }));
      
      setCategoryLocks(locks);
    };
    
    fetchLocks();
  }, [batchId]);

  // 🚨 TOGGLE QUESTION BANK LOCK (Updates DB + UI)
  const toggleQuestionBank = async (catId, e) => {
    e.stopPropagation();
    const currentState = categoryLocks[catId]?.isQuestionBankLocked ?? true;
    const newState = !currentState;

    // Optimistic UI Update
    setCategoryLocks(prev => ({ ...prev, [catId]: { ...prev[catId], isQuestionBankLocked: newState } }));

    // Firebase Update
    try {
      const catRef = doc(db, `batches/${batchId}/self_practice/${catId}`);
      await setDoc(catRef, { isQuestionBankLocked: newState }, { merge: true });
    } catch (error) {
      console.error("Failed to update Question Bank Lock:", error);
    }
  };

  // 🚨 TOGGLE SECTION LOCK (Updates DB + UI)
  const toggleSectionLock = async (catId, e) => {
    e.stopPropagation();
    const currentState = categoryLocks[catId]?.isLocked ?? false;
    const newState = !currentState;

    // Optimistic UI Update
    setCategoryLocks(prev => ({ ...prev, [catId]: { ...prev[catId], isLocked: newState } }));

    // Firebase Update
    try {
      const catRef = doc(db, `batches/${batchId}/self_practice/${catId}`);
      await setDoc(catRef, { isLocked: newState }, { merge: true });
    } catch (error) {
      console.error("Failed to update Section Lock:", error);
    }
  };

  return (
    <div className="w-full h-full animate-in fade-in duration-700 relative">
      
      {/* Subtle Background Grid for that "Pro/Dev" feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none ${isDarkMode ? 'opacity-20' : 'opacity-10'}`}></div>

      <div className="relative z-10 space-y-8">
        
        {/* Sleek Modern Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
                <Sparkles size={18} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Dojo Matrix V2</span>
            </div>
            <h2 className={`text-4xl font-black tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Practice Dojo
            </h2>
            <p className={`font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Architect gamified learning paths, manage official resources, and orchestrate spaced-repetition drills.
            </p>
          </div>
        </div>

        {/* Dynamic Masonry/Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const isSectionLocked = categoryLocks[cat.id]?.isLocked ?? false;
            const isQBLocked = categoryLocks[cat.id]?.isQuestionBankLocked ?? true;

            return (
              <motion.div 
                layout
                key={cat.id} 
                className={`relative group ${isActive ? 'xl:col-span-2' : ''}`}
              >
                {/* Glowing Backdrop on Hover */}
                <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-r ${cat.color} blur-xl opacity-0 transition-opacity duration-500 ${isActive ? 'opacity-10' : 'group-hover:opacity-10'}`}></div>

                {/* Main Card Container */}
                <motion.div 
                  layout
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className={`relative cursor-pointer overflow-hidden rounded-[2.5rem] border transition-all duration-500 h-full flex flex-col ${
                    isActive 
                      ? `${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-300'} shadow-2xl` 
                      : `${isDarkMode ? 'bg-[#151E2E]/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'} ${cat.borderGlow} hover:shadow-xl hover:-translate-y-1`
                  }`}
                >
                  
                  {/* Decorative Background Flare */}
                  <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${cat.color} opacity-10 blur-[40px] pointer-events-none`}></div>

                  {/* Card Header Section */}
                  <div className={`p-8 md:p-10 flex flex-col lg:flex-row lg:items-center gap-6 relative z-10 ${isActive ? 'pb-6' : ''}`}>
                    <div className={`w-16 h-16 shrink-0 rounded-[1.2rem] flex items-center justify-center text-white bg-gradient-to-br ${cat.color} shadow-xl ${cat.glow}`}>
                      {cat.icon}
                    </div>
                    
                    <div className="flex-1 w-full">
                      {/* 🚨 THE NEW STATUS PILL HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
                        
                        <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {cat.title}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          {!isActive && (
                             <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-200/50 border-slate-300 text-slate-500'}`}>
                               {cat.tag}
                             </div>
                          )}

                          <button 
                            onClick={(e) => toggleSectionLock(cat.id, e)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border backdrop-blur-sm shadow-sm hover:scale-105 active:scale-95 ${
                              isSectionLocked 
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                                : (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100')
                            }`}
                          >
                            {isSectionLocked ? <><Lock size={12} /> Hidden</> : <><Unlock size={12} /> Live</>}
                          </button>
                        </div>

                      </div>
                      <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{cat.subtitle}</p>
                    </div>

                    {/* Expand Indicator */}
                    {!isActive && (
                      <div className={`hidden lg:flex shrink-0 w-10 h-10 rounded-full items-center justify-center border transition-all group-hover:bg-indigo-500 group-hover:border-indigo-500 group-hover:text-white ${isDarkMode ? 'border-slate-700 text-slate-600' : 'border-slate-300 text-slate-400'}`}>
                        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  {/* 🚨 THE WIDESCREEN COMMAND CONSOLE (Reveals on Click) */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="px-8 md:px-10 pb-8 md:pb-10 pt-2"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-t border-slate-800/50 pt-8">
                          
                          {/* Console Button 1: Practice Map */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/batch/${batchId}/dojo/${cat.id}/map`); }}
                            className={`flex flex-col items-start p-6 rounded-3xl border-2 transition-all group ${
                              isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                          >
                            <div className={`p-3 rounded-2xl mb-4 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} transition-transform group-hover:scale-110 group-hover:-rotate-3`}>
                              <Map size={24} />
                            </div>
                            <h4 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Path Architect</h4>
                            <p className={`text-xs font-bold text-left ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Build gamified visual learning maps.</p>
                          </button>

                          {/* Console Button 2: Official Material */}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              navigate(`/batch/${batchId}/arsenal`); 
                            }}
                            className={`flex flex-col items-start p-6 rounded-3xl border border-dashed transition-all group ${
                              isDarkMode ? 'bg-[#0B1121]/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800' : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`p-3 rounded-2xl mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'} transition-transform group-hover:scale-110`}>
                              <Layers size={24} />
                            </div>
                            <h4 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Add Resources</h4>
                            <p className={`text-xs font-bold text-left ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Build Flashcards and drill decks.</p>
                          </button>

                          {/* Console Button 3: Question Bank Toggle */}
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className={`flex flex-col justify-between p-6 rounded-3xl border transition-all ${
                              isDarkMode ? 'bg-[#0B1121]/50 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div>
                              <div className={`p-3 w-fit rounded-2xl mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                <Database size={24} />
                              </div>
                              <h4 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Question Bank</h4>
                              <p className={`text-xs font-bold text-left mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Manage the master repository.</p>
                            </div>

                            {/* 🚨 THE QUESTION BANK LOCK BUTTON */}
                            <button 
                              onClick={(e) => toggleQuestionBank(cat.id, e)}
                              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all border ${
                                isQBLocked 
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isQBLocked ? <><Lock size={16} /> Locked</> : <><Unlock size={16} /> Unlocked</>}
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}