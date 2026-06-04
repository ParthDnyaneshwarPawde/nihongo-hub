import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Save, Loader2, Search, X, Check, 
  Clock, Lock, Key, Settings, Server, ToggleLeft, Globe, Repeat
} from 'lucide-react';

export default function SeriesMatrixPage() {
  const { seriesId } = useParams(); // 🚨 Grabs the ID from the URL
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [activeSeries, setActiveSeries] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  const [isExamSearchModalOpen, setIsExamSearchModalOpen] = useState(false);
  const [selectedMatrixExam, setSelectedMatrixExam] = useState(null);
  const [examSearch, setExamSearch] = useState('');

  const fetchMatrixData = async (uid) => {
    setIsLoading(true);
    try {
      // 1. Fetch the specific Series
      const seriesSnap = await getDoc(doc(db, 'test_series', seriesId));
      if (seriesSnap.exists()) {
        const seriesData = { id: seriesSnap.id, ...seriesSnap.data(), tests: seriesSnap.data().tests || [] };
        
        // Security: Ensure user is Author or Collab
        if (seriesData.authorId !== uid && !(seriesData.collaborators || []).includes(uid)) {
           alert("You do not have access to this matrix.");
           navigate('/test-series');
           return;
        }
        setActiveSeries(seriesData);
      } else {
        alert("Series not found.");
        navigate('/test-series');
        return;
      }

      // 2. Fetch Blueprints for Search
      const testsSnap = await getDocs(collection(db, 'mock_tests'));
      setAvailableTests(testsSnap.docs.map(d => ({
        id: d.id, title: d.data().title || 'Untitled', authorId: d.data().authorId || '',
        collaborators: d.data().collaborators || [], targetLevel: d.data().targetLevel || 'Unknown'
      })));

      // 3. Fetch Staff for Request Fallbacks
      const staffSnap = await getDocs(collection(db, 'users'));
      setTeacherList(staffSnap.docs.map(d => ({ id: d.id, name: d.data().displayName || d.data().name || 'Unknown', role: (d.data().role || 'student').toLowerCase() }))
        .filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role)));

    } catch (error) { console.error("Matrix Sync Error:", error); } finally { setIsLoading(false); }
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

    const newMatrixExam = { testId: test.id, executionMode: 'auto', accessKey: '', unlockDate: '', deadlineDate: '', entryLockoutMinutes: 0, allowPostDeadline: false, postDeadlineEndDate: '', postDeadlineAttempts: 1 };
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

  const inputClass = `w-full px-5 h-14 rounded-2xl bg-slate-900/80 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner`;
  const labelClass = `block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2`;
  const formatDeployDate = (dateStr) => {
    if (!dateStr) return 'Not Set'; const d = new Date(dateStr); return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading || !activeSeries) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-[90vh] max-w-[1500px] w-full mx-auto p-4 md:p-8 select-none relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full bg-[#0B1120] border border-slate-800 rounded-[3rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative">
        
        {/* Matrix Header */}
        <div className="p-8 md:px-12 border-b border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/test-series')} className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all shadow-lg"><ArrowLeft size={24}/></button>
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
    </div>
  );
}