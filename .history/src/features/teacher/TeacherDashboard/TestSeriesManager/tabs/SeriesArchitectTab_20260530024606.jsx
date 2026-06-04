import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, FolderOpen, Edit2, Loader2, Users, 
  Search, X, Check, FileText, Clock, Lock, Key, ShieldCheck, 
  Settings, Server, ToggleLeft, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SeriesArchitectTab() {
  const navigate = useNavigate();
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // View Router: 'grid' | 'settings' | 'matrix'
  const [currentView, setCurrentView] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Stores
  const [testSeries, setTestSeries] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  // Active Context
  const [editingId, setEditingId] = useState('');
  const [activeSeries, setActiveSeries] = useState(null);

  // Search Contexts
  const [teacherSearch, setTeacherSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');

  // Exam Matrix Drawer
  const [selectedMatrixExam, setSelectedMatrixExam] = useState(null);

  const initialFormState = { title: '', description: '', assignedBatches: [], collaborators: [], authorId: '' };
  const [formData, setFormData] = useState(initialFormState);

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
  const fetchAllData = async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      // 1. Fetch Series (Filter for Author or Collab)
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      const fetchedSeries = seriesSnap.docs.map(d => ({ id: d.id, ...d.data(), tests: d.data().tests || [] }))
        .filter(s => s.authorId === uid || (s.collaborators && s.collaborators.includes(uid)));
      setTestSeries(fetchedSeries);

      // 2. Fetch All Exams (For the Matrix Adder & Request Logic)
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
      setAvailableBatches(batchesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, teacherIds: d.data().teacherIds || [] }))
        .filter(b => b.teacherIds.includes(uid)));

      // 4. Fetch Staff
      const staffSnap = await getDocs(collection(db, 'users'));
      const teachers = staffSnap.docs.map(d => {
        const data = d.data();
        let fullName = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
        return {
          id: d.id, name: fullName, email: data.email || '', role: (data.role || '').toLowerCase(),
          avatar: fullName.substring(0, 2).toUpperCase()
        };
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
  // CORE SERIES SETTINGS (Metadata, Collabs, Batches)
  // ==========================================
  const handleOpenSettings = (series = null) => {
    if (series) {
      setEditingId(series.id);
      setFormData({
        title: series.title || '', description: series.description || '',
        assignedBatches: series.assignedBatches || [], collaborators: series.collaborators || [],
        authorId: series.authorId || currentUserId
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
      const payload = {
        id: sId, ...formData, 
        authorId: formData.authorId || currentUserId,
        updatedAt: new Date().toISOString()
      };
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

  // Adders
  const toggleCollab = (id) => setFormData(p => ({ ...p, collaborators: p.collaborators.includes(id) ? p.collaborators.filter(x => x !== id) : [...p.collaborators, id] }));
  const toggleBatch = (id) => setFormData(p => ({ ...p, assignedBatches: p.assignedBatches.includes(id) ? p.assignedBatches.filter(x => x !== id) : [...p.assignedBatches, id] }));

  // ==========================================
  // MATRIX EXECUTION ENGINE (Adding & Configuring Exams)
  // ==========================================
  const handleOpenMatrix = (series) => {
    setActiveSeries(series);
    setExamSearch('');
    setSelectedMatrixExam(null);
    setCurrentView('matrix');
  };

  const requestExamAccess = async (testId) => {
    alert(`Access Request sent to the Lead Architect of Exam [${testId}]. It will appear here once approved.`);
    // Future Implementation: Write to 'exam_access_requests' collection here
  };

  const addExamToMatrix = async (test) => {
    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
    if (!hasAccess) return requestExamAccess(test.id);

    const isDuplicate = activeSeries.tests.some(t => t.testId === test.id);
    if (isDuplicate) return alert("Exam already exists in this matrix.");

    const newMatrixExam = {
      testId: test.id,
      executionMode: 'auto', // 'auto' (scheduled) | 'manual' (teacher triggered)
      accessKey: '',
      unlockDate: '', deadlineDate: '',
      entryLockoutMinutes: 0,
      allowPostDeadline: false, postDeadlineEndDate: ''
    };

    const updatedTests = [...activeSeries.tests, newMatrixExam];
    setActiveSeries(p => ({ ...p, tests: updatedTests }));

    // Instant DB Push
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    setTestSeries(prev => prev.map(s => s.id === activeSeries.id ? { ...s, tests: updatedTests } : s));
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

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const inputClass = `w-full px-5 h-12 rounded-2xl bg-slate-900/80 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all`;
  const labelClass = `block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2`;

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
                <div className="w-72 h-12 px-4 rounded-2xl bg-[#0D1527] border border-slate-800 flex items-center gap-3">
                  <Search size={16} className="text-slate-500" />
                  <input type="text" placeholder="Search series..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-white w-full" />
                </div>
                <button onClick={() => handleOpenSettings()} className="px-6 h-12 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-105 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                  <Plus size={16} /> Create Series
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {testSeries.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(series => (
                <div key={series.id} className="p-8 rounded-[2.5rem] bg-[#0B1120]/95 backdrop-blur-xl border border-white/5 shadow-2xl flex flex-col justify-between group overflow-hidden relative">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
                  
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        {series.assignedBatches?.length || 0} Batches
                      </span>
                      {series.authorId === currentUserId && (
                        <button onClick={() => deleteSeries(series.id)} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-white leading-tight mb-2 truncate">{series.title}</h4>
                    <p className="text-xs text-slate-400 font-medium line-clamp-2 min-h-[32px]">{series.description || 'No description provided.'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={() => handleOpenSettings(series)} className="h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <Settings size={14}/> Config
                    </button>
                    <button onClick={() => handleOpenMatrix(series)} className="h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <Server size={14}/> Matrix ({series.tests.length})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =========================================
            VIEW 1: CORE SETTINGS (Collabs & Batches)
        ========================================= */}
        {currentView === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto w-full pb-32">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={() => setCurrentView('grid')} className="w-12 h-12 rounded-2xl bg-[#0D1527] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><ArrowLeft size={20} /></button>
              <div>
                <h2 className="text-2xl font-black text-white">{editingId ? "Series Configuration" : "New Series Identity"}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Metadata, Access, and Targeting</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-xl space-y-6">
                <div>
                  <label className={labelClass}>Series Title</label>
                  <input required name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. 2026 Core Execution" />
                </div>
                <div>
                  <label className={labelClass}>Description Context</label>
                  <textarea name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} min-h-[100px] py-4 resize-y`} placeholder="Describe the curriculum flow..." />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Batch Adder */}
                <div className="p-8 rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-xl flex flex-col">
                  <label className={labelClass}><Users size={14} className="inline mr-1 text-emerald-500"/> Target Batches</label>
                  <div className="flex gap-2 mb-4">
                    <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} className="flex-1 h-12 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-emerald-500" placeholder="Search assigned batches..." />
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2 pr-2 custom-scrollbar">
                    {availableBatches.filter(b => b.name.toLowerCase().includes(batchSearch.toLowerCase())).map(batch => {
                      const isSelected = formData.assignedBatches.includes(batch.id);
                      return (
                        <div key={batch.id} className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                          <span className={`text-sm font-black ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{batch.name}</span>
                          <button type="button" onClick={() => toggleBatch(batch.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-emerald-400'}`}>
                            {isSelected ? <Check size={14}/> : <Plus size={14}/>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collab Adder */}
                <div className="p-8 rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-xl flex flex-col">
                  <label className={labelClass}><ShieldCheck size={14} className="inline mr-1 text-indigo-500"/> Co-Architects</label>
                  
                  {currentUserId === formData.authorId ? (
                    <>
                      <div className="flex gap-2 mb-4">
                        <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} onKeyDown={e => {if(e.key==='Enter') e.preventDefault()}} className="flex-1 h-12 bg-slate-950/80 border border-slate-800 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-indigo-500" placeholder="Search staff..." />
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 pr-2 custom-scrollbar mb-4 border-b border-slate-800 pb-4">
                        {teacherList.filter(t => t.id !== currentUserId && !formData.collaborators.includes(t.id) && t.name.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => (
                          <div key={t.id} className="p-3 rounded-2xl flex items-center justify-between bg-slate-900/50 border border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center text-[10px] font-black">{t.avatar}</div>
                              <span className="text-xs font-bold text-slate-300">{t.name}</span>
                            </div>
                            <button type="button" onClick={() => toggleCollab(t.id)} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center"><Plus size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 mb-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                      <ShieldCheck size={24} className="text-slate-600 mx-auto mb-2"/>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Only Lead can add collabs</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center">Lead (You)</span>
                    {formData.collaborators.filter(id => id !== currentUserId).map(id => {
                      const t = teacherList.find(x => x.id === id);
                      if (!t) return null;
                      return (
                        <span key={id} className="bg-slate-900 text-slate-300 border border-slate-700 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
                          {t.name}
                          {currentUserId === formData.authorId && <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => toggleCollab(id)}/>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button type="submit" disabled={isSaving} className="px-12 py-5 bg-white text-black rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Core Settings
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* =========================================
            VIEW 2: THE EXECUTION MATRIX (Exams)
        ========================================= */}
        {currentView === 'matrix' && activeSeries && (
          <motion.div key="matrix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex h-[80vh] gap-8">
            
            {/* Left Panel: Available Exams Adder */}
            <div className="w-[400px] flex flex-col bg-[#0B1120] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl shrink-0">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                <button onClick={() => setCurrentView('grid')} className="w-10 h-10 mb-6 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><ArrowLeft size={16} /></button>
                <h3 className="text-lg font-black text-white">Global Repository</h3>
                <div className="mt-4 relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                  <input value={examSearch} onChange={e => setExamSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold outline-none focus:border-indigo-500" placeholder="Search all exams..." />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase())).map(test => {
                  const inMatrix = activeSeries.tests.some(x => x.testId === test.id);
                  const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
                  return (
                    <div key={test.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 group">
                      <p className="text-sm font-black text-white mb-1 truncate">{test.title}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">Level: {test.targetLevel}</p>
                      {inMatrix ? (
                        <div className="h-8 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black flex items-center justify-center uppercase tracking-widest"><Check size={12} className="mr-1"/> Added</div>
                      ) : hasAccess ? (
                        <button onClick={() => addExamToMatrix(test)} className="w-full h-8 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black flex items-center justify-center uppercase tracking-widest"><Plus size={12} className="mr-1"/> Add to Matrix</button>
                      ) : (
                        <button onClick={() => requestExamAccess(test.id)} className="w-full h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all text-[9px] font-black flex items-center justify-center uppercase tracking-widest"><Lock size={12} className="mr-1"/> Request Access</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Matrix Configuration */}
            <div className="flex-1 flex flex-col bg-[#0B1120] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              
              {/* Matrix Header */}
              <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{activeSeries.title}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-2 flex items-center gap-2"><Server size={14}/> Execution Matrix Layer</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeSeries.tests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <Server size={64} className="mb-6 text-slate-600"/>
                    <p className="text-sm font-black uppercase tracking-widest text-white">Matrix Empty</p>
                    <p className="text-xs font-bold text-slate-400 mt-2">Push exams from the repository to configure routing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                    {activeSeries.tests.map((matrixExam) => {
                      const blueprint = availableTests.find(t => t.id === matrixExam.testId);
                      const isSelected = selectedMatrixExam?.testId === matrixExam.testId;
                      return (
                        <div key={matrixExam.testId} onClick={() => setSelectedMatrixExam(matrixExam)} className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all ${isSelected ? 'bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${matrixExam.executionMode === 'auto' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {matrixExam.executionMode}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); removeExamFromMatrix(matrixExam.testId); }} className="text-slate-500 hover:text-rose-500"><X size={16}/></button>
                          </div>
                          <h4 className="text-base font-black text-white mb-1 truncate">{blueprint?.title || 'Unknown Exam'}</h4>
                          <p className="text-[9px] font-bold text-slate-500 tracking-widest font-mono truncate">{matrixExam.testId}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 🚨 THE ADVANCED SETTINGS DRAWER */}
              <AnimatePresence>
                {selectedMatrixExam && (
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="absolute bottom-0 left-0 right-0 h-[65%] bg-[#0D1527]/95 backdrop-blur-2xl border-t-2 border-indigo-500/30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20 flex flex-col">
                    
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2"><Settings size={18} className="text-indigo-400"/> Deployment Engine</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{availableTests.find(t=>t.id===selectedMatrixExam.testId)?.title}</p>
                      </div>
                      <button onClick={() => setSelectedMatrixExam(null)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><X size={16}/></button>
                    </div>

                    <form onSubmit={saveMatrixExamSettings} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                      
                      <div className="grid grid-cols-2 gap-6 border-b border-slate-800/80 pb-8">
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
                        <div className="grid grid-cols-2 gap-6 border-b border-slate-800/80 pb-8 animate-in fade-in slide-in-from-top-4">
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

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}><Lock size={12} className="inline mr-1 text-amber-500"/> Late Entry Lockout (Mins)</label>
                          <input type="number" min="0" value={selectedMatrixExam.entryLockoutMinutes} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, entryLockoutMinutes: parseInt(e.target.value) || 0})} placeholder="0 = Disabled" className={inputClass} />
                          <p className="text-[9px] font-bold text-slate-500 mt-2 px-2">Block entry X mins after unlock time.</p>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer mt-4">
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${selectedMatrixExam.allowPostDeadline ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${selectedMatrixExam.allowPostDeadline ? 'translate-x-6' : 'left-1'}`}></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Allow Post-Deadline Practice</span>
                          </label>
                          {selectedMatrixExam.allowPostDeadline && (
                            <div className="animate-in fade-in">
                              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1 ml-1">Practice Cutoff Date</label>
                              <input type="datetime-local" value={selectedMatrixExam.postDeadlineEndDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineEndDate: e.target.value})} className={`${inputClass} !h-10`} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isSaving} className="px-10 h-12 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Engine Parameters
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}