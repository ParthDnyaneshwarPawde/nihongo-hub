import React from 'react';
import { Trash2, ChevronUp, ChevronDown, Layers, Zap, Wand2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import QuestionMeta from './question-fields/QuestionMeta';
import PromptEditor from './question-fields/PromptEditor';
import ChoiceEditor from './question-fields/ChoiceEditor';
import ExactMatchEditor from './question-fields/ExactMatchEditor';
import SolutionEditor from './question-fields/SolutionEditor';

export default function QuestionAccordion({ 
  q, qIndex, toggleQuestionExpansion, handleRemoveQuestion, 
  updateQuestionField, handleAddOption, handleRemoveOption, 
  updateOptionText, setCorrectOption, isDarkMode 
}) {
  
  // Safe fallback if for some reason compatibleEngines is missing
  const activeEngines = q.compatibleEngines || ['srs', 'drill'];
  const hasSrs = activeEngines.includes('srs');
  const hasDrill = activeEngines.includes('drill');

  const toggleEngine = (engine) => {
    let next = [...activeEngines];
    if (next.includes(engine)) {
      if (next.length === 1) return; // Prevent unchecking both (must be at least one)
      next = next.filter(e => e !== engine);
    } else {
      next.push(engine);
    }
    updateQuestionField(q.id, 'compatibleEngines', next);
  };

  const handleMagicSync = () => {
    // Strips HTML tags so the Drill Prompt gets clean text
    const cleanText = (q.srsFrontHtml || "").replace(/<[^>]*>?/gm, '');
    updateQuestionField(q.id, 'prompt', cleanText.trim());
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`p-6 md:p-8 rounded-[32px] border relative group transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer" onClick={() => toggleQuestionExpansion(q.id)}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{qIndex + 1}</div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {q.type.replace('_', ' ').toUpperCase()}
              
              {/* Target Mode Badges */}
              {hasSrs && <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 uppercase flex items-center gap-1"><Layers size={10}/> SRS</span>}
              {hasDrill && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 uppercase flex items-center gap-1"><Zap size={10}/> Drill</span>}
              
              {q.customId && <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">#{q.customId}</span>}
            </h3>
            {!q.isExpanded && (
              <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {hasSrs ? (q.srsFrontHtml?.replace(/<[^>]*>?/gm, '') || 'Empty SRS Front...') : (q.prompt || 'Empty Drill Prompt...')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-rose-50 text-rose-600'}`}><Trash2 size={18} /></button>
          <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{q.isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
        </div>
      </div>

      {/* BODY */}
      <AnimatePresence>
        {q.isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-8 space-y-8">
              
              {/* TARGET MODES TOGGLE */}
              <div className="flex flex-col gap-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Target Modes</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => toggleEngine('srs')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${hasSrs ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-500 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-400 hover:border-slate-300')}`}
                  >
                    <Layers size={18} /> Flashcards (SRS)
                  </button>
                  <button 
                    onClick={() => toggleEngine('drill')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${hasDrill ? (isDarkMode ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-amber-50 border-amber-500 text-amber-600') : (isDarkMode ? 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-400 hover:border-slate-300')}`}
                  >
                    <Zap size={18} /> Speed Drill
                  </button>
                </div>
              </div>

              <QuestionMeta q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />

              {/* 🃏 SRS SECTION */}
              {hasSrs && (
                <div className={`p-6 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50/50'}`}>
                  <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}><Layers size={14}/> SRS Flashcard Content</h4>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Front */}
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Front (Accepts HTML)</label>
                      <textarea 
                        value={q.srsFrontHtml || ''} 
                        onChange={(e) => updateQuestionField(q.id, 'srsFrontHtml', e.target.value)}
                        placeholder="<h2>水</h2>"
                        className={`w-full p-4 rounded-xl text-sm font-mono outline-none border transition-colors h-28 resize-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-500'}`}
                      />
                      <div className={`p-4 rounded-xl min-h-[60px] border flex items-center justify-center ${isDarkMode ? 'bg-[#1A2333] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}>
                        {q.srsFrontHtml ? <div dangerouslySetInnerHTML={{ __html: q.srsFrontHtml }} /> : <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Eye size={12}/> Live Preview</span>}
                      </div>
                    </div>

                    {/* Back */}
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Back (Accepts HTML)</label>
                      <textarea 
                        value={q.srsBackHtml || ''} 
                        onChange={(e) => updateQuestionField(q.id, 'srsBackHtml', e.target.value)}
                        placeholder="<p>Water (mizu)</p>"
                        className={`w-full p-4 rounded-xl text-sm font-mono outline-none border transition-colors h-28 resize-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-700 focus:border-indigo-500'}`}
                      />
                      <div className={`p-4 rounded-xl min-h-[60px] border flex items-center justify-center ${isDarkMode ? 'bg-[#1A2333] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-black'}`}>
                        {q.srsBackHtml ? <div dangerouslySetInnerHTML={{ __html: q.srsBackHtml }} /> : <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Eye size={12}/> Live Preview</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🪄 MAGIC SYNC WAND */}
              {hasSrs && hasDrill && (
                <div className="flex justify-center -my-2 relative z-10">
                  <button onClick={handleMagicSync} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-lg transition-transform active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'}`}>
                    <Wand2 size={14} /> Sync SRS Front to Drill Prompt
                  </button>
                </div>
              )}

              {/* ⚡ DRILL SECTION */}
              {hasDrill && (
                <div className={`p-6 rounded-3xl border-2 border-dashed ${isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/50'}`}>
                   <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}><Zap size={14}/> Speed Drill Content</h4>
                   <div className="space-y-6">
                      <PromptEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
                      {(q.type === 'single_choice' || q.type === 'multiple_choice') ? (
                        <ChoiceEditor q={q} handleAddOption={handleAddOption} handleRemoveOption={handleRemoveOption} updateOptionText={updateOptionText} setCorrectOption={setCorrectOption} isDarkMode={isDarkMode} />
                      ) : (
                        <ExactMatchEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
                      )}
                   </div>
                </div>
              )}

              {/* SHARED SOLUTION */}
              <div className="pt-4 border-t border-slate-800">
                <SolutionEditor q={q} updateQuestionField={updateQuestionField} isDarkMode={isDarkMode} />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}