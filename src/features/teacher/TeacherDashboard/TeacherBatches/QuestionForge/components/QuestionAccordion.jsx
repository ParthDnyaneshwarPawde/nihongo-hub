import React from 'react';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionMeta from './question-fields/QuestionMeta';
import PromptEditor from './question-fields/PromptEditor';
import ChoiceEditor from './question-fields/ChoiceEditor';
import ExactMatchEditor from './question-fields/ExactMatchEditor';
import SolutionEditor from './question-fields/SolutionEditor';

export default function QuestionAccordion({ q, qIndex, toggleQuestionExpansion, handleRemoveQuestion, updateQuestionField, handleAddOption, handleRemoveOption, updateOptionText, setCorrectOption, isDarkMode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`p-6 md:p-8 rounded-[32px] border relative group ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => toggleQuestionExpansion(q.id)}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{qIndex + 1}</div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {q.type.replace('_', ' ').toUpperCase()}
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${q.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-500' : q.difficulty === 'mid' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{q.difficulty}</span>
              {q.customId && <span className="text-[10px] font-bold text-slate-500 uppercase">#{q.customId}</span>}
            </h3>
            {!q.isExpanded && <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{q.prompt || 'Empty Prompt...'}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-rose-50 text-rose-600'}`}><Trash2 size={18} /></button>
          <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{q.isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
        </div>
      </div>

      <AnimatePresence>
        {q.isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-8">
              <QuestionMeta q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
              <div className="space-y-6">
                <PromptEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
                {(q.type === 'single_choice' || q.type === 'multiple_choice') ? (
                  <ChoiceEditor q={q} handleAddOption={handleAddOption} handleRemoveOption={handleRemoveOption} updateOptionText={updateOptionText} setCorrectOption={setCorrectOption} isDarkMode={isDarkMode} />
                ) : (
                  <ExactMatchEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
                )}
                <SolutionEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}