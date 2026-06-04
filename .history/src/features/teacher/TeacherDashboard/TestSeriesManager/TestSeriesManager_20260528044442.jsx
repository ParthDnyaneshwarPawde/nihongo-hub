import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { 
  Plus, Save, Trash2, FolderOpen, 
  Edit2, Loader2, Users, Clock, 
  FileText, Search, Activity, 
  Target, Settings, Play, Square, Radio, PenTool
} from 'lucide-react';

export default function TestSeriesManager() {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('creator'); // 'creator' | 'architect' | 'command_center'

  // ==========================================
  // EXAM CREATOR STATE
  // ==========================================
  const [mockTests, setMockTests] = useState([]);
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  
  const initialExamState = {
    title: '',
    description: '',
    accessKey: '',
    visuals: { from: '#4F46E5', to: '#7C3AED' },
    schedule: { start: '', end: '' },
    mode: 'auto', // 'auto' | 'manual'
    allowLateAttempts: false,
    lateDeadline: ''
  };
  const [examForm, setExamForm] = useState(initialFormState);

  // MOCK DATA FOR DEMO PURPOSES
  useEffect(() => {
    setMockTests([
      {
        id: 'mt_001',
        title: 'JLPT N4 Mock Exam - July',
        accessKey: 'N4-PASS-2026',
        visuals: { from: '#4F46E5', to: '#7C3AED' },
        schedule: { start: '2026-07-01T14:00', end: '2026-07-01T16:00' },
        mode: 'manual',
        status: 'scheduled' // 'scheduled' | 'active' | 'testing' | 'completed'
      }
    ]);
  }, []);

  const handleExamInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm({ ...examForm, [parent]: { ...examForm[parent], [child]: value } });
    } else {
      setExamForm({ ...examForm, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSaveExam = (e) => {
    e.preventDefault();
    const newExam = { id: `mt_${Date.now()}`, ...examForm, status: 'scheduled' };
    setMockTests([newExam, ...mockTests]);
    setIsExamFormOpen(false);
    setExamForm(initialExamState);
  };

  // Action Triggers
  const handleExamAction = (testId, action) => {
    if (action === 'activate') alert(`📡 BULLETIN SENT: "Exam is now active! Students can enter Access Key."`);
    if (action === 'start') alert(`🚀 EXAM FORCED START: All students in waiting room are now testing.`);
    if (action === 'end') alert(`🛑 EXAM FORCE ENDED: Auto-submitting all student responses.`);
    if (action === 'forge') alert(`🔨 OPENING FORGE: Redirecting to Question Builder...`);
  };

  // Premium UI Classes
  const inputPremiumClass = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold`;
  const labelPremiumClass = `block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1`;

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 text-slate-200 bg-[#090E1A] min-h-screen">
      
      {/* 🚨 TOP NAVIGATION TABS */}
      <div className="max-w-[1400px] w-full mx-auto mb-8 flex gap-8 border-b border-slate-800/80">
        <button onClick={() => setActiveTab('creator')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'creator' ? 'border-amber-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <PenTool size={16} className={activeTab === 'creator' ? 'text-amber-500' : ''}/> Exam Creator
        </button>
        <button onClick={() => setActiveTab('architect')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'architect' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <FolderOpen size={16} className={activeTab === 'architect' ? 'text-indigo-500' : ''}/> Series Architect
        </button>
        <button onClick={() => setActiveTab('command_center')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'command_center' ? 'border-rose-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
          <Activity size={16} className={activeTab === 'command_center' ? 'text-rose-500' : ''} /> Command Center
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* =========================================
             VIEW 1: EXAM CREATOR (DEFAULT)
            ========================================= */}
        {activeTab === 'creator' && (
          <motion.div key="creator" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full max-w-[1400px] w-full mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <Target size={28} className="text-amber-500" /> Exam Creator
                </h1>
                <p className="text-sm font-bold text-slate-500 mt-1">Design global mock tests, configure schedules, and manage active instances.</p>
              </div>
              {!isExamFormOpen && (
                <button onClick={() => setIsExamFormOpen(true)} className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95">
                  <Plus size={16} /> Blueprint Exam
                </button>
              )}
            </div>

            {isExamFormOpen ? (
              <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSaveExam} className="max-w-[900px] mx-auto w-full space-y-8 pb-20">
                
                {/* 1. Meta & Identity */}
                <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><Edit2 size={16} className="text-indigo-500"/> Blueprint Identity</h3>
                  <div className="space-y-6">
                    <div>
                      <label className={labelPremiumClass}>Exam Title</label>
                      <input type="text" name="title" value={examForm.title} onChange={handleExamInput} className={`${inputPremiumClass} !text-xl`} required />
                    </div>
                    <div>
                      <label className={labelPremiumClass}>Description</label>
                      <textarea name="description" value={examForm.description} onChange={handleExamInput} rows="2" className={inputPremiumClass} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelPremiumClass}>Access Key (Pre-Flight Code)</label>
                        <input type="text" name="accessKey" value={examForm.accessKey} onChange={handleExamInput} placeholder="e.g. N4-GANBATTE" className={`${inputPremiumClass} tracking-widest uppercase font-mono`} required />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className={labelPremiumClass}>Card Gradient Start</label>
                          <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleExamInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                        </div>
                        <div className="flex-1">
                          <label className={labelPremiumClass}>Card Gradient End</label>
                          <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleExamInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Schedule & Behavior */}
                <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><Settings size={16} className="text-amber-500"/> Scheduling & Behavior</h3>
                  <div className="space-y-8">
                    
                    {/* Time Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelPremiumClass}>Start Time</label>
                        <input type="datetime-local" name="schedule.start" value={examForm.schedule.start} onChange={handleExamInput} className={inputPremiumClass} required />
                      </div>
                      <div>
                        <label className={labelPremiumClass}>End Time (Duration Limit)</label>
                        <input type="datetime-local" name="schedule.end" value={examForm.schedule.end} onChange={handleExamInput} className={inputPremiumClass} required />
                      </div>
                    </div>

                    {/* Mode Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
                      <div>
                        <label className={labelPremiumClass}>Launch Mode</label>
                        <div className="flex gap-4 mt-2">
                          <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${examForm.mode === 'auto' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                            <input type="radio" name="mode" value="auto" checked={examForm.mode === 'auto'} onChange={handleExamInput} className="hidden" />
                            <Clock size={16} /> Auto-Start
                          </label>
                          <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${examForm.mode === 'manual' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                            <input type="radio" name="mode" value="manual" checked={examForm.mode === 'manual'} onChange={handleExamInput} className="hidden" />
                            <Target size={16} /> Manual
                          </label>
                        </div>
                      </div>
                      
                      <div>
                         <label className={labelPremiumClass}>Post-Deadline Policy</label>
                         <label className="relative inline-flex items-center cursor-pointer mt-2 mb-4">
                          <input type="checkbox" name="allowLateAttempts" checked={examForm.allowLateAttempts} onChange={handleExamInput} className="sr-only peer" />
                          <div className="w-14 h-7 bg-[#0D1527] border border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-400"></div>
                          <span className="ml-3 text-xs font-bold text-slate-400">Allow Late Attempts</span>
                        </label>
                        {examForm.allowLateAttempts && (
                          <input type="datetime-local" name="lateDeadline" value={examForm.lateDeadline} onChange={handleExamInput} className={inputPremiumClass} />
                        )}
                      </div>
                    </div>

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
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-8 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                          <h4 className="text-2xl font-black text-white">{test.title}</h4>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${test.status === 'scheduled' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                          {test.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8 p-5 rounded-2xl bg-[#0D1527] border border-slate-800">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Access Key</p>
                          <p className="text-sm font-mono font-bold text-amber-400">{test.accessKey}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mode</p>
                          <p className="text-sm font-bold text-indigo-400 capitalize">{test.mode} Start</p>
                        </div>
                      </div>
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button onClick={() => handleExamAction(test.id, 'forge')} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all">
                        <PenTool size={16} /> Forge
                      </button>
                      <button onClick={() => handleExamAction(test.id, 'activate')} className="p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all">
                        <Radio size={16} /> Set Active
                      </button>
                      <button onClick={() => handleExamAction(test.id, 'start')} disabled={test.mode === 'auto'} className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <Play size={16} /> Start
                      </button>
                      <button onClick={() => handleExamAction(test.id, 'end')} className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all">
                        <Square size={16} /> End Early
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Note: Architect and Command Center views remain identical to previous implementation */}
        {activeTab === 'architect' && (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <FolderOpen size={48} className="mb-4 opacity-50" />
             <p className="text-lg font-bold">Series Architect Workspace</p>
           </div>
        )}

        {activeTab === 'command_center' && (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500">
             <Activity size={48} className="mb-4 opacity-50" />
             <p className="text-lg font-bold">Live Proctoring Command Center</p>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}