import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, UserPlus, Lock, Filter, Activity, Calendar, 
  CheckCircle2, LayoutGrid, LayoutList, ChevronLeft, ChevronRight,
  Radio, Play, Square
} from 'lucide-react';

// Mock Data
const MOCK_TEACHERS = [
  { id: 't_001', name: 'Parth Pawde', role: 'Lead Architect', avatar: 'PP' },
  { id: 't_002', name: 'Varsha Sensei', role: 'Reviewer', avatar: 'VS' }
];

const MOCK_TEST_SERIES = [
  { id: 'ts_n4', title: 'Summer JLPT N4 Bootcamp', batches: 3 }
];

const INITIAL_EXAM_STATE = {
  title: '', description: '', accessKey: '',
  visuals: { from: '#4F46E5', to: '#7C3AED' },
  mode: 'auto', allowLateAttempts: false,
  entryLockout: false, lockoutMinutes: 15,
  collaborators: ['t_001']
};

export default function ExamCreatorTab() {
  // Generate 25 Mock Exams to demonstrate Pagination
  const initialMockTests = Array.from({ length: 25 }, (_, i) => ({
    id: `mt_00${i + 1}`,
    title: `JLPT Practice Exam 00${i + 1}`,
    accessKey: `KEY-${i + 1}`,
    visuals: i % 2 === 0 ? { from: '#f59e0b', to: '#ea580c' } : { from: '#3b82f6', to: '#8b5cf6' },
    mode: i % 3 === 0 ? 'manual' : 'auto',
    status: i < 5 ? 'live' : i < 15 ? 'upcoming' : 'over',
    collaborators: ['t_001']
  }));

  const [mockTests, setMockTests] = useState(initialMockTests);

  // View & Pagination State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
  const [seriesAssignForm, setSeriesAssignForm] = useState({ selectedSeries: [], schedulingMode: 'global', globalSchedule: { start: '', end: '' }, customSchedules: {} });

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

  const handleLiveAction = (testId, action) => {
    if (action === 'activate') alert(`📡 Set Active: Exam ${testId} is in Pre-Flight!`);
    if (action === 'start') alert(`🚀 Force Start: Exam ${testId} has begun!`);
    if (action === 'end') alert(`🛑 End Early: Exam ${testId} closed.`);
  };

  // Filtering & Pagination Engine
  const filteredExams = useMemo(() => {
    let filtered = mockTests;
    if (activeFilter !== 'all') filtered = mockTests.filter(t => t.status === activeFilter);
    return filtered;
  }, [mockTests, activeFilter]);

  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  const currentExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExams.slice(start, start + itemsPerPage);
  }, [filteredExams, currentPage]);

  // Reset to page 1 if filter changes
  useEffect(() => { setCurrentPage(1); }, [activeFilter]);

  // UI Classes
  const inputBase = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-bold`;
  const labelBase = `block text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 ml-1`;
  const btnBase = `py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all`;

  return (
    <div className="flex flex-col h-full max-w-[1400px] w-full mx-auto relative pb-24">
      
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
                  { id: 'live', label: 'Live Now', icon: Activity },
                  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                  { id: 'over', label: 'Completed', icon: CheckCircle2 }
                ].map(filter => (
                  <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFilter === filter.id ? 'bg-[#0D1527] text-white shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                    <filter.icon size={14} className={activeFilter === filter.id && filter.id === 'live' ? 'text-amber-500' : ''}/> {filter.label}
                  </button>
                ))}
              </div>

              {/* Grid vs List Toggle */}
              <div className="flex bg-[#0B1120] border border-slate-800 rounded-xl p-1.5 w-max">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#0D1527] text-white border border-slate-700' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#0D1527] text-white border border-slate-700' : 'text-slate-500 hover:text-white'}`}><LayoutList size={16}/></button>
              </div>
            </div>

            {/* Exams Container */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-8" : "flex flex-col gap-4"}>
              {currentExams.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-[#0B1120]">
                  <Search size={40} className="text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">No exams found for this filter.</p>
                </div>
              ) : (
                currentExams.map((test) => {
                  // Status Coloring
                  let statusColor = 'text-slate-400 bg-slate-800 border-slate-700';
                  if (test.status === 'live') statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  if (test.status === 'upcoming') statusColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
                  if (test.status === 'over') statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

                  // ------------------------------------
                  // GRID VIEW RENDER
                  // ------------------------------------
                  if (viewMode === 'grid') {
                    return (
                      <div key={test.id} className="p-8 rounded-[2rem] bg-[#0B1120] border-2 border-slate-800/80 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden">
                        <div>
                          <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-10 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                              <div>
                                <h4 className="text-xl font-black text-white tracking-tight">{test.title}</h4>
                                <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">ID: {test.id}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>{test.status}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800">
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

                        {/* Two Rows of Actions for Grid View */}
                        <div className="space-y-3">
                          {/* 🚨 LIVE PROCTORING CONTROLS */}
                          <div className="grid grid-cols-3 gap-2 bg-[#0D1527] p-2 rounded-2xl border border-slate-800">
                            <button onClick={() => handleLiveAction(test.id, 'activate')} className={`${btnBase} bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400`}><Radio size={12}/> Active</button>
                            <button onClick={() => handleLiveAction(test.id, 'start')} disabled={test.mode === 'auto'} className={`${btnBase} bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed`}><Play size={12}/> Start</button>
                            <button onClick={() => handleLiveAction(test.id, 'end')} className={`${btnBase} bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400`}><Square size={12}/> End</button>
                          </div>
                          
                          {/* BUILDER CONTROLS */}
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => { setEditingId(test.id); setExamForm({ ...test }); setIsExamFormOpen(true); }} className={`${btnBase} bg-slate-800 hover:bg-slate-700 text-white`}><Edit2 size={12} /> Edit</button>
                            <button onClick={() => { setDeployingExamId(test.id); setIsSeriesModalOpen(true); }} className={`${btnBase} border border-slate-700 hover:bg-slate-800 text-slate-300`}><Send size={12} /> Deploy</button>
                            <button className={`${btnBase} bg-gradient-to-r from-amber-600 to-orange-600 text-white`}><PenTool size={12} /> Forge</button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ------------------------------------
                  // COMPACT LIST VIEW RENDER
                  // ------------------------------------
                  return (
                    <div key={test.id} className="p-4 md:p-5 rounded-[1.5rem] bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-6 group">
                      <div className="flex items-center gap-4 min-w-[280px]">
                        <div className="w-2 h-14 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                        <div>
                          <h4 className="text-base font-black text-white leading-tight mb-1">{test.title}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">ID: {test.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>{test.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap md:flex-nowrap items-center gap-6 xl:gap-8 flex-1 px-4 xl:border-l xl:border-slate-800">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Key</p>
                          <p className="text-xs font-mono font-bold text-amber-400">{test.accessKey}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Mode</p>
                          <p className="text-xs font-bold text-white capitalize">{test.mode}</p>
                        </div>
                        
                        {/* 🚨 COMPACT LIVE PROCTORING CONTROLS */}
                        <div className="flex items-center gap-2 bg-[#0D1527] p-1.5 rounded-xl border border-slate-800 ml-auto">
                          <button onClick={() => handleLiveAction(test.id, 'activate')} className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 transition-all" title="Set Active"><Radio size={14}/></button>
                          <button onClick={() => handleLiveAction(test.id, 'start')} disabled={test.mode === 'auto'} className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Force Start"><Play size={14}/></button>
                          <button onClick={() => handleLiveAction(test.id, 'end')} className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition-all" title="End Early"><Square size={14}/></button>
                        </div>
                      </div>

                      {/* COMPACT BUILDER CONTROLS */}
                      <div className="flex items-center gap-2 shrink-0 border-t border-slate-800 xl:border-none pt-4 xl:pt-0">
                        <button onClick={() => { setEditingId(test.id); setExamForm({ ...test }); setIsExamFormOpen(true); }} className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest"><Edit2 size={12} /></button>
                        <button onClick={() => { setDeployingExamId(test.id); setIsSeriesModalOpen(true); }} className="px-3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Send size={12} /> Deploy</button>
                        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"><PenTool size={12} /> Forge</button>
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
    </div>
  );
}