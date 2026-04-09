import React from 'react';

const CATEGORIES = ['ALL', 'CHEAT_SHEETS', 'AUDIO_PACKS', 'FLASHCARDS', 'MOCK_TESTS'];

export default function CategoryFilter({ isDarkMode, activeFilter, setActiveFilter }) {
  return (
    <div className={`p-2 rounded-[2.5rem] border backdrop-blur-xl shadow-2xl flex items-center gap-2 overflow-x-auto hide-scrollbar w-full xl:w-auto ${isDarkMode ? 'bg-[#0B1120]/80 border-white/5' : 'bg-white/90 border-slate-200'}`}>
      {CATEGORIES.map((id) => (
        <button
          key={id}
          onClick={() => setActiveFilter(id)}
          className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
            ${activeFilter === id 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105' 
              : isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          {id.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}
