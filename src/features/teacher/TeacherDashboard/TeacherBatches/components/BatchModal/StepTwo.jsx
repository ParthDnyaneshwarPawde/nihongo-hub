import React from 'react';
import { Image as ImageIcon, Layout, ListChecks, Plus, X, ArrowLeft, Loader2 } from 'lucide-react';

export default function StepTwo({
  newBatch, setNewBatch, pointInput, setPointInput,
  keyPoints, setKeyPoints, isSaving, editingBatchId, onBack
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in slide-in-from-left-8 duration-500">
      <div className="space-y-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><ImageIcon size={14}/> Course Banner Image (URL)</label>
          <input value={newBatch.bannerURL} onChange={e => setNewBatch({...newBatch, bannerURL: e.target.value})} className="w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 shadow-inner" placeholder="Direct Link (Unsplash/Imgur)" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><Layout size={14}/> Master Description</label>
          <textarea required rows="8" value={newBatch.description} onChange={e => setNewBatch({...newBatch, description: e.target.value})} className="w-full p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white text-sm leading-loose outline-none focus:border-indigo-500 shadow-inner" placeholder="What makes this batch special?"></textarea>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><ListChecks size={14}/> Selling Points</label>
          <div className="flex gap-2">
            <input value={pointInput} onChange={e => setPointInput(e.target.value)} className="flex-1 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm" placeholder="Ex: Live Speaking Drills" />
            <button type="button" onClick={() => { if(pointInput){ setKeyPoints([...keyPoints, pointInput]); setPointInput(''); }}} className="bg-white text-black p-5 rounded-2xl"><Plus size={20}/></button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto premium-scroll">
            {keyPoints.map((p, i) => <div key={i} className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-xs text-white font-bold animate-in fade-in"><span>{p}</span><X size={14} className="cursor-pointer text-rose-500" onClick={() => setKeyPoints(keyPoints.filter((_, idx) => idx !== i))}/></div>)}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2">Curriculum Flow (Optional)</label>
          <textarea rows="4" value={newBatch.curriculum} onChange={e => setNewBatch({...newBatch, curriculum: e.target.value})} className="w-full p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white text-sm leading-relaxed" placeholder="Week 1: Foundations..."></textarea>
        </div>

        <div className="flex gap-4 pt-6">
          <button type="button" onClick={onBack} className="flex-1 py-7 border-2 border-slate-800 text-slate-500 font-black rounded-[2.5rem] flex items-center justify-center gap-3 uppercase tracking-widest">
            <ArrowLeft size={18} /> Back
          </button>
          <button type="submit" disabled={isSaving} className="flex-[2] py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-indigo-600/40 text-lg tracking-widest uppercase">
            {isSaving ? <Loader2 className="animate-spin mx-auto"/> : editingBatchId ? "Save Updates" : "Deploy Batch"}
          </button>
        </div>
      </div>
    </div>
  );
}
