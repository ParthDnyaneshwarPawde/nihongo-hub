import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, FolderOpen, Edit2, Loader2, Users, 
  Search, X, Check, Clock, Lock, Key, ShieldCheck, 
  Settings, Server, ToggleLeft, BookOpen, Send, ShieldAlert, Globe,
  Repeat
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

  const initialFormState = { 
    title: '', 
    description: '', 
    targetLevel: 'Mixed', 
    assignedBatches: [], 
    collaborators: [], 
    authorId: '' 
  };
  const [formData, setFormData] = useState(initialFormState);

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
  const fetchAllData = async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      // 1. Fetch Series (Strict Security: Only load if Author or Collab)
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      const fetchedSeries = seriesSnap.docs.map(d => ({ 
        id: d.id, ...d.data(), tests: d.data().tests || [] 
      })).filter(s => s.authorId === uid || (s.collaborators && s.collaborators.includes(uid)));
      setTestSeries(fetchedSeries);

      // 2. Fetch Blueprints (For Matrix Search & Add)
      const testsSnap = await getDocs(collection(db, 'mock_tests'));
      setAvailableTests(testsSnap.docs.map(d => ({
        id: d.id, 
        title: d.data().title || 'Untitled', 
        authorId: d.data().authorId || '',
        collaborators: d.data().collaborators || [], 
        targetLevel: d.data().targetLevel || 'Unknown'
      })));

      // 3. Fetch Batches (Strictly where user is in teacherIds)
      const batchesSnap = await getDocs(collection(db, 'batches'));
      setAvailableBatches(batchesSnap.docs.map(d => ({ 
        id: d.id, 
        name: d.data().name || d.id, 
        teacherIds: d.data().teacherIds || [] 
      })).filter(b => b.teacherIds.includes(uid)));

      // 4. Fetch Verified Instructors
      const staffSnap = await getDocs(collection(db, 'users'));
      const teachers = staffSnap.docs.map(d => {
        const data = d.data();
        let fullName = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown Sensei';
        const initials = fullName !== 'Unknown Sensei' ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST';
        return { 
          id: d.id, 
          name: fullName, 
          email: data.email || '', 
          role: (data.role || 'student').toLowerCase(), 
          avatar: initials 
        };
      }).filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role));
      setTeacherList(teachers);

    } catch (error) { console.error("Data Sync Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) { setCurrentUserId(user.uid); fetchAllData(user.uid); }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // CORE SERIES SETTINGS (Metadata, Collabs, Batches)
  // ==========================================
  const handleOpenSettings = (series = null) => {
    if (series) {
      setEditingId(series.id);
      setFormData({
        title: series.title || '', 
        description: series.description || '', 
        targetLevel: series.targetLevel || 'Mixed',
        assignedBatches: series.assignedBatches || [], 
        collaborators: series.collaborators || [], 
        authorId: series.authorId || currentUserId
      });
    } else {
      setEditingId('');
      setFormData({ ...initialFormState, collaborators: [currentUserId], authorId: currentUserId });
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
      const payload = { 
        id: sId, 
        ...formData, 
        authorId: formData.authorId || currentUserId, 
        updatedAt: new Date().toISOString() 
      };
      await setDoc(doc(db, 'test_series', sId), payload, { merge: true });
      await fetchAllData(currentUserId);
      setCurrentView('grid');
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const deleteSeries = async (id) => {
    if (!window.confirm("Permanently delete this Series and all its matric assignments?")) return;
    await deleteDoc(doc(db, 'test_series', id));
    setTestSeries(prev => prev.filter(s => s.id !== id));
  };

  // Safe Adders
  const toggleCollab = (id) => setFormData(p => ({ ...p, collaborators: p.collaborators.includes(id) ? p.collaborators.filter(x => x !== id) : [...p.collaborators, id] }));
  const toggleBatch = (id) => setFormData(p => ({ ...p, assignedBatches: p.assignedBatches.includes(id) ? p.assignedBatches.filter(x => x !== id) : [...p.assignedBatches, id] }));

  // Search Logic for Collabs
  const foundTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return [];
    return teacherList.filter(t => 
      t.id !== currentUserId && 
      !formData.collaborators.includes(t.id) &&
      (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase())))
    );
  }, [teacherSearch, teacherList, formData.collaborators, currentUserId]);

  // ==========================================
  // MATRIX EXECUTION ENGINE & SUBCOLLECTION REQUESTS
  // ==========================================
const requestExamAccess = async (test) => {
    try {
      // 🚨 FIX: Moved to a Root Collection to bypass Firebase Index requirements!
      const reqRef = doc(collection(db, 'exam_access_requests'));
      await setDoc(reqRef, {
        testId: test.id,
        testTitle: test.title,
        seriesId: activeSeries.id,
        seriesTitle: activeSeries.title,
        requesterId: currentUserId,
        requesterName: teacherList.find(t => t.id === currentUserId)?.name || 'Authorized Instructor',
        ownerId: test.authorId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert(`Access Request dispatched to the Lead Architect of [${test.title}]. You will be notified when they approve it in the Exam Forge.`);
    } catch (err) { alert("Failed to send request: " + err.message); }
  };

  const addExamToMatrix = async (test) => {
    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
    if (!hasAccess) return requestExamAccess(test);

    if (activeSeries.tests.some(t => t.testId === test.id)) return alert("Exam already exists in this matrix.");

    // The Comprehensive Matrix Exam Payload
    const newMatrixExam = {
      testId: test.id, 
      executionMode: 'auto', 
      accessKey: '',
      unlockDate: '', 
      deadlineDate: '', 
      entryLockoutMinutes: 0,
      allowPostDeadline: false, 
      postDeadlineEndDate: '',
      postDeadlineAttempts: 1
    };

    const updatedTests = [...activeSeries.tests, newMatrixExam];
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    setTestSeries(prev => prev.map(s => s.id === activeSeries.id ? { ...s, tests: updatedTests } : s));
  };

  const removeExamFromMatrix = async (testId) => {
    if (!window.confirm("Remove this exam from the series matrix?")) return;
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

  // ==========================================
  // UI HELPERS
  // ==========================================
  const inputClass = `w-full px-5 h-14 rounded-2xl bg-slate-900/80 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner`;
  const labelClass = `block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2`;
  const formatDeployDate = (dateStr) => {
    if (!dateStr) return 'Not Set';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20 pt-8">
      <AnimatePresence mode="wait">
        
        {/* =========================================
            VIEW 0: DASHBOARD GRID
            ========================================= */}
        {currentView === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3"><FolderOpen size={28} className="text-indigo-500" /> Series Architect</h1>
                <p className="text-sm font-bold text-slate-500 mt-2 ml-10">Package curriculums and mandate global execution protocols.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-72 h-14 px-4 rounded-[1.5rem] bg-[#0D1527] border border-slate-800 flex items-center gap-3">
                  <Search size={18} className="text-slate-500" />
                  <input type="text" placeholder="Search series..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-white w-full" />
                </div>
                <button onClick={() => handleOpenSettings()} className="px-8 h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-105 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                  <Plus size={18} /> Create Series
                </button>
              </div>
            </div>

            {testSeries.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-[3rem] bg-[#0A0E17]/50">
                <FolderOpen size={64} className="text-slate-700 mb-6"/>
                <p className="text-lg font-black text-white uppercase tracking-widest">No Series Established</p>
                <p className="text-sm text-slate-500 font-bold mt-2">Create your first test series to begin routing exams to students.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {testSeries.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(series => (
                  <div key={series.id} className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/95 border border-slate-800 shadow-2xl flex flex-col justify-between group overflow-hidden relative transition-all hover:border-indigo-500/50">
                    <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <button onClick={() => handleOpenSettings(series)} className="w-12 h-12 bg-slate-900 border border-slate-700 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-indigo-500 hover:border-indigo-500 hover:text-white transition-all shadow-lg"><Edit2 size={18}/></button>
                      {series.authorId === currentUserId && <button onClick={() => deleteSeries(series.id)} className="w-12 h-12 bg-slate-900 border border-slate-700 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 hover:text-white transition-all shadow-lg"><Trash2 size={18}/></button>}
                    </div>
                    
                    <div>
                      <span className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 inline-block">Target: {series.targetLevel || 'Mixed'}</span>
                      <h4 className="text-2xl font-black text-white leading-tight mb-3 pr-12">{series.title}</h4>
                      <p className="text-sm text-slate-400 font-medium line-clamp-2 min-h-[40px] leading-relaxed">{series.description || 'No description provided.'}</p>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-800 flex justify-between items-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex flex-col gap-1">
                        <p><Users size={14} className="inline mb-0.5 mr-1 text-emerald-500"/> {series.assignedBatches?.length || 0} Batches</p>
                        <p><ShieldCheck size={14} className="inline mb-0.5 mr-1 text-indigo-500"/> {series.collaborators?.length || 1} Staff</p>
                      </div>
                      <button onClick={() => { setActiveSeries(series); setCurrentView('matrix'); }} className="px-8 h-12 rounded-[1.5rem] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-inner">
                        <Server size={16}/> Matrix ({series.tests.length})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================
            VIEW 1: CORE SETTINGS & ROUTING
            ========================================= */}
        {currentView === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-[1200px] mx-auto w-full pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800/80 pb-6">
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentView('grid')} className="w-14 h-14 rounded-[1.5rem] bg-[#0D1527] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"><ArrowLeft size={24} /></button>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{editingId ? "Series Configuration" : "New Series Identity"}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Metadata, Access Constraints, and Batch Targeting</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-10">
              
              {/* Core Details */}
              <div className="p-8 md:p-10 rounded-[3rem] bg-[#0B1120] border border-slate-800 shadow-2xl space-y-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-2"><BookOpen size={16} className="text-indigo-500"/> Core Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className={labelClass}>Series Title</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. 2026 Core Execution" />
                  </div>
                  <div>
                    <label className={labelClass}>Target Level</label>
                    <select value={formData.targetLevel} onChange={e => setFormData({...formData, targetLevel: e.target.value})} className={`${inputClass} appearance-none cursor-pointer`}>
                      <option value="Mixed">Mixed Levels</option><option value="JLPT N5">JLPT N5</option><option value="JLPT N4">JLPT N4</option><option value="JLPT N3">JLPT N3</option><option value="JLPT N2">JLPT N2</option><option value="JLPT N1">JLPT N1</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Curriculum Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} min-h-[120px] py-4 resize-y`} placeholder="Provide context to the students about what this series entails..." />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* Batches Configuration */}
                <div className="p-8 md:p-10 rounded-[3rem] bg-[#0B1120] border border-slate-800 shadow-2xl flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-6">
                    <label className={labelClass}><Users size={16} className="inline mr-2 text-emerald-500"/> Batch Targeting</label>
                    <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400">{formData.assignedBatches.length} Selected</span>
                  </div>
                  <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} className={`${inputClass} pl-12 bg-slate-950`} placeholder="Search your batches..." />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-t border-slate-800/80 pt-6">
                    {availableBatches.filter(b => b.name.toLowerCase().includes(batchSearch.toLowerCase())).map(batch => {
                      const isSelected = formData.assignedBatches.includes(batch.id);
                      return (
                        <div key={batch.id} onClick={() => toggleBatch(batch.id)} className={`p-5 rounded-2xl flex items-center justify-between border-2 cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                          <span className={`text-sm font-black ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{batch.name}</span>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {isSelected ? <Check size={16}/> : <Plus size={16}/>}
                          </div>
                        </div>
                      );
                    })}
                    {availableBatches.length === 0 && <p className="text-center text-xs font-bold text-slate-500 mt-10">You have not been assigned to any batches.</p>}
                  </div>
                </div>

                {/* Collabs Configuration (STRICT SECURITY) */}
                <div className="p-8 md:p-10 rounded-[3rem] bg-[#0B1120] border border-slate-800 shadow-2xl flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-6">
                    <label className={labelClass}><ShieldCheck size={16} className="inline mr-2 text-indigo-500"/> Co-Architects</label>
                    <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400">{formData.collaborators.length} Assigned</span>
                  </div>
                  
                  {(!editingId || currentUserId === formData.authorId) ? (
                    <>
                      <div className="flex gap-3 mb-6 relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10"/>
                        <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} onKeyDown={e => {if(e.key==='Enter') e.preventDefault()}} className={`${inputClass} pl-12 bg-slate-950`} placeholder="Search by name or email..." />
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-y border-slate-800/80 py-4 mb-4 min-h-[150px]">
                        {teacherSearch.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <Users size={32} className="text-slate-500 mb-3" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Search Registry</p>
                          </div>
                        ) : foundTeachers.length === 0 ? (
                          <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No Sensei Found</p>
                        ) : (
                          foundTeachers.map(t => (
                            <div key={t.id} className="p-4 rounded-2xl flex items-center justify-between bg-slate-900/50 border border-slate-800">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center text-xs font-black">{t.avatar}</div>
                                <div>
                                  <p className="text-xs font-bold text-white mb-0.5">{t.name}</p>
                                  <p className="text-[9px] font-bold text-slate-500 tracking-wider">{t.email}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => toggleCollab(t.id)} className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all"><Plus size={16}/></button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 mb-6">
                      <ShieldAlert size={40} className="text-indigo-500 mb-4 opacity-50"/>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Security Lock</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 text-center max-w-[200px]">Only the Lead Architect can manage collaborators.</p>
                    </div>
                  )}

                  {/* Active Collabs Render */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest flex items-center shadow-inner">Lead (You)</span>
                    <AnimatePresence>
                      {(formData.collaborators || []).filter(id => id !== currentUserId).map(id => {
                        const t = teacherList.find(x => x.id === id);
                        if (!t) return null;
                        return (
                          <motion.span layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} key={id} className="bg-slate-900 text-slate-300 border border-slate-700 text-[10px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-md">
                            {t.name}
                            {(!editingId || currentUserId === formData.authorId) && <X size={12} className="cursor-pointer text-slate-500 hover:text-rose-500 transition-colors ml-1" onClick={() => toggleCollab(id)}/>}
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              <div className="flex justify-center pt-8">
                <button type="submit" disabled={isSaving} className="w-full md:w-auto md:px-20 h-16 bg-white text-black rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {editingId ? "Update Series Core" : "Initialize Series"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* =========================================
            VIEW 2: THE MODERN MATRIX CONTROL PANEL
            ========================================= */}
        {currentView === 'matrix' && activeSeries && (
          <motion.div key="matrix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-[85vh] bg-[#0B1120] border border-slate-800 rounded-[3rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative">
            
            {/* Matrix Header */}
            <div className="p-8 md:px-12 border-b border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentView('grid')} className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all shadow-lg"><ArrowLeft size={24}/></button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest">{activeSeries.targetLevel}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500"><Server size={12} className="inline mb-0.5 mr-1"/> Execution Matrix Layer</span>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{activeSeries.title}</h2>
                </div>
              </div>
              <button onClick={() => { setIsExamSearchModalOpen(true); setExamSearch(''); }} className="px-8 h-14 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-95 shrink-0">
                <Search size={18}/> Find & Pull Blueprint
              </button>
            </div>

            {/* Matrix Grid Canvas */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-[#050810] relative">
              {activeSeries.tests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <Server size={80} className="mb-8 text-slate-600"/>
                  <p className="text-lg font-black uppercase tracking-[0.3em] text-white">Matrix Canvas Empty</p>
                  <p className="text-sm font-bold text-slate-500 mt-2 max-w-md text-center">Pull exams from the global repository to configure complex routing and execution schedules.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                  {activeSeries.tests.map((matrixExam) => {
                    const blueprint = availableTests.find(t => t.id === matrixExam.testId);
                    return (
                      <div key={matrixExam.testId} className="p-8 rounded-[2.5rem] bg-[#0B1120] border-2 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${matrixExam.executionMode === 'auto' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {matrixExam.executionMode}
                          </span>
                          <button onClick={() => removeExamFromMatrix(matrixExam.testId)} className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><X size={14}/></button>
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-white leading-tight mb-3 pr-4">{blueprint?.title || 'Unknown Exam'}</h4>
                          <div className="flex flex-col gap-3 mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                            {matrixExam.executionMode === 'auto' ? (
                               <>
                                 <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-emerald-500"><Clock size={12}/> Unlock:</span> <span className="text-slate-300">{formatDeployDate(matrixExam.unlockDate)}</span></div>
                                 <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-rose-500"><Clock size={12}/> Deadline:</span> <span className="text-slate-300">{formatDeployDate(matrixExam.deadlineDate)}</span></div>
                               </>
                            ) : (
                               <div className="flex justify-between items-center"><span className="flex items-center gap-1.5 text-amber-500"><Lock size={12}/> Trigger:</span> <span className="text-slate-300">Manual Start</span></div>
                            )}
                            {matrixExam.accessKey && <div className="flex justify-between items-center pt-2 border-t border-slate-800"><span className="flex items-center gap-1.5 text-indigo-400"><Key size={12}/> Key:</span> <span className="text-slate-300">{matrixExam.accessKey}</span></div>}
                          </div>
                        </div>
                        <button onClick={() => setSelectedMatrixExam(matrixExam)} className="mt-8 w-full h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-inner">
                          <Settings size={14}/> Engine Config
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* THE EXAM SEARCH MODAL (Central Repository Lookup) */}
            <AnimatePresence>
              {isExamSearchModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl h-[85vh] flex flex-col bg-[#0B1120] border border-slate-700 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                    <div className="p-8 md:p-10 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-3xl font-black text-white flex items-center gap-3"><Globe className="text-indigo-500"/> Global Repository</h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2 ml-1">Search databases and pull exams into your matrix canvas</p>
                      </div>
                      <button onClick={() => setIsExamSearchModalOpen(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
                    </div>
                    <div className="p-8 border-b border-slate-800">
                      <div className="relative">
                        <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500"/>
                        <input value={examSearch} onChange={e => setExamSearch(e.target.value)} className="w-full h-16 pl-16 pr-6 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" placeholder="Search exams by exact title or JLPT level..." />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-[#050810]">
                      {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase()) || t.targetLevel.toLowerCase().includes(examSearch.toLowerCase())).map(test => {
                        const inMatrix = activeSeries.tests.some(x => x.testId === test.id);
                        const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
                        return (
                          <div key={test.id} className="p-6 md:p-8 rounded-[2rem] border border-slate-800 bg-[#0B1120] hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all shadow-lg">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-widest">{test.targetLevel}</span>
                                <span className="text-[10px] font-mono text-slate-500">{test.id}</span>
                              </div>
                              <p className="text-xl font-black text-white">{test.title}</p>
                            </div>
                            <div className="shrink-0 flex items-center">
                              {inMatrix ? (
                                <span className="w-full md:w-40 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-inner"><Check size={16}/> Matrixed</span>
                              ) : hasAccess ? (
                                <button onClick={() => addExamToMatrix(test)} className="w-full md:w-40 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"><Plus size={16}/> Pull Exam</button>
                              ) : (
                                <button onClick={() => requestExamAccess(test)} className="w-full md:w-40 h-12 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 border border-amber-500/30 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Lock size={16}/> Req Access</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-20 text-slate-500 font-bold">No blueprints found matching your search.</div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* DEPLOYMENT ENGINE DRAWER (Slide-in from right overlay) */}
            <AnimatePresence>
              {selectedMatrixExam && (
                <div className="absolute inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-md">
                  <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-full max-w-xl h-full bg-[#0B1120] border-l border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col">
                    <div className="p-8 md:p-10 border-b border-slate-800 bg-slate-900/80 flex justify-between items-start shrink-0">
                      <div>
                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3"><Settings className="text-indigo-500"/> Engine Config</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 line-clamp-1 border-l-2 border-indigo-500 pl-3 py-0.5">{availableTests.find(t=>t.id===selectedMatrixExam.testId)?.title}</p>
                      </div>
                      <button onClick={() => setSelectedMatrixExam(null)} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg"><X size={20}/></button>
                    </div>

                    <form onSubmit={saveMatrixExamSettings} className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-10">
                      
                      {/* Security & Access */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 border-b border-slate-800 pb-3">1. Execution Context</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className={labelClass}><ToggleLeft size={14} className="inline mr-1 text-slate-500"/> Mode</label>
                            <select value={selectedMatrixExam.executionMode} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, executionMode: e.target.value})} className={inputClass}>
                              <option value="auto">Auto Scheduled</option>
                              <option value="manual">Manual Trigger</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}><Key size={14} className="inline mr-1 text-slate-500"/> Access Key</label>
                            <input type="text" value={selectedMatrixExam.accessKey} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, accessKey: e.target.value})} placeholder="Optional Code" className={inputClass} />
                          </div>
                        </div>
                      </div>

                      {/* Timelines */}
                      {selectedMatrixExam.executionMode === 'auto' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 border-b border-slate-800 pb-3">2. System Timelines</h4>
                          <div>
                            <label className={labelClass}><Clock size={14} className="inline mr-1 text-emerald-500"/> Global Unlock Tick</label>
                            <input type="datetime-local" required value={selectedMatrixExam.unlockDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, unlockDate: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}><Clock size={14} className="inline mr-1 text-rose-500"/> Global Deadline Tick</label>
                            <input type="datetime-local" required value={selectedMatrixExam.deadlineDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, deadlineDate: e.target.value})} className={inputClass} />
                          </div>
                        </div>
                      )}

                      {/* Constraints */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 border-b border-slate-800 pb-3">{selectedMatrixExam.executionMode==='auto'?'3':'2'}. Exam Constraints</h4>
                        <div>
                          <label className={labelClass}><Lock size={14} className="inline mr-1 text-amber-500"/> Entry Lockout (Mins)</label>
                          <input type="number" min="0" value={selectedMatrixExam.entryLockoutMinutes} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, entryLockoutMinutes: parseInt(e.target.value) || 0})} placeholder="0 = Unlimited Entry" className={inputClass} />
                          <p className="text-[9px] font-bold text-slate-500 mt-2 ml-2 leading-relaxed">If set, users cannot start the exam X minutes after the global unlock tick.</p>
                        </div>
                        
                        <div className="p-6 rounded-[2rem] bg-slate-900/80 border border-slate-800 space-y-6">
                          <label className="flex items-center gap-4 cursor-pointer">
                            <div className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${selectedMatrixExam.allowPostDeadline ? 'bg-indigo-500' : 'bg-[#0B1120] border border-slate-700'}`}>
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${selectedMatrixExam.allowPostDeadline ? 'translate-x-7' : 'left-1'}`}></div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-300">Allow Post-Deadline Practice</span>
                          </label>
                          
                          {selectedMatrixExam.allowPostDeadline && (
                            <div className="space-y-6 pt-6 border-t border-slate-800/80 animate-in fade-in">
                              <div>
                                <label className={labelClass}>Practice Phase End Date</label>
                                <input type="datetime-local" required value={selectedMatrixExam.postDeadlineEndDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineEndDate: e.target.value})} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}><Repeat size={14} className="inline mr-1 text-indigo-400"/> Max Practice Attempts</label>
                                <input type="number" min="1" required value={selectedMatrixExam.postDeadlineAttempts} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineAttempts: parseInt(e.target.value) || 1})} className={inputClass} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </form>
                    <div className="p-8 border-t border-slate-800 bg-[#0B1120] shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                      <button onClick={saveMatrixExamSettings} disabled={isSaving} className="w-full h-16 bg-white text-black rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.15)]">
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Flash Engine Rules
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