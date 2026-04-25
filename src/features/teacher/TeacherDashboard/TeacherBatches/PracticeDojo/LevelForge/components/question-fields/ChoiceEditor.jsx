import React from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChoiceEditor({ q, handleAddOption, handleRemoveOption, updateOptionText, setCorrectOption, isDarkMode }) {
  return (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><CheckCircle2 size={14}/> Answer Options ({q.type === 'single_choice' ? 'Pick One' : 'Pick Multiple'})</label>
      <div className="space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
        <AnimatePresence>
          {q.options.map((opt, optIndex) => (
            <motion.div key={opt.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`flex items-center p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : isDarkMode ? 'border-slate-700 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
              <button onClick={() => setCorrectOption(q.id, opt.id)} className={`p-2 shrink-0 transition-colors ${opt.isCorrect ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-400'}`}>
                {q.type === 'multiple_choice' ? (opt.isCorrect ? <CheckCircle2 size={24}/> : <Circle size={24}/>) : (opt.isCorrect ? <CheckCircle2 size={24}/> : <Circle size={24}/>)}
              </button>
              <div className="w-px h-6 bg-slate-700 mx-2 opacity-50"></div>
              <input type="text" value={opt.text} onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)} placeholder={`Option ${optIndex + 1}`} className={`flex-1 bg-transparent border-none outline-none font-bold text-base px-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} ${opt.isCorrect ? 'text-emerald-400' : ''}`} />
              <button onClick={() => handleRemoveOption(q.id, opt.id)} className={`p-2 text-slate-500 hover:text-rose-500 transition-colors`}><X size={16} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={() => handleAddOption(q.id)} className={`w-full py-3 rounded-xl border border-dashed font-bold text-sm mt-2 transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>+ Add Choice</button>
      </div>
    </div>
  );
}