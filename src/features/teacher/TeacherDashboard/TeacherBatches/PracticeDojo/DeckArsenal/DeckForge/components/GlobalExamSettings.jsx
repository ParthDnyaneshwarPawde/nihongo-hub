import React from 'react';
import { AlignLeft, Percent, EyeOff, Eye, Star, Layers } from 'lucide-react';

export default function GlobalLevelSettings({ 
  levelTitle, setLevelTitle, 
  levelDescription, setLevelDescription, 
  passPercentage, setPassPercentage, 
  xpReward, setXpReward, 
  requireSrs, setRequireSrs, 
  isLocked, setIsLocked, 
  isDarkMode 
}) {
  return (
    <section className={`p-8 rounded-[32px] border shadow-sm space-y-8 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
      <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Global Level Parameters</h2>
      
      <div className="space-y-6">
        <div>
          <label className={`text-xs font-bold block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Level Title (Shown on Student Popup)</label>
          <input 
            type="text" 
            placeholder="e.g., N5 Food Vocabulary" 
            value={levelTitle} 
            onChange={(e) => setLevelTitle(e.target.value)} 
            className={`w-full p-4 rounded-2xl border text-2xl font-black outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-400'}`} 
          />
        </div>
        <div>
          <label className={`text-xs font-bold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <AlignLeft size={14}/> Level Description
          </label>
          <textarea 
            rows="2" 
            placeholder="What will they learn here?" 
            value={levelDescription} 
            onChange={(e) => setLevelDescription(e.target.value)} 
            className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-400'}`} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
        
        {/* Drill Pass Target */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl"><Percent size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Drill Pass Target</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Min % to Clear Level</p>
            </div>
          </div>
          <input 
            type="number" min="0" max="100" 
            value={passPercentage} 
            onChange={(e) => setPassPercentage(e.target.value)} 
            className={`w-20 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-emerald-400' : 'bg-white border text-emerald-600'}`} 
          />
        </div>

        {/* XP Reward */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl"><Star size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Completion XP</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Awarded upon clearing</p>
            </div>
          </div>
          <input 
            type="number" min="0" 
            value={xpReward} 
            onChange={(e) => setXpReward(e.target.value)} 
            className={`w-20 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-amber-400' : 'bg-white border text-amber-600'}`} 
          />
        </div>

        {/* Lock Drill Behind SRS */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${requireSrs ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'}`}><Layers size={18}/></div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Learning Loop</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{requireSrs ? 'Must do SRS first' : 'Free Choice'}</p>
            </div>
          </div>
          <button onClick={() => setRequireSrs(!requireSrs)} className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${requireSrs ? 'bg-indigo-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${requireSrs ? 'translate-x-7' : 'left-1'}`}></div>
          </button>
        </div>

        {/* Visibility */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLocked ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{isLocked ? <EyeOff size={18}/> : <Eye size={18}/>}</div>
            <div>
              <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Level Status</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isLocked ? 'Locked / Hidden' : 'Live on Map'}</p>
            </div>
          </div>
          <button onClick={() => setIsLocked(!isLocked)} className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${isLocked ? 'bg-slate-600' : 'bg-emerald-500'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isLocked ? 'left-1' : 'translate-x-7'}`}></div>
          </button>
        </div>

      </div>
    </section>
  );
}