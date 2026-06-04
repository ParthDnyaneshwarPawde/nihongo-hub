import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function ControlUnit() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`p-8 h-full overflow-y-auto ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <h1 className="text-3xl font-black tracking-tight mb-4">Control Unit</h1>
      <p className="text-sm font-bold opacity-70">Global administration settings and engine controls.</p>
    </div>
  );
}
