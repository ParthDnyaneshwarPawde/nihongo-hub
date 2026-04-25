import React from 'react';
import { Lightbulb, Video, Tag, HelpCircle } from 'lucide-react';

export default function SolutionEditor({ q, updateQuestionField, isDarkMode }) {
  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0B1121] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
      <div>
        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}><HelpCircle size={14}/> Student Hint</label>
        <input type="text" value={q.hint} onChange={(e) => updateQuestionField(q.id, 'hint', e.target.value)} placeholder="A small nudge before the 2nd attempt..." className={`w-full p-3 rounded-xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-cyan-500' : 'bg-white border-slate-200 text-slate-700 focus:border-cyan-400'}`} />
      </div>

      <div>
        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}><Lightbulb size={14}/> Official Solution</label>
        <textarea rows="2" value={q.solutionText} onChange={(e) => updateQuestionField(q.id, 'solutionText', e.target.value)} placeholder="Explain why the answer is correct..." className={`w-full p-3 rounded-xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-400'}`} />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Video size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={q.solutionVideoUrl} onChange={(e) => updateQuestionField(q.id, 'solutionVideoUrl', e.target.value)} placeholder="Solution Video URL" className={`w-full p-2.5 pl-9 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300' : 'bg-white border-slate-200'}`} />
        </div>
        <div className="flex-1 relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={q.tags} onChange={(e) => updateQuestionField(q.id, 'tags', e.target.value)} placeholder="Tags (comma separated)" className={`w-full p-2.5 pl-9 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300' : 'bg-white border-slate-200'}`} />
        </div>
      </div>
    </div>
  );
}