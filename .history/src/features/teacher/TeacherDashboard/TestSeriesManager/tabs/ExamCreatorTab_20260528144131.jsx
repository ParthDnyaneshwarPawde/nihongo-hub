import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, UserPlus, Lock, Filter, Activity, Calendar, CheckCircle2
} from 'lucide-react';

// Mock Data for UI demonstration
const MOCK_TEACHERS = [
  { id: 't_001', name: 'Parth Pawde', role: 'Lead Architect', avatar: 'PP' },
  { id: 't_002', name: 'Varsha Sensei', role: 'Reviewer', avatar: 'VS' },
  { id: 't_003', name: 'Yuki Nakamura', role: 'Content Creator', avatar: 'YN' }
];

const MOCK_TEST_SERIES = [
  { id: 'ts_n4_summer', title: 'Summer JLPT N4 Bootcamp', batches: 3 },
  { id: 'ts_n3_kanji', title: 'Advanced N3 Kanji Mastery', batches: 1 }
];

const INITIAL_EXAM_STATE = {
  title: '', description: '', accessKey: '',
  visuals: { from: '#4F46E5', to: '#7C3AED' },
  mode: 'auto', allowLateAttempts: false,
  entryLockout: false, lockoutMinutes: 15,
  collaborators: ['t_001']
};

export default function ExamCreatorTab() {
  // Primary State
  const [mockTests, setMockTests] = useState([
    { id: 'mt_001', title: 'JLPT N4 Reading Comprehension', accessKey: 'N4-READ', visuals: { from: '#f59e0b', to: '#ea580c' }, mode: 'auto', status: 'live', collaborators: ['t_001', 't_003'] },
    { id: 'mt_002', title: 'Advanced Grammar & Vocab N3', accessKey: 'N3-GRAM', visuals: { from: '#3b82f6', to: '#8b5cf6' }, mode: 'manual', status: 'upcoming', collaborators: ['t_001'] },
    { id: 'mt_003', title: 'Basic Kanji Introduction N5', accessKey: 'N5-KANJ', visuals: { from: '#10b981', to: '#059669' }, mode: 'auto', status: 'over', collaborators: ['t_002'] }
  ]);

  // View State
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(INITIAL_EXAM_STATE);
  
  // Filter State
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'live', 'upcoming', 'over'

  // Modals
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);
  const [seriesAssignForm, setSeriesAssignForm] = useState({ selectedSeries: [], schedulingMode: 'global', globalSchedule: { start: '', end: '' }, customSchedules: {} });

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm({ ...examForm, [parent]: { ...examForm[parent], [child]: value } });
    } else {
      setExamForm({ ...examForm, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleEdit = (test) => {
    setEditingId(test.id);
    setExamForm({ ...test });
    setIsExamFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      setMockTests(mockTests.map(t => t.id === editingId ? { ...examForm, id: editingId, status: t.status } : t));
    } else {
      setMockTests([{ ...examForm, id: `mt_${Date.now()}`, status: 'upcoming' }, ...mockTests]);
    }
    closeForm();
  };

  const closeForm = () => {
    setIsExamFormOpen(false);
    setEditingId(null);
    setExamForm(INITIAL_EXAM_STATE);
  };

  // Collaborator Logic
  const filteredTeachers = useMemo(() => MOCK_TEACHERS.filter(t => t.name.toLowerCase().includes(collabSearch.toLowerCase())), [collabSearch]);
  const toggleCollaborator = (teacherId) => {
    setExamForm(prev => {
      const isSelected = prev.collaborators.includes(teacherId);
      return { ...prev, collaborators: isSelected ? prev.collaborators.filter(id => id !== teacherId) : [...prev.collaborators, teacherId] };
    });
  };

  // Deployment Logic
  const openDeploymentModal = (examId) => {
    setDeployingExamId(examId);
    setSeriesAssignForm({ selectedSeries: [], schedulingMode: 'global', globalSchedule: { start: '', end: '' }, customSchedules: {} });
    setIsSeriesModalOpen(true);
  };

  const toggleSeriesSelection = (seriesId) => {
    setSeriesAssignForm(prev => {
      const isSelected = prev.selectedSeries.includes(seriesId);
      const newSelected = isSelected ? prev.selectedSeries.filter(id => id !== seriesId) : [...prev.selectedSeries, seriesId];
      const newCustomSchedules = { ...prev.customSchedules };
      if (!isSelected && !newCustomSchedules[seriesId]) newCustomSchedules[seriesId] = { start: '', end: '' };
      return { ...prev, selectedSeries: newSelected, customSchedules: newCustomSchedules };
    });
  };

  const handleDeploy = () => {
    if (seriesAssignForm.selectedSeries.length === 0) return alert("Select at least one Test Series.");
    alert(`Successfully deployed to ${seriesAssignForm.selectedSeries.length} Series!`);
    setIsSeriesModalOpen(false);
  };

  // Filter Logic
  const filteredExams = useMemo(() => {
    if (activeFilter === 'all') return mockTests;
    return mockTests.filter(t => t.status === activeFilter);
  }, [mockTests, activeFilter]);

  // UI Classes
  const inputBase = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-bold`;
  const labelBase = `block text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 ml-1`;
  const panelBase = `p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/90 border border-slate-800/80 shadow-xl`;

  return (
    <div className="flex flex-col h-full max-w-[1400px] w-full mx-auto relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Architect exams, assign senseis, and deploy to your curriculums.</p>
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
             VIEW 1: EXAM BUILDER / EDITOR
            ========================================= */
          <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleSave} className="max-w-[1000px] mx-auto w-full space-y-8 pb-20">
            
            {/* Identity Panel */}
            <div className={panelBase}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Edit2 size={16} className="text-amber-500"/> Blueprint Identity</h3>
                {editingId && <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase border border-indigo-500/20">Editing Mode Active</span>}
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className={labelBase}>Exam Title</label>
                  <input type="text" name="title" value={examForm.title} onChange={handleInput} placeholder="e.g., JLPT N4 Final Exam" className={`${inputBase} !text-xl`} required />
                </div>
                <div>
                  <label className={labelBase}>Description Context</label>
                  <textarea name="description" value={examForm.description} onChange={handleInput} rows="2" className={inputBase} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelBase}>Access Key (Pre-Flight)</label>
                    <input type="text" name="accessKey" value={examForm.accessKey} onChange={handleInput} className={`${inputBase} uppercase font-mono tracking-widest`} required />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className={labelBase}>Theme Start</label>
                      <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <label className={labelBase}>Theme End</label>
                      <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleInput} className="w-full h-[54px] rounded-2xl bg-[#0D1527]/80 border border-slate-800 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborators Panel */}
            <div className={panelBase}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Users size={16} className="text-indigo-500"/> Assigned Senseis</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Teachers with edit and proctoring rights for this specific exam.</p>
                </div>
                <button type="button" onClick={() => setIsCollabModalOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                  <UserPlus size={14} /> Add Staff
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {examForm.collaborators.length === 0 ? (
                  <span className="text-sm font-bold text-slate-600 italic">No additional staff assigned.</span>
                ) : (
                  examForm.collaborators.map(teacherId => {
                    const teacher = MOCK_TEACHERS.find(t => t.id === teacherId);
                    if (!teacher) return null;
                    return (
                      <div key={teacher.id} className="pr-2 pl-1 py-1 rounded-full bg-[#0D1527] border border-slate-800 flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white">{teacher.avatar}</div>
                        <div className="flex flex-col mr-2">
                          <span className="text-xs font-bold text-white leading-none">{teacher.name}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{teacher.role}</span>
                        </div>
                        <button type="button" onClick={() => toggleCollaborator(teacher.id)} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Behavior & Anti-Cheat */}
            <div className={panelBase}>
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><ShieldAlert size={16} className="text-rose-500"/> Behavior & Integrity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className={labelBase}>Launch Protocol</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${examForm.mode === 'auto' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                      <input type="radio" name="mode" value="auto" checked={examForm.mode === 'auto'} onChange={handleInput} className="hidden" />
                      <Clock size={16} /> Auto-Start
                    </label>
                    <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${examForm.mode === 'manual' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-slate-800 bg-[#0D1527] text-slate-500 hover:border-slate-700'}`}>
                      <input type="radio" name="mode" value="manual" checked={examForm.mode === 'manual'} onChange={handleInput} className="hidden" />
                      <ShieldAlert size={16} /> Manual
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className={labelBase}>Strict Entry Lockout</label>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Block late joiners</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleInput} className="sr-only peer" />
                      <div className="w-12 h-6 bg-[#0B1120] border border-slate-700 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                  {examForm.entryLockout && (
                    <div className="flex items-center gap-3 p-1 rounded-xl bg-[#0D1527] border border-slate-800">
                      <input type="number" name="lockoutMinutes" value={examForm.lockoutMinutes} onChange={handleInput} className="w-20 p-3 bg-transparent border-none text-white text-center font-black outline-none" min="1" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Minutes after start</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex gap-4 sticky bottom-8 z-10">
              <button type="button" onClick={closeForm} className="w-1/3 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest bg-[#0B1120]/80 backdrop-blur-md border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all shadow-xl">Discard</button>
              <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] transition-all">
                <Save size={20} /> {editingId ? 'Update Blueprint' : 'Commit Blueprint'}
              </button>
            </div>
          </motion.form>
        ) : (
          
          /* =========================================
             VIEW 2: EXAM LIST (HIGH DENSITY)
            ========================================= */
          <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            
            {/* Filter Navigation */}
            <div className="flex items-center gap-2 p-1.5 bg-[#0B1120] border border-slate-800 rounded-xl w-max">
              {[
                { id: 'all', label: 'All Exams', icon: Filter },
                { id: 'live', label: 'Live Now', icon: Activity },
                { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                { id: 'over', label: 'Completed', icon: CheckCircle2 }
              ].map(filter => (
                <button 
                  key={filter.id} onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFilter === filter.id ? 'bg-[#0D1527] text-white shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <filter.icon size={14} className={activeFilter === filter.id && filter.id === 'live' ? 'text-amber-500' : ''}/> {filter.label}
                </button>
              ))}
            </div>

            {/* List Container */}
            <div className="flex flex-col gap-4">
              {filteredExams.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-[#0B1120]">
                  <Search size={40} className="text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">No exams found for this filter.</p>
                </div>
              ) : (
                filteredExams.map((test) => {
                  let statusColor = 'text-slate-400 bg-slate-800 border-slate-700';
                  if (test.status === 'live') statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                  if (test.status === 'upcoming') statusColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
                  if (test.status === 'over') statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

                  return (
                    <div key={test.id} className="p-4 md:p-5 rounded-[1.5rem] bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-6 group">
                      
                      {/* 1. Identity & Status */}
                      <div className="flex items-center gap-4 min-w-[320px]">
                        <div className="w-2 h-14 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                        <div>
                          <h4 className="text-lg font-black text-white leading-tight mb-1">{test.title}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">ID: {test.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>{test.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Key Details Row */}
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-6 xl:gap-10 flex-1 px-4 xl:border-l xl:border-slate-800">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Lock size={10}/> Access Key</p>
                          <p className="text-sm font-mono font-bold text-amber-400">{test.accessKey}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Settings size={10}/> Mode</p>
                          <p className="text-xs font-bold text-white capitalize">{test.mode}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Users size={10}/> Staff</p>
                          <div className="flex -space-x-2">
                            {test.collaborators.slice(0, 3).map(id => {
                              const t = MOCK_TEACHERS.find(x => x.id === id);
                              return t ? <div key={id} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#0B1120] flex items-center justify-center text-[8px] font-black text-white" title={t.name}>{t.avatar}</div> : null;
                            })}
                            {test.collaborators.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#0B1120] flex items-center justify-center text-[8px] font-black text-slate-400">+{test.collaborators.length - 3}</div>}
                          </div>
                        </div>
                      </div>

                      {/* 3. Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 border-t border-slate-800 xl:border-none pt-4 xl:pt-0">
                        <button onClick={() => handleEdit(test)} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => openDeploymentModal(test.id)} className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                          <Send size={12} /> Deploy
                        </button>
                        <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all">
                          <PenTool size={12} /> Forge
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================
           MODALS (COLLAB & DEPLOYMENT)
          ========================================= */}
      <AnimatePresence>
        {isCollabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCollabModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2"><UserPlus size={20} className="text-indigo-500"/> Assign Senseis</h3>
                <button onClick={() => setIsCollabModalOpen(false)} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"><X size={16}/></button>
              </div>
              <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search by name..." value={collabSearch} onChange={(e) => setCollabSearch(e.target.value)} className="w-full p-4 pl-12 rounded-xl bg-[#0D1527] border border-slate-800 text-white font-bold outline-none focus:border-indigo-500 transition-all" />
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {filteredTeachers.map(teacher => {
                  const isSelected = examForm.collaborators.includes(teacher.id);
                  return (
                    <div key={teacher.id} onClick={() => toggleCollaborator(teacher.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527] border-slate-800 hover:border-slate-700'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg">{teacher.avatar}</div>
                        <div>
                          <p className={`font-bold text-sm ${isSelected ? 'text-indigo-400' : 'text-white'}`}>{teacher.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{teacher.role}</p>
                        </div>
                      </div>
                      {isSelected && <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Check size={12}/></div>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl flex flex-col rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0D1527]/50">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3"><Send size={24} className="text-indigo-500"/> Deploy to Series</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Select target curriculums</p>
                </div>
                <button onClick={() => setIsSeriesModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500 transition-all"><X size={18}/></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {MOCK_TEST_SERIES.map(series => {
                    const isSelected = seriesAssignForm.selectedSeries.includes(series.id);
                    return (
                      <div key={series.id} onClick={() => toggleSeriesSelection(series.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527] border-slate-800 hover:border-slate-700'}`}>
                        <div>
                          <p className={`font-black text-sm mb-1 ${isSelected ? 'text-indigo-400' : 'text-white'}`}>{series.title}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{series.batches} Batches Attached</p>
                        </div>
                        <div className={`w-6 h-6 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-transparent'}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 border-t border-slate-800 bg-[#0B1120] flex justify-end gap-4">
                <button onClick={handleDeploy} disabled={seriesAssignForm.selectedSeries.length === 0} className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50 transition-all">
                  Execute Deployment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}