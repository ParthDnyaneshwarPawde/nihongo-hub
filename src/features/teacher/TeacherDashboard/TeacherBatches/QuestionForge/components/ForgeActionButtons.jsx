import React from 'react';
import { Plus, Download, Loader2 } from 'lucide-react';

export default function ForgeActionButtons({ handleAddQuestion, importId, setImportId, handleImportQuestion, isImporting, isDarkMode }) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <button onClick={handleAddQuestion} className={`flex-1 p-6 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all group hover:bg-rose-500/5 ${isDarkMode ? 'border-slate-800 hover:border-rose-500/50' : 'border-slate-300 hover:border-rose-400'}`}>
        <div className={`p-4 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 group-hover:bg-rose-500 text-slate-400 group-hover:text-white' : 'bg-slate-100 group-hover:bg-rose-500 text-slate-500 group-hover:text-white'}`}><Plus size={24} /></div>
        <span className={`font-black text-lg ${isDarkMode ? 'text-slate-400 group-hover:text-rose-400' : 'text-slate-500 group-hover:text-rose-600'}`}>Create Blank Question</span>
      </button>
      <div className={`flex-1 p-6 rounded-[32px] border flex flex-col justify-center gap-4 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div>
          <h3 className={`font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Download size={18} className="text-indigo-500"/> Import from Bank</h3>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Paste an ID (e.g., q_001234) from your question bank.</p>
        </div>
        <div className={`flex items-center gap-2 p-2 rounded-2xl border focus-within:border-indigo-500 transition-colors ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <input type="text" value={importId} onChange={(e) => setImportId(e.target.value)} placeholder="Paste Question ID..." className={`flex-1 bg-transparent px-3 outline-none text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
          <button onClick={handleImportQuestion} disabled={isImporting || !importId.trim()} className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all ${isImporting || !importId.trim() ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            {isImporting ? <Loader2 size={16} className="animate-spin"/> : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}