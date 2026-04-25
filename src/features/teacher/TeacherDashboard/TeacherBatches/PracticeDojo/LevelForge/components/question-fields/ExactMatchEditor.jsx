import React from 'react';
import { PenTool, CheckCircle2 } from 'lucide-react';

export default function ExactMatchEditor({ q, updateQuestionField, isDarkMode }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
      {q.type === 'kanji_draw' && (
        <div className={`p-6 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
          <PenTool size={24} className="text-indigo-500 shrink-0 mt-1" />
          <div>
            <h4 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Kanji AI Evaluation Task</h4>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Students will draw the Kanji on a canvas. The AI Engine automatically grades their stroke order against your expected character.
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-500/30">
        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          <CheckCircle2 size={14}/> {q.type === 'kanji_draw' ? 'Expected Kanji Character' : 'Exact Expected Answer'}
        </label>
        <div className={`flex items-center p-3 rounded-2xl border-2 transition-all ${isDarkMode ? 'border-indigo-500/50 bg-[#0B1121]' : 'border-indigo-200 bg-white'}`}>
          <input 
            type="text" 
            placeholder={q.type === 'kanji_draw' ? "e.g., 水" : "Exact string to match..."}
            value={q.options && q.options.length > 0 ? q.options[0].text : ''} 
            onChange={(e) => {
              const newOptions = q.options && q.options.length > 0
                ? [{ ...q.options[0], text: e.target.value }]
                : [{ id: Date.now(), text: e.target.value, isCorrect: true, count: 0 }];
              updateQuestionField(q.id, 'options', newOptions);
            }} 
            className={`flex-1 bg-transparent border-none outline-none font-black text-2xl px-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} 
          />
        </div>
      </div>
    </div>
  );
}