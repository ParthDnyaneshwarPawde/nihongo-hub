import React from 'react';
import { Check } from 'lucide-react';

export default function StepBubble({ step, active, done, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black border transition-all duration-500 ${done ? 'bg-emerald-500 border-emerald-500 text-white scale-90' : active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'border-slate-800 text-slate-600'}`}>
        {done ? <Check size={18}/> : step}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}
