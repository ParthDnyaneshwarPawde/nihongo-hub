import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, UserPlus, Lock, Filter, LayoutGrid, LayoutList, 
  ChevronLeft, ChevronRight, Globe, Sparkles, Trash2, Loader2,
  Shield, ArrowRight
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
    // 🚨 REMOVED SCHEDULE FROM BLUEPRINT
    mode: 'auto', 
    allowLateAttempts: false,
    lateDeadline: '',
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
  const itemsPerPage = viewMode === 'grid' ? 6 : 10;
  
  // Modals & Sub-forms
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(initialExamState);

  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);
  const [seriesAssignForm, setSeriesAssignForm] = useState(initialDeploymentState);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [teacherSearch, setTeacherSearch] = useState('');

  // ==========================================
  // UI CLASSES
  // ==========================================
  const inputBase = `w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white font-bold text-lg transition-all outline-none focus:border-indigo-500`;
  const labelPremiumClass = `block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 mb-3`;
  const panelBase = `p-8 md:p-10 rounded-[3rem] bg-[#0B1120]/90 border border-slate-800/80 shadow-2xl`;

  // ==========================================
  // DATABASE SYNC ENGINE (FIRESTORE)
  // ==========================================
  useEffect(() => {
    const syncDatabase = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUserId(user.uid);

        // 1. Fetch Standing Blueprints
        const testsSnap = await getDocs(collection(db, 'mock_tests'));
        const exams = testsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            status: 'blueprint', // Simplified since blueprints have no active/live state
            description: data.description || '',
            collaborators: data.collaborators || [user.uid],
            visuals: data.visuals || { from: '#4F46E5', to: '#7C3AED' }
          };
        });
        setMockTests(exams);

        // 2. Fetch User Authorized Test Series Containers
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

        // 3. System Accounts Fetching (Staff directory)
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
          console.warn("Could not fetch users directly, falling back to basic list.", e);
        }

      } catch (err) {
        console.error("Critical core synchronization error:", err);
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
  // BLUEPRINT HANDLERS & MODAL INTERFACES
  // ==========================================
  const handleFormInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setExamForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setExamForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
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
        lateDeadline: test.lateDeadline || '',
        entryLockout: test.entryLockout || false,
        lockoutMinutes: test.lockoutMinutes || 15,
        collaborators: test.collaborators || [currentUserId]
      });
    } else {
      setEditingId(null);
      setExamForm({
        ...initialExamState,
        collaborators: [currentUserId]
      });
    }
    setTeacherSearch('');
    setIsExamFormOpen(true);
  };

  const commitFormToDatabase = async (e) => {
    e.preventDefault();
    if (!examForm.title.trim()) return alert("Exam instance title validation error.");
    
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
        lateDeadline: examForm.allowLateAttempts ? examForm.lateDeadline : '',
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
      alert(`Database write reject operation failure: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setIsExamFormOpen(false);
    setEditingId(null);
    setExamForm(initialExamState);
    setTeacherSearch('');
  };

  const removeExamInstance = async (id) => {
    if (!window.confirm("Perform hard deletion? Access references across allocated test series configurations will drop completely.")) return;
    try {
      await deleteDoc(doc(db, 'mock_tests', id));
      setMockTests(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete exam from database.");
    }
  };

  // ==========================================
  // STAFF MUTATION MECHANICS (COLLABORATORS)
  // ==========================================
  const foundTeachers = useMemo(() => {
  if (!teacherSearch.trim()) return []; // Use teacherSearch here
  return teacherList.filter(t => 
    t.id !== currentUserId && 
    !examForm.collaborators.includes(t.id) &&
    (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
     (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase())))
  );
}, [teacherSearch, teacherList, examForm.collaborators, currentUserId]);

  const addCollaborator = (teacherId) => {
    setExamForm(prev => ({
      ...prev,
      collaborators: [...prev.collaborators, teacherId]
    }));
    setTeacherSearch('');
  };

  const removeCollaborator = (teacherId) => {
    setExamForm(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(id => id !== teacherId)
    }));
  };

  // ==========================================
  // DIRECT CROSS-DEPLOYMENT MANAGEMENT ENGINE
  // ==========================================
  const openDeploymentModal = (id) => {
    setDeployingExamId(id);
    setSeriesAssignForm({
      selectedSeries: [],
      schedulingMode: 'global',
      globalSchedule: { start: '', end: '' },
      customSchedules: {}
    });
    setIsSeriesModalOpen(true);
  };

  const processSeriesItemSelect = (seriesId) => {
    setSeriesAssignForm(prev => {
      const match = prev.selectedSeries.includes(seriesId);
      const updated = match ? prev.selectedSeries.filter(id => id !== seriesId) : [...prev.selectedSeries, seriesId];
      
      const customConfig = { ...prev.customSchedules };
      if (!match && !customConfig[seriesId]) {
        customConfig[seriesId] = { start: '', end: '' };
      }
      return {
        ...prev,
        selectedSeries: updated,
        customSchedules: customConfig
      };
    });
  };

  const configureDistributionSchedules = (mode, field, val, targetId = null) => {
    setSeriesAssignForm(prev => {
      if (mode === 'global') {
        return {
          ...prev,
          globalSchedule: { ...prev.globalSchedule, [field]: val }
        };
      } else {
        return {
          ...prev,
          customSchedules: {
            ...prev.customSchedules,
            [targetId]: { ...prev.customSchedules[targetId], [field]: val }
          }
        };
      }
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
          
          let subUnlock = '';
          let subDeadline = '';

          if (seriesAssignForm.schedulingMode === 'global') {
            subUnlock = seriesAssignForm.globalSchedule.start || '';
            subDeadline = seriesAssignForm.globalSchedule.end || '';
          } else {
            subUnlock = seriesAssignForm.customSchedules[seriesId]?.start || '';
            subDeadline = seriesAssignForm.customSchedules[seriesId]?.end || '';
          }

          const recordIndex = targetArray.findIndex(item => item.testId === deployingExamId);
          const metaPayload = {
            testId: deployingExamId,
            testUnlockDate: subUnlock,
            testDeadlineDate: subDeadline
          };

          if (recordIndex > -1) {
            targetArray[recordIndex] = metaPayload;
          } else {
            targetArray.push(metaPayload);
          }

          await updateDoc(seriesDocRef, { tests: targetArray });
        }
      }

      alert("Deployment logic synchronized perfectly across chosen Test Series configurations.");
      setIsSeriesModalOpen(false);
    } catch (err) {
      alert(`Pipeline error pushing target arrays: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // COMPUTE & PAGINATION SUB-SYSTEMS
  // ==========================================
  const totalPages = Math.ceil(mockTests.length / itemsPerPage);
  
  const runtimeViewChunk = useMemo(() => {
    const baselineIdx = (currentPage - 1) * itemsPerPage;
    return mockTests.slice(baselineIdx, baselineIdx + itemsPerPage);
  }, [mockTests, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // ==========================================
  // RENDER UI DOM BLOCK
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090E1A]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-amber-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Synchronizing Data Modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20">
      
      {/* Dynamic State Tab Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Design high-fidelity custom assessment templates. Time controls are managed in the Series Architect.</p>
        </div>
        {!isExamFormOpen && (
          <button 
            onClick={() => triggerFormOpen()} 
            className="px-8 py-5 bg-white text-black rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl hover:scale-105 transition-all duration-300 shrink-0"
          >
            Create Blueprint <ArrowRight size={18} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isExamFormOpen ? (
          /* ====================================================================
             WORKSPACE SUB-VIEW: BLUEPRINT ARCHITECT PANEL
             ==================================================================== */
          <motion.form 
            key="form" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }}
            onSubmit={commitFormToDatabase} className="max-w-[1200px] mx-auto w-full pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-right-8 duration-500">
              
              {/* LEFT COLUMN: Core Details */}
              <div className="space-y-8">
                
                <div className="space-y-3">
                  <label className={labelPremiumClass}>
                    Exam Blueprint Title {editingId && <span className="text-amber-500 ml-2">(EDITING)</span>}
                  </label>
                  <input 
                    required 
                    name="title"
                    value={examForm.title} 
                    onChange={handleFormInput} 
                    className={inputBase} 
                    placeholder="Ex: Master N3 Vocabulary Final" 
                  />
                </div>

                <div className="space-y-3">
                  <label className={labelPremiumClass}>Description Context</label>
                  <textarea 
                    name="description" 
                    value={examForm.description} 
                    onChange={handleFormInput} 
                    className={`${inputBase} min-h-[120px] resize-y`} 
                    placeholder="Briefly describe the contents of this exam..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Access Key (Pre-Flight)</label>
                    <input 
                      required
                      name="accessKey"
                      value={examForm.accessKey} 
                      onChange={handleFormInput} 
                      className={`${inputBase} uppercase font-mono tracking-widest text-amber-400`} 
                      placeholder="EXAM-KEY" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Launch Logic Model</label>
                    <button 
                      type="button" 
                      onClick={() => setExamForm({...examForm, mode: examForm.mode === 'auto' ? 'manual' : 'auto'})} 
                      className={`w-full py-6 rounded-[2rem] font-black text-xs transition-all shadow-xl tracking-widest uppercase flex items-center justify-center gap-2 ${examForm.mode === 'auto' ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-rose-600 text-white shadow-rose-500/20'}`}
                    >
                      {examForm.mode === 'auto' ? <><Clock size={16}/> Auto-Start</> : <><ShieldAlert size={16}/> Manual Gate</>}
                    </button>
                  </div>
                </div>

                {/* Visual Colors */}
                <div className="p-8 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10 space-y-6 shadow-inner">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Settings size={14}/> Visual Identity Colors
                  </label>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-500 mb-2 ml-2">Gradient Start</p>
                      <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleFormInput} className="w-full h-14 rounded-3xl cursor-pointer border-none bg-transparent" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-500 mb-2 ml-2">Gradient End</p>
                      <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleFormInput} className="w-full h-14 rounded-3xl cursor-pointer border-none bg-transparent" />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Collaborators & Anti-Cheat */}
              <div className="space-y-8 flex flex-col">
                
                {/* Real Collaborator UI */}
                <div className="space-y-3 flex-1 flex flex-col">
                  <label className={labelPremiumClass}>Collaborators (Senseis)</label>
                  <div className="flex-1 bg-slate-950/50 p-8 rounded-[3rem] border border-slate-800 shadow-inner flex flex-col space-y-6">
                    
                    {/* Search Bar */}
                    <div className="flex gap-2">
                      <input 
                        value={teacherSearch} 
                        onChange={e => setTeacherSearch(e.target.value)} 
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all" 
                        placeholder="Search Sensei Name or Email..." 
                      />
                      <button type="button" className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg hover:scale-105 transition-all">
                        <Search size={20}/>
                      </button>
                    </div>
                    
                    {/* Search Results */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[200px]">
                      {teacherSearch.length === 0 ? (
                        <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-slate-600">Type to search registry</p>
                      ) : foundTeachers.length === 0 ? (
                        <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No matching Sensei found</p>
                      ) : (
                        foundTeachers.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <div>
                              <p className="text-xs font-black text-white">{t.name}</p>
                              <p className="text-[9px] font-bold text-slate-500 tracking-wider">{t.email}</p> 
                            </div>
                            <button 
                              type="button" 
                              onClick={() => addCollaborator(t.id)} 
                              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Team Registry Pills */}
                    <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-3">
                      <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12}/> Verified Lead (You)
                      </span>

                      <AnimatePresence>
                        {examForm.collaborators.map(teacherId => {
                          const t = teacherList.find(x => x.id === teacherId);
                          if (!t) return null;
                          return (
                            <motion.span 
                              layout
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              key={t.id} 
                              className="bg-slate-800 text-white border border-slate-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2"
                            >
                              {t.name}
                              <X 
                                size={12} 
                                className="cursor-pointer hover:text-rose-500 transition-colors ml-1" 
                                onClick={() => removeCollaborator(t.id)} 
                              />
                            </motion.span>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Anti-Cheat Rules */}
                <div className="space-y-3">
                  <label className={labelPremiumClass}>Integrity & Entry Rules</label>
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800 shadow-inner flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Strict Entry Lockout</h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">Deny late joiners after start.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleFormInput} className="sr-only peer" />
                        <div className="w-12 h-6 bg-[#0B1120] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 transition-all duration-200 peer-checked:bg-rose-500 border-slate-700"></div>
                      </label>
                    </div>

                    {examForm.entryLockout && (
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-[#0B1120] border border-slate-800 animate-fadeIn">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Lock Room After:</span>
                        <input type="number" name="lockoutMinutes" value={examForm.lockoutMinutes} onChange={handleFormInput} className="w-20 p-2 rounded-lg bg-[#0D1527] border border-slate-700 text-white text-center font-black outline-none focus:border-rose-500" min="1" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Mins</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-800 pt-4 mt-2 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Late Attempt Mode</h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">Allow practice runs post-deadline.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" name="allowLateAttempts" checked={examForm.allowLateAttempts} onChange={handleFormInput} className="sr-only peer" />
                        <div className="w-12 h-6 bg-[#0B1120] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 transition-all duration-200 peer-checked:bg-emerald-500 border-slate-700"></div>
                      </label>
                    </div>

                    {examForm.allowLateAttempts && (
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-[#0B1120] border border-slate-800 animate-fadeIn mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Final Cutoff:</span>
                        <input type="datetime-local" name="lateDeadline" value={examForm.lateDeadline} onChange={handleFormInput} className="flex-1 p-2 rounded-lg bg-[#0D1527] border border-slate-700 text-white text-[10px] outline-none focus:border-emerald-500" />
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
             WORKSPACE SUB-VIEW: MASTER METRICS & HIGH-DENSITY DASHBOARD
             ==================================================================== */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            {/* Control Strip Filtering Rows Layout */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B1120]/40 p-3 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-1.5 p-1 bg-[#090E1A] border border-slate-800 rounded-xl w-max overflow-x-auto">
                <button className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 bg-[#131C31] text-amber-400 border border-slate-700/80 shadow-md`}>
                  <Filter size={13} /> Active Blueprints Collection
                </button>
              </div>

              {/* Layout Presentation Multi-Toggle Switch */}
              <div className="flex items-center gap-1.5 bg-[#090E1A] border border-slate-800 rounded-xl p-1 w-max self-end lg:self-auto">
                <button type="button" onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#131C31] text-amber-400 border border-slate-700' : 'text-slate-600 hover:text-slate-300'}`}><LayoutGrid size={15}/></button>
                <button type="button" onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#131C31] text-amber-400 border border-slate-700' : 'text-slate-600 hover:text-slate-300'}`}><LayoutList size={15}/></button>
              </div>
            </div>

            {/* Target Iterative Rows Data Display Render Window */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "flex flex-col gap-3"}>
              {runtimeViewChunk.length === 0 ? (
                <div className="py-24 border-2 border-dashed border-slate-800/80 rounded-[2.5rem] bg-[#0B1120]/40 flex flex-col items-center text-center px-4 col-span-full">
                  <Globe size={40} className="text-slate-700 mb-3 animate-pulse duration-10000" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Blueprints Compiled</p>
                  <p className="text-xs text-slate-600 font-bold mt-1 max-w-sm">Create your first exam shell to begin mapping questions and deploying to batches.</p>
                </div>
              ) : (
                runtimeViewChunk.map((test) => {
                  
                  // --------------------------------------------------------
                  // PRESENTATION SCHEME A: DENSE STRIPPED FLEX ROWS (TABLE-LIKE)
                  // --------------------------------------------------------
                  if (viewMode === 'list') {
                    return (
                      <div key={test.id} className="pl-3 pr-4 py-3 rounded-2xl bg-[#0B1120]/90 border border-slate-800/50 hover:border-slate-700/80 transition-all duration-200 flex flex-col md:flex-row items-center justify-between gap-4 group">
                        
                        <div className="flex items-center gap-4 w-full md:w-[35%] shrink-0">
                          <div className="w-2 h-10 rounded-full shrink-0 shadow-md" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                          <div className="overflow-hidden truncate">
                            <h4 className="text-sm font-black text-slate-200 group-hover:text-white transition-colors duration-150 truncate tracking-tight">{test.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border text-indigo-400 bg-indigo-500/10 border-indigo-500/20">BLUEPRINT</span>
                              <span className="text-[9px] font-mono font-bold text-slate-600 tracking-tighter truncate">{test.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center justify-between flex-1 px-4 border-x border-slate-800/60 max-w-xl">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Access Key</span>
                            <span className="text-xs font-mono font-black text-amber-500/90 tracking-wider mt-0.5">{test.accessKey || 'UNSET'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Launch Rule</span>
                            <span className="text-xs font-black text-slate-400 capitalize mt-0.5 flex items-center gap-1">
                              {test.mode === 'auto' ? <Clock size={10}/> : <ShieldAlert size={10}/>} {test.mode}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Faculty</span>
                            <div className="flex -space-x-1">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 border border-[#0B1120] flex items-center justify-center text-[7px] font-black text-white z-10" title="Lead Architect">L</div>
                              {test.collaborators?.slice(0, 3).map(id => {
                                const matchedStaff = teacherList.find(x => x.id === id);
                                return matchedStaff ? (
                                  <div key={id} className="w-5 h-5 rounded-full bg-slate-800 border border-[#0B1120] flex items-center justify-center text-[7px] font-black text-slate-300" title={matchedStaff.name}>{matchedStaff.avatar}</div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                          <button onClick={() => triggerFormOpen(test)} className="px-4 py-2.5 rounded-xl bg-[#0D1527] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Edit2 size={12}/> Edit</button>
                          <button onClick={() => openDeploymentModal(test.id)} className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Send size={12}/> Deploy</button>
                          <button onClick={() => removeExamInstance(test.id)} className="p-2.5 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors" title="Delete"><Trash2 size={14}/></button>
                          <div className="w-px h-6 bg-slate-800 mx-1"></div>
                          <button onClick={() => alert("Launching Forge Architect...")} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-amber-600/20"><PenTool size={12}/> Forge</button>
                        </div>
                      </div>
                    );
                  }

                  // --------------------------------------------------------
                  // PRESENTATION SCHEME B: 2-COLUMN SPACIOUS PREMIUM CARDS
                  // --------------------------------------------------------
                  return (
                    <div key={test.id} className="p-6 md:p-8 rounded-[2.5rem] bg-[#0B1120] border border-slate-800/80 hover:border-slate-700 transition-all duration-300 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 opacity-5 blur-[80px] pointer-events-none" style={{ backgroundColor: test.visuals?.from || '#4F46E5' }}></div>
                      
                      <div>
                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-2.5 h-12 rounded-full shadow-md" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                            <div>
                              <h4 className="text-xl font-black text-white tracking-tight leading-none">{test.title}</h4>
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mt-2">UUID: {test.id}</span>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border text-indigo-400 bg-indigo-500/10 border-indigo-500/20">BLUEPRINT</span>
                        </div>

                        {test.description && <p className="text-xs text-slate-400 font-medium leading-relaxed mb-8 line-clamp-2 relative z-10">{test.description}</p>}

                        <div className="grid grid-cols-2 gap-4 mb-8 p-4 rounded-2xl bg-[#0D1527]/60 border border-slate-800/80 relative z-10">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Pre-Flight Key</p>
                            <p className="text-sm font-mono font-black text-amber-400 tracking-wider">{test.accessKey || 'UNSET'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Launch Logic</p>
                            <p className="text-xs font-black text-white capitalize flex items-center gap-1.5">
                              {test.mode === 'auto' ? <Clock size={12} className="text-amber-500"/> : <ShieldAlert size={12} className="text-rose-500"/>} 
                              {test.mode} Start
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 pt-6 border-t border-slate-800/60 relative z-10">
                        <button onClick={() => triggerFormOpen(test)} className="py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"><Edit2 size={12}/> Edit</button>
                        <button onClick={() => openDeploymentModal(test.id)} className="py-3.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"><Send size={12}/> Deploy</button>
                        <button onClick={() => removeExamInstance(test.id)} className="py-3.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"><Trash2 size={12}/> Drop</button>
                        <button onClick={() => alert("Launching Forge Architect...")} className="py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/10"><PenTool size={12}/> Forge</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls Footer Dock */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12 pt-6 border-t border-slate-900">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronLeft size={16}/></button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button key={pageNumber} type="button" onClick={() => setCurrentPage(pageNumber)} className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNumber ? 'bg-amber-500 text-white shadow-lg' : 'bg-[#0B1120] border border-slate-800 text-slate-500 hover:border-slate-700'}`}>{pageNumber}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-all"><ChevronRight size={16}/></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
         MODAL 2: ENTERPRISE CURRICULUM CROSS-DEPLOYMENT MATRIX
         ==================================================================== */}
      <AnimatePresence>
        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden z-10">
              
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0D1527]/40">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3"><Send size={22} className="text-indigo-500"/> Blueprint Deployment Routing</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Assign this exam to active test series containers and set schedules.</p>
                </div>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={16}/></button>
              </div>

              <div className="p-8 overflow-y-auto premium-scroll flex-1 space-y-10">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 ml-1">Step 1: Select Target Test Series Container Nodes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testSeriesList.map(series => {
                      const activeSelection = seriesAssignForm.selectedSeries.includes(series.id);
                      return (
                        <div key={series.id} onClick={() => processSeriesItemSelect(series.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between ${activeSelection ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527]/60 border-slate-800 hover:border-slate-700'}`}>
                          <div>
                            <p className={`font-black text-sm mb-1 ${activeSelection ? 'text-indigo-400' : 'text-slate-200'}`}>{series.title}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Batches Attached: {series.batches?.length || 0}</p>
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${activeSelection ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 bg-transparent'}`}>
                            {activeSelection && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                    {testSeriesList.length === 0 && (
                      <div className="col-span-full py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Series Available. Create one in the Series Architect.</p>
                      </div>
                    )}
                  </div>
                </div>

                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-8">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 ml-1">Step 2: Deployment Timeline Properties</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">Determine if timeline values track globally or mutate per configuration vector.</p>
                      </div>
                      <div className="flex bg-[#090E1A] rounded-xl p-1 border border-slate-800 shrink-0">
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'global' }))} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Uniform Schedule</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'custom' }))} className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Custom Per Series</button>
                      </div>
                    </div>

                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className="p-8 rounded-[2rem] bg-[#0D1527]/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2">Global Unlock Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => configureDistributionSchedules('global', 'start', e.target.value)} className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-sm outline-none focus:border-amber-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2">Global Expiration Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => configureDistributionSchedules('global', 'end', e.target.value)} className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold text-sm outline-none focus:border-amber-500 transition-all" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const instanceObject = testSeriesList.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className="p-6 rounded-[2rem] bg-[#0D1527]/60 border border-slate-800/80">
                              <h5 className="text-xs font-black text-indigo-400 mb-4 flex items-center gap-2"><Sparkles size={12}/> Custom Constraints: {instanceObject?.title}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2">Unlock Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => configureDistributionSchedules('custom', 'start', e.target.value, seriesId)} className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-2">Expiration Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => configureDistributionSchedules('custom', 'end', e.target.value, seriesId)} className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
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

              <div className="p-6 border-t border-slate-800 bg-[#0B1120] flex justify-end gap-4">
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="px-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-xs text-slate-500 hover:bg-slate-800/60 hover:text-white transition-all">Cancel Process</button>
                <button type="button" onClick={commitDeploymentConfiguration} disabled={seriesAssignForm.selectedSeries.length === 0 || isSaving} className="px-10 py-5 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-indigo-600/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-3">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Execute Pipeline Allocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}