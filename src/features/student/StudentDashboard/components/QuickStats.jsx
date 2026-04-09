import React from 'react';
import { Zap } from 'lucide-react';

export default function QuickStats({ level, isDarkMode }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
      <div className="lg:col-span-2 space-y-4">
        <h1 className={`text-4xl lg:text-6xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mastering {level}.</h1>
        <p className={`text-lg lg:text-xl font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          You've solved 42 questions today. You're 12% ahead of your weekly target. Keep the momentum, Samurai.
        </p>
      </div>
      <div className="p-8 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Zap size={24} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full">Daily Goal</span>
          </div>
          <h3 className="text-3xl font-black mb-2 tracking-tight">65% Complete</h3>
          <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Complete 3 more grammar units to hit your streak.</p>
          <button className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">Continue Lesson</button>
        </div>
        <div className="absolute right-[-10%] bottom-[-10%] text-9xl font-black text-white/10 select-none">進捗</div>
      </div>
    </section>
  );
}
