import React from 'react';
import { Trophy, Clock } from 'lucide-react';

export default function ExamResults({ score, totalQuestions, examConfig, totalTimeSpent, isDarkMode, onDashboard }) {
  const accuracy = Math.round((score / totalQuestions) * 100) || 0;
  const passed = accuracy >= (examConfig?.passPercentage || 80);

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B1121] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`max-w-2xl w-full p-10 rounded-[3rem] border shadow-2xl text-center relative overflow-hidden ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`absolute -top-32 -right-32 w-64 h-64 blur-[100px] rounded-full ${passed ? 'bg-emerald-500/30' : 'bg-rose-500/20'}`}></div>
        <div className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center mb-8 border-4 ${passed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}><Trophy size={48} /></div>
        <h1 className="text-4xl font-black mb-2">{passed ? "Assessment Cleared!" : "Training Required."}</h1>
        <p className={`text-base font-bold uppercase tracking-widest mb-10 ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>{passed ? "Excellent Performance" : "Did not meet passing criteria"}</p>
        <button onClick={onDashboard} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl active:scale-95">Return to Dashboard</button>
      </div>
    </div>
  );
}