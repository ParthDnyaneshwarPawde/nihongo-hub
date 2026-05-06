import React from 'react';
import { Type, Headphones, Clock } from 'lucide-react';

export default function PromptEditor({ q, updateQuestionField, isDarkMode }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Type size={18} className="absolute left-4 top-4 text-slate-400" />
        <input type="text" value={q.prompt} onChange={(e) => updateQuestionField(q.id, 'prompt', e.target.value)} placeholder="Enter your question prompt here..." className={`w-full p-4 pl-12 rounded-2xl border text-lg font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'}`} />
      </div>
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Headphones size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={q.mediaUrl} onChange={(e) => updateQuestionField(q.id, 'mediaUrl', e.target.value)} placeholder="Audio/Image URL (gs://... or https://...)" className={`w-full p-3 pl-10 rounded-xl border text-sm font-medium outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} />
        </div>
        <div className={`flex items-center gap-2 px-3 rounded-xl border ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <Clock size={16} className="text-indigo-500" />
          <input type="number" value={q.timeLimit} onChange={(e) => updateQuestionField(q.id, 'timeLimit', e.target.value)} className={`w-12 bg-transparent outline-none font-bold text-sm text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
          <span className="text-[10px] font-black uppercase text-slate-500">Sec</span>
        </div>
      </div>
    </div>
  );
}