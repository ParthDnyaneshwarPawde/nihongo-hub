import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, getDoc, query, limit, startAfter, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Save, Loader2, Search, X, Check, 
  Clock, Lock, Key, Settings, Server, ToggleLeft, Globe, Repeat, 
  ShieldAlert, Play, StopCircle, RefreshCw, Power, Shield
} from 'lucide-react';

export default function SeriesMatrixPage() {
  const { seriesId } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  const [activeSeries, setActiveSeries] = useState(null);
  const [teacherList, setTeacherList] = useState([]);

  // --- Scalable Repository State ---
  const [isExamSearchModalOpen, setIsExamSearchModalOpen] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [examSearch, setExamSearch] = useState('');
  const [lastVisibleExam, setLastVisibleExam] = useState(null);
  const [isLoadingMoreExams, setIsLoadingMoreExams] = useState(false);
  const [hasMoreExams, setHasMoreExams] = useState(true);

  // --- Engine Config State ---
  const [selectedMatrixExam, setSelectedMatrixExam] = useState(null);

  const fetchMatrixData = async (uid) => {
    setIsLoading(true);
    try {
      // 1. Fetch Series & Security Check
      const seriesSnap = await getDoc(doc(db, 'test_series', seriesId));
      if (seriesSnap.exists()) {
        const seriesData = { id: seriesSnap.id, ...seriesSnap.data(), tests: seriesSnap.data().tests || [] };
        if (seriesData.authorId !== uid && !(seriesData.collaborators || []).includes(uid)) {
           setIsAuthorized(false); setIsLoading(false); return;
        }
        setActiveSeries(seriesData);
      } else {
        alert("Series not found."); navigate('/test-series'); return;
      }

      // 2. Fetch Initial Batch of Global Exams
      await loadMoreExams(true); // true = initial load

      // 3. Fetch Staff
      const staffSnap = await getDocs(collection(db, 'users'));
      setTeacherList(staffSnap.docs.map(d => ({ id: d.id, name: d.data().displayName || d.data().name || 'Unknown', role: (d.data().role || 'student').toLowerCase() }))
        .filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role)));

    } catch (error) { console.error("Matrix Sync Error:", error); } finally { setIsLoading(false); }
  };

  // 🚀 SCALABLE EXAM FETCHER
  const loadMoreExams = async (isInitial = false) => {
    if (isLoadingMoreExams || (!hasMoreExams && !isInitial)) return;
    setIsLoadingMoreExams(true);
    try {
      let q = query(collection(db, 'mock_tests'), orderBy('updatedAt', 'desc'), limit(15));
      if (!isInitial && lastVisibleExam) {
        q = query(collection(db, 'mock_tests'), orderBy('updatedAt', 'desc'), startAfter(lastVisibleExam), limit(15));
      }

      const querySnapshot = await getDocs(q);
      const newExams = querySnapshot.docs.map(d => ({
        id: d.id, title: d.data().title || 'Untitled', authorId: d.data().authorId || '',
        collaborators: d.data().collaborators || [], targetLevel: d.data().targetLevel || 'Unknown'
      }));

      setLastVisibleExam(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMoreExams(querySnapshot.docs.length === 15);

      if (isInitial) setAvailableTests(newExams);
      else setAvailableTests(prev => [...prev, ...newExams]);

    } catch (err) { console.error("Pagination Fetch Error:", err); } finally { setIsLoadingMoreExams(false); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) { setCurrentUserId(user.uid); fetchMatrixData(user.uid); } });
    return () => unsubscribe();
  }, [seriesId]);

  // ==========================================
  // MATRIX ACTIONS
  // ==========================================
  const requestExamAccess = async (test) => {
    try {
      await setDoc(doc(collection(db, 'exam_access_requests')), {
        testId: test.id, testTitle: test.title, seriesId: activeSeries.id, seriesTitle: activeSeries.title,
        requesterId: currentUserId, requesterName: teacherList.find(t => t.id === currentUserId)?.name || 'Authorized Instructor',
        ownerId: test.authorId, status: 'pending', createdAt: new Date().toISOString()
      });
      alert(`Access Request dispatched. You will be notified when approved.`);
    } catch (err) { alert("Failed to send request: " + err.message); }
  };

  const addExamToMatrix = async (test) => {
    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
    if (!hasAccess) return requestExamAccess(test);
    if (activeSeries.tests.some(t => t.testId === test.id)) return alert("Exam already exists in this matrix.");

    const newMatrixExam = { 
      testId: test.id, 
      statusOverride: 'staged', // 'staged' | 'live' | 'archived'
      executionMode: 'auto', 
      accessKey: '', 
      unlockDate: '', 
      deadlineDate: '', 
      isEntryLockoutEnabled: false,
      entryLockoutMinutes: 0, 
      allowPostDeadline: false, 
      postDeadlineEndDate: '', 
      postDeadlineAttempts: 1,
      ipWhitelist: '' // Future implementation
    };

    const updatedTests = [...activeSeries.tests, newMatrixExam];
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
  };

  const removeExamFromMatrix = async (testId) => {
    if (!window.confirm("Remove this exam from the series matrix?")) return;
    const updatedTests = activeSeries.tests.filter(t => t.testId !== testId);
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    if (selectedMatrixExam?.testId === testId) setSelectedMatrixExam(null);
  };

  const saveMatrixExamSettings = async (e) => {
    e.preventDefault(); setIsSaving(true);
    const updatedTests = activeSeries.tests.map(t => t.testId === selectedMatrixExam.testId ? selectedMatrixExam : t);
    try {
      await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
      setActiveSeries(p => ({ ...p, tests: updatedTests })); setSelectedMatrixExam(null);
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const quickToggleExamStatus = async (testId, newStatus) => {
    const updatedTests = activeSeries.tests.map(t => t.testId === testId ? { ...t, statusOverride: newStatus } : t);
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    try {
      await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
    } catch (err) { alert("Failed to push operational status change."); }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const inputClass = `w-full px-5 h-14 rounded-2xl bg-slate-900/80 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner`;
  const labelClass = `block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2`;
  const formatDeployDate = (dateStr) => {
    if (!dateStr) return 'Not Set'; const d = new Date(dateStr); return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading || !activeSeries) return <div className="h-screen flex items-center justify-center bg-[#050810]"><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050810] w-full p-4 md:p-8 select-none">
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B1120] border border-slate-800 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="w-32 h-32 mb-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
            <ShieldAlert size={48} className="text-rose-500 opacity-90" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] mb-3 text-center">Clearance Denied</h1>
          <p className="text-sm font-bold text-slate-400 max-w-md text-center leading-relaxed mb-10">You are not listed as the Lead Architect or an authorized Collaborator for this Execution Matrix.</p>
          <button onClick={() => navigate('/test-series')} className="px-10 h-14 bg-slate-900 border border-slate-700 hover:border-indigo-500 hover:bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 active:scale-95">
            <ArrowLeft size={18} /> Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050810] w-full select-none relative overflow-x-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full flex-1">
        
        {/* Full-width Matrix Header */}
        <div className="sticky top-0 z-30 p-6 md:px-12 md:py-8 border-b border-slate-800 bg-[#0B1120]/90 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0 shadow-lg">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/test-series')} className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-all shadow-lg shrink-0">
              <ArrowLeft size={24}/>
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest">{activeSeries.targetLevel}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center"><Server size={12} className="inline mb-0.5 mr-1.5"/> Execution Matrix Layer</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{activeSeries.title}</h2>
            </div>
          </div>
          <button onClick={() => { setIsExamSearchModalOpen(true); setExamSearch(''); }} className="px-8 h-14 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-95 shrink-0">
            <Search size={18}/> Push Blueprint to Matrix
          </button>
        </div>

        {/* Full-width Matrix Grid Canvas */}
        <div className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-12 relative">
          {activeSeries.tests.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center opacity-40">
              <Server size={80} className="mb-8 text-slate-600"/>
              <p className="text-lg font-black uppercase tracking-[0.3em] text-white">Matrix Canvas Empty</p>
              <p className="text-sm font-bold text-slate-500 mt-2 max-w-md text-center leading-relaxed">Pull exams from the global repository to configure complex routing and execution schedules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {activeSeries.tests.map((matrixExam) => {
                const blueprint = availableTests.find(t => t.id === matrixExam.testId) || { title: 'Loading...', targetLevel: '?' };
                
                // Determine Visual State based on Override
                const isLive = matrixExam.statusOverride === 'live';
                const isArchived = matrixExam.statusOverride === 'archived';
                const cardBorder = isLive ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : isArchived ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700';

                return (
                  <div key={matrixExam.testId} className={`p-8 rounded-[2.5rem] bg-[#0B1120] border-2 transition-all flex flex-col justify-between group shadow-xl ${cardBorder}`}>
                    
                    {/* Header Tags */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-2">
                        <span className="self-start px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-widest">{blueprint.targetLevel}</span>
                        <span className={`self-start px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${matrixExam.executionMode === 'auto' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {matrixExam.executionMode === 'auto' ? 'Automated Lift' : 'Manual Shift'}
                        </span>
                      </div>
                      <button onClick={() => removeExamFromMatrix(matrixExam.testId)} className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all"><X size={14}/></button>
                    </div>

                    {/* Content */}
                    <div>
                      <h4 className="text-xl font-black text-white leading-tight mb-4 pr-4">{blueprint.title}</h4>
                      
                      {/* Operational Quick Toggles */}
                      <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-950 border border-slate-800/80 mb-6 shadow-inner">
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'staged')} className={`flex-1 flex justify-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isLive && !isArchived ? 'bg-slate-800 text-slate-300' : 'text-slate-600 hover:text-slate-400'}`}>Staged</button>
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'live')} className={`flex-1 flex justify-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isLive ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-600 hover:text-emerald-500'}`}>Live</button>
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'archived')} className={`flex-1 flex justify-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isArchived ? 'bg-slate-800 text-slate-500' : 'text-slate-600 hover:text-slate-400'}`}>Archived</button>
                      </div>

                      {/* Mini Parameter Display */}
                      <div className="flex flex-col gap-2 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {matrixExam.executionMode === 'auto' && (
                          <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80"><span className="text-emerald-500 flex items-center gap-1.5"><Play size={12}/> Deploy</span> <span className="text-slate-300">{formatDeployDate(matrixExam.unlockDate)}</span></div>
                        )}
                        {matrixExam.executionMode === 'auto' && (
                          <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80"><span className="text-rose-500 flex items-center gap-1.5"><StopCircle size={12}/> Terminal Lock</span> <span className="text-slate-300">{formatDeployDate(matrixExam.deadlineDate)}</span></div>
                        )}
                        {matrixExam.accessKey && <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80"><span className="text-amber-500 flex items-center gap-1.5"><Key size={12}/> Access Key</span> <span className="text-slate-300 font-mono tracking-widest">{matrixExam.accessKey}</span></div>}
                      </div>
                    </div>

                    <button onClick={() => setSelectedMatrixExam(matrixExam)} className="mt-8 w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95">
                      <Settings size={16}/> Engine Config
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🚨 THE GLOBAL REPOSITORY SCALABLE SEARCH MODAL */}
        <AnimatePresence>
          {isExamSearchModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl h-[85vh] flex flex-col bg-[#0B1120] border border-slate-700 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="p-8 md:p-10 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-3xl font-black text-white flex items-center gap-3"><Globe className="text-indigo-500"/> Global Repository</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2 ml-1">Search databases and push exams into your matrix canvas</p>
                  </div>
                  <button onClick={() => setIsExamSearchModalOpen(false)} className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><X size={20}/></button>
                </div>
                <div className="p-8 border-b border-slate-800 shrink-0">
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
                            <button onClick={() => addExamToMatrix(test)} className="w-full md:w-40 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"><Plus size={16}/> Push Config</button>
                          ) : (
                            <button onClick={() => requestExamAccess(test)} className="w-full md:w-40 h-12 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 border border-amber-500/30 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Lock size={16}/> Req Access</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase())).length === 0 && !isLoadingMoreExams && (
                    <div className="text-center py-20 text-slate-500 font-bold">No blueprints found matching your search.</div>
                  )}
                  {hasMoreExams && !examSearch && (
                    <button onClick={() => loadMoreExams()} disabled={isLoadingMoreExams} className="w-full py-6 mt-4 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
                      {isLoadingMoreExams ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Load More Exams from Server
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 🚨 THE ADVANCED ENGINE DRAWER (Slide-in from right overlay) */}
        <AnimatePresence>
          {selectedMatrixExam && (
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-md">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-full max-w-2xl h-full bg-[#0B1120] border-l border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col">
                <div className="p-8 md:p-10 border-b border-slate-800 bg-slate-900/80 flex justify-between items-start shrink-0">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3"><Settings className="text-indigo-500"/> Operational Parameters</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 line-clamp-1 border-l-2 border-indigo-500 pl-3 py-0.5">{availableTests.find(t=>t.id===selectedMatrixExam.testId)?.title}</p>
                  </div>
                  <button onClick={() => setSelectedMatrixExam(null)} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg"><X size={20}/></button>
                </div>

                <form onSubmit={saveMatrixExamSettings} className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-12">
                  
                  {/* Security & Access */}
                  <div className="p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/80 space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 border-b border-slate-800/60 pb-4 mb-2 flex items-center gap-2"><Power size={14}/> Execution Strategy Protocol</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${selectedMatrixExam.executionMode === 'auto' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`} onClick={() => setSelectedMatrixExam({...selectedMatrixExam, executionMode: 'auto'})}>
                         <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedMatrixExam.executionMode === 'auto' ? 'text-indigo-400' : 'text-slate-500'}`}>Automated Clock Lift</p>
                         <p className="text-xs font-bold text-slate-400">Triggers lifecycle at baseline timestamp.</p>
                      </div>
                      <div className={`p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${selectedMatrixExam.executionMode === 'manual' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`} onClick={() => setSelectedMatrixExam({...selectedMatrixExam, executionMode: 'manual'})}>
                         <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedMatrixExam.executionMode === 'manual' ? 'text-indigo-400' : 'text-slate-500'}`}>Manual Proctor Shift</p>
                         <p className="text-xs font-bold text-slate-400">Requires manual launch from dashboard.</p>
                      </div>
                    </div>
                  </div>

                  {/* Timelines */}
                  {selectedMatrixExam.executionMode === 'auto' && (
                    <div className="p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/80 space-y-6 animate-in fade-in slide-in-from-top-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 border-b border-slate-800/60 pb-4 mb-2 flex items-center gap-2"><Clock size={14}/> Baseline Timestamps</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}>System Unlock Window</label>
                          <input type="datetime-local" required value={selectedMatrixExam.unlockDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, unlockDate: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Terminal Closure Lock</label>
                          <input type="datetime-local" required value={selectedMatrixExam.deadlineDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, deadlineDate: e.target.value})} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Constraints */}
                  <div className="p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/80 space-y-8">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 border-b border-slate-800/60 pb-4 mb-2 flex items-center gap-2"><Shield size={14}/> Security & Compliance</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}><Key size={14} className="inline mr-1"/> Access Key</label>
                        <input type="text" value={selectedMatrixExam.accessKey} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, accessKey: e.target.value})} placeholder="e.g. FALL2026" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}><Globe size={14} className="inline mr-1"/> IP Whitelist (CIDR)</label>
                        <input type="text" value={selectedMatrixExam.ipWhitelist || ''} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, ipWhitelist: e.target.value})} placeholder="e.g. 192.168.1.0/24" className={inputClass} />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800/60">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <span className="text-sm font-black uppercase tracking-widest text-white group-hover:text-amber-400 transition-colors">Dynamic Entry Lockout</span>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 max-w-sm leading-relaxed">Closes entry gates down for students arriving late after the deployment lifecycle starts.</p>
                        </div>
                        <div className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${selectedMatrixExam.isEntryLockoutEnabled ? 'bg-amber-500' : 'bg-[#0B1120] border border-slate-700'}`}>
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${selectedMatrixExam.isEntryLockoutEnabled ? 'translate-x-8' : 'left-1'}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedMatrixExam.isEntryLockoutEnabled} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, isEntryLockoutEnabled: e.target.checked, entryLockoutMinutes: e.target.checked ? selectedMatrixExam.entryLockoutMinutes || 15 : 0})} />
                      </label>
                      
                      {selectedMatrixExam.isEntryLockoutEnabled && (
                        <div className="mt-6 flex items-center gap-4 animate-in fade-in">
                          <input type="number" min="1" value={selectedMatrixExam.entryLockoutMinutes} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, entryLockoutMinutes: parseInt(e.target.value) || 15})} className={`${inputClass} !w-32`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Minutes allowed for late entry</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post-Deadline Allocations */}
                  <div className="p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/80 space-y-6">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <span className="text-sm font-black uppercase tracking-widest text-white group-hover:text-indigo-400 transition-colors">Asynchronous Allocations</span>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 max-w-sm leading-relaxed">Permit self-paced review workflows after main synchronized sequence ends.</p>
                      </div>
                      <div className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${selectedMatrixExam.allowPostDeadline ? 'bg-indigo-500' : 'bg-[#0B1120] border border-slate-700'}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${selectedMatrixExam.allowPostDeadline ? 'translate-x-8' : 'left-1'}`}></div>
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedMatrixExam.allowPostDeadline} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, allowPostDeadline: e.target.checked})} />
                    </label>
                    
                    {selectedMatrixExam.allowPostDeadline && (
                      <div className="pt-6 border-t border-slate-800/60 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                        <div>
                          <label className={labelClass}>Absolute Final Cut-Off Date</label>
                          <input type="datetime-local" required value={selectedMatrixExam.postDeadlineEndDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineEndDate: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}><Repeat size={14} className="inline mr-1 text-indigo-400"/> Max Practice Attempts</label>
                          <input type="number" min="1" required value={selectedMatrixExam.postDeadlineAttempts} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, postDeadlineAttempts: parseInt(e.target.value) || 1})} className={inputClass} />
                        </div>
                      </div>
                    )}
                  </div>

                </form>
                <div className="p-8 border-t border-slate-800 bg-[#0B1120] shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                  <button onClick={saveMatrixExamSettings} disabled={isSaving} className="w-full h-16 bg-white text-black rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.15)]">
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Secure Config Mapping
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}