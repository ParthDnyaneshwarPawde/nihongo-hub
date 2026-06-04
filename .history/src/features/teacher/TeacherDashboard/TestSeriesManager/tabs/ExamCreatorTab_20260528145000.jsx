import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, UserPlus, Lock, Filter, Activity, Calendar, 
  CheckCircle2, LayoutGrid, LayoutList, ChevronLeft, ChevronRight,
  Radio, Play, Square, AlertTriangle
} from 'lucide-react';

// Mock Data
const MOCK_TEACHERS = [
  { id: 't_001', name: 'Parth Pawde', role: 'Lead Architect', avatar: 'PP' },
  { id: 't_002', name: 'Varsha Sensei', role: 'Reviewer', avatar: 'VS' }
];

const INITIAL_EXAM_STATE = {
  title: '', description: '', accessKey: '',
  visuals: { from: '#4F46E5', to: '#7C3AED' },
  mode: 'auto', allowLateAttempts: false,
  entryLockout: false, lockoutMinutes: 15,
  collaborators: ['t_001']
};

export default function ExamCreatorTab() {
  // Generate Mock Exams with varying states
  const initialMockTests = Array.from({ length: 25 }, (_, i) => ({
    id: `mt_00${i + 1}`,
    title: `JLPT Premium Mock Exam ${i + 1}`,
    accessKey: `KEY-${i + 1}X`,
    visuals: i % 2 === 0 ? { from: '#f59e0b', to: '#ea580c' } : { from: '#3b82f6', to: '#8b5cf6' },
    mode: i % 3 === 0 ? 'manual' : 'auto',
    status: i === 0 ? 'live' : i === 1 ? 'active' : i < 15 ? 'upcoming' : 'over',
    collaborators: ['t_001']
  }));

  const [mockTests, setMockTests] = useState(initialMockTests);

  // View & Pagination State
  const [viewMode, setViewMode] = useState('list'); // Defaulting to the new compact list
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 12; // Show more items in list view
  
  // Filter & Form State
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(INITIAL_EXAM_STATE);

  // Modals
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);

  // ==========================================
  // LOGIC & HANDLERS
  // ==========================================
  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm({ ...examForm, [parent]: { ...examForm[parent], [child]: value } });
    } else setExamForm({ ...examForm, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      setMockTests(mockTests.map(t => t.id === editingId ? { ...examForm, id: editingId, status: t.status } : t));
    } else {
      setMockTests([{ ...examForm, id: `mt_${Date.now()}`, status: 'upcoming' }, ...mockTests]);
    }
    setIsExamFormOpen(false); setEditingId(null); setExamForm(INITIAL_EXAM_STATE);
  };

  // 🚨 DYNAMIC STATE MACHINE HANDLER
  const advanceExamState = (testId, currentStatus, mode) => {
    let nextStatus = currentStatus;
    let message = "";

    if (currentStatus === 'upcoming') {
      nextStatus = 'active';
      message = "📡 Pre-Flight Active: Students can now enter the access key.";
    } else if (currentStatus === 'active') {
      nextStatus = 'live';
      message = "🚀 Exam Started: All students in the waiting room are now testing.";
    } else if (currentStatus === 'live') {
      nextStatus = 'over';
      message = "🛑 Exam Ended: All active sessions have been force-submitted.";
    }

    if (nextStatus !== currentStatus) {
      setMockTests(mockTests.map(t => t.id === testId ? { ...t, status: nextStatus } : t));
      alert(message);
    }
  };

  // Filtering & Pagination Engine
  const filteredExams = useMemo(() => {
    let filtered = mockTests;
    if (activeFilter !== 'all') {
      if (activeFilter === 'live') {
        filtered = mockTests.filter(t => t.status === 'live' || t.status === 'active');
      } else {
        filtered = mockTests.filter(t => t.status === activeFilter);
      }
    }
    return filtered;
  }, [mockTests, activeFilter]);

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const currentExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExams.slice(start, start + itemsPerPage);
  }, [filteredExams, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [activeFilter, viewMode]);

  // Premium UI Classes
  const inputBase = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-bold`;
  const labelBase = `block text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 ml-1`;

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Architect exams, assign senseis, and manage live executions.</p>
        </div>
        {!isExamFormOpen && (
          <button onClick={() => setIsExamFormOpen(true)} className="px-6 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95">
            <Plus size={16} /> Create Blueprint
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isExamFormOpen ? (
          /* =========================================
             VIEW 1: EXAM BUILDER FORM
            ========================================= */
          <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleSave} className="max-w-[1000px] mx-auto w-full space-y-8">
            <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/90 border border-slate-800/80 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><Edit2 size={16} className="text-amber-500"/> Blueprint Identity</h3>
              <div className="space-y-6">
                <div>
                  <label className={labelBase}>Exam Title</label>
                  <input type="text" name="title" value={examForm.title} onChange={handleInput} className={`${inputBase} !text-xl`} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelBase}>Access Key (Pre-Flight)</label>
                    <input type="text" name="accessKey" value={examForm.accessKey} onChange={handleInput} className={`${inputBase} uppercase font-mono tracking-widest`} required />
                  </div>
                  <div>
                     <label className={labelBase}>Launch Mode</label>
                     <div className="flex gap-4 mt-2">
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${examForm.mode === 'auto' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                          <input type="radio" name="mode" value="auto" checked={examForm.mode === 'auto'} onChange={handleInput} className="hidden" />
                          <Clock size={14} /> Auto
                        </label>
                        <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center gap-2 ${examForm.mode === 'manual' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                          <input type="radio" name="mode" value="manual" checked={examForm.mode === 'manual'} onChange={handleInput} className="hidden" />
                          <ShieldAlert size={14} /> Manual
                        </label>
                      </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 sticky bottom-8 z-10">
              <button type="button" onClick={() => { setIsExamFormOpen(false); setEditingId(null); setExamForm(INITIAL_EXAM_STATE); }} className="w-1/3 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest bg-[#0B1120]/80 backdrop-blur-md border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] transition-all">
                <Save size={20} /> Save Blueprint
              </button>
            </div>
          </motion.form>

        ) : (
          
          /* =========================================
             VIEW 2: DASHBOARD (LIST / GRID)
            ========================================= */
          <motion.div key="dashboard" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            
            {/* Nav Row: Filters & View Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 p-1.5 bg-[#0B1120] border border-slate-800 rounded-xl w-max">
                {[
                  { id: 'all', label: 'All', icon: Filter },
                  { id: 'live', label: 'Active / Live', icon: Activity },
                  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                  { id: 'over', label: 'Archived', icon: CheckCircle2 }
                ].map(filter => (
                  <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFilter === filter.id ? 'bg-[#0D1527] text-white shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                    <filter.icon size={14} className={activeFilter === filter.id && filter.id === 'live' ? 'text-amber-500' : ''}/> {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-[#0B1120] border border-slate-800 rounded-xl p-1.5 w-max">
                <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#0D1527] text-white border border-slate-700' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#0D1527] text-white border border-slate-700' : 'text-slate-500 hover:text-white'}`}><LayoutList size={16}/></button>
              </div>
            </div>

            {/* Exams Container */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-8" : "flex flex-col gap-3"}>
              {currentExams.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-[#0B1120]">
                  <Search size={40} className="text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">No exams found for this filter.</p>
                </div>
              ) : (
                currentExams.map((test) => {
                  // 🚨 DYNAMIC BUTTON RENDER LOGIC
                  let ActionButton = null;
                  let statusPill = '';
                  
                  if (test.status === 'upcoming') {
                    statusPill = <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">Upcoming</span>;
                    ActionButton = <button onClick={() => advanceExamState(test.id, test.status, test.mode)} className={`px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all w-full md:w-auto`}><Radio size={14}/> Set Active</button>;
                  } else if (test.status === 'active') {
                    statusPill = <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">Pre-Flight</span>;
                    ActionButton = <button onClick={() => advanceExamState(test.id, test.status, test.mode)} disabled={test.mode === 'auto'} className={`px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed w-full md:w-auto`} title={test.mode === 'auto' ? "Auto-starts on schedule" : "Force start now"}><Play size={14}/> Start Exam</button>;
                  } else if (test.status === 'live') {
                    statusPill = <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">Live</span>;
                    ActionButton = <button onClick={() => advanceExamState(test.id, test.status, test.mode)} className={`px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all w-full md:w-auto`}><Square size={14}/> End Early</button>;
                  } else {
                    statusPill = <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800/50 text-slate-500 border border-slate-800">Ended</span>;
                    ActionButton = <button disabled className={`px-4 py-2 rounded-xl bg-[#0D1527] text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed w-full md:w-auto`}><CheckCircle2 size={14}/> Completed</button>;
                  }

                  // ------------------------------------
                  // COMPACT LIST VIEW RENDER
                  // ------------------------------------
                  if (viewMode === 'list') {
                    return (
                      <div key={test.id} className="pl-2 pr-4 py-3 rounded-2xl bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-center justify-between gap-4 group">
                        
                        {/* 1. Identity */}
                        <div className="flex items-center gap-4 w-full md:w-[35%] lg:w-[30%] shrink-0">
                          <div className="w-1.5 h-10 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-black text-white truncate leading-tight">{test.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {statusPill}
                              <span className="text-[10px] text-slate-500 font-mono">{test.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Meta Data (Hidden on small screens) */}
                        <div className="hidden md:flex items-center justify-between flex-1 px-4 border-x border-slate-800">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Access Key</span>
                            <span className="text-xs font-mono font-bold text-amber-400">{test.accessKey}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mode</span>
                            <span className="text-xs font-bold text-white capitalize">{test.mode}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Staff</span>
                            <div className="flex -space-x-1.5 mt-0.5">
                              {test.collaborators.slice(0, 3).map(id => {
                                const t = MOCK_TEACHERS.find(x => x.id === id);
                                return t ? <div key={id} className="w-5 h-5 rounded-full bg-slate-700 border-2 border-[#0B1120] flex items-center justify-center text-[7px] font-black text-white" title={t.name}>{t.avatar}</div> : null;
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 3. Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                          {ActionButton}
                          
                          <div className="flex items-center gap-1 bg-[#0D1527] p-1 rounded-xl border border-slate-800">
                            <button onClick={() => { setEditingId(test.id); setExamForm({ ...test }); setIsExamFormOpen(true); }} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Edit"><Edit2 size={14}/></button>
                            <button onClick={() => { setDeployingExamId(test.id); setIsSeriesModalOpen(true); }} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Deploy"><Send size={14}/></button>
                            <button className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white transition-all" title="Forge Blueprint"><PenTool size={14}/></button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ------------------------------------
                  // GRID VIEW RENDER
                  // ------------------------------------
                  return (
                    <div key={test.id} className="p-6 md:p-8 rounded-[2rem] bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden">
                      <div>
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-10 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                            <div>
                              <h4 className="text-xl font-black text-white tracking-tight">{test.title}</h4>
                              <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">ID: {test.id}</p>
                            </div>
                          </div>
                          {statusPill}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-2xl bg-[#0D1527] border border-slate-800">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Lock size={10}/> Access Key</p>
                            <p className="text-sm font-mono font-bold text-amber-400">{test.accessKey}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Settings size={10}/> Mode</p>
                            <p className="text-sm font-bold text-white capitalize">{test.mode} Start</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {ActionButton}
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => { setEditingId(test.id); setExamForm({ ...test }); setIsExamFormOpen(true); }} className="py-2.5 rounded-xl bg-[#0D1527] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest flex justify-center gap-2"><Edit2 size={12} /> Edit</button>
                          <button onClick={() => { setDeployingExamId(test.id); setIsSeriesModalOpen(true); }} className="py-2.5 rounded-xl bg-[#0D1527] hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest flex justify-center gap-2"><Send size={12} /> Deploy</button>
                          <button className="py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex justify-center gap-2"><PenTool size={12} /> Forge</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🚨 PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-slate-800/80">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-[#0D1527] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronLeft size={16}/></button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-amber-500 text-white shadow-lg' : 'bg-[#0D1527] border border-slate-800 text-slate-500 hover:border-slate-600'}`}>{page}</button>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-xl bg-[#0D1527] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"><ChevronRight size={16}/></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS OMITTED FOR BREVITY (Collab and Deployment modals remain identical to previous build) */}
    </div>
  );
}