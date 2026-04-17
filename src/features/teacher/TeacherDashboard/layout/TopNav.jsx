import React from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import ZenToggle from '../components/ZenToggle';
import { useTheme } from '@/context/ThemeContext';

export default function TopNav({ toggleSidebar }) {
  const { isDarkMode, toggleTheme } = useTheme();
  return (
    <header className={`h-20 border-b backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-slate-500" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-xl border transition-all duration-300
          ${isDarkMode ? 'bg-slate-800/50 border-slate-800 focus-within:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-indigo-500/5'}
        `}>
          <Search size={16} className="text-slate-400" />
          <input type="text" placeholder="Search students..." className={`bg-transparent font-black text-sm outline-none w-full placeholder:text-slate-400 placeholder:font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ZenToggle />
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
        <button className={`p-2.5 rounded-xl border relative transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
        </button>
      </div>
    </header>
  );
}
