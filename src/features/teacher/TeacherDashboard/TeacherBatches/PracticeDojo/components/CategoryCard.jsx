import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, PlusCircle, Database, Lock, Unlock, ChevronRight } from 'lucide-react';

export default function CategoryCard({ 
  cat, 
  isActive, 
  onClick, 
  onNavigateMap, 
  isDarkMode, 
  isQbLocked, 
  onToggleQb 
}) {
  return (
    <div className="relative">
      {/* THE MAIN CARD */}
      <button 
        onClick={onClick}
        className={`w-full p-8 rounded-[2.5rem] border text-left transition-all duration-300 relative overflow-hidden group ${
          isActive 
            ? `${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-white border-slate-300'} shadow-xl scale-[1.01] z-10` 
            : `${isDarkMode ? 'bg-[#0B1121] border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'} hover:shadow-lg`
        }`}
      >
        <div className={`absolute top-6 right-8 text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          {cat.tag}
        </div>
        
        <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center text-white bg-gradient-to-br ${cat.color} shadow-lg ${cat.shadow}`}>
          {cat.icon}
        </div>
        
        <h3 className={`text-3xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cat.title}</h3>
        <p className={`font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{cat.subtitle}</p>

        <div className={`h-2 w-full mt-8 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div className={`h-full w-1/3 bg-gradient-to-r ${cat.color} rounded-full`}></div>
        </div>
      </button>

      {/* THE SUB-MENU OPTIONS */}
      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }} 
            animate={{ opacity: 1, y: 0, height: 'auto' }} 
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="relative z-0 mt-4"
          >
            <div className={`p-4 rounded-[2rem] border shadow-xl flex flex-col gap-2 ${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-white border-slate-200'}`}>
              
              {/* Option 1: Map Editor */}
              <button 
                onClick={onNavigateMap}
                className={`w-full p-4 rounded-2xl flex items-center justify-between group transition-all ${cat.bg} border border-transparent hover:border-${cat.color.split('-')[1]}-500/30`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl bg-white/10 ${cat.text}`}><Map size={24} /></div>
                  <div className="text-left">
                    <h4 className={`font-black text-lg ${cat.text}`}>Design Practice Map</h4>
                    <p className={`text-xs font-bold opacity-80 ${cat.text}`}>Gamified winding path editor</p>
                  </div>
                </div>
                <ChevronRight size={20} className={`${cat.text} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
              </button>

              {/* Option 2: Official Material */}
              <button className={`w-full p-4 rounded-2xl flex items-center justify-between group transition-all ${isDarkMode ? 'bg-[#0B1121] hover:bg-slate-800 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} border`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}><PlusCircle size={20} /></div>
                  <div className="text-left">
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Add Official Material</h4>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PDFs, Guides, and Overviews</p>
                  </div>
                </div>
              </button>

              {/* Option 3: Question Bank Toggle */}
              <div className={`w-full p-4 rounded-2xl flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-slate-50 border-slate-200'} border`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}><Database size={20} /></div>
                  <div className="text-left">
                    <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Question Bank</h4>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Master storage for {cat.id}</p>
                  </div>
                </div>
                
                <button 
                  onClick={onToggleQb}
                  className={`p-3 rounded-xl transition-all ${isQbLocked ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                >
                  {isQbLocked ? <Lock size={20} /> : <Unlock size={20} />}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}