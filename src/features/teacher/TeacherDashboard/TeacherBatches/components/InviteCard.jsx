import React from 'react';
import { Check, X, ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function InviteCard({ invite, onAccept, onReject, isDark }) {
  return (
    <div className="group relative p-[1.5px] rounded-[2.8rem] transition-all duration-500 hover:scale-[1.02]">
      {/* Animated Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-500 to-rose-500 rounded-[2.8rem] opacity-40 group-hover:opacity-100 transition-opacity" />
      
      <div className={`relative h-full w-full rounded-[2.75rem] p-8 flex flex-col justify-between backdrop-blur-3xl ${isDark ? 'bg-[#0B1120]/95' : 'bg-white/95'}`}>
        
        {/* Header Logic */}
        <div className="flex justify-between items-center mb-8">
          <div className={`px-4 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
            NEW INVITATION
          </div>
          <ShieldCheck size={18} className="text-indigo-500 opacity-50" />
        </div>

        {/* Content */}
        <div className="space-y-3 mb-10">
          <div className="flex items-start justify-between">
            <h4 className={`text-xl font-black leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {invite.batchTitle}
            </h4>
            <ArrowUpRight size={16} className="text-slate-600 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-[8px] text-white font-bold">
              {invite.senderName?.charAt(0) || 'S'}
            </div>
            <p className="text-xs font-medium text-slate-500">
              Sensei <span className={`${isDark ? 'text-indigo-400' : 'text-indigo-600'} font-bold`}>{invite.senderName}</span> wants to collaborate
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={onAccept}
            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
          >
            <Check size={14} strokeWidth={4} /> Accept Access
          </button>
          <button 
            onClick={onReject}
            className={`px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border active:scale-95 ${isDark ? 'bg-slate-900 border-slate-800 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-slate-50 border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'}`}
          >
            <X size={14} strokeWidth={4} />
          </button>
        </div>
      </div>
    </div>
  );
}