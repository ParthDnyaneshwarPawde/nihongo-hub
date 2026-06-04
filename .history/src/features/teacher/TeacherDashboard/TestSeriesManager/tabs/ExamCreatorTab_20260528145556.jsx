import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, UserPlus, Lock, Filter, Activity, Calendar, 
  CheckCircle2, LayoutGrid, LayoutList, ChevronLeft, ChevronRight,
  Radio, Play, Square, AlertTriangle, Eye, Globe, Sparkles, Trash2
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
    schedule: { start: '', end: '' },
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
  const [activeFilter, setActiveFilter] = useState('all'); 
  
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
          
          // Real-time calculation helper for 'auto' mode evaluation
          let currentStatus = data.status || 'upcoming';
          if (data.mode === 'auto' && data.schedule?.start && currentStatus === 'upcoming') {
            const now = new Date();
            const startThreshold = new Date(data.schedule.start);
            if (now >= startThreshold) {
              currentStatus = 'active'; 
            }
          }

          return {
            id: d.id,
            ...data,
            status: currentStatus,
            description: data.description || '',
            collaborators: data.collaborators || [user.uid],
            visuals: data.visuals || { from: '#4F46E5', to: '#7C3AED' },
            schedule: data.schedule || { start: '', end: '' }
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
          tests: d.data().tests || []
        })).filter(s => s.authorId === user.uid || s.collaborators.includes(user.uid));
        setTestSeriesList(seriesData);

        // 3. System Accounts Fetching (Staff directory)
        const staffSnap = await getDocs(collection(db, 'users'));
        if (!staffSnap.empty) {
          setTeacherList(staffSnap.docs.map(d => ({
            id: d.id,
            name: d.data().displayName || d.data().name || 'Unknown Sensei',
            role: d.data().role || 'Instructor',
            avatar: (d.data().displayName || 'ST').substring(0, 2).toUpperCase()
          })));
        } else {
          // Robust system fallback parameters
          setTeacherList([
            { id: 't_001', name: 'Parth Pawde', role: 'Lead Admin', avatar: 'PP' },
            { id: 't_002', name: 'Varsha Sensei', role: 'Sensei Partner', avatar: 'VS' },
            { id: 't_003', name: 'Yuki Nakamura', role: 'Native Consultant', avatar: 'YN' }
          ]);
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
        schedule: test.schedule || { start: '', end: '' },
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
        schedule: examForm.schedule,
        mode: examForm.mode,
        allowLateAttempts: examForm.allowLateAttempts,
        lateDeadline: examForm.allowLateAttempts ? examForm.lateDeadline : '',
        entryLockout: examForm.entryLockout,
        lockoutMinutes: examForm.entryLockout ? parseInt(examForm.lockoutMinutes) : 15,
        collaborators: examForm.collaborators,
        authorId: currentUserId,
        status: editingId ? (mockTests.find(t => t.id === editingId)?.status || 'upcoming') : 'upcoming',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'mock_tests', testId), payload);
      
      // Local structural mutation mapping optimization
      if (editingId) {
        setMockTests(prev => prev.map(t => t.id === editingId ? { ...t, ...payload } : t));
      } else {
        setMockTests(prev => [payload, ...prev]);
      }
      
      setIsExamFormOpen(false);
      setEditingId(null);
      setExamForm(initialExamState);
    } catch (err) {
      alert(`Database write reject operation failure: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const removeExamInstance = async (id) => {
    if (!window.confirm("Perform hard deletion? Access references across allocated test series configurations will drop completely.")) return;
    try {
      await deleteDoc(doc(db, 'mock_tests', id));
      setMockTests(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // STATE MACHINE RUNTIME TRACKER
  // ==========================================
  const advanceExamState = async (testId, currentStatus) => {
    let nextStatus = currentStatus;
    let notificationStr = "";

    if (currentStatus === 'upcoming') {
      nextStatus = 'active';
      notificationStr = "📡 Instance shifted to Pre-Flight deployment window. Waiting room validation enabled.";
    } else if (currentStatus === 'active') {
      nextStatus = 'live';
      notificationStr = "🚀 Examination execution triggered. Countdown limits are now structural across active instances.";
    } else if (currentStatus === 'live') {
      nextStatus = 'over';
      notificationStr = "🛑 Target window closed manually. Enforcing terminal sequence data save pipeline processes.";
    }

    if (nextStatus !== currentStatus) {
      try {
        await updateDoc(doc(db, 'mock_tests', testId), { status: nextStatus });
        setMockTests(prev => prev.map(t => t.id === testId ? { ...t, status: nextStatus } : t));
        alert(notificationStr);
      } catch (err) {
        alert(`System lifecycle transition mutation write failed: ${err.message}`);
      }
    }
  };

  // ==========================================
  // STAFF MUTATION MECHANICS (COLLABORATORS)
  // ==========================================
  const queryTeachersFiltered = useMemo(() => {
    return teacherList.filter(t => t.name.toLowerCase().includes(collabSearch.toLowerCase()));
  }, [teacherList, collabSearch]);

  const mapStaffAuthorization = (id) => {
    setExamForm(prev => {
      const active = prev.collaborators.includes(id);
      return {
        ...prev,
        collaborators: active ? prev.collaborators.filter(item => item !== id) : [...prev.collaborators, id]
      };
    });
  };

  // ==========================================
  // DIRECT CROSS-DEPLOYMENT MANAGEMENT ENGINE
  // ==========================================
  const launchSeriesMapModal = (id) => {
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
      const targetedExam = mockTests.find(t => t.id === deployingExamId);
      
      for (const seriesId of seriesAssignForm.selectedSeries) {
        const seriesDocRef = doc(db, 'test_series', seriesId);
        const seriesSnap = await getDoc(seriesDocRef);
        
        if (seriesSnap.exists()) {
          const targetArray = seriesSnap.data().tests || [];
          
          let subUnlock = '';
          let subDeadline = '';

          if (seriesAssignForm.schedulingMode === 'global') {
            subUnlock = seriesAssignForm.globalSchedule.start || targetedExam.schedule?.start || '';
            subDeadline = seriesAssignForm.globalSchedule.end || targetedExam.schedule?.end || '';
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
  const evaluationsPipeline = useMemo(() => {
    let dataset = mockTests;
    if (activeFilter !== 'all') {
      if (activeFilter === 'live') {
        dataset = mockTests.filter(t => t.status === 'live' || t.status === 'active');
      } else {
        dataset = mockTests.filter(t => t.status === activeFilter);
      }
    }
    return dataset;
  }, [mockTests, activeFilter]);

  const maxPagesCount = Math.ceil(evaluationsPipeline.length / itemsPerPage);
  const runtimeViewChunk = useMemo(() => {
    const baselineIdx = (currentPage - 1) * itemsPerPage;
    return evaluationsPipeline.slice(baselineIdx, baselineIdx + itemsPerPage);
  }, [evaluationsPipeline, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, viewMode]);

  // ==========================================
  // RENDER UI DOM BLOCK
  // ==========================================
  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none">
      
      {/* Dynamic State Tab Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Design high-fidelity custom assessment templates and trigger synchronized deployments.</p>
        </div>
        {!isExamFormOpen && (
          <button 
            onClick={() => triggerFormOpen()} 
            className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-amber-600/10 transition-all duration-200 active:scale-95 shrink-0"
          >
            <Plus size={16} /> Create Blueprint
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
            onSubmit={commitFormToDatabase} className="max-w-[1100px] mx-auto w-full space-y-8 pb-32"
          >
            {/* Identity Core Schema Block */}
            <div className={panelBase}>
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <PenTool size={16} className="text-amber-500"/> Blueprint Core Initialization
                </h3>
                {editingId && <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-inner">Operational Update Registry Lock</span>}
              </div>

              <div className="space-y-6">
                <div>
                  <label className={labelPremiumClass}>Examination Instance Title</label>
                  <input type="text" name="title" value={examForm.title} onChange={handleFormInput} placeholder="e.g., JLPT N4 Full Comprehensive Mock 2026" className={`${inputBase} !text-lg !font-black text-white`} required />
                </div>
                <div>
                  <label className={labelPremiumClass}>Strategic Context Description</label>
                  <textarea name="description" value={examForm.description} onChange={handleFormInput} placeholder="State structural focus configurations, pass parameters, target rules..." rows="3" className={inputBase} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelPremiumClass}>Waiting Room Validation Token (Access Key)</label>
                    <input type="text" name="accessKey" value={examForm.accessKey} onChange={handleFormInput} placeholder="EXAM-KEY-SECURE" className={`${inputBase} uppercase font-mono tracking-widest text-amber-400`} required />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className={labelPremiumClass}>Visual Context Left Accent</label>
                      <div className="flex items-center gap-3 bg-[#0D1527]/80 border border-slate-800/80 rounded-2xl p-2.5">
                        <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleFormInput} className="w-12 h-10 rounded-xl cursor-pointer border-none bg-transparent" />
                        <span className="text-xs font-mono font-bold text-slate-400">{examForm.visuals.from.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className={labelPremiumClass}>Visual Context Right Accent</label>
                      <div className="flex items-center gap-3 bg-[#0D1527]/80 border border-slate-800/80 rounded-2xl p-2.5">
                        <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleFormInput} className="w-12 h-10 rounded-xl cursor-pointer border-none bg-transparent" />
                        <span className="text-xs font-mono font-bold text-slate-400">{examForm.visuals.to.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborators Matrix Layer */}
            <div className={panelBase}>
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Users size={16} className="text-indigo-400"/> Authorized Faculty Directory Assignments</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">Granted global edit schema, proctor terminal override keys, and analytics stream views.</p>
                </div>
                <button type="button" onClick={() => setIsCollabModalOpen(true)} className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2">
                  <UserPlus size={14} /> Link Instructor
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {examForm.collaborators.length === 0 ? (
                  <span className="text-xs font-bold text-slate-600 italic p-2">Isolated Blueprint Configuration Mode. Owner execution only.</span>
                ) : (
                  examForm.collaborators.map(teacherId => {
                    const teacher = teacherList.find(t => t.id === teacherId);
                    if (!teacher) return null;
                    return (
                      <div key={teacher.id} className="pl-1.5 pr-3 py-1.5 rounded-full bg-[#0D1527] border border-slate-800/60 flex items-center gap-3 group shadow-inner">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-black text-white">{teacher.avatar}</div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-white">{teacher.name}</span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{teacher.role}</span>
                        </div>
                        {teacher.id !== currentUserId && (
                          <button type="button" onClick={() => mapStaffAuthorization(teacher.id)} className="w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-500 flex items-center justify-center transition-all duration-150">
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Behavioral Settings & Timing Schemas */}
            <div className={panelBase}>
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8 border-b border-slate-800 pb-4"><ShieldAlert size={16} className="text-rose-500"/> Operational Protocol Real-Time Parameters</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Launch Matrix Switch */}
                <div className="space-y-4">
                  <div>
                    <label className={labelBase}>Execution Launch Strategy Protocol</label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Auto-unlock triggers evaluation lifecycle instantly at baseline clock match.</p>
                  </div>
                  <div className="flex gap-4">
                    <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${examForm.mode === 'auto' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-[#0D1527]/60 text-slate-600 hover:border-slate-700'}`}>
                      <input type="radio" name="mode" value="auto" checked={examForm.mode === 'auto'} onChange={handleFormInput} className="hidden" />
                      <Clock size={16} /> Automated Clock Lift
                    </label>
                    <label className={`flex-1 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${examForm.mode === 'manual' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-slate-800 bg-[#0D1527]/60 text-slate-600 hover:border-slate-700'}`}>
                      <input type="radio" name="mode" value="manual" checked={examForm.mode === 'manual'} onChange={handleFormInput} className="hidden" />
                      <ShieldAlert size={16} /> Manual Proctor Shift
                    </label>
                  </div>
                </div>

                {/* Anti-Cheat Access Threshold Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0D1527]/60 border border-slate-800">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Dynamic Entry Lockout Enforcement</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">Closes entry gates down for students arriving late after deployment lifecycle start.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" name="entryLockout" checked={examForm.entryLockout} onChange={handleFormInput} className="sr-only peer" />
                      <div className="w-12 h-6 bg-[#0B1120] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 transition-all duration-200 peer-checked:bg-rose-500 border-slate-700"></div>
                    </label>
                  </div>

                  {examForm.entryLockout && (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-[#0B1120] border border-slate-800 animate-fadeIn">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Deny Entrance Interval:</span>
                      <input type="number" name="lockoutMinutes" value={examForm.lockoutMinutes} onChange={handleFormInput} className="w-20 p-2 rounded-lg bg-[#0D1527] border border-slate-700 text-white text-center font-black outline-none focus:border-rose-500" min="1" />
                      <span className="text-xs font-bold text-slate-400">Minutes past launch</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Standing Scheduling Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-800/80">
                <div>
                  <label className={labelBase}>Baseline System Unlock Window Timestamp</label>
                  <input type="datetime-local" name="schedule.start" value={examForm.schedule.start} onChange={handleFormInput} className={inputBase} required />
                </div>
                <div>
                  <label className={labelBase}>Baseline Terminal Closure Lock Target Timestamp</label>
                  <input type="datetime-local" name="schedule.end" value={examForm.schedule.end} onChange={handleFormInput} className={inputBase} required />
                </div>
              </div>

              {/* Permitted Post-Deadline Workflows */}
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="p-4 rounded-2xl bg-[#0D1527]/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Asynchronous Post-Deadline Allocations</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Permit self-paced review workflows after main synchronized sequence ends.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" name="allowLateAttempts" checked={examForm.allowLateAttempts} onChange={handleFormInput} className="sr-only peer" />
                    <div className="w-12 h-6 bg-[#0B1120] border border-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 transition-all duration-200 peer-checked:bg-emerald-500 border-slate-700"></div>
                  </label>
                </div>

                {examForm.allowLateAttempts && (
                  <div className="mt-4 p-5 rounded-2xl bg-[#0B1120] border border-slate-800 animate-fadeIn">
                    <label className={labelBase}>Absolute Late Practice Final Cut-Off Limit</label>
                    <input type="datetime-local" name="lateDeadline" value={examForm.lateDeadline} onChange={handleFormInput} className={inputBase} required />
                  </div>
                )}
              </div>
            </div>

            {/* Commits Navigation Dock */}
            <div className="flex gap-4 sticky bottom-6 z-30 bg-[#090E1A]/80 backdrop-blur-md p-4 rounded-3xl border border-slate-800/60 shadow-2xl">
              <button type="button" onClick={closeForm} className="w-1/4 py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200">Discard Blueprint</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-4.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.15)] transition-all duration-200 active:scale-98">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Secure Config Mapping
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
                {[
                  { id: 'all', label: 'All Blueprints', icon: Filter },
                  { id: 'live', label: 'Active Execution', icon: Activity },
                  { id: 'upcoming', label: 'Staged / Upcoming', icon: Calendar },
                  { id: 'over', label: 'Archived Pipeline', icon: CheckCircle2 }
                ].map(filter => (
                  <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeFilter === filter.id ? 'bg-[#131C31] text-white border border-slate-700/80 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                    <filter.icon size={13} className={activeFilter === filter.id && filter.id === 'live' ? 'text-amber-400 animate-pulse' : 'text-current'}/> {filter.label}
                  </button>
                ))}
              </div>

              {/* Layout Presentation Multi-Toggle Switch */}
              <div className="flex items-center gap-1.5 bg-[#090E1A] border border-slate-800 rounded-xl p-1 w-max self-end lg:self-auto">
                <button type="button" onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#131C31] text-amber-400 border border-slate-700' : 'text-slate-600 hover:text-slate-300'}`}><LayoutGrid size={15}/></button>
                <button type="button" onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#131C31] text-amber-400 border border-slate-700' : 'text-slate-600 hover:text-slate-300'}`}><LayoutList size={15}/></button>
              </div>
            </div>

            {/* Target Iterative Rows Data Display Render Window */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "flex flex-col gap-2"}>
              {runtimeViewChunk.length === 0 ? (
                <div className="py-24 border-2 border-dashed border-slate-800/80 rounded-[2.5rem] bg-[#0B1120]/40 flex flex-col items-center text-center px-4 col-span-full">
                  <Globe size={40} className="text-slate-700 mb-3 animate-spin duration-10000" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No matching structural entries compiled</p>
                  <p className="text-xs text-slate-600 font-bold mt-1 max-w-sm">No exam layouts or state models are allocated under this targeted scope filter view parameters.</p>
                </div>
              ) : (
                runtimeViewChunk.map((test) => {
                  // Core Execution Micro-State Processing Engine
                  let executionActionBtn = null;
                  let visualBadge = '';

                  if (test.status === 'upcoming') {
                    visualBadge = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
                    executionActionBtn = (
                      <button 
                        type="button" onClick={() => advanceExamState(test.id, test.status)}
                        className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm"
                      >
                        <Radio size={12}/> Set Active
                      </button>
                    );
                  } else if (test.status === 'active') {
                    visualBadge = 'text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse';
                    executionActionBtn = (
                      <button 
                        type="button" onClick={() => advanceExamState(test.id, test.status)}
                        disabled={test.mode === 'auto'}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-emerald-500/5"
                        title={test.mode === 'auto' ? 'Automated clock lifting parameter sequence locked.' : 'Trigger full live countdown lock manually.'}
                      >
                        <Play size={12}/> Start Exam
                      </button>
                    );
                  } else if (test.status === 'live') {
                    visualBadge = 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse font-black shadow-lg shadow-rose-500/5';
                    executionActionBtn = (
                      <button 
                        type="button" onClick={() => advanceExamState(test.id, test.status)}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm"
                      >
                        <Square size={12}/> End Early
                      </button>
                    );
                  } else {
                    visualBadge = 'text-slate-500 bg-slate-800/40 border-slate-800';
                    executionActionBtn = (
                      <button type="button" disabled className="px-3 py-2 bg-[#0A0F1D] text-slate-600 border border-slate-800/80 text-[9px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 cursor-not-allowed">
                        <CheckCircle2 size={12}/> Closed
                      </button>
                    );
                  }

                  // --------------------------------------------------------
                  // PRESENTATION SCHEME A: DENSE STRIPPED FLEX ROWS (TABLE-LIKE)
                  // --------------------------------------------------------
                  if (viewMode === 'list') {
                    return (
                      <div key={test.id} className="pl-3 pr-4 py-2 rounded-xl bg-[#0B1120]/90 border border-slate-800/50 hover:border-slate-700/80 transition-all duration-200 flex flex-col md:flex-row items-center justify-between gap-4 group">
                        
                        {/* Name Allocation Component Block */}
                        <div className="flex items-center gap-3 w-full md:w-[32%] shrink-0">
                          <div className="w-1.5 h-8 rounded-full shrink-0 shadow-md" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                          <div className="overflow-hidden truncate">
                            <h4 className="text-xs font-black text-slate-200 group-hover:text-white transition-colors duration-150 truncate tracking-tight">{test.title}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${visualBadge}`}>{test.status}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-600 tracking-tighter truncate">{test.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle Operational Metadata Fields */}
                        <div className="hidden md:flex items-center justify-between flex-1 px-4 border-x border-slate-800/60 max-w-xl">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Access Token</span>
                            <span className="text-xs font-mono font-black text-amber-500/90 tracking-wider mt-0.5">{test.accessKey || 'UNSET'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Launch Logic</span>
                            <span className="text-xs font-black text-slate-400 capitalize mt-0.5">{test.mode}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Staff</span>
                            <div className="flex -space-x-1">
                              {test.collaborators?.slice(0, 3).map(id => {
                                const matchedStaff = teacherList.find(x => x.id === id);
                                return matchedStaff ? (
                                  <div key={id} className="w-4 h-4 rounded-full bg-slate-800 border border-[#0B1120] flex items-center justify-center text-[7px] font-black text-slate-300" title={matchedStaff.name}>{matchedStaff.avatar}</div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Localized Inline Pipeline Triggers */}
                        <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-end">
                          {executionActionBtn}
                          
                          <div className="flex items-center gap-0.5 bg-[#0D1527]/80 p-1 rounded-xl border border-slate-800/80">
                            <button onClick={() => triggerFormOpen(test)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors" title="Edit Properties"><Edit2 size={13}/></button>
                            <button onClick={() => openDeploymentModal(test.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors" title="Deploy Architecture Package"><Send size={13}/></button>
                            <button onClick={() => removeExamInstance(test.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors" title="Hard Delete"><Trash2 size={13}/></button>
                            <div className="w-px h-4 bg-slate-800 mx-1"></div>
                            <button className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white transition-colors" title="Launch Design Forge"><PenTool size={13}/></button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // --------------------------------------------------------
                  // PRESENTATION SCHEME B: 2-COLUMN SPACIOUS PREMIUM CARDS
                  // --------------------------------------------------------
                  return (
                    <div key={test.id} className="p-6 rounded-[2rem] bg-[#0B1120] border border-slate-800/80 hover:border-slate-700 transition-all duration-300 shadow-xl flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 opacity-5 blur-[80px] pointer-events-none" style={{ backgroundColor: test.visuals?.from || '#4F46E5' }}></div>
                      
                      <div>
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-2.5 h-9 rounded-full shadow-md" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                            <div>
                              <h4 className="text-xl font-black text-white tracking-tight leading-none">{test.title}</h4>
                              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block mt-1.5">UUID: {test.id}</span>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${visualBadge}`}>{test.status}</span>
                        </div>

                        {test.description && <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 line-clamp-2">{test.description}</p>}

                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-[#0D1527]/60 border border-slate-800/80">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Pre-Flight Key</p>
                            <p className="text-sm font-mono font-black text-amber-400 tracking-wider">{test.accessKey || 'UNSET'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Clock Control</p>
                            <p className="text-xs font-black text-indigo-400 capitalize">{test.mode} Lift Strategy</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-800/60">
                        {executionActionBtn}
                        <div className="grid grid-cols-4 gap-2">
                          <button onClick={() => triggerFormOpen(test)} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"><Edit2 size={12}/> Edit</button>
                          <button onClick={() => openDeploymentModal(test.id)} className="py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"><Send size={12}/> Deploy</button>
                          <button onClick={() => removeExamInstance(test.id)} className="py-2.5 rounded-xl border border-slate-800 hover:border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors"><Trash2 size={12}/> Drop</button>
                          <button className="py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/5"><PenTool size={12}/> Forge</button>
                        </div>
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
         SYSTEM MODALS SECTION: COLLABORATORS & CROSS-DEPLOYMENT MANAGEMENT
         ==================================================================== */}
      <AnimatePresence>
        
        {/* MODAL 1: SEARCH & LINK ACCREDITED INSTRUCTORS */}
        {isCollabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCollabModalOpen(false)} className="absolute inset-0" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 15 }} className="relative w-full max-w-lg rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl p-8 overflow-hidden z-10">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2"><UserPlus size={18} className="text-indigo-400"/> Link Faculty Accounts</h3>
                <button type="button" onClick={() => setIsCollabModalOpen(false)} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={14}/></button>
              </div>
              
              <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input type="text" placeholder="Filter by faculty legal name registry..." value={collabSearch} onChange={(e) => setCollabSearch(e.target.value)} className="w-full p-4 pl-12 rounded-xl bg-[#0D1527] border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
              </div>

              <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {queryTeachersFiltered.map(teacher => {
                  const matchActive = examForm.collaborators.includes(teacher.id);
                  return (
                    <div key={teacher.id} onClick={() => toggleCollaborator(teacher.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 flex items-center justify-between ${matchActive ? 'bg-indigo-500/10 border-indigo-500/80 shadow-md shadow-indigo-500/5' : 'bg-[#0D1527]/60 border-slate-800/80 hover:border-slate-700'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white">{teacher.avatar}</div>
                        <div>
                          <p className={`font-black text-sm ${matchActive ? 'text-indigo-400' : 'text-slate-200'}`}>{teacher.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{teacher.role}</p>
                        </div>
                      </div>
                      {matchActive && <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Check size={12}/></div>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: ENTERPRISE CURRICULUM CROSS-DEPLOYMENT MATRIX */}
        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[2.5rem] bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden z-10">
              
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0D1527]/40">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-3"><Send size={22} className="text-indigo-500"/> Direct Cross-Deployment Routing</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Map template blueprint coordinates to live container lines</p>
                </div>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={16}/></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 ml-1">Step 1: Select Target Test Series Container Nodes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testSeriesList.map(series => {
                      const activeSelection = seriesAssignForm.selectedSeries.includes(series.id);
                      return (
                        <div key={series.id} onClick={() => processSeriesItemSelect(series.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between ${activeSelection ? 'bg-indigo-500/10 border-indigo-500' : 'bg-[#0D1527]/60 border-slate-800 hover:border-slate-700'}`}>
                          <div>
                            <p className={`font-black text-sm mb-1 ${activeSelection ? 'text-indigo-400' : 'text-slate-200'}`}>{series.title}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Curriculum Node: {series.id}</p>
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${activeSelection ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 bg-transparent'}`}>
                            {activeSelection && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-6">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 ml-1">Step 2: Deployment Timeline Properties</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">Determine if timeline values track globally or mutate per configuration vector.</p>
                      </div>
                      <div className="flex bg-[#090E1A] rounded-xl p-1 border border-slate-800 shrink-0">
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'global' }))} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Uniform Clock</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'custom' }))} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Custom Matrix</button>
                      </div>
                    </div>

                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className="p-6 rounded-2xl bg-[#0D1527]/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Global Target Unlock Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => configureDistributionSchedules('global', 'start', e.target.value)} className={inputBase} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Global Target Expiration Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => configureDistributionSchedules('global', 'end', e.target.value)} className={inputBase} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const instanceObject = testSeriesList.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className="p-5 rounded-2xl bg-[#0D1527]/60 border border-slate-800/80">
                              <h5 className="text-xs font-black text-indigo-400 mb-4 flex items-center gap-2"><Sparkles size={12}/> Custom Constraints: {instanceObject?.title}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Node Specific Unlock Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => configureDistributionSchedules('custom', 'start', e.target.value, seriesId)} className={inputBase} />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Node Specific Expiration Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => configureDistributionSchedules('custom', 'end', e.target.value, seriesId)} className={inputBase} />
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
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-800/60 hover:text-white transition-all">Cancel</button>
                <button type="button" onClick={commitDeploymentConfiguration} disabled={seriesAssignForm.selectedSeries.length === 0} className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                  <Send size={12} /> Execute Pipeline Allocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}