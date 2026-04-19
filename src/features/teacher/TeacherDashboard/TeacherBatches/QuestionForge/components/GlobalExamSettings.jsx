import React from 'react';
import { AlignLeft, Percent, ShieldAlert, EyeOff, Eye, Sparkles } from 'lucide-react';

export default function GlobalExamSettings({ 
  quizTitle, setQuizTitle, 
  quizDescription, setQuizDescription, 
  passPercentage, setPassPercentage, 
  attemptPoints, setAttemptPoints, 
  allowPause, setAllowPause, 
  isLocked, setIsLocked, 
  isDarkMode 
}) {
  return (
    <section className={`p-8 rounded-[32px] border shadow-sm space-y-8 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
      <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Global Exam Parameters</h2>
      
      <div className="space-y-6">
        <div>
          <label className={`text-xs font-bold block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assessment Title</label>
          <input type="text" placeholder="e.g., Chapter 1 Master Quiz" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className={`w-full p-4 rounded-2xl border text-2xl font-black outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-400'}`} />
        </div>
        <div>
          <label className={`text-xs font-bold block mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><AlignLeft size={14}/> Instructions</label>
          <textarea rows="2" placeholder="Brief instructions..." value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'}`} />
        </div>
      </div>

      {/* 🚨 THE 2x2 GRID FIX: grid-cols-1 (mobile) and md:grid-cols-2 (desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
        
        {/* Row 1, Col 1: Passing Score */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl"><Percent size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Passing Score</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Min % Required</p>
            </div>
          </div>
          <input type="number" min="0" max="100" value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} className={`w-20 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-emerald-400' : 'bg-white border text-emerald-600'}`} />
        </div>

        {/* Row 1, Col 2: Attempt Reward */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl"><Sparkles size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Attempt Reward</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Free points for starting</p>
            </div>
          </div>
          <input type="number" min="0" value={attemptPoints} onChange={(e) => setAttemptPoints(e.target.value)} className={`w-20 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-indigo-400' : 'bg-white border text-indigo-600'}`} />
        </div>

        {/* Row 2, Col 1: Timer Controls */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${allowPause ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'}`}><ShieldAlert size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Timer Controls</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{allowPause ? 'Students can pause' : 'Strict/Unstoppable'}</p>
            </div>
          </div>
          <button onClick={() => setAllowPause(!allowPause)} className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${allowPause ? 'bg-amber-500' : 'bg-rose-500'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${allowPause ? 'translate-x-7' : 'left-1'}`}></div></button>
        </div>

        {/* Row 2, Col 2: Visibility */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLocked ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{isLocked ? <EyeOff size={18}/> : <Eye size={18}/>}</div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Visibility</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isLocked ? 'Hidden from Students' : 'Live on Dashboard'}</p>
            </div>
          </div>
          <button onClick={() => setIsLocked(!isLocked)} className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${isLocked ? 'bg-slate-600' : 'bg-emerald-500'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isLocked ? 'left-1' : 'translate-x-7'}`}></div></button>
        </div>

      </div>
    </section>
  );
}