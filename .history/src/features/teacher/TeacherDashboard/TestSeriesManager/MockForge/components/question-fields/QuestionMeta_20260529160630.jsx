import React from 'react';
import { Hash, Type, BarChart, Layers, Award, TrendingDown, RefreshCcw, Tag, ListChecks, Timer } from 'lucide-react';

export default function QuestionMeta({ q, updateQuestionField, isDarkMode }) {
  return (
    <div className={`p-5 rounded-2xl mb-6 space-y-5 ${isDarkMode ? 'bg-[#0B1121] border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
      
      {/* --- ROW 1: Core Metadata --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Hash size={12}/> Q. No.</label>
          <input type="number" placeholder="ID" value={q.customId} onChange={(e) => updateQuestionField(q.id, 'customId', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}/>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Type size={12}/> Format</label>
          <select value={q.type} onChange={(e) => updateQuestionField(q.id, 'type', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="text_input">Text Answer</option>
            <option value="kanji_draw">Kanji Drawing</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><BarChart size={12}/> Difficulty</label>
          <select value={q.difficulty} onChange={(e) => updateQuestionField(q.id, 'difficulty', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <option value="easy">Easy</option><option value="mid">Medium</option><option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Layers size={12}/> Category</label>
          <select value={q.subType} onChange={(e) => updateQuestionField(q.id, 'subType', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <option value="reading">Reading</option><option value="listening">Listening</option>
            <option value="vocab">Vocabulary</option><option value="grammar">Grammar</option>
          </select>
        </div>
      </div>

      {/* Subtle Divider */}
      <div className={`h-px w-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>

      {/* --- ROW 2: Granular Metadata & Scoring --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Tag size={12}/> Topic</label>
          <input type="text" placeholder="e.g. N4 Kanji" value={q.topic} onChange={(e) => updateQuestionField(q.id, 'topic', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}/>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Tag size={12} className="opacity-0"/> Sub-Topic</label>
          <input type="text" placeholder="Optional" value={q.subTopic} onChange={(e) => updateQuestionField(q.id, 'subTopic', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}/>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Award size={12}/> Max Points</label>
          <input type="number" readOnly={q.gradingRubric} value={q.points} onChange={(e) => updateQuestionField(q.id, 'points', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} ${q.gradingRubric ? 'opacity-50 cursor-not-allowed' : ''}`}/>
          {q.gradingRubric && <p className="text-[8px] text-slate-500 mt-1">Auto-calculated from Rubric</p>}
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><TrendingDown size={12}/> Penalty</label>
          <input type="number" value={q.negativePoints} onChange={(e) => updateQuestionField(q.id, 'negativePoints', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}/>
        </div>
      </div>

      {/* --- ROW 3: Advanced Behavioral Toggles --- */}
      <div className={`pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        
        {/* Toggle 1: Grading Rubric */}
        <div className="flex items-center justify-between gap-4 flex-1">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Dynamic Grading Rubric</span>
          </div>
          <button onClick={() => updateQuestionField(q.id, 'gradingRubric', !q.gradingRubric)} className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${q.gradingRubric ? 'bg-amber-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform ${q.gradingRubric ? 'translate-x-5' : 'left-[2px]'}`}></div>
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700 hidden md:block opacity-50"></div>

        {/* Toggle 2: Time-Based Hint */}
        <div className="flex items-center justify-between gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Timer size={16} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-500'} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Time-Triggered Hint</span>
          </div>
          <button onClick={() => updateQuestionField(q.id, 'afterTimeHint', !q.afterTimeHint)} className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${q.afterTimeHint ? 'bg-cyan-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform ${q.afterTimeHint ? 'translate-x-5' : 'left-[2px]'}`}></div>
          </button>
        </div>

        <div className="w-px h-6 bg-slate-700 hidden md:block opacity-50"></div>

        {/* Toggle 3: Second Attempt */}
        <div className="flex items-center justify-between gap-4 flex-1">
          <div className="flex items-center gap-2">
            <RefreshCcw size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Allow Second Attempt</span>
          </div>
          <button onClick={() => updateQuestionField(q.id, 'allowSecondAttempt', !q.allowSecondAttempt)} className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${q.allowSecondAttempt ? 'bg-indigo-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform ${q.allowSecondAttempt ? 'translate-x-5' : 'left-[2px]'}`}></div>
          </button>
        </div>

      </div>
    </div>
  );
}