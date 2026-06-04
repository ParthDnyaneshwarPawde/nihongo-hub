import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, Edit2, Target, Settings, PenTool, Clock, ShieldAlert } from 'lucide-react';

export default function ExamCreatorTab() {
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [mockTests, setMockTests] = useState([
    { id: 'mt_001', title: 'JLPT N4 Mock Exam', accessKey: 'N4-PASS', visuals: { from: '#4F46E5', to: '#7C3AED' }, mode: 'auto', status: 'scheduled' }
  ]);

  const [examForm, setExamForm] = useState({
    title: '', description: '', accessKey: '',
    visuals: { from: '#4F46E5', to: '#7C3AED' },
    schedule: { start: '', end: '' },
    mode: 'auto', allowLateAttempts: false,
    entryLockout: false, lockoutMinutes: 15 // 🚨 NEW: Anti-Cheating Lockout
  });

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm({ ...examForm, [parent]: { ...examForm[parent], [child]: value } });
    } else {
      setExamForm({ ...examForm, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setMockTests([{ id: `mt_${Date.now()}`, ...examForm, status: 'scheduled' }, ...mockTests]);
    setIsExamFormOpen(false);
  };

  const openForge = (testId) => alert(`🔨 Opening Question Forge for Test: ${testId}`);

  const inputPremiumClass = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-bold`;
  const labelPremiumClass = `block text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 ml-1`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full max-w-[1400px] w-full mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Creator
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Design global mock tests, configure schedules, and set anti-cheat rules.</p>
        </div>
        {!isExamFormOpen && (
          <button onClick={() => setIsExamFormOpen(true)} className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95">
            <Plus size={16} /> Blueprint Exam
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isExamFormOpen ? (
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleSave} className="max-w-[900px] mx-auto w-full space-y-8 pb-20">
            
            {/* Identity & Visuals */}
            <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><Edit2 size={16} className="text-amber-500"/> Blueprint Identity</h3>
              <div className="space-y-6">
                <div>
                  <label className={labelPremiumClass}>Exam Title</label>
                  <input type="text" name="title" value={examForm.title} onChange={handleInput} className={inputPremiumClass} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelPremiumClass}>Access Key (Pre-Flight)</label>
                    <input type="text" name="accessKey" value={examForm.accessKey} onChange={handleInput} className={`${inputPremiumClass} uppercase font-mono tracking-widest`} required />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className={labelPremiumClass}>Gradient Start</label>
                      <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <label className={labelPremiumClass}>Gradient End</label>
                      <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling & Anti-Cheat */}
            <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><ShieldAlert size={16} className="text-rose-500"/> Timing & Anti-Cheating</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className={labelPremiumClass}>Scheduled Start</label>
                  <input type="datetime-local" name="schedule.start" value={examForm.schedule.start} onChange={handleInput} className={inputPremiumClass} />
                </div>
                <div>
                  <label className={labelPremiumClass}>Scheduled End</label>
                  <input type="datetime-local" name="schedule.end" value={examForm.schedule.end} onChange={handleInput} className={inputPremiumClass} />
                </div>
              </div>

              {/* 🚨 ANTI-CHEAT LOCKOUT TOGGLE */}
              <div className="p-6 rounded-2xl bg-[#0D1527] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">Entry Lockout (Anti-Cheat)</h4>
                  <p className="text-xs text-slate-500 mt-1">Prevent students from joining late if they may have received answers from early finishers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleInput} className="sr-only peer" />
                  <div className="w-14 h-7 bg-[#0B1120] border border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 peer-checked:border-rose-400"></div>
                </label>
              </div>

              {examForm.entryLockout && (
                <div className="mb-8">
                  <label className={labelPremiumClass}>Lock Entry After (Minutes)</label>
                  <input type="number" name="lockoutMinutes" value={examForm.lockoutMinutes} onChange={handleInput} className={inputPremiumClass} placeholder="e.g. 15" />
                </div>
              )}

              {/* Late Attempts */}
              <div className="border-t border-slate-800/80 pt-6">
                <label className="relative inline-flex items-center cursor-pointer mb-4">
                  <input type="checkbox" name="allowLateAttempts" checked={examForm.allowLateAttempts} onChange={handleInput} className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#0D1527] border border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-400"></div>
                  <span className="ml-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Allow Post-Deadline Attempts</span>
                </label>
              </div>

            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setIsExamFormOpen(false)} className="w-1/3 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-amber-600/20 transition-all active:scale-95">
                <Save size={20} /> Save Blueprint
              </button>
            </div>
          </motion.form>
        ) : (
          /* EXAM GRID */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {mockTests.map((test) => (
              <div key={test.id} className="p-8 rounded-[2rem] bg-[#0B1120] border-2 border-slate-800/80 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-8 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                      <h4 className="text-2xl font-black text-white">{test.title}</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-8 p-5 rounded-2xl bg-[#0D1527] border border-slate-800">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Access Key</p>
                      <p className="text-sm font-mono font-bold text-amber-400">{test.accessKey}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/80">
                  <button onClick={() => openForge(test.id)} className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <PenTool size={16} /> Open Exam Forge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}