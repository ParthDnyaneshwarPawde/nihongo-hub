import React from 'react';
import { AlignLeft, Percent, EyeOff, Eye, BookOpen, Clock, Shield } from 'lucide-react';

export default function GlobalExamSettings({ examSettings, setExamSettings, isDarkMode }) {
  const updateSetting = (field, value) => {
    setExamSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section className={`p-6 md:p-8 rounded-[32px] border shadow-xl relative overflow-hidden ${isDarkMode ? 'bg-[#151E2E]/80 backdrop-blur-xl border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Global Exam Parameters
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="md:col-span-2">
          <label className={`text-xs font-bold block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assessment Title</label>
          <input type="text" placeholder="e.g., JLPT N4 Master Mock Exam" value={examSettings.title} onChange={(e) => updateSetting('title', e.target.value)} className={`w-full p-4 rounded-2xl border text-xl md:text-2xl font-black outline-none transition-all focus:ring-4 focus:ring-rose-500/10 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-400'}`} />
        </div>

        <div>
          <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><BookOpen size={14}/> Target Level</label>
          <select value={examSettings.targetLevel} onChange={(e) => updateSetting('targetLevel', e.target.value)} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none cursor-pointer transition-all focus:ring-4 focus:ring-indigo-500/10 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`}>
             <option value="JLPT N5">JLPT N5</option><option value="JLPT N4">JLPT N4</option>
             <option value="JLPT N3">JLPT N3</option><option value="JLPT N2">JLPT N2</option><option value="JLPT N1">JLPT N1</option>
          </select>
        </div>

        <div>
          <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><Clock size={14}/> Total Global Duration</label>
          <div className="relative">
            <input type="number" value={examSettings.durationMinutes} onChange={(e) => updateSetting('durationMinutes', e.target.value)} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all focus:ring-4 focus:ring-amber-500/10 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-amber-400 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-amber-600 focus:border-amber-400'}`} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500">Mins</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><AlignLeft size={14}/> Instructions</label>
          <textarea rows="2" placeholder="Brief instructions..." value={examSettings.description} onChange={(e) => updateSetting('description', e.target.value)} className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all focus:ring-4 focus:ring-rose-500/10 ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 mt-2 border-t border-dashed border-slate-200 dark:border-slate-700/50 relative z-10">
        
        {/* Passing Score */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors hover:border-emerald-500/30 ${isDarkMode ? 'bg-[#0B1121]/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl"><Percent size={16}/></div>
            <div>
              <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Passing Marks</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">Total % Required</p>
            </div>
          </div>
          <input type="number" min="0" max="100" value={examSettings.passPercentage} onChange={(e) => updateSetting('passPercentage', e.target.value)} className={`w-16 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-emerald-400' : 'bg-white border text-emerald-600'}`} />
        </div>

        {/* Proctoring Mode */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors hover:border-rose-500/30 ${isDarkMode ? 'bg-[#0B1121]/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${examSettings.proctoringMode ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}><Shield size={16}/></div>
            <div>
              <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Strict Proctoring</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">WebRTC Monitored</p>
            </div>
          </div>
          <button onClick={() => updateSetting('proctoringMode', !examSettings.proctoringMode)} className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${examSettings.proctoringMode ? 'bg-rose-500' : 'bg-slate-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${examSettings.proctoringMode ? 'translate-x-6' : 'left-1'}`}></div></button>
        </div>

        {/* Visibility */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors hover:border-indigo-500/30 ${isDarkMode ? 'bg-[#0B1121]/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${examSettings.isLocked ? 'bg-slate-500/10 text-slate-500' : 'bg-indigo-500/10 text-indigo-500'}`}>{examSettings.isLocked ? <EyeOff size={16}/> : <Eye size={16}/>}</div>
            <div>
              <p className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Visibility</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{examSettings.isLocked ? 'Private (Draft)' : 'Live on Dashboard'}</p>
            </div>
          </div>
          <button onClick={() => updateSetting('isLocked', !examSettings.isLocked)} className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${examSettings.isLocked ? 'bg-slate-600' : 'bg-indigo-500'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${examSettings.isLocked ? 'left-1' : 'translate-x-6'}`}></div></button>
        </div>

      </div>
    </section>
  );
}