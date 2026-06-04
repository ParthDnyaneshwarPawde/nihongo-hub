import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { PenTool, FolderOpen, Activity } from 'lucide-react';
import ExamCreatorTab from './tabs/ExamCreatorTab/ExamCreatorTab';
import SeriesArchitectTab from './tabs/SeriesArchitectTab/SeriesArchitectTab.jsx';
import CommandCenterTab from './tabs/CommandCenterTab';

export default function TestSeriesManager() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('creator'); 

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 text-slate-200 bg-[#090E1A] min-h-screen">
      
      {/* 🚨 PREMIUM NAVIGATION TABS */}
      <div className="max-w-[1400px] w-full mx-auto mb-8 flex gap-8 border-b border-slate-800/80">
        <button onClick={() => setActiveTab('creator')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'creator' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <PenTool size={16} className={activeTab === 'creator' ? 'text-amber-500' : ''}/> Exam Creator
        </button>
        <button onClick={() => setActiveTab('architect')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'architect' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <FolderOpen size={16} className={activeTab === 'architect' ? 'text-indigo-500' : ''}/> Series Architect
        </button>
        <button onClick={() => setActiveTab('command_center')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'command_center' ? 'border-rose-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <Activity size={16} className={activeTab === 'command_center' ? 'text-rose-500' : ''} /> Command Center
        </button>
      </div>

      {/* 🚨 TAB ROUTING */}
      {activeTab === 'creator' && <ExamCreatorTab />}
      {activeTab === 'architect' && <SeriesArchitectTab />}
      {activeTab === 'command_center' && <CommandCenterTab />}

    </div>
  );
}