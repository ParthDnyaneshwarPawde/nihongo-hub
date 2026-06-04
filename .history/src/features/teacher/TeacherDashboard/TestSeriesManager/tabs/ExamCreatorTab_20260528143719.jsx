import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, Globe, Layers, UserPlus, FileText, ChevronRight, Lock,
} from 'lucide-react';

// Mock Data for UI demonstration
const MOCK_TEACHERS = [
  { id: 't_001', name: 'Parth Pawde', role: 'Lead Architect', avatar: 'PP' },
  { id: 't_002', name: 'Varsha Sensei', role: 'Reviewer', avatar: 'VS' },
  { id: 't_003', name: 'Yuki Nakamura', role: 'Content Creator', avatar: 'YN' },
  { id: 't_004', name: 'Kenji Sato', role: 'Proctor', avatar: 'KS' }
];

const MOCK_TEST_SERIES = [
  { id: 'ts_n4_summer', title: 'Summer JLPT N4 Bootcamp', batches: 3 },
  { id: 'ts_n3_kanji', title: 'Advanced N3 Kanji Mastery', batches: 1 },
  { id: 'ts_weekend', title: 'Weekend Rapid Prep', batches: 4 }
];

const INITIAL_EXAM_STATE = {
  title: '', description: '', accessKey: '',
  visuals: { from: '#4F46E5', to: '#7C3AED' },
  mode: 'auto', allowLateAttempts: false,
  entryLockout: false, lockoutMinutes: 15,
  collaborators: ['t_001'] // Default to current user
};

export default function ExamCreatorTab() {
  // Primary State
  const [mockTests, setMockTests] = useState([
    { 
      id: 'mt_001', title: 'JLPT N4 Reading Comprehension', accessKey: 'N4-READ-26', 
      visuals: { from: '#f59e0b', to: '#ea580c' }, mode: 'auto', status: 'published',
      collaborators: ['t_001', 't_003']
    }
  ]);

  // View & Edit State
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(INITIAL_EXAM_STATE);

  // Collaborator Modal State
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');

  // Series Deployment Modal State
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);
  const [seriesAssignForm, setSeriesAssignForm] = useState({
    selectedSeries: [],
    schedulingMode: 'global', // 'global' | 'custom'
    globalSchedule: { start: '', end: '' },
    customSchedules: {} // { seriesId: { start: '', end: '' } }
  });

  // ==========================================
  // EXAM BUILDER HANDLERS
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
      setMockTests([{ ...examForm, id: `mt_${Date.now()}`, status: 'draft' }, ...mockTests]);
    }
    closeForm();
  };

  const closeForm = () => {
    setIsExamFormOpen(false);
    setEditingId(null);
    setExamForm(INITIAL_EXAM_STATE);
  };

  // ==========================================
  // COLLABORATOR HANDLERS
  // ==========================================
  const filteredTeachers = useMemo(() => 
    MOCK_TEACHERS.filter(t => t.name.toLowerCase().includes(collabSearch.toLowerCase())),
  [collabSearch]);

  const toggleCollaborator = (teacherId) => {
    setExamForm(prev => {
      const isSelected = prev.collaborators.includes(teacherId);
      return {
        ...prev,
        collaborators: isSelected 
          ? prev.collaborators.filter(id => id !== teacherId)
          : [...prev.collaborators, teacherId]
      };
    });
  };

  const removeCollaborator = (teacherId, e) => {
    e.stopPropagation();
    toggleCollaborator(teacherId);
  };

  // ==========================================
  // SERIES DEPLOYMENT HANDLERS
  // ==========================================
  const openDeploymentModal = (examId) => {
    setDeployingExamId(examId);
    setSeriesAssignForm({
      selectedSeries: [], schedulingMode: 'global',
      globalSchedule: { start: '', end: '' }, customSchedules: {}
    });
    setIsSeriesModalOpen(true);
  };

  const toggleSeriesSelection = (seriesId) => {
    setSeriesAssignForm(prev => {
      const isSelected = prev.selectedSeries.includes(seriesId);
      const newSelected = isSelected ? prev.selectedSeries.filter(id => id !== seriesId) : [...prev.selectedSeries, seriesId];
      
      // Initialize custom schedule object if selecting
      const newCustomSchedules = { ...prev.customSchedules };
      if (!isSelected && !newCustomSchedules[seriesId]) {
        newCustomSchedules[seriesId] = { start: '', end: '' };
      }
      
      return { ...prev, selectedSeries: newSelected, customSchedules: newCustomSchedules };
    });
  };

  const handleScheduleChange = (type, field, value, seriesId = null) => {
    setSeriesAssignForm(prev => {
      if (type === 'global') {
        return { ...prev, globalSchedule: { ...prev.globalSchedule, [field]: value } };
      } else {
        return { 
          ...prev, 
          customSchedules: { 
            ...prev.customSchedules, 
            [seriesId]: { ...prev.customSchedules[seriesId], [field]: value } 
          } 
        };
      }
    });
  };

  const handleDeploy = () => {
    if (seriesAssignForm.selectedSeries.length === 0) return alert("Select at least one Test Series.");
    
    // Simulate deployment logic
    alert(`Successfully deployed to ${seriesAssignForm.selectedSeries.length} Series!`);
    
    // Mark as published locally
    setMockTests(mockTests.map(t => t.id === deployingExamId ? { ...t, status: 'published' } : t));
    setIsSeriesModalOpen(false);
  };

  // ==========================================
  // UI CLASSES
  // ==========================================
  const inputBase = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none font-bold`;
  const labelBase = `block text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 ml-1`;
  const panelBase = `p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/90 backdrop-blur-xl border border-slate-800/80 shadow-2xl`;

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
        {/* =========================================
             VIEW 1: EXAM BUILDER / EDITOR
            ========================================= */}
        {isExamFormOpen ? (
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
                        <button type="button" onClick={(e) => removeCollaborator(teacher.id, e)} className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
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
                {/* Launch Mode */}
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

                {/* Entry Lockout */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className={labelBase}>Strict Entry Lockout</label>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Block late joiners</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleInput} className="sr-only peer" />
                      <div className="w-12 h-6 bg-[#0B1120] border border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500 peer-checked:border-rose-400"></div>
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
              <button type="button" onClick={closeForm} className="w-1/3 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest bg-[#0B1120]/80 backdrop-blur-md border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all shadow-xl">Discard</button>
              <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.3)] transition-all active:scale-95">
                <Save size={20} /> {editingId ? 'Update Blueprint' : 'Commit Blueprint'}
              </button>
            </div>
          </motion.form>
        ) : (
          
          /* =========================================
             VIEW 2: EXAM GRID DASHBOARD
            ========================================= */
          <motion.div key="grid" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {mockTests.map((test) => (
              <div key={test.id} className="p-8 rounded-[2rem] bg-[#0B1120] border-2 border-slate-800/80 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between group relative overflow-hidden">
                
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 opacity-5 blur-[100px] pointer-events-none transition-all group-hover:opacity-10" style={{ backgroundColor: test.visuals.from }}></div>

                <div>
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-10 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals.from}, ${test.visuals.to})` }}></div>
                      <div>
                        <h4 className="text-2xl font-black text-white tracking-tight">{test.title}</h4>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">ID: {test.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${test.status === 'draft' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                      {test.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 p-5 rounded-2xl bg-[#0D1527]/80 backdrop-blur-sm border border-slate-800 relative z-10">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Lock size={10}/> Access Key</p>
                      <p className="text-sm font-mono font-bold text-amber-400">{test.accessKey}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Settings size={10}/> Mode</p>
                      <p className="text-sm font-bold text-indigo-400 capitalize">{test.mode}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Users size={10}/> Staff</p>
                      <p className="text-sm font-bold text-white">{test.collaborators?.length || 1} Assigned</p>
                    </div>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-800/80 pt-6 relative z-10">
                  <button onClick={() => handleEdit(test)} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => openDeploymentModal(test.id)} className="py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Send size={14} /> Deploy to Series
                  </button>
                  <button onClick={() => alert("Opening Forge Architect...")} className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all">
                    <PenTool size={14} /> Assembly Forge
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================
           MODALS (COLLAB & DEPLOYMENT)
          ========================================= */}
      <AnimatePresence>
        
        {/* COLLABORATOR MODAL */}
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
                <input type="text" placeholder="Search by name or role..." value={collabSearch} onChange={(e) => setCollabSearch(e.target.value)} className="w-full p-4 pl-12 rounded-xl bg-[#0D1527] border border-slate-800 text-white font-bold outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2 pr-2">
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

        {/* SERIES DEPLOYMENT MODAL */}
        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden">
              
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0D1527]/50">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3"><Send size={24} className="text-indigo-500"/> Deploy to Series</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Map this exam to active curriculums</p>
                </div>
                <button onClick={() => setIsSeriesModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500 transition-all"><X size={18}/></button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Step 1: Select Target Series */}
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 ml-1">Step 1: Select Target Folders</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {MOCK_TEST_SERIES.map(series => {
                    const isSelected = seriesAssignForm.selectedSeries.includes(series.id);
                    return (
                      <div key={series.id} onClick={() => toggleSeriesSelection(series.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527] border-slate-800 hover:border-slate-700'}`}>
                        <div className={`mt-1 w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-transparent'}`}>
                          {isSelected && <Check size={12} />}
                        </div>
                        <div>
                          <p className={`font-black text-sm mb-1 ${isSelected ? 'text-indigo-400' : 'text-white'}`}>{series.title}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{series.batches} Batches Attached</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 2: Scheduling Logic (Only show if series are selected) */}
                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 ml-1">Step 2: Timing Configuration</h4>
                      <div className="flex bg-[#0D1527] rounded-xl p-1 border border-slate-800">
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({...p, schedulingMode: 'global'}))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Uniform Schedule</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({...p, schedulingMode: 'custom'}))} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Custom per Series</button>
                      </div>
                    </div>

                    {/* Mode: Global (Same for all) */}
                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className="p-6 rounded-2xl bg-[#0D1527] border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Unlock Date (All Selected)</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => handleScheduleChange('global', 'start', e.target.value)} className={inputBase} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Deadline (All Selected)</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => handleScheduleChange('global', 'end', e.target.value)} className={inputBase} />
                        </div>
                      </div>
                    ) : (
                      /* Mode: Custom (Different per series) */
                      <div className="space-y-4">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const seriesData = MOCK_TEST_SERIES.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className="p-6 rounded-2xl bg-[#0D1527] border border-slate-800">
                              <h5 className="text-xs font-black text-indigo-400 mb-4">{seriesData.title}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Series Unlock Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => handleScheduleChange('custom', 'start', e.target.value, seriesId)} className={inputBase} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Series Deadline</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => handleScheduleChange('custom', 'end', e.target.value, seriesId)} className={inputBase} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Deployment Footer */}
              <div className="p-6 border-t border-slate-800 bg-[#0B1120] flex justify-end gap-4">
                <button onClick={() => setIsSeriesModalOpen(false)} className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
                <button onClick={handleDeploy} disabled={seriesAssignForm.selectedSeries.length === 0} className="px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                  <Send size={16} /> Execute Deployment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}