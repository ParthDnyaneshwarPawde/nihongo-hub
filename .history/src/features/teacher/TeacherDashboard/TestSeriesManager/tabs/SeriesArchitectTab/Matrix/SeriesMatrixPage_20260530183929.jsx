import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, getDoc, query, limit, startAfter, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Save, Loader2, Search, X, Check, 
  Clock, Lock, Key, Settings, Server, Globe, Repeat, 
  ShieldAlert, Play, StopCircle, RefreshCw, Power, Shield, ListFilter,
  ChevronDown, Monitor
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function SeriesMatrixPage() {
  const { isDarkMode } = useTheme();
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
  const [expandedSecurityLevel, setExpandedSecurityLevel] = useState(1); 

  // --- Filter & Sort Engine State ---
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filterState, setFilterState] = useState({
    search: '', sortBy: 'latest', statuses: [], levels: [], durationMin: '', durationMax: '', dateStart: '', dateEnd: ''
  });

  const fetchMatrixData = async (uid) => {
    setIsLoading(true);
    try {
      const seriesSnap = await getDoc(doc(db, 'test_series', seriesId));
      if (seriesSnap.exists()) {
        const seriesData = { id: seriesSnap.id, ...seriesSnap.data(), tests: seriesSnap.data().tests || [] };
        if (seriesData.authorId !== uid && !(seriesData.collaborators || []).includes(uid)) {
           setIsAuthorized(false); setIsLoading(false); return;
        }
        setActiveSeries(seriesData);
      } else {
        alert("Series not found."); navigate(-1); return;
      }

      await loadMoreExams(true); 

      const staffSnap = await getDocs(collection(db, 'users'));
      setTeacherList(staffSnap.docs.map(d => ({ id: d.id, name: d.data().displayName || d.data().name || 'Unknown', role: (d.data().role || 'student').toLowerCase() }))
        .filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role)));

    } catch (error) { console.error("Matrix Sync Error:", error); } finally { setIsLoading(false); }
  };

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
        id: d.id, title: d.data().title || 'Untitled', description: d.data().description || '',
        authorId: d.data().authorId || '', collaborators: d.data().collaborators || [], 
        targetLevel: d.data().targetLevel || 'Unknown', durationMinutes: d.data().durationMinutes || 0,
        proctoringMode: d.data().proctoringMode || false 
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

  // Find the blueprint associated with the active panel selection
  const currentSelectedBlueprint = useMemo(() => {
    if (!selectedMatrixExam) return null;
    return availableTests.find(t => t.id === selectedMatrixExam.testId) || null;
  }, [selectedMatrixExam, availableTests]);

  // Determine if proctoring mode is forced to true by the mock test blueprint template
  const isProctoringForcedOn = useMemo(() => {
    return currentSelectedBlueprint?.proctoringMode === true;
  }, [currentSelectedBlueprint]);

  // Effectively active proctoring state taking blueprint configuration overrides into account
  const isProctoringActive = useMemo(() => {
    if (isProctoringForcedOn) return true;
    return selectedMatrixExam?.proctoringMode || false;
  }, [isProctoringForcedOn, selectedMatrixExam]);

  // Adjust accordion behavior to open if forced or manually enabled
  useEffect(() => {
    if (isProctoringActive && !expandedSecurityLevel) {
      setExpandedSecurityLevel(1);
    }
  }, [isProctoringActive]);

  const requestExamAccess = async (test) => {
    try {
      await setDoc(doc(collection(db, 'exam_access_requests')), {
        testId: test.id, testTitle: test.title, seriesId: activeSeries.id, seriesTitle: activeSeries.title,
        requesterId: currentUserId, requesterName: teacherList.find(t => t.id === currentUserId)?.name || 'Authorized Instructor',
        ownerId: test.authorId, status: 'pending', createdAt: new Date().toISOString()
      });
      alert(`Access Request dispatched to the Lead Architect of [${test.title}]. You will be notified when they approve it in the Exam Forge.`);
    } catch (err) { alert("Failed to send request: " + err.message); }
  };

  const addExamToMatrix = async (test) => {
    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
    if (!hasAccess) return requestExamAccess(test);
    if (activeSeries.tests.some(t => t.testId === test.id)) return alert("Exam already exists in this matrix.");

    const newMatrixExam = { 
      testId: test.id, statusOverride: 'staged', executionMode: 'hybrid', 
      accessKey: '', unlockDate: '', deadlineDate: '', isEntryLockoutEnabled: false,
      entryLockoutMinutes: 0, allowPostDeadline: false, postDeadlineEndDate: '', postDeadlineAttempts: 1, 
      ipWhitelist: '', ipBlacklist: '',
      proctoringMode: test.proctoringMode || false, 
      // Change false to true here for anything you want ON by default
securityManifest: {
  fullscreen: true, multiMonitor: true, clipboard: true, metadataForensics: true, // Level 1 (Already True)
  webcam: true, audio: true, screenshare: true,                                   // Level 2 (Already True)
  aiVideo: true, aiAudio: true, gazeTracking: true, voiceSignature: true, keystroke: true, vmDetection: true // Level 3
}
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
    // Ensure forced blueprint parameters write down to the database manifest record
    const finalConfig = {
      ...selectedMatrixExam,
      proctoringMode: isProctoringActive
    };
    const updatedTests = activeSeries.tests.map(t => t.testId === finalConfig.testId ? finalConfig : t);
    try {
      await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests });
      setActiveSeries(p => ({ ...p, tests: updatedTests })); setSelectedMatrixExam(null);
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const quickToggleExamStatus = async (testId, newStatus) => {
    const updatedTests = activeSeries.tests.map(t => t.testId === testId ? { ...t, statusOverride: newStatus } : t);
    setActiveSeries(p => ({ ...p, tests: updatedTests }));
    try { await updateDoc(doc(db, 'test_series', activeSeries.id), { tests: updatedTests }); } 
    catch (err) { alert("Failed to push operational status change."); }
  };

  const toggleSecurityManifest = (key) => {
    setSelectedMatrixExam(prev => ({
      ...prev,
      securityManifest: {
        ...(prev.securityManifest || {}),
        [key]: !(prev.securityManifest?.[key])
      }
    }));
  };

  const toggleFilterArray = (field, value) => {
    setFilterState(prev => ({ ...prev, [field]: prev[field].includes(value) ? prev[field].filter(x => x !== value) : [...prev[field], value] }));
  };

  const processedMatrixExams = useMemo(() => {
    if (!activeSeries) return [];
    let mapped = activeSeries.tests.map(test => {
      const blueprint = availableTests.find(t => t.id === test.testId) || { title: 'Unknown Exam', description: '', targetLevel: 'N/A', durationMinutes: 0 };
      return { ...test, blueprint };
    });
    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      mapped = mapped.filter(x => x.blueprint.title.toLowerCase().includes(q) || x.blueprint.description.toLowerCase().includes(q));
    }
    if (filterState.statuses.length > 0) mapped = mapped.filter(x => filterState.statuses.includes(x.statusOverride));
    if (filterState.levels.length > 0) mapped = mapped.filter(x => filterState.levels.includes(x.blueprint.targetLevel));
    if (filterState.durationMin) mapped = mapped.filter(x => x.blueprint.durationMinutes >= parseInt(filterState.durationMin));
    if (filterState.durationMax) mapped = mapped.filter(x => x.blueprint.durationMinutes <= parseInt(filterState.durationMax));
    if (filterState.dateStart) mapped = mapped.filter(x => x.unlockDate && new Date(x.unlockDate).getTime() >= new Date(filterState.dateStart).getTime());
    if (filterState.dateEnd) mapped = mapped.filter(x => x.deadlineDate && new Date(x.deadlineDate).getTime() <= new Date(filterState.dateEnd).getTime());
    if (filterState.sortBy === 'az') mapped.sort((a,b) => a.blueprint.title.localeCompare(b.blueprint.title));
    else if (filterState.sortBy === 'za') mapped.sort((a,b) => b.blueprint.title.localeCompare(a.blueprint.title));
    else if (filterState.sortBy === 'latest') mapped.reverse(); 
    return mapped;
  }, [activeSeries, availableTests, filterState]);

  const inputClass = `w-full px-5 h-14 rounded-2xl border font-bold text-sm outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-slate-800 force-white-text [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:bg-white force-dark-text [color-scheme:light]'}`;
  const labelClass = `block text-[10px] font-bold uppercase tracking-widest ml-2 mb-2 ${isDarkMode ? 'text-slate-400 force-slate-text' : 'text-slate-500 force-light-slate-text'}`;
  
  const formatDeployDate = (dateStr) => {
    if (!dateStr) return 'Not Set'; const d = new Date(dateStr); return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const SecurityToggle = ({ label, description, stateKey, colorClass }) => {
    const isChecked = selectedMatrixExam?.securityManifest?.[stateKey] || false;
    return (
      <label className="flex items-center justify-between cursor-pointer group py-2.5">
        <div>
          <span className={`text-sm font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'text-white group-hover:text-slate-300' : 'text-slate-900 group-hover:text-slate-700'}`}>{label}</span>
          <p className={`text-[9px] font-bold mt-1 max-w-[250px] leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{description}</p>
        </div>
        <div className={`w-12 h-6 rounded-full relative transition-colors shadow-inner shrink-0 ${isChecked ? colorClass : (isDarkMode ? 'bg-[#050810] border border-slate-700' : 'bg-slate-200 border border-slate-300')}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-7' : 'left-1'}`}></div>
        </div>
        <input type="checkbox" className="hidden" checked={isChecked} onChange={() => toggleSecurityManifest(stateKey)} />
      </label>
    );
  };

  if (isLoading || !activeSeries) return <div className={`h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  if (!isAuthorized) {
    return (
      <div className={`flex flex-col min-h-screen w-full p-4 md:p-8 select-none ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}>
        <div className={`flex-1 flex flex-col items-center justify-center border rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="w-32 h-32 mb-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
            <ShieldAlert size={48} className="text-rose-500 opacity-90" />
          </div>
          <h1 className={`text-4xl font-black uppercase tracking-[0.2em] mb-3 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Clearance Denied</h1>
          <p className={`text-sm font-bold max-w-md text-center leading-relaxed mb-10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>You are not listed as the Lead Architect or an authorized Collaborator for this Execution Matrix.</p>
          <button onClick={() => navigate(-1)} className={`px-10 h-14 border rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 active:scale-95 ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700'}`}>
            <ArrowLeft size={18} /> Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen w-full select-none relative overflow-x-hidden ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full flex-1">
        
        {/* Full-width Matrix Header */}
        <div className={`sticky top-0 z-30 p-6 md:px-12 md:py-8 border-b backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-8 shrink-0 shadow-lg ${isDarkMode ? 'border-slate-800 bg-[#0B1120]/90' : 'border-slate-200 bg-white/90'}`}>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all shadow-lg shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><ArrowLeft size={24}/></button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest">{activeSeries.targetLevel}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center"><Server size={12} className="inline mb-0.5 mr-1.5"/> Execution Matrix Layer</span>
              </div>
              <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeSeries.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsFilterDrawerOpen(true)} className={`px-6 h-14 rounded-[1.5rem] border font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-lg active:scale-95 shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'}`}><ListFilter size={18}/> Filters</button>
            <button onClick={() => { setIsExamSearchModalOpen(true); setExamSearch(''); }} className="px-8 h-14 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:scale-105 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-95 shrink-0"><Search size={18}/> Pull Blueprint</button>
          </div>
        </div>

        {/* Full-width Matrix Grid Canvas */}
        <div className="flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-12 relative">
          {processedMatrixExams.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center opacity-40">
              <Server size={80} className={`mb-8 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}/>
              <p className={`text-lg font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Exams Match Criteria</p>
              <p className={`text-sm font-bold mt-2 max-w-md text-center leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Adjust your filters or pull new blueprints from the global repository to configure complex routing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {processedMatrixExams.map((matrixExam) => {
                const { blueprint } = matrixExam;
                const isLive = matrixExam.statusOverride === 'live';
                const isArchived = matrixExam.statusOverride === 'archived';
                const cardClasses = isLive 
                  ? (isDarkMode ? 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-gradient-to-br from-[#0B1120] to-emerald-950/20' : 'border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)] bg-emerald-50/50') 
                  : isArchived 
                    ? (isDarkMode ? 'border-slate-800 opacity-60 bg-[#0B1120]' : 'border-slate-200 opacity-60 bg-white') 
                    : (isDarkMode ? 'border-indigo-500/30 hover:border-indigo-500/70 bg-gradient-to-br from-[#0B1120] to-[#0A0F1C]' : 'border-indigo-200 hover:border-indigo-400 bg-white');

                return (
                  <div key={matrixExam.testId} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col justify-between group shadow-2xl relative overflow-hidden ${cardClasses}`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none"></div>
                    
                    {/* Header Tags */}
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex flex-row items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{blueprint.targetLevel}</span>
                        <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                          matrixExam.executionMode === 'auto' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                          matrixExam.executionMode === 'hybrid' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {matrixExam.executionMode === 'auto' ? 'Strict Auto' : matrixExam.executionMode === 'hybrid' ? 'Hybrid Engine' : 'Full Manual'}
                        </span>
                      </div>
                      <button onClick={() => removeExamFromMatrix(matrixExam.testId)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isDarkMode ? 'bg-slate-800/50 text-slate-500 hover:bg-rose-500 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}><X size={14}/></button>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <h4 className={`text-2xl font-black leading-tight mb-2 pr-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{blueprint.title}</h4>
                      <p className={`text-xs font-bold mb-6 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}><Clock size={12}/> {blueprint.durationMinutes} Minutes</p>
                      
                      {/* Operational Quick Toggles */}
                      <div className={`flex items-center justify-between p-1.5 rounded-[1rem] border mb-6 shadow-inner ${isDarkMode ? 'bg-[#050810] border-slate-800/80' : 'bg-white border-slate-200'}`}>
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'staged')} className={`flex-1 flex justify-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isLive && !isArchived ? (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700') : 'text-slate-500 hover:text-slate-700'}`}>Staged</button>
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'live')} className={`flex-1 flex justify-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isLive ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:text-emerald-500'}`}>Live</button>
                        <button onClick={() => quickToggleExamStatus(matrixExam.testId, 'archived')} className={`flex-1 flex justify-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isArchived ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-600') : 'text-slate-500 hover:text-slate-700'}`}>Archived</button>
                      </div>

                      {/* Mini Parameter Display */}
                      <div className="flex flex-col gap-2 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {['auto', 'hybrid'].includes(matrixExam.executionMode) && (
                          <>
                            <div className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}><span className="text-emerald-500 flex items-center gap-1.5"><Play size={12}/> Deploy</span> <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{formatDeployDate(matrixExam.unlockDate)}</span></div>
                            <div className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}><span className="text-rose-500 flex items-center gap-1.5"><StopCircle size={12}/> Terminal Lock</span> <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{formatDeployDate(matrixExam.deadlineDate)}</span></div>
                          </>
                        )}
                        {matrixExam.accessKey && <div className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}><span className="text-amber-500 flex items-center gap-1.5"><Key size={12}/> Access Key</span> <span className={`font-mono tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{matrixExam.accessKey}</span></div>}
                      </div>
                    </div>

                    <button onClick={() => setSelectedMatrixExam(matrixExam)} className="mt-8 w-full h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white shadow-lg active:scale-95 relative z-10">
                      <Settings size={16}/> Engine Protocol
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FILTER & SORT DRAWER */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-md">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className={`w-full max-w-md h-full flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] border-l ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-8 md:p-10 border-b flex justify-between items-start shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
                  <div>
                    <h3 className={`text-2xl font-black mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><ListFilter className="text-indigo-500"/> Filter & Sort Engine</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Refine your matrix view</p>
                  </div>
                  <button onClick={() => setIsFilterDrawerOpen(false)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 text-slate-400' : 'bg-white border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500'}`}><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-10">
                  <div>
                    <label className={labelClass}>Search Term</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                      <input value={filterState.search} onChange={e => setFilterState({...filterState, search: e.target.value})} placeholder="Title or description..." className={`${inputClass} pl-12`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Sort By</label>
                    <select value={filterState.sortBy} onChange={e => setFilterState({...filterState, sortBy: e.target.value})} className={inputClass}>
                      <option value="latest">Latest Added</option>
                      <option value="az">Alphabetical (A-Z)</option>
                      <option value="za">Alphabetical (Z-A)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Operational Status</label>
                    <div className="flex flex-wrap gap-3">
                      {['staged', 'live', 'archived'].map(s => (
                        <button key={s} onClick={() => toggleFilterArray('statuses', s)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterState.statuses.includes(s) ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-[#050810] border-slate-800 text-slate-500 hover:border-slate-600'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Target Level</label>
                    <div className="flex flex-wrap gap-3">
                      {['JLPT N5', 'JLPT N4', 'JLPT N3', 'JLPT N2', 'JLPT N1'].map(s => (
                        <button key={s} onClick={() => toggleFilterArray('levels', s)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterState.levels.includes(s) ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-400' : 'bg-[#050810] border-slate-800 text-slate-500 hover:border-slate-600'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Min Duration</label>
                      <input type="number" placeholder="0 mins" value={filterState.durationMin} onChange={e => setFilterState({...filterState, durationMin: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Max Duration</label>
                      <input type="number" placeholder="300 mins" value={filterState.durationMax} onChange={e => setFilterState({...filterState, durationMax: e.target.value})} className={inputClass} />
                    </div>
                  </div>
                  <div>
                     <h4 className={`text-xs font-black uppercase tracking-[0.2em] border-b pb-3 mb-6 ${isDarkMode ? 'text-slate-300 border-slate-800' : 'text-slate-600 border-slate-200'}`}>Schedule Window</h4>
                     <div className="space-y-4">
                        <div>
                           <label className={labelClass}>Starts After</label>
                           <input type="datetime-local" value={filterState.dateStart} onChange={e => setFilterState({...filterState, dateStart: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                           <label className={labelClass}>Ends Before</label>
                           <input type="datetime-local" value={filterState.dateEnd} onChange={e => setFilterState({...filterState, dateEnd: e.target.value})} className={inputClass} />
                        </div>
                     </div>
                  </div>
                </div>
                <div className={`p-8 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#0B1120]' : 'border-slate-200 bg-white'}`}>
                  <button onClick={() => setFilterState({search: '', sortBy: 'latest', statuses: [], levels: [], durationMin: '', durationMax: '', dateStart: '', dateEnd: ''})} className={`w-full h-14 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/20 text-rose-500 hover:text-white' : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-rose-500 hover:text-rose-600'}`}>
                    Reset All Filters
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* GLOBAL REPOSITORY SCALABLE SEARCH MODAL */}
        <AnimatePresence>
          {isExamSearchModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/60">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-4xl h-[85vh] flex flex-col border rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`p-8 md:p-10 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div>
                    <h3 className={`text-3xl font-black flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Globe className="text-indigo-500"/> Global Repository</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Search databases and push exams into your matrix canvas</p>
                  </div>
                  <button onClick={() => setIsExamSearchModalOpen(false)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400' : 'bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-500'}`}><X size={20}/></button>
                </div>
                <div className={`p-8 border-b shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="relative">
                    <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500"/>
                    <input value={examSearch} onChange={e => setExamSearch(e.target.value)} className={`w-full h-16 pl-16 pr-6 rounded-2xl border text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 transition-all shadow-inner placeholder:text-slate-500 ${isDarkMode ? 'bg-[#050810] border-slate-800 text-white focus:ring-indigo-500/10 [color-scheme:dark] force-white-text' : 'bg-white border-slate-300 text-slate-900 focus:ring-indigo-500/20 [color-scheme:light] force-dark-text'}`} placeholder="Search exams by exact title or JLPT level..." />
                  </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar ${isDarkMode ? 'bg-[#050810]' : 'bg-slate-50'}`}>
                  {availableTests.filter(t => t.title.toLowerCase().includes(examSearch.toLowerCase()) || t.targetLevel.toLowerCase().includes(examSearch.toLowerCase())).map(test => {
                    const inMatrix = activeSeries.tests.some(x => x.testId === test.id);
                    const hasAccess = test.authorId === currentUserId || test.collaborators.includes(currentUserId);
                    return (
                      <div key={test.id} className={`p-6 md:p-8 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all shadow-lg ${isDarkMode ? 'bg-[#0B1120] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{test.targetLevel}</span>
                            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{test.id}</span>
                          </div>
                          <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.title}</p>
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
                    <button onClick={() => loadMoreExams()} disabled={isLoadingMoreExams} className={`w-full py-6 mt-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2 shadow-lg ${isDarkMode ? 'bg-[#0B1120] border-slate-800 text-indigo-400 hover:bg-slate-900' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'}`}>
                      {isLoadingMoreExams ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Load More Exams from Server
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ADVANCED ENGINE DRAWER */}
        <AnimatePresence>
          {selectedMatrixExam && (
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-md">
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className={`w-full max-w-3xl h-full flex flex-col border-l shadow-[0_0_100px_rgba(0,0,0,0.8)] ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-8 md:p-10 border-b flex justify-between items-start shrink-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'}`}>
                  <div>
                    <h3 className={`text-2xl font-black mb-2 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Settings className="text-indigo-500"/> Operational Parameters</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest line-clamp-1 border-l-2 border-indigo-500 pl-3 py-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{currentSelectedBlueprint?.title || 'Loading Blueprint...'}</p>
                  </div>
                  <button onClick={() => setSelectedMatrixExam(null)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 text-slate-400' : 'bg-white border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500'}`}><X size={20}/></button>
                </div>

                <form onSubmit={saveMatrixExamSettings} className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-12">
                  
                  {/* Execution Strategy */}
                  <div className="space-y-6">
                    <h4 className={`text-sm font-black uppercase tracking-[0.2em] border-b pb-4 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white border-slate-800/80' : 'text-slate-900 border-slate-200'}`}><Power size={18} className="text-rose-500"/> Execution Strategy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedMatrixExam.executionMode === 'auto' ? 'border-amber-500 bg-amber-500/5' : (isDarkMode ? 'bg-[#050810] border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}`} onClick={() => setSelectedMatrixExam({...selectedMatrixExam, executionMode: 'auto'})}>
                         <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${selectedMatrixExam.executionMode === 'auto' ? 'text-amber-500' : 'text-slate-400'}`}><Clock size={14}/> Strict Auto</p>
                         <p className={`text-[9px] font-bold mt-2 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>System controls exact start/stop. No manual override.</p>
                      </div>
                      <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedMatrixExam.executionMode === 'hybrid' ? 'border-indigo-500 bg-indigo-500/5' : (isDarkMode ? 'bg-[#050810] border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}`} onClick={() => setSelectedMatrixExam({...selectedMatrixExam, executionMode: 'hybrid'})}>
                         <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${selectedMatrixExam.executionMode === 'hybrid' ? 'text-indigo-400' : 'text-slate-400'}`}><Server size={14}/> Hybrid Engine</p>
                         <p className={`text-[9px] font-bold mt-2 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Schedules act as failsafe. Manual override allowed.</p>
                      </div>
                      <div className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedMatrixExam.executionMode === 'manual' ? 'border-fuchsia-500 bg-fuchsia-500/5' : (isDarkMode ? 'bg-[#050810] border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}`} onClick={() => setSelectedMatrixExam({...selectedMatrixExam, executionMode: 'manual'})}>
                         <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2 ${selectedMatrixExam.executionMode === 'manual' ? 'text-fuchsia-400' : 'text-slate-400'}`}><ShieldAlert size={14}/> Full Manual</p>
                         <p className={`text-[9px] font-bold mt-2 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>No scheduled timelines. Proctor controls everything.</p>
                      </div>
                    </div>
                  </div>

                  {/* Timelines */}
                  {['auto', 'hybrid'].includes(selectedMatrixExam.executionMode) && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className={labelClass}><Clock size={14} className="inline mr-1 text-emerald-500"/> System Unlock Window</label>
                          <input type="datetime-local" required value={selectedMatrixExam.unlockDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, unlockDate: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}><Clock size={14} className="inline mr-1 text-rose-500"/> Terminal Closure Lock</label>
                          <input type="datetime-local" required value={selectedMatrixExam.deadlineDate} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, deadlineDate: e.target.value})} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THE MASTER PROCTORING & SECURITY MANIFEST */}
                  <div className="mt-12 space-y-6">
                    <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                       <div>
                         <h3 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                           <Shield size={20} className={isProctoringActive ? 'text-indigo-500' : 'text-slate-500'}/> 
                           Security Manifest
                         </h3>
                         <p className={`text-[10px] font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                           {isProctoringForcedOn 
                             ? "⚠️ Forced ON by core mock test template settings." 
                             : "Enable multi-tier proctoring engines."}
                         </p>
                       </div>
                       <label className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${isProctoringForcedOn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isProctoringActive ? 'bg-indigo-500' : (isDarkMode ? 'bg-[#050810] border border-slate-700' : 'bg-slate-200 border border-slate-300')}`}>
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${isProctoringActive ? 'translate-x-8' : 'left-1'}`}></div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            disabled={isProctoringForcedOn}
                            checked={isProctoringActive} 
                            onChange={e => {
                              setSelectedMatrixExam({ ...selectedMatrixExam, proctoringMode: e.target.checked });
                              if (e.target.checked && !expandedSecurityLevel) setExpandedSecurityLevel(1);
                            }} 
                          />
                       </label>
                    </div>

                    <AnimatePresence>
                      {isProctoringActive && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                          
                          {/* Level 1 Accordion */}
                          <div className={`rounded-[2rem] border overflow-hidden shadow-inner ${isDarkMode ? 'bg-blue-900/5 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                            <button type="button" onClick={() => setExpandedSecurityLevel(expandedSecurityLevel === 1 ? null : 1)} className={`w-full p-6 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-blue-900/10' : 'hover:bg-blue-100'}`}>
                               <h4 className={`text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}><Monitor size={18}/> Level 1: Environment Hardening</h4>
                               <ChevronDown className={`transition-transform ${expandedSecurityLevel === 1 ? 'rotate-180' : ''} ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            </button>
                            <AnimatePresence>
                              {expandedSecurityLevel === 1 && (
                                <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
                                  <div className={`p-6 pt-0 space-y-2 border-t mt-2 ${isDarkMode ? 'border-blue-900/20' : 'border-blue-100'}`}>
                                    <SecurityToggle label="Fullscreen Enforcement" description="Automatically exits exam if student leaves fullscreen mode." stateKey="fullscreen" colorClass="bg-blue-500" />
                                    <SecurityToggle label="Multi-Monitor Detection" description="Prevents exam launch if external displays are connected." stateKey="multiMonitor" colorClass="bg-blue-500" />
                                    <SecurityToggle label="Clipboard & Context Menu Lock" description="Disables right-click, copy, paste, and selection tools." stateKey="clipboard" colorClass="bg-blue-500" />
                                    <SecurityToggle label="Metadata Forensics" description="Logs device IP, OS, browser, and network anomalies." stateKey="metadataForensics" colorClass="bg-blue-500" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Level 2 Accordion */}
                          <div className={`rounded-[2rem] border overflow-hidden shadow-inner ${isDarkMode ? 'bg-emerald-900/5 border-emerald-900/30' : 'bg-emerald-50 border-emerald-100'}`}>
                            <button type="button" onClick={() => setExpandedSecurityLevel(expandedSecurityLevel === 2 ? null : 2)} className={`w-full p-6 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-emerald-900/10' : 'hover:bg-emerald-100'}`}>
                               <h4 className={`text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><Video size={18}/> Level 2: Active Proctoring</h4>
                               <ChevronDown className={`transition-transform ${expandedSecurityLevel === 2 ? 'rotate-180' : ''} ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </button>
                            <AnimatePresence>
                              {expandedSecurityLevel === 2 && (
                                <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
                                  <div className={`p-6 pt-0 space-y-2 border-t mt-2 ${isDarkMode ? 'border-emerald-900/20' : 'border-emerald-100'}`}>
                                    <SecurityToggle label="WebRTC Webcam Monitor" description="Requires active video feed to keep the exam unlocked." stateKey="webcam" colorClass="bg-emerald-500" />
                                    <SecurityToggle label="Microphone Audio Monitor" description="Continuously records and flags ambient room noise." stateKey="audio" colorClass="bg-emerald-500" />
                                    <SecurityToggle label="Screenshare Monitor" description="Forces student to share their entire screen with the proctor." stateKey="screenshare" colorClass="bg-emerald-500" />
                                    
                                    <div className={`pt-6 mt-4 border-t grid grid-cols-2 gap-6 ${isDarkMode ? 'border-emerald-900/30' : 'border-emerald-200'}`}>
                                      <div>
                                        <label className={labelClass}><Globe size={14} className="inline mr-1 text-emerald-500"/> IP Whitelist (Allowed)</label>
                                        <input type="text" value={selectedMatrixExam.ipWhitelist || ''} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, ipWhitelist: e.target.value})} placeholder="Blank = All Allowed" className={inputClass} />
                                      </div>
                                      <div>
                                        <label className={labelClass}><Globe size={14} className="inline mr-1 text-rose-500"/> IP Blacklist (Blocked)</label>
                                        <input type="text" value={selectedMatrixExam.ipBlacklist || ''} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, ipBlacklist: e.target.value})} placeholder="Blank = None Blocked" className={inputClass} />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Level 3 Accordion */}
                          <div className={`rounded-[2rem] border overflow-hidden shadow-inner ${isDarkMode ? 'bg-rose-900/5 border-rose-900/30' : 'bg-rose-50 border-rose-100'}`}>
                            <button type="button" onClick={() => setExpandedSecurityLevel(expandedSecurityLevel === 3 ? null : 3)} className={`w-full p-6 flex items-center justify-between transition-colors ${isDarkMode ? 'hover:bg-rose-900/10' : 'hover:bg-rose-100'}`}>
                               <h4 className={`text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}><Cpu size={18}/> Level 3: AI Cognitive Forensics</h4>
                               <ChevronDown className={`transition-transform ${expandedSecurityLevel === 3 ? 'rotate-180' : ''} ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                            </button>
                            <AnimatePresence>
                              {expandedSecurityLevel === 3 && (
                                <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden">
                                  <div className={`p-6 pt-0 space-y-2 border-t mt-2 ${isDarkMode ? 'border-rose-900/20' : 'border-rose-100'}`}>
                                    <SecurityToggle label="AI Video Forensics" description="Analyzes webcam feed for multiple faces, missing faces, or foreign objects." stateKey="aiVideo" colorClass="bg-rose-500" />
                                    <SecurityToggle label="AI Audio Forensics" description="Detects speech, whispers, and background noise anomalies." stateKey="aiAudio" colorClass="bg-rose-500" />
                                    <SecurityToggle label="Gaze Tracking" description="Monitors eye movement to ensure the student is looking at the screen." stateKey="gazeTracking" colorClass="bg-rose-500" />
                                    <SecurityToggle label="Voice Signature Matching" description="Verifies the student's identity against a pre-recorded voiceprint." stateKey="voiceSignature" colorClass="bg-rose-500" />
                                    <SecurityToggle label="Keystroke Dynamics" description="Identifies the student based on their unique typing rhythm." stateKey="keystroke" colorClass="bg-rose-500" />
                                    <SecurityToggle label="VM / Emulation Detection" description="Prevents the exam from running inside virtual machines." stateKey="vmDetection" colorClass="bg-rose-500" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Access & Post-Deadline Settings */}
                  <div className={`mt-12 space-y-6 border-t pt-10 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-[0.2em] border-b pb-4 mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white border-slate-800/80' : 'text-slate-900 border-slate-200'}`}><Lock size={18} className="text-amber-500"/> Access & Workflow Rules</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}><Key size={14} className="inline mr-1 text-amber-500"/> Security Access Key</label>
                        <input type="text" value={selectedMatrixExam.accessKey} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, accessKey: e.target.value})} placeholder="e.g. FALL2026" className={inputClass} />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center justify-between cursor-pointer group mt-4">
                          <div>
                            <span className="text-sm font-black uppercase tracking-widest text-white group-hover:text-amber-400 transition-colors">Dynamic Entry Lockout</span>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 max-w-[200px] leading-relaxed">Blocks late arrivals after launch.</p>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${selectedMatrixExam.isEntryLockoutEnabled ? 'bg-amber-500' : 'bg-[#050810] border border-slate-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${selectedMatrixExam.isEntryLockoutEnabled ? 'translate-x-7' : 'left-1'}`}></div>
                          </div>
                          <input type="checkbox" className="hidden" checked={selectedMatrixExam.isEntryLockoutEnabled} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, isEntryLockoutEnabled: e.target.checked, entryLockoutMinutes: e.target.checked ? selectedMatrixExam.entryLockoutMinutes || 15 : 0})} />
                        </label>
                      </div>
                    </div>

                    {selectedMatrixExam.isEntryLockoutEnabled && (
                      <div className="flex items-center gap-4 animate-in fade-in bg-[#050810] p-4 rounded-[1.5rem] border border-slate-800">
                        <input type="number" min="1" value={selectedMatrixExam.entryLockoutMinutes} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, entryLockoutMinutes: parseInt(e.target.value) || 15})} className={`${inputClass} !w-32 !h-12 !rounded-xl border-none`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Minutes allowed for late entry</span>
                      </div>
                    )}

                    <div className="pt-6 mt-6 border-t border-slate-800/60">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <span className="text-sm font-black uppercase tracking-widest text-white group-hover:text-indigo-400 transition-colors">Asynchronous Post-Deadline Allocations</span>
                          <p className="text-[9px] font-bold text-slate-500 mt-1 max-w-[300px] leading-relaxed">Permit self-paced review workflows after main synchronized sequence ends.</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${selectedMatrixExam.allowPostDeadline ? 'bg-indigo-500' : 'bg-[#050810] border border-slate-700'}`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${selectedMatrixExam.allowPostDeadline ? 'translate-x-7' : 'left-1'}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedMatrixExam.allowPostDeadline} onChange={e => setSelectedMatrixExam({...selectedMatrixExam, allowPostDeadline: e.target.checked})} />
                      </label>
                      
                      {selectedMatrixExam.allowPostDeadline && (
                        <div className="mt-6 grid grid-cols-2 gap-6 animate-in fade-in">
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