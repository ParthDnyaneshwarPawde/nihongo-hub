import React from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function SearchBar({ searchQuery, setSearchQuery }) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`relative flex-1 w-full xl:w-80 group`}>
      <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
      <input 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
        placeholder="Search this Vault..." 
        className={`w-full pl-16 pr-8 py-5 rounded-[2.5rem] border font-black text-[11px] uppercase tracking-widest outline-none transition-all shadow-xl ${isDarkMode ? 'bg-[#0B1120] border-white/5 text-white focus:border-indigo-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-400'}`} 
      />
    </div>
  );
}
