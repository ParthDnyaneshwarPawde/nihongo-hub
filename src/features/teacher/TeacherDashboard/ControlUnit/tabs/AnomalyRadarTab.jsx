import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function AnomalyRadarTab() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white border-slate-200'}`}>
      <h2 className="text-xl font-black mb-4">Anomaly Radar</h2>
      <p className="text-sm font-medium opacity-70">Detection metrics, flags, and behavioral anomalies will appear here.</p>
    </div>
  );
}
