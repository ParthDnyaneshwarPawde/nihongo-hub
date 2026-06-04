import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, ScrollText, Cpu } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// Import your sub-tabs (We will build these later)
import ProctoringEngineTab from './tabs/ProctoringEngineTab';
import AnomalyRadarTab from './tabs/AnomalyRadarTab';
import AuditLogsTab from './tabs/AuditLogsTab';

export default function ControlUnit() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('proctoring');

  const tabs = [
    { id: 'proctoring', label: 'Proctoring Engine', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-500' },
    { id: 'radar', label: 'Anomaly Radar', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'logs', label: 'Audit Logs', icon: ScrollText, color: 'text-emerald-500', bg: 'bg-emerald-500' }
  ];

  return (
    <div className={`flex flex-col h-full w-full ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}>
      
      {/* Header & Tab Navigation */}
      <div className={`shrink-0 border-b p-6 md:px-12 md:pt-10 md:pb-0 ${isDarkMode ? 'border-slate-800 bg-[#0B1120]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
            <Cpu className={isDarkMode ? 'text-white' : 'text-slate-900'} size={24} />
          </div>
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Control Unit</h1>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Platform Architecture & Security</p>
          </div>
        </div>

        {/* Dynamic Tab Row */}
        <div className="flex space-x-8 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-5 flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-colors ${
                  isActive 
                    ? (isDarkMode ? 'text-white' : 'text-slate-900') 
                    : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                <tab.icon size={16} className={isActive ? tab.color : ''} />
                {tab.label}
                
                {/* Active Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className={`absolute bottom-0 left-0 right-0 h-1 rounded-t-full ${tab.bg}`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full overflow-y-auto custom-scrollbar p-6 md:p-12"
          >
            {activeTab === 'proctoring' && <ProctoringEngineTab />}
            {activeTab === 'radar' && <AnomalyRadarTab />}
            {activeTab === 'logs' && <AuditLogsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}