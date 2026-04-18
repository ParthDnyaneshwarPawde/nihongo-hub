import React from 'react';
import { Hash, Type, BarChart, Layers, Award, TrendingDown, RefreshCcw, Tag } from 'lucide-react';

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
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><Award size={12}/> Points</label>
          <input type="number" value={q.points} onChange={(e) => updateQuestionField(q.id, 'points', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}/>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1"><TrendingDown size={12}/> Penalty</label>
          <input type="number" value={q.negativePoints} onChange={(e) => updateQuestionField(q.id, 'negativePoints', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}/>
        </div>
      </div>

      {/* --- ROW 3: Settings Bar --- */}
      <div className={`pt-4 flex items-center justify-between border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <RefreshCcw size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} />
          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Allow Second Attempt?</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 hidden sm:inline ml-2">(Halves points on retry)</span>
        </div>
        <button onClick={() => updateQuestionField(q.id, 'allowSecondAttempt', !q.allowSecondAttempt)} className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${q.allowSecondAttempt ? 'bg-emerald-500' : 'bg-slate-600'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${q.allowSecondAttempt ? 'translate-x-7' : 'left-1'}`}></div>
        </button>
      </div>

    </div>
  );
}