import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, Filter, LayoutGrid, LayoutList, 
  ChevronLeft, ChevronRight, Globe, Sparkles, Trash2, 
  Loader2, Shield, ArrowRight, UserPlus
} from 'lucide-react';

export default function ExamCreatorTab() {
  // ==========================================
  // INITIAL PARAMETERS & STATES
  // ==========================================
  const initialExamState = {
    title: '',
    description: '',
    accessKey: '',
    visuals: { from: '#4F46E5', to: '#7C3AED' },
    mode: 'auto', 
    allowLateAttempts: false,
    entryLockout: false,
    lockoutMinutes: 15,
    collaborators: [] 
  };

  const initialDeploymentState = {
    selectedSeries: [],
    schedulingMode: 'global', 
    globalSchedule: { start: '', end: '' },
    customSchedules: {} 
  };

  const [mockTests, setMockTests] = useState([]);
  const [testSeriesList, setTestSeriesList] = useState([]);
  const [teacherList, setTeacherList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  // UI Navigation & Control States
  const [viewMode, setViewMode] = useState('list'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 8 : 12;
  const [activeFilter, setActiveFilter] = useState('all'); 
  
  // Modals & Sub-forms
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(initialExamState);

  // Collab UI States
  const [teacherSearch, setTeacherSearch] = useState('');

  // Deployment States
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);
  const [seriesAssignForm, setSeriesAssignForm] = useState(initialDeploymentState);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // UI CLASSES 
  // ==========================================
  const inputBase = `w-full p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-sm transition-all outline-none focus:border-indigo-500`;
  const labelPremiumClass = `block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 mb-2`;

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
  useEffect(() => {
    const syncDatabase = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUserId(user.uid);

        const testsSnap = await getDocs(collection(db, 'mock_tests'));
        const exams = testsSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          status: 'blueprint',
          collaborators: d.data().collaborators || [],
          visuals: d.data().visuals || { from: '#4F46E5', to: '#7C3AED' }
        }));
        setMockTests(exams);

        const seriesSnap = await getDocs(collection(db, 'test_series'));
        const seriesData = seriesSnap.docs.map(d => ({
          id: d.id,
          title: d.data().title || 'Untitled Series',
          authorId: d.data().authorId,
          collaborators: d.data().collaborators || [],
          tests: d.data().tests || [],
          batches: d.data().assignedBatches || []
        })).filter(s => s.authorId === user.uid || s.collaborators.includes(user.uid));
        setTestSeriesList(seriesData);

        try {
          const staffSnap = await getDocs(collection(db, 'users'));
          if (!staffSnap.empty) {
            setTeacherList(staffSnap.docs.map(d => ({
              id: d.id,
              name: d.data().displayName || d.data().name || 'Unknown Sensei',
              email: d.data().email || '',
              role: d.data().role || 'Instructor',
              avatar: (d.data().displayName || d.data().name || 'ST').substring(0, 2).toUpperCase()
            })));
          }
        } catch (e) {
          console.warn("Could not fetch users, falling back to basic list.");
        }

      } catch (err) {
        console.error("Critical synchronization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) syncDatabase();
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // FORM HANDLERS
  // ==========================================
  const handleFormInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setExamForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const triggerFormOpen = (test = null) => {
    if (test) {
      setEditingId(test.id);
      setExamForm({
        title: test.title || '',
        description: test.description || '',
        accessKey: test.accessKey || '',
        visuals: test.visuals || { from: '#4F46E5', to: '#7C3AED' },
        mode: test.mode || 'auto',
        allowLateAttempts: test.allowLateAttempts || false,
        entryLockout: test.entryLockout || false,
        lockoutMinutes: test.lockoutMinutes || 15,
        collaborators: test.collaborators || []
      });
    } else {
      setEditingId(null);
      setExamForm({ ...initialExamState, collaborators: [] });
    }
    setTeacherSearch('');
    setIsExamFormOpen(true);
  };

  const closeForm = () => {
    setIsExamFormOpen(false);
    setEditingId(null);
    setExamForm(initialExamState);
    setTeacherSearch('');
  };

  const commitFormToDatabase = async (e) => {
    e.preventDefault();
    if (!examForm.title.trim()) return alert("Exam title is required.");
    
    setIsSaving(true);
    try {
      const testId = editingId || `mt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payload = {
        id: testId,
        title: examForm.title,
        description: examForm.description,
        accessKey: examForm.accessKey.toUpperCase().trim(),
        visuals: examForm.visuals,
        mode: examForm.mode,
        allowLateAttempts: examForm.allowLateAttempts,
        entryLockout: examForm.entryLockout,
        lockoutMinutes: examForm.entryLockout ? parseInt(examForm.lockoutMinutes) : 15,
        collaborators: examForm.collaborators,
        authorId: currentUserId,
        status: 'blueprint',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'mock_tests', testId), payload, { merge: true });
      
      if (editingId) {
        setMockTests(prev => prev.map(t => t.id === editingId ? { ...t, ...payload } : t));
      } else {
        setMockTests(prev => [payload, ...prev]);
      }
      
      closeForm();
    } catch (err) {
      alert(`Database write failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const removeExamInstance = async (id) => {
    if (!window.confirm("Permanently delete this exam? It will be removed from all Test Series.")) return;
    try {
      await deleteDoc(doc(db, 'mock_tests', id));
      setMockTests(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Failed to delete exam.");
    }
  };

  // ==========================================
  // STAFF MUTATION MECHANICS (COLLABORATORS)
  // ==========================================
  const foundTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return [];
    return teacherList.filter(t => 
      t.id !== currentUserId && 
      !examForm.collaborators.includes(t.id) &&
      (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
       (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase())))
    );
  }, [teacherSearch, teacherList, examForm.collaborators, currentUserId]);

  const addCollaborator = (teacherId) => {
    setExamForm(prev => ({ ...prev, collaborators: [...prev.collaborators, teacherId] }));
    setTeacherSearch('');
  };

  const removeCollaborator = (teacherId) => {
    setExamForm(prev => ({ ...prev, collaborators: prev.collaborators.filter(id => id !== teacherId) }));
  };

  // ==========================================
  // DIRECT CROSS-DEPLOYMENT MANAGEMENT ENGINE
  // ==========================================
  const openDeploymentModal = (id) => {
    setDeployingExamId(id);
    setSeriesAssignForm({ selectedSeries: [], schedulingMode: 'global', globalSchedule: { start: '', end: '' }, customSchedules: {} });
    setIsSeriesModalOpen(true);
  };

  const processSeriesItemSelect = (seriesId) => {
    setSeriesAssignForm(prev => {
      const match = prev.selectedSeries.includes(seriesId);
      const updated = match ? prev.selectedSeries.filter(id => id !== seriesId) : [...prev.selectedSeries, seriesId];
      const customConfig = { ...prev.customSchedules };
      if (!match && !customConfig[seriesId]) customConfig[seriesId] = { start: '', end: '' };
      return { ...prev, selectedSeries: updated, customSchedules: customConfig };
    });
  };

  const configureDistributionSchedules = (mode, field, val, targetId = null) => {
    setSeriesAssignForm(prev => {
      if (mode === 'global') return { ...prev, globalSchedule: { ...prev.globalSchedule, [field]: val } };
      else return { ...prev, customSchedules: { ...prev.customSchedules, [targetId]: { ...prev.customSchedules[targetId], [field]: val } } };
    });
  };

  const commitDeploymentConfiguration = async () => {
    if (seriesAssignForm.selectedSeries.length === 0) return alert("Select destination targets first.");
    setIsSaving(true);
    try {
      for (const seriesId of seriesAssignForm.selectedSeries) {
        const seriesDocRef = doc(db, 'test_series', seriesId);
        const seriesSnap = await getDoc(seriesDocRef);
        if (seriesSnap.exists()) {
          const targetArray = seriesSnap.data().tests || [];
          let subUnlock = seriesAssignForm.schedulingMode === 'global' ? seriesAssignForm.globalSchedule.start : seriesAssignForm.customSchedules[seriesId]?.start || '';
          let subDeadline = seriesAssignForm.schedulingMode === 'global' ? seriesAssignForm.globalSchedule.end : seriesAssignForm.customSchedules[seriesId]?.end || '';

          const recordIndex = targetArray.findIndex(item => item.testId === deployingExamId);
          const metaPayload = { testId: deployingExamId, testUnlockDate: subUnlock, testDeadlineDate: subDeadline };

          if (recordIndex > -1) targetArray[recordIndex] = metaPayload;
          else targetArray.push(metaPayload);

          await updateDoc(seriesDocRef, { tests: targetArray });
        }
      }
      alert("Exam mapped to the selected Test Series!");
      setIsSeriesModalOpen(false);
    } catch (err) {
      alert(`Pipeline error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // COMPUTE & PAGINATION 
  // ==========================================
  const totalPages = Math.ceil(mockTests.length / itemsPerPage);
  const runtimeViewChunk = useMemo(() => {
    const baselineIdx = (currentPage - 1) * itemsPerPage;
    return mockTests.slice(baselineIdx, baselineIdx + itemsPerPage);
  }, [mockTests, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [viewMode]);

  // ==========================================
  // RENDER UI 
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090E1A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-amber-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Forge Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-[1400px] w-full mx-auto relative pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Design exam content and layout. Timers are set in the Series Architect.</p>
        </div>
        {!isExamFormOpen && (
          <button onClick={() => triggerFormOpen()} className="px-6 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-200 transition-all shrink-0">
            Create Blueprint <ArrowRight size={14} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isExamFormOpen ? (
          /* ====================================================================
             WORKSPACE: BLUEPRINT ARCHITECT FORM
             ==================================================================== */
          <motion.form 
            key="form" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }}
            onSubmit={commitFormToDatabase} className="max-w-[1200px] mx-auto w-full pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-right-8 duration-500">
              
              {/* LEFT COLUMN */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className={labelPremiumClass}>Exam Blueprint Title {editingId && <span className="text-amber-500 ml-2">(EDITING)</span>}</label>
                  <input required name="title" value={examForm.title} onChange={handleFormInput} className={inputBase} placeholder="Ex: Master N3 Vocabulary Final" />
                </div>

                <div className="space-y-3">
                  <label className={labelPremiumClass}>Description Context</label>
                  <textarea name="description" value={examForm.description} onChange={handleFormInput} className={`${inputBase} min-h-[100px] resize-y`} placeholder="Brief description..." />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Pre-Flight Key</label>
                    <input required name="accessKey" value={examForm.accessKey} onChange={handleFormInput} className={`${inputBase} uppercase font-mono tracking-widest text-amber-400`} placeholder="EXAM-KEY" />
                  </div>
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Launch Model</label>
                    <button type="button" onClick={() => setExamForm({...examForm, mode: examForm.mode === 'auto' ? 'manual' : 'auto'})} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${examForm.mode === 'auto' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/10' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'}`}>
                      {examForm.mode === 'auto' ? <><Clock size={14}/> Auto-Start</> : <><ShieldAlert size={14}/> Manual Lock</>}
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/10 space-y-4">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 flex items-center gap-2"><Settings size={14}/> Visual Identity Colors</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] uppercase font-bold text-slate-500 mb-2 ml-2">Gradient Start</p>
                      <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleFormInput} className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent" />
                    </div>
                    <div>
                      <p className="text-[8px] uppercase font-bold text-slate-500 mb-2 ml-2">Gradient End</p>
                      <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleFormInput} className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent" />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-8 flex flex-col">
                <div className="space-y-3 flex-1 flex flex-col">
                  <label className={labelPremiumClass}>Collaborators (Senseis)</label>
                  <div className="flex-1 bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800 shadow-inner flex flex-col space-y-6">
                    
                    <div className="flex gap-2">
                      <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 text-xs text-white font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Search Sensei..." />
                      <button type="button" className="bg-indigo-600 p-4 rounded-xl text-white hover:bg-indigo-500 transition-all"><Search size={16}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[150px]">
                      {teacherSearch.length === 0 ? (
                        <p className="text-[9px] uppercase font-black text-center mt-6 tracking-widest text-slate-600">Type to search registry</p>
                      ) : foundTeachers.length === 0 ? (
                        <p className="text-[9px] uppercase font-black text-center mt-6 tracking-widest text-rose-500">No matching Sensei found</p>
                      ) : (
                        foundTeachers.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                            <div>
                              <p className="text-xs font-black text-white">{t.name}</p>
                              <p className="text-[8px] font-bold text-slate-500 tracking-wider">{t.email}</p> 
                            </div>
                            <button type="button" onClick={() => addCollaborator(t.id)} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"><Plus size={14} /></button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                      <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                        <Shield size={10}/> Lead (You)
                      </span>
                      <AnimatePresence>
                        {examForm.collaborators.map(teacherId => {
                          const t = teacherList.find(x => x.id === teacherId);
                          if (!t) return null;
                          return (
                            <motion.span layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} key={t.id} className="bg-slate-800 text-white border border-slate-700 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                              {t.name}
                              <X size={10} className="cursor-pointer hover:text-rose-500 ml-0.5" onClick={() => removeCollaborator(t.id)} />
                            </motion.span>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className={labelPremiumClass}>Integrity Rules</label>
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Entry Lockout</h4>
                        <p className="text-[9px] text-slate-500 mt-1">Deny late joiners after start.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleFormInput} className="sr-only peer" />
                        <div className="w-10 h-5 bg-[#0B1120] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 transition-all peer-checked:bg-rose-500 border-slate-700"></div>
                      </label>
                    </div>

                    {examForm.entryLockout && (
                      <div className="flex items-center gap-3 p-2 rounded-xl bg-[#0B1120] border border-slate-800">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 pl-2">Lock Room After:</span>
                        <input type="number" name="lockoutMinutes" value={examForm.lockoutMinutes} onChange={handleFormInput} className="w-16 p-2 rounded-lg bg-[#0D1527] text-white text-center text-xs font-black outline-none focus:border-rose-500" min="1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Mins</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Smaller Action Buttons at Footer */}
            <div className="flex gap-4 sticky bottom-6 z-30 bg-[#090E1A]/95 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl max-w-xl mx-auto mt-10">
              <button type="button" onClick={closeForm} className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">Discard</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editingId ? 'Update Blueprint' : 'Save Blueprint'}
              </button>
            </div>
          </motion.form>

        ) : (
          /* ====================================================================
             WORKSPACE: LIST & GRID DASHBOARD (Compact & Manageable)
             ==================================================================== */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1120] p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Filter size={12} className="text-amber-500"/> Blueprint Library
              </div>
              <div className="flex items-center gap-1 bg-[#090E1A] border border-slate-800 rounded-lg p-1">
                <button type="button" onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={14}/></button>
                <button type="button" onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}><LayoutList size={14}/></button>
              </div>
            </div>

            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-2"}>
              {runtimeViewChunk.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center text-center col-span-full">
                  <Target size={32} className="text-slate-700 mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Blueprints Found</p>
                </div>
              ) : (
                runtimeViewChunk.map((test) => {
                  
                  // ================= COMPACT LIST VIEW ================= //
                  if (viewMode === 'list') {
                    return (
                      <div key={test.id} className="pl-3 pr-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-center justify-between gap-4 group">
                        
                        <div className="flex items-center gap-3 w-full md:w-[35%] shrink-0">
                          <div className="w-1 h-8 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-white truncate leading-tight">{test.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border text-indigo-400 bg-indigo-500/10 border-indigo-500/20">Blueprint</span>
                              <span className="text-[9px] text-slate-500 font-mono truncate">{test.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-between flex-1 px-4 border-x border-slate-800/60 max-w-lg">
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Access Key</span>
                            <span className="text-xs font-mono font-bold text-amber-500">{test.accessKey || 'UNSET'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Mode</span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase">{test.mode}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Staff</span>
                            <span className="text-[10px] font-bold text-slate-300">{test.collaborators?.length || 0} Assigned</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 w-full md:w-auto shrink-0 justify-end">
                          <button onClick={() => triggerFormOpen(test)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors" title="Edit"><Edit2 size={13}/></button>
                          <button onClick={() => openDeploymentModal(test.id)} className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors" title="Deploy"><Send size={13}/></button>
                          <button onClick={() => removeExamInstance(test.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors" title="Drop"><Trash2 size={13}/></button>
                          <div className="w-px h-5 bg-slate-800 mx-1"></div>
                          <button onClick={() => alert("Launching Forge Architect...")} className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md"><PenTool size={11}/> Forge</button>
                        </div>
                      </div>
                    );
                  }

                  // ================= COMPACT GRID VIEW ================= //
                  return (
                    <div key={test.id} className="p-5 rounded-2xl bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between group">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 rounded-full" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                            <div>
                              <h4 className="text-base font-bold text-white tracking-tight leading-tight">{test.title}</h4>
                              <span className="text-[9px] font-mono text-slate-500 mt-1 block">ID: {test.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-[#0D1527] border border-slate-800/80">
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-500 mb-0.5">Access Key</p>
                            <p className="text-xs font-mono font-bold text-amber-400">{test.accessKey || 'UNSET'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase text-slate-500 mb-0.5">Mode</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase">{test.mode}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-800/60">
                        <button onClick={() => triggerFormOpen(test)} className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase flex items-center justify-center gap-1.5"><Edit2 size={11}/> Edit</button>
                        <button onClick={() => openDeploymentModal(test.id)} className="py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-[9px] font-black uppercase flex items-center justify-center gap-1.5"><Send size={11}/> Deploy</button>
                        <button onClick={() => removeExamInstance(test.id)} className="py-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 text-[9px] font-black uppercase flex items-center justify-center"><Trash2 size={12}/></button>
                        <button onClick={() => alert("Launching Forge...")} className="py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1"><PenTool size={11}/> Forge</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft size={14}/></button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-[10px] font-black ${currentPage === page ? 'bg-amber-500 text-white shadow-md' : 'bg-[#0B1120] border border-slate-800 text-slate-500 hover:border-slate-700'}`}>{page}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight size={14}/></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
         MODAL: DEPLOYMENT MATRIX (UNCHANGED)
         ==================================================================== */}
      <AnimatePresence>
        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[2rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden z-10">
              
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0D1527]/40">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2"><Send size={18} className="text-indigo-500"/> Blueprint Deployment Routing</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Assign this exam to active test series containers.</p>
                </div>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"><X size={14}/></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">Step 1: Select Target Series</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {testSeriesList.map(series => {
                      const activeSelection = seriesAssignForm.selectedSeries.includes(series.id);
                      return (
                        <div key={series.id} onClick={() => processSeriesItemSelect(series.id)} className={`p-4 rounded-xl border cursor-pointer transition-all ${activeSelection ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527] border-slate-800 hover:border-slate-700'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`font-bold text-xs mb-1 ${activeSelection ? 'text-indigo-400' : 'text-slate-200'}`}>{series.title}</p>
                              <p className="text-[8px] font-black text-slate-500 uppercase">Batches: {series.batches?.length || 0}</p>
                            </div>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${activeSelection ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700'}`}>
                              {activeSelection && <Check size={10} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {testSeriesList.length === 0 && (
                      <div className="col-span-full py-6 text-center border-2 border-dashed border-slate-800 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">No Series Available.</p>
                      </div>
                    )}
                  </div>
                </div>

                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 border-t border-slate-800 pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-400 ml-1">Step 2: Deployment Timeline</h4>
                      <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0">
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'global' }))} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Uniform</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'custom' }))} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Custom</button>
                      </div>
                    </div>

                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1.5">Global Unlock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => configureDistributionSchedules('global', 'start', e.target.value)} className="w-full p-3 rounded-lg bg-[#0B1120] border border-slate-700 text-white text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1.5">Global Expiration</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => configureDistributionSchedules('global', 'end', e.target.value)} className="w-full p-3 rounded-lg bg-[#0B1120] border border-slate-700 text-white text-xs outline-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const sData = testSeriesList.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                              <h5 className="text-[10px] font-black text-indigo-400 mb-3 truncate">{sData?.title}</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">Unlock</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => configureDistributionSchedules('custom', 'start', e.target.value, seriesId)} className="w-full p-2.5 rounded-lg bg-[#0B1120] border border-slate-700 text-white text-[10px] outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-black uppercase text-slate-500 mb-1">Expiration</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => configureDistributionSchedules('custom', 'end', e.target.value, seriesId)} className="w-full p-2.5 rounded-lg bg-[#0B1120] border border-slate-700 text-white text-[10px] outline-none" />
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

              <div className="p-5 border-t border-slate-800 bg-[#0B1120] flex justify-end gap-3">
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-800 hover:text-white">Cancel</button>
                <button type="button" onClick={commitDeploymentConfiguration} disabled={seriesAssignForm.selectedSeries.length === 0 || isSaving} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase disabled:opacity-30 flex items-center gap-2">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Execute Deployment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}