import React from 'react';
import { Lightbulb, Video, Tag } from 'lucide-react';

export default function SolutionEditor({ q, updateQuestionField, isDarkMode }) {
  return (
    <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0B1121]/80 backdrop-blur-md border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
      
      {/* Official Solution Field */}
      <div>
        <label className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
          <Lightbulb size={14}/> Official Solution Review
        </label>
        <textarea 
          rows="2" 
          value={q.solutionText} 
          onChange={(e) => updateQuestionField(q.id, 'solutionText', e.target.value)} 
          placeholder="Explain why the answer is correct for the student's post-exam review..." 
          className={`w-full p-4 rounded-xl border text-sm font-medium outline-none transition-all focus:ring-4 focus:ring-amber-500/10 ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-400'}`} 
        />
      </div>
      
      {/* Media and Tags */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Video size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            value={q.solutionVideoUrl} 
            onChange={(e) => updateQuestionField(q.id, 'solutionVideoUrl', e.target.value)} 
            placeholder="Solution Video URL (Optional)" 
            className={`w-full p-3.5 pl-11 rounded-xl border text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-white border-slate-200'}`} 
          />
        </div>
        <div className="flex-1 relative">
          <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            value={q.tags} 
            onChange={(e) => updateQuestionField(q.id, 'tags', e.target.value)} 
            placeholder="Tags (comma separated, e.g. N4, Grammar)" 
            className={`w-full p-3.5 pl-11 rounded-xl border text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-white border-slate-200'}`} 
          />
        </div>
      </div>
    </div>
  );
}