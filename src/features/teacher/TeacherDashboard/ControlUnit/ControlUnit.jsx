import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScrollText, Cpu, Radar, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

import ProctoringEngineTab from './tabs/ProctoringEngineTab';
import AnomalyRadarTab from './tabs/AnomalyRadarTab';
import AuditLogsTab from './tabs/AuditLogsTab';

export default function ControlUnit() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('proctoring');
  const [isDockOpen, setIsDockOpen] = useState(true);

  const tabs = [
    { id: 'proctoring', label: 'Proctoring', icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500' },
    { id: 'radar', label: 'Radar', icon: Radar, color: 'text-rose-400', bg: 'bg-rose-500' },
    { id: 'logs', label: 'Logs', icon: ScrollText, color: 'text-emerald-400', bg: 'bg-emerald-500' }
  ];

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}>
      
      {/* Main Content Area (Now takes full vertical space with no header) */}
      <div className="flex-1 overflow-hidden relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`h-full w-full overflow-y-auto custom-scrollbar p-6 md:p-12 transition-all duration-500 ${isDockOpen ? 'lg:pr-28' : 'lg:pr-12'}`}
          >
            {activeTab === 'proctoring' && <ProctoringEngineTab />}
            {activeTab === 'radar' && <AnomalyRadarTab />}
            {activeTab === 'logs' && <AuditLogsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Modular Dock (No Container, Just Floating Glass Modules) */}
      <motion.div 
        initial={false}
        animate={{ x: isDockOpen ? 0 : 100, opacity: isDockOpen ? 1 : 0, scale: isDockOpen ? 1 : 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 z-50 pointer-events-none`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="relative group flex justify-center w-full pointer-events-auto">
              <button
                onClick={() => setActiveTab(tab.id)}
                tabIndex={isDockOpen ? 0 : -1}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
                  isActive 
                    ? `shadow-[0_15px_35px_rgba(0,0,0,0.3)] scale-110 ${isDarkMode ? 'bg-[#0F172A] border border-white/10' : 'bg-white border border-slate-200'}` 
                    : `${isDarkMode ? 'hover:bg-[#1E293B]/80 bg-[#0B1120]/60 backdrop-blur-xl border border-white/5' : 'hover:bg-white/90 bg-white/50 backdrop-blur-xl border border-slate-200/50'} shadow-lg hover:scale-105`
                }`}
              >
                {/* Dynamic Background Tint for active state */}
                {isActive && (
                  <motion.div 
                    layoutId="activeDockModule"
                    className={`absolute inset-0 opacity-10 ${tab.bg}`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <tab.icon 
                  size={isActive ? 24 : 20} 
                  className={`transition-colors z-10 ${isActive ? tab.color : (isDarkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900')}`} 
                />

                {/* Cyber-Accent Line (Left Edge of Active Button) */}
                {isActive && (
                  <motion.div
                    layoutId="cyberAccent"
                    className={`absolute left-0 top-0 bottom-0 w-1 ${tab.bg}`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
              
              {/* Ultra-Modern Floating Tooltip */}
              {isDockOpen && (
                <div className={`absolute right-full mr-6 top-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 whitespace-nowrap shadow-2xl border backdrop-blur-2xl ${isDarkMode ? 'bg-[#0B1120]/90 text-white border-slate-700/50' : 'bg-white/95 text-slate-900 border-slate-200'}`}>
                  {tab.label}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Floating Toggle Hub Button (Bottom Right) */}
      <button 
        onClick={() => setIsDockOpen(!isDockOpen)}
        className={`absolute right-6 bottom-6 w-14 h-14 rounded-full flex items-center justify-center z-50 shadow-[0_15px_30px_rgba(0,0,0,0.2)] backdrop-blur-2xl border transition-all duration-300 hover:scale-110 ${
          isDarkMode 
            ? 'bg-[#0B1121]/90 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500' 
            : 'bg-white/90 border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'
        }`}
      >
        <motion.div
           animate={{ rotate: isDockOpen ? 180 : 0 }}
           transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
           className="flex items-center justify-center"
        >
          {isDockOpen ? <ChevronRight size={22} className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} /> : <Cpu size={22} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />}
        </motion.div>
        
        {/* Subtle Pulse ring when closed */}
        {!isDockOpen && (
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className={`absolute inset-0 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-500'}`}
          />
        )}
      </button>

    </div>
  );
}