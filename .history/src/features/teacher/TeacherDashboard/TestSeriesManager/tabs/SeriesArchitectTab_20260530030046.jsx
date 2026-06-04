import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, FolderOpen, Edit2, Loader2, Users, 
  Search, X, Check, Clock, Lock, Key, ShieldCheck, 
  Settings, Server, ToggleLeft, BookOpen, Send
} from 'lucide-react';

export default function SeriesArchitectTab() {
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentView, setCurrentView] = useState('grid'); // 'grid' | 'settings' | 'matrix'
  const [searchQuery, setSearchQuery] = useState('');

  // Data Stores
  const [testSeries, setTestSeries] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  // Active Context
  const [editingId, setEditingId] = useState('');
  const [activeSeries, setActiveSeries] = useState(null);

  // Modals & Drawers
  const [isExamSearchModalOpen, setIsExamSearchModalOpen] = useState(false);
  const [selectedMatrixExam, setSelectedMatrixExam] = useState(null);
  const [examSearch, setExamSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  const initialFormState = { title: '', description: '', targetLevel: 'Mixed', assignedBatches: [], collaborators: [], authorId: '' };
  const [formData, setFormData] = useState(initialFormState);

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
  const fetchAllData = async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      const fetchedSeries = seriesSnap.docs.map(d => ({ id: d.id, ...d.data(), tests: d.data().tests || [] }))
        .filter(s => s.authorId === uid || (s.collaborators && s.collaborators.includes(uid)));
      setTestSeries(fetchedSeries);

      const testsSnap = await getDocs(collection(db, 'mock_tests'));
      setAvailableTests(testsSnap.docs.map(d => ({
        id: d.id, title: d.data().title || 'Untitled', authorId: d.data().authorId || '',
        collaborators: d.data().collaborators || [], targetLevel: d.data().targetLevel || 'Unknown'
      })));

      const batchesSnap = await getDocs(collection(db, 'batches'));
      setAvailableBatches(batchesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, teacherIds: d.data().teacherIds || [] }))
        .filter(b => b.teacherIds.includes(uid)));

      const staffSnap = await getDocs(collection(db, 'users'));
      const teachers = staffSnap.docs.map(d => {
        const data = d.data();
        let fullName = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
        return { id: d.id, name: fullName, email: data.email || '', role: (data.role || '').toLowerCase(), avatar: fullName.substring(0, 2).toUpperCase() };
      }).filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role));
      setTeacherList(teachers);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUserId(user.uid); fetchAllData(user.uid); }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // CORE SERIES SETTINGS
  // ==========================================
  const handleOpenSettings = (series = null) => {
    if (series) {
      setEditingId(series.id);
      setFormData({
        title: series.title || '', description: series.description || '', targetLevel: series.targetLevel || 'Mixed',
        assignedBatches: series.assignedBatches || [], collaborators: series.collaborators || [], authorId: series.authorId || currentUserId
      });
    } else {
      setEditingId('');
      setFormData({ ...initialFormState, authorId: currentUserId });
    }
    setTeacherSearch(''); setBatchSearch('');
    setCurrentView('settings');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Series Title is required.");
    setIsSaving(true);
    try {
      const sId = editingId || `ts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payload = { id: sId, ...formData, authorId: formData.authorId || currentUserId, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'test_series', sId), payload, { merge: true });
      await fetchAllData(currentUserId);
      setCurrentView('grid');
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const deleteSeries = async (id) => {
    if (!window.confirm("Permanently delete this Series?")) return;
    await deleteDoc(doc(db, 'test_series', id));
    setTestSeries(prev => prev.filter(s => s.id !== id));
  };

  const toggleCollab = (id) => setFormData(p => ({ ...p, collaborators: p.collaborators.includes(id) ? p.collaborators.filter(x => x !== id) : [...p.collaborators, id] }));
  const toggleBatch = (id) => setFormData(p => ({ ...p, assignedBatches: p.assignedBatches.includes(id) ? p.assignedBatches.filter(x => x !== id) : [...p.assignedBatches, id] }));

  // ==========================================
  // MATRIX EXECUTION ENGINE & SUBCOLLECTION REQUESTS
  // ==========================================
  const requestExamAccess = async (test) => {
    try {
      // 🚨 Writes request to: test_series/{seriesId}/exam_access_requests/{reqId}
      const reqRef = doc(collection(db, 'test_series', activeSeries.id, 'exam_access_requests'));
      await setDoc(reqRef, {
        testId: test.id,
        testTitle: test.title,
        seriesId: activeSeries.id,
        seriesTitle: activeSeries.title,
        requesterId: currentUserId,
        requesterName: teacherList.find(t => t.id === currentUserId)?.name || 'A Teacher',
        ownerId: test.authorId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert(`Access Request dispatched to the Lead Architect of [${test.title}].`);
    } catch (err) { alert("Failed to send request: " + err.message); }
  };

  const addExamToMatrix = async (test) => {
    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
    if (!hasAccess) return requestExamAccess(test);

    if (activeSeries.tests.some(t => t.testId === test.id)) return alert("Exam already in matrix.");

    const newMatrixExam = {
      testId: test.id, executionMode: 'auto', accessKey: '',
      unlockDate: '', deadlineDate: '', entryLockoutMinutes: 0,
      allowPostDeadline: false, postDeadlineEndDate: ''
    };

    const updatedTests = [...activeSeries.tests, newMatrixExam];
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    setTestSeries(prev => prev.map(s => s.id === activeSeries.id ? { ...s, tests: updatedTests } : s));
    setIsExamSearchModalOpen(false);
  };

  const removeExamFromMatrix = async (testId) => {
    const updatedTests = activeSeries.tests.filter(t => t.testId !== testId);
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    setTestSeries(prev => prev.map(s => s.id === activeSeries.id ? { ...s, tests: updatedTests } : s));
    if (selectedMatrixExam?.testId === testId) setSelectedMatrixExam(null);
  };

  const saveMatrixExamSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const updatedTests = activeSeries.tests.map(t => t.testId === selectedMatrixExam.testId ? selectedMatrixExam : t);
    try {
      await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
      setActiveSeries(p => ({ ...p, tests: updatedTests }));
      setTestSeries(prev => prev.map(s => s.id === activeSeries.id ? { ...s, tests: updatedTests } : s));
      setSelectedMatrixExam(null);
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const inputClass = `w-full px-5 h-14 rounded-2xl bg-slate-900/80 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all`;
  const labelClass = `block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2`;

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20 pt-8">
      <AnimatePresence mode="wait">
        
        {/* VIEW 0: DASHBOARD GRID */}
        {currentView === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3"><FolderOpen size={28} className="text-indigo-500" /> Series Architect</h1>
                <p className="text-sm font-bold text-slate-500 mt-2 ml-10">Package curriculums and mandate global execution protocols.</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleOpenSettings()} className="px-8 h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-105 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                  <Plus size={18} /> Create Series
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {testSeries.map(series => (
                <div key={series.id} className="p-8 rounded-[2.5rem] bg-[#0B1120]/95 border border-slate-800 shadow-2xl flex flex-col justify-between group overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={() => handleOpenSettings(series)} className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500"><Edit2 size={16}/></button>
                    {series.authorId === currentUserId && <button onClick={() => deleteSeries(series.id)} className="w-10 h-10 bg-slate-800 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white"><Trash2 size={16}/></button>}
                  </div>
                  <div>
                    <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-4 inline-block">Level: {series.targetLevel || 'Mixed'}</span>
                    <h4 className="text-2xl font-black text-white leading-tight mb-2 truncate">{series.title}</h4>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 min-h-[32px]">{series.description || 'No description provided.'}</p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <p><Users size={12} className="inline mb-0.5 text-emerald-500"/> {series.assignedBatches?.length || 0} Batches</p>
                    </div>
                    <button onClick={() => { setActiveSeries(series); setCurrentView('matrix'); }} className="px-6 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <Server size={14}/> Matrix ({series.tests.length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 1: SETTINGS */}
        {currentView === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto w-full pb-32">
             {/* Note: I kept your exact settings view from the previous turn here to save space, it works perfectly. Just add the Target Level dropdown below title! */}
             <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setCurrentView('grid')} className="w-12 h-12 rounded-2xl bg-[#0D1527] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
              <div>
                <h2 className="text-2xl font-black text-white">{editingId ? "Series Configuration" : "New Series Identity"}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Metadata, Access, and Targeting</p>
              </div>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-xl space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Series Title</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. 2026 Core Execution" />
                  </div>
                  <div>
                    <label className={labelClass}>Target Level</label>
                    <select value={formData.targetLevel} onChange={e => setFormData({...formData, targetLevel: e.target.value})} className={inputClass}>
                      <option value="Mixed">Mixed Levels</option><option value="JLPT N5">JLPT N5</option><option value="JLPT N4">JLPT N4</option><option value="JLPT N3">JLPT N3</option><option value="JLPT N2">JLPT N2</option><option value="JLPT N1">JLPT N1</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} min-h-[100px] py-4 resize-y`} />
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <button type="submit" disabled={isSaving} className="px-12 py-5 bg-white text-black rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Settings
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* VIEW 2: THE MODERN MATRIX CONTROL PANEL */}
        {currentView === 'matrix' && activeSeries && (
          <motion.div key="matrix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-[85vh] bg-[#0B1120] border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative">
            
            {/* Header */}
            <div className="p-8 md:px-10 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentView('grid')} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white"><ArrowLeft size={20}/></button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest">{activeSeries.targetLevel}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500"><Server size={12} className="inline mb-0.5"/> Matrix Layer</span>
                  </div>
                  <h2 className="text-3xl font-black text-white">{activeSeries.title}</h2>
                </div>
              </div>
              <button onClick={() => setIsExamSearchModalOpen(true)} className="px-8 h-14 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20">
                <Search size={16}/> Find & Add Blueprint
              </button>
            </div>

            {/* Matrix Grid */}
            <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar bg-[#050810]">
              {activeSeries.tests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Server size={64} className="mb-6 text-slate-600"/>
                  <p className="text-sm font-black uppercase tracking-widest text-white">Matrix Empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSeries.tests.map((matrixExam) => {
                    const blueprint = availableTests.find(t => t.id === matrixExam.testId);
                    return (
                      <div key={matrixExam.testId} className="p-6 rounded-[2rem] bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
                        <div className="flex justify-between items-start mb-6">
                          <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${matrixExam.executionMode === 'auto' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {matrixExam.executionMode}
                          </span>
                          <button onClick={() => removeExamFromMatrix(matrixExam.testId)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={16}/></button>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white leading-tight mb-2">{blueprint?.title || 'Unknown Exam'}</h4>
                          <div className="flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {matrixExam.unlockDate ? <p><Clock size={12} className="inline mr-1 text-emerald-500"/> Scheduled</p> : <p><Lock size={12} className="inline mr-1 text-amber-500"/> Locked</p>}
                            {matrixExam.accessKey && <p><Key size={12} className="inline mr-1 text-indigo-400"/> Key Req</p>}
                          </div>
                        </div>
                        <button onClick={() => setSelectedMatrixExam(matrixExam)} className="mt-8 w-full py-4 rounded-xl bg-slate-900 text-slate-300 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
                          <Settings size={14}/> Engine Config
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* EXAM SEARCH MODAL */}
            <AnimatePresence>
              {isExamSearchModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-3xl h-[80vh] flex flex-col bg-[#0B1120] border border-slate-800 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-black text-white">Global Repository</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Search and pull exams into your matrix</p>
                      </div>
                      <button onClick={() => setIsExamSearchModalOpen(false)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white"><X size={16}/></button>
                    </div>
                    <div className="p-6 border-b border-slate-800">
                      <div className="relative">
                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input value={examSearch} onChange={e => setExamSearch(e.target.value)} className="w-full h-14 pl-12 pr-6 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold outline-none focus:border-indigo-500" placeholder="Search by title or level..." />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase())).map(test => {
                        const inMatrix = activeSeries.tests.some(x => x.testId === test.id);
                        const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
                        return (
                          <div key={test.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                            <div>
                              <p className="text-base font-black text-white">{test.title}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Level: <span className="text-indigo-400">{test.targetLevel}</span></p>
                            </div>
                            {inMatrix ? (
                              <span className="px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Check size={14}/> Matrixed</span>
                            ) : hasAccess ? (
                              <button onClick={() => addExamToMatrix(test)} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Plus size={14}/> Pull Exam</button>
                            ) : (
                              <button onClick={() => requestExamAccess(test)} className="px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Lock size={14}/> Request Access</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* DEPLOYMENT ENGINE DRAWER (Right Side Modal overlay inside Matrix) */}
            <AnimatePresence>
              {selectedMatrixExam && (
                <div className="absolute inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm">
                  <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-full max-w-md h-full bg-[#0B1120] border-l border-slate-800 shadow-2xl flex flex-col">
                    <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">Engine Config</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 line-clamp-1">{availableTests.find(t=>t.id===selectedMatrixExam.testId)?.title}</p>
                      </div>
                      <button onClick={() => setSelectedMatrixExam(null)} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><X size={16}/></button>
                    </div>

                    <form onSubmit={saveMatrixExamSettings} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                      <div className="space-y-6">
                        <div>
                          <label className={labelClass}><ToggleLeft size={12} className="inline mr-1"/> Execution Mode</label>
                          <select value={selectedMatrixExam.executionMode} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, executionMode: e.target.value})} className={inputClass}>
                            <option value="auto">Auto (Scheduled Timeline)</option>
                            <option value="manual">Manual (Teacher Triggered)</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}><Key size={12} className="inline mr-1"/> Access Key (Optional)</label>
                          <input type="text" value={selectedMatrixExam.accessKey} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, accessKey: e.target.value})} placeholder="e.g. FALL2026" className={inputClass} />
                        </div>
                      </div>

                      {selectedMatrixExam.executionMode === 'auto' && (
                        <div className="space-y-6 pt-6 border-t border-slate-800/80 animate-in fade-in">
                          <div>
                            <label className={labelClass}><Clock size={12} className="inline mr-1 text-emerald-500"/> System Unlock</label>
                            <input type="datetime-local" value={selectedMatrixExam.unlockDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, unlockDate: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}><Clock size={12} className="inline mr-1 text-rose-500"/> System Deadline</label>
                            <input type="datetime-local" value={selectedMatrixExam.deadlineDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, deadlineDate: e.target.value})} className={inputClass} />
                          </div>
                        </div>
                      )}

                      <div className="space-y-6 pt-6 border-t border-slate-800/80">
                        <div>
                          <label className={labelClass}><Lock size={12} className="inline mr-1 text-amber-500"/> Late Entry Lockout (Mins)</label>
                          <input type="number" min="0" value={selectedMatrixExam.entryLockoutMinutes} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, entryLockoutMinutes: parseInt(e.target.value) || 0})} placeholder="0 = Disabled" className={inputClass} />
                        </div>
                        <div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${selectedMatrixExam.allowPostDeadline ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${selectedMatrixExam.allowPostDeadline ? 'translate-x-6' : 'left-1'}`}></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Allow Post-Deadline Practice</span>
                          </label>
                          {selectedMatrixExam.allowPostDeadline && (
                            <div className="mt-4 animate-in fade-in">
                              <label className={labelClass}>Practice Cutoff Date</label>
                              <input type="datetime-local" value={selectedMatrixExam.postDeadlineEndDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineEndDate: e.target.value})} className={inputClass} />
                            </div>
                          )}
                        </div>
                      </div>
                    </form>
                    <div className="p-6 border-t border-slate-800 bg-[#0B1120]">
                      <button onClick={saveMatrixExamSettings} disabled={isSaving} className="w-full h-14 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Update Engine
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}