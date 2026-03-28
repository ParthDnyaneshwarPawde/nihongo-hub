import React from 'react';

export default function MetricCard({ label, val, icon, color, colorClass, isDark }) {
  const colors = { indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20', emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  
  const finalColorClass = colorClass || colors[color] || colors.indigo;

  return (
    <div className={`p-10 rounded-[3rem] border flex items-center justify-between transition-all hover:-translate-y-2 hover:shadow-2xl ${isDark ? 'bg-[#0B1120] border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">{label}</p>
        <p className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{val}</p>
      </div>
      <div className={`p-6 rounded-[1.5rem] border shadow-2xl ${finalColorClass}`}>{icon}</div>
    </div>
  );
}
