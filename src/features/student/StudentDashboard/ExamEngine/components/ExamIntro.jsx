import React from 'react';
import { AlertCircle, PlayCircle } from 'lucide-react';

export default function ExamIntro({ examConfig, totalQuestions, onStart, isDarkMode }) {
  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B1121] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`max-w-2xl w-full p-10 rounded-[3rem] border shadow-2xl text-center ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="w-24 h-24 mx-auto bg-indigo-500/10 text-indigo-500 rounded-[2rem] flex items-center justify-center rotate-3 mb-8"><AlertCircle size={40} className="-rotate-3" /></div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">{examConfig?.title || "Exam"}</h1>
        <p className="text-lg mb-10 text-slate-500">{examConfig?.description || "Prepare yourself."}</p>
        <button onClick={onStart} className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl flex items-center justify-center mx-auto gap-3 active:scale-95">Start Assessment <PlayCircle size={20} /></button>
      </div>
    </div>
  );
}