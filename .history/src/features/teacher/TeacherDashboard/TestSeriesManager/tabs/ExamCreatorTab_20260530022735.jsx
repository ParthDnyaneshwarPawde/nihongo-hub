import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, Filter, LayoutGrid, LayoutList, Activity, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, Globe, Sparkles, Trash2, Loader2,
  Shield, ArrowRight, BookOpen, Layers, RotateCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ExamCreatorTab() {

  const navigate = useNavigate();
  // ==========================================
  // INITIAL PARAMETERS & CONSTANTS
  // ==========================================
  const INITIAL_EXAM_STATE = {
    title: '',
    description: '',
    targetLevel: 'JLPT N4', 
    durationMinutes: 90,    
    visuals: { from: '#4F46E5', to: '#7C3AED' },
    collaborators: []
  };

  const INITIAL_DEPLOYMENT_STATE = {
    selectedSeries: [],
    schedulingMode: 'global', 
    globalSchedule: { start: '', end: '' },
    customSchedules: {} 
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [mockTests, setMockTests] = useState([]);
  const [testSeriesList, setTestSeriesList] = useState([]);
  const [teacherList, setTeacherList] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  // UI Navigation & Control States
  const [viewMode, setViewMode] = useState('list'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 12;
  const [activeFilter, setActiveFilter] = useState('all'); 
  
  // Modals & Sub-forms
  const [isExamFormOpen, setIsExamFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [examForm, setExamForm] = useState(INITIAL_EXAM_STATE);

  const [teacherSearch, setTeacherSearch] = useState('');

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [deployingExamId, setDeployingExamId] = useState(null);
  const [seriesAssignForm, setSeriesAssignForm] = useState(INITIAL_DEPLOYMENT_STATE);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // UI STYLING CLASSES 
  // ==========================================
  const inputBase = `w-full p-6 rounded-[2rem] bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 text-white font-bold text-lg transition-all outline-none focus:border-indigo-500 focus:bg-slate-900 hover:border-slate-700`;
  const labelPremiumClass = `block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2 mb-3 flex items-center gap-2`;

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
  const fetchAllData = async (uid = currentUserId) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      // 1. Fetch Standing Blueprints (🚨 STRICT SECURITY FILTER ADDED)
      const testsSnap = await getDocs(collection(db, 'mock_tests'));
      const exams = testsSnap.docs.map(d => ({
        id: d.id, 
        ...d.data(), 
        status: d.data().status || 'upcoming', 
        description: d.data().description || '', 
        targetLevel: d.data().targetLevel || 'JLPT N4',
        durationMinutes: d.data().durationMinutes || 90, 
        
        // 🚨 FIX: Removed `|| uid` fallback so Random Teachers don't get Ghost Ownership!
        collaborators: d.data().collaborators || [], 
        authorId: d.data().authorId || '', 
        
        visuals: d.data().visuals || { from: '#4F46E5', to: '#7C3AED' }
      })).filter(exam => exam.authorId === uid || (exam.collaborators && exam.collaborators.includes(uid))); 
      // 🚨 FIX: This filter hides exams from teachers who aren't explicitly assigned to them!

      setMockTests(exams);

      // 2. Fetch Authorized Series
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      const seriesData = seriesSnap.docs.map(d => ({
        id: d.id, title: d.data().title || 'Untitled Series', authorId: d.data().authorId,
        collaborators: d.data().collaborators || [], tests: d.data().tests || [], batches: d.data().assignedBatches || []
      })).filter(s => s.authorId === uid || s.collaborators.includes(uid));
      setTestSeriesList(seriesData);

      // 3. Fetch Staff (Strictly Teachers Only)
      try {
        const staffSnap = await getDocs(collection(db, 'users'));
        if (!staffSnap.empty) {
          
          const mappedUsers = staffSnap.docs.map(d => {
            const data = d.data();
            
            let fullName = 'Unknown Sensei';
            if (data.firstName || data.lastName) {
              fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            } else if (data.displayName || data.name) {
              fullName = data.displayName || data.name;
            }

            const initials = fullName !== 'Unknown Sensei' 
              ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              : 'ST';

            return {
              id: d.id, 
              name: fullName, 
              email: data.email || '',
              role: (data.role || 'student').toLowerCase(), 
              avatar: initials
            };
          });

          // Filter out anyone who isn't staff
          const strictlyTeachers = mappedUsers.filter(u => 
            u.role === 'teacher' || u.role === 'instructor' || u.role === 'admin' || u.role === 'sensei'
          );

          setTeacherList(strictlyTeachers);
        }
      } catch (e) {
        console.warn("User fetch fallback initiated.");
      }

    } catch (err) {
      console.error("Critical core synchronization error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchAllData(user.uid);
      }
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
        targetLevel: test.targetLevel || 'JLPT N4',
        durationMinutes: test.durationMinutes || 90,
        visuals: test.visuals || { from: '#4F46E5', to: '#7C3AED' },
        collaborators: test.collaborators || [currentUserId],
        authorId: test.authorId // 🚨 Pulling actual ownership ID into the form
      });
    } else {
      setEditingId(null);
      setExamForm({ 
        ...INITIAL_EXAM_STATE, 
        collaborators: [currentUserId],
        authorId: currentUserId // 🚨 Sets you as owner for brand new exams
      });
    }
    setTeacherSearch('');
    setIsExamFormOpen(true);
  };

  const closeForm = () => {
    setIsExamFormOpen(false);
    setEditingId(null);
    setExamForm(INITIAL_EXAM_STATE);
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
        targetLevel: examForm.targetLevel,
        durationMinutes: parseInt(examForm.durationMinutes) || 90,
        visuals: examForm.visuals,
        collaborators: examForm.collaborators,
        authorId: examForm.authorId || currentUserId, // Keep original author
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
      alert(`Database write operation failed: ${err.message}`);
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
      alert("Failed to delete exam from database.");
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
    setExamForm(prev => ({ 
      ...prev, 
      collaborators: [...(prev.collaborators || []), teacherId] 
    }));
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

    // Scan database to see if this exam is already deployed
    const alreadySelected = [];
    const loadedCustomSchedules = {};
    let globStart = '';
    let globEnd = '';

    testSeriesList.forEach(series => {
      const existingDeployment = (series.tests || []).find(t => t.testId === id);
      if (existingDeployment) {
        alreadySelected.push(series.id);
        loadedCustomSchedules[series.id] = {
          start: existingDeployment.testUnlockDate || '',
          end: existingDeployment.testDeadlineDate || ''
        };
        globStart = existingDeployment.testUnlockDate || '';
        globEnd = existingDeployment.testDeadlineDate || '';
      }
    });

    setSeriesAssignForm({
      selectedSeries: alreadySelected,
      schedulingMode: alreadySelected.length > 0 ? 'custom' : 'global',
      globalSchedule: { start: globStart, end: globEnd },
      customSchedules: loadedCustomSchedules
    });

    setIsSeriesModalOpen(true);
  };

  const processSeriesItemSelect = (seriesId) => {
    setSeriesAssignForm(prev => {
      const match = prev.selectedSeries.includes(seriesId);
      const updated = match ? prev.selectedSeries.filter(id => id !== seriesId) : [...prev.selectedSeries, seriesId];
      const customConfig = { ...prev.customSchedules };
      if (!match && !customConfig[seriesId]) { customConfig[seriesId] = { start: '', end: '' }; }
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
      
      // 1. Pull clean database snapshot so React has the newest data
      await fetchAllData(auth.currentUser?.uid);

      // 2. Wipe the staging state completely so nothing lingers in memory
      setSeriesAssignForm({
        selectedSeries: [],
        schedulingMode: 'global',
        globalSchedule: { start: '', end: '' },
        customSchedules: {}
      });

      // 3. Close the modal smoothly
      setIsSeriesModalOpen(false);

      // 4. Force UI to navigate to the Upcoming tab automatically to see the result!
      setActiveFilter('upcoming');

    } catch (err) {
      alert(`Pipeline error pushing target arrays: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // COMPUTE & PAGINATION SUB-SYSTEMS
  // ==========================================
  
  // Create virtual "Deployed Instances" based on the mappings inside testSeriesList
  const deployedInstances = useMemo(() => {
    const instances = [];
    const now = new Date().getTime();

    // 🚨 HELPER: Bulletproof date string validation
    const isValidDate = (dStr) => dStr && typeof dStr === 'string' && dStr.trim() !== '' && !isNaN(new Date(dStr).getTime());

    testSeriesList.forEach(series => {
      if (series.tests && Array.isArray(series.tests)) {
        series.tests.forEach(deployment => {
          const blueprint = mockTests.find(m => m.id === deployment.testId);
          if (blueprint) {
            let currentStatus = 'upcoming';
            
            const hasStart = isValidDate(deployment.testUnlockDate);
            const hasEnd = isValidDate(deployment.testDeadlineDate);

            // 🚨 STRICT CASCADING ROUTING
            if (!hasStart && !hasEnd) {
              currentStatus = 'upcoming'; 
            } else if (hasStart && !hasEnd) {
              const start = new Date(deployment.testUnlockDate).getTime();
              currentStatus = now >= start ? 'live' : 'upcoming';
            } else if (!hasStart && hasEnd) {
              const end = new Date(deployment.testDeadlineDate).getTime();
              currentStatus = now > end ? 'over' : 'live';
            } else if (hasStart && hasEnd) {
              const start = new Date(deployment.testUnlockDate).getTime();
              const end = new Date(deployment.testDeadlineDate).getTime();
              
              if (now > end) {
                currentStatus = 'over';
              } else if (now >= start && now <= end) {
                currentStatus = 'live'; 
              } else {
                currentStatus = 'upcoming'; 
              }
            }

            instances.push({
              ...blueprint,
              id: `${series.id}_${blueprint.id}`, 
              originalId: blueprint.id, 
              isInstance: true,
              seriesTitle: series.title,
              seriesId: series.id,
              unlockDate: deployment.testUnlockDate,
              deadlineDate: deployment.testDeadlineDate,
              status: currentStatus,
            });
          }
        });
      }
    });
    return instances;
  }, [testSeriesList, mockTests]);

  const evaluationsPipeline = useMemo(() => {
    if (activeFilter === 'all') return mockTests;
    if (activeFilter === 'active') return deployedInstances.filter(i => i.status === 'live');
    if (activeFilter === 'upcoming') return deployedInstances.filter(i => i.status === 'upcoming');
    if (activeFilter === 'over') return deployedInstances.filter(i => i.status === 'over');
    return mockTests;
  }, [mockTests, deployedInstances, activeFilter]);

  const totalPages = Math.ceil(evaluationsPipeline.length / itemsPerPage);
  
  const runtimeViewChunk = useMemo(() => {
    const baselineIdx = (currentPage - 1) * itemsPerPage;
    return evaluationsPipeline.slice(baselineIdx, baselineIdx + itemsPerPage);
  }, [evaluationsPipeline, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [activeFilter, viewMode]);

  const formatDeployDate = (dateStr) => {
    if (!dateStr) return 'Not Set';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

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
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20 pt-8">
      
      {/* Dynamic State Tab Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-2 ml-10">Design high-fidelity custom assessment templates. Execution rules are managed in the Series Architect.</p>
        </div>
        {!isExamFormOpen && (
          <button 
            onClick={() => triggerFormOpen()} 
            className="px-8 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.2)] transition-all duration-300 active:scale-95 shrink-0"
          >
            <Plus size={18} /> Create Blueprint
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
                    <Layers size={14} className="text-indigo-500" /> Blueprint Title {editingId && <span className="text-amber-500 ml-2">(EDITING)</span>}
                  </label>
                  <input required name="title" value={examForm.title} onChange={handleFormInput} className={inputBase} placeholder="Ex: Master N3 Vocabulary Final" />
                </div>

                <div className="space-y-3">
                  <label className={labelPremiumClass}>
                    <PenTool size={14} className="text-indigo-500" /> Strategic Context
                  </label>
                  <textarea name="description" value={examForm.description} onChange={handleFormInput} className={`${inputBase} min-h-[120px] resize-y`} placeholder="Briefly describe the contents of this exam..." />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Target Level</label>
                    <div className="relative">
                      <BookOpen size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" />
                      <select name="targetLevel" value={examForm.targetLevel} onChange={handleFormInput} className={`${inputBase} pl-12 cursor-pointer appearance-none`}>
                        <option value="JLPT N5">JLPT N5</option>
                        <option value="JLPT N4">JLPT N4</option>
                        <option value="JLPT N3">JLPT N3</option>
                        <option value="JLPT N2">JLPT N2</option>
                        <option value="JLPT N1">JLPT N1</option>
                        <option value="Custom">Custom Level</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className={labelPremiumClass}>Duration Time</label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" />
                      <input required type="number" name="durationMinutes" value={examForm.durationMinutes} onChange={handleFormInput} className={`${inputBase} pl-12`} placeholder="e.g. 90" min="1" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500">Mins</span>
                    </div>
                  </div>
                </div>

                {/* Visual Colors */}
                <div className="p-8 rounded-[3rem] bg-indigo-900/10 border border-indigo-500/20 space-y-6 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 flex items-center gap-2 relative z-10">
                    <Settings size={14}/> Visual Identity Setup
                  </label>
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-400 mb-2 ml-2">Gradient Start Point</p>
                      <div className="p-1 rounded-[2rem] bg-slate-900 border border-slate-700 hover:border-indigo-500 transition-all">
                        <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleFormInput} className="w-full h-12 rounded-[1.5rem] cursor-pointer border-none bg-transparent" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-400 mb-2 ml-2">Gradient End Point</p>
                      <div className="p-1 rounded-[2rem] bg-slate-900 border border-slate-700 hover:border-indigo-500 transition-all">
                        <input type="color" name="visuals.to" value={examForm.visuals.to} onChange={handleFormInput} className="w-full h-12 rounded-[1.5rem] cursor-pointer border-none bg-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Collaborators Only */}
              <div className="space-y-8 flex flex-col h-full">
                
                <div className="flex-1 flex flex-col min-h-0">
                  <label className={labelPremiumClass}>
                    <Users size={14} className="text-indigo-500" /> Authorized Instructors
                  </label>
                  <div className="flex-1 bg-slate-900/40 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col relative overflow-hidden">
                    <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    {/* 🚨 SECURITY LOCK: Only show Search Bar to the Lead Architect */}
                    {(!editingId || currentUserId === examForm.authorId) ? (
                      <>
                        {/* Search Bar */}
                        <div className="flex gap-3 relative z-10 mb-6 shrink-0">
                          <input 
                            value={teacherSearch} 
                            onChange={e => setTeacherSearch(e.target.value)} 
                            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} 
                            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
                            placeholder="Search Sensei Name or Email..." 
                          />
                          <button type="button" className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white shadow-[0_5px_20px_rgba(99,102,241,0.3)] hover:scale-105 transition-all">
                            <Search size={20}/>
                          </button>
                        </div>
                        
                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 relative z-10 min-h-[200px]">
                          {teacherSearch.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                              <Users size={40} className="text-slate-500 mb-4" />
                              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Search Registry to Add</p>
                            </div>
                          ) : foundTeachers.length === 0 ? (
                            <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No matching Sensei found</p>
                          ) : (
                            foundTeachers.map(t => (
                              <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-400">{t.avatar}</div>
                                  <div>
                                    <p className="text-sm font-black text-white">{t.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 tracking-wider mt-0.5">{t.email}</p> 
                                  </div>
                                </div>
                                <button type="button" onClick={() => addCollaborator(t.id)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                                  <Plus size={16} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center h-full opacity-50 relative z-10">
                        <ShieldAlert size={48} className="text-indigo-500 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">Access Restricted</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-2 text-center max-w-[200px]">Only the Lead Architect can manage collaborators.</p>
                      </div>
                    )}
                    
                    {/* Team Registry Pills */}
                    <div className="pt-8 mt-6 border-t border-slate-800/80 flex flex-wrap gap-3 relative z-10 shrink-0">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-inner">
                        <Shield size={12}/> Verified Lead (You)
                      </span>

                      <AnimatePresence>
                        {(examForm.collaborators || []).filter(id => id !== currentUserId).map(teacherId => {
                          const t = teacherList.find(x => x.id === teacherId);
                          if (!t) return null;
                          return (
                            <motion.span 
                              layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              key={t.id} 
                              className="bg-slate-900 text-white border border-slate-700 text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-md hover:border-rose-500/50 transition-colors group"
                            >
                              {t.name}
                              {/* 🚨 SECURITY: Only Lead Architect can remove other collabs */}
                              {(!editingId || currentUserId === examForm.authorId) && (
                                <X size={12} className="cursor-pointer text-slate-500 group-hover:text-rose-500 transition-colors ml-1" onClick={() => removeCollaborator(t.id)} />
                              )}
                            </motion.span>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Action Buttons at Footer */}
            <div className="flex gap-5 sticky bottom-6 z-30 bg-slate-900/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-xl mx-auto mt-12">
              <button type="button" onClick={closeForm} className="px-8 py-4 rounded-[1.5rem] text-[10px] font-black text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-[0.2em]">Discard</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-white text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editingId ? 'Update Blueprint' : 'Save Blueprint'}
              </button>
            </div>
          </motion.form>

        ) : (
          /* ====================================================================
             WORKSPACE SUB-VIEW: MASTER METRICS & HIGH-DENSITY DASHBOARD
             ==================================================================== */
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
           {/* Filter Bar */}
 <div className="flex items-center justify-between border border-slate-800 rounded-[1rem] p-2 mb-6 bg-[#0B1120]/40">
   <div className="flex items-center gap-2">
      <button onClick={() => setActiveFilter('all')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'all' ? 'bg-slate-800/80 text-white' : 'text-slate-500 hover:text-white'}`}>
         <Filter size={14}/> All Blueprints
      </button>
      <button onClick={() => setActiveFilter('active')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'active' ? 'bg-slate-800/80 text-white' : 'text-slate-500 hover:text-white'}`}>
         <Activity size={14}/> Active Execution
      </button>
      <button onClick={() => setActiveFilter('upcoming')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'upcoming' ? 'bg-slate-800/80 text-white' : 'text-slate-500 hover:text-white'}`}>
         <Calendar size={14}/> Staged / Upcoming
      </button>
      <button onClick={() => setActiveFilter('over')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'over' ? 'bg-slate-800/80 text-white' : 'text-slate-500 hover:text-white'}`}>
         <CheckCircle2 size={14}/> Archived Pipeline
      </button>
   </div>
   <div className="flex items-center gap-1 pr-2">
      {/* 🚨 REFRESH BUTTON ADDED RIGHT HERE 🚨 */}
      <button onClick={() => fetchAllData(currentUserId)} className="p-2 rounded-md transition-all text-slate-500 hover:text-white hover:bg-slate-800/50" title="Refresh Data">
         <RotateCw size={16} className={isLoading ? "animate-spin text-amber-500" : ""} />
      </button>
      
      <div className="w-px h-5 bg-slate-800 mx-1"></div> {/* Tiny vertical separator */}

      <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-800/80 text-amber-500' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={16}/></button>
      <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800/80 text-amber-500' : 'text-slate-500 hover:text-white'}`}><LayoutList size={16}/></button>
   </div>
 </div>

            {/* Render Window */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col space-y-1.5"}>
              {runtimeViewChunk.length === 0 ? (
                <div className="py-24 border-2 border-dashed border-slate-800/60 rounded-[3rem] bg-[#0B1120]/40 flex flex-col items-center text-center px-4 col-span-full">
                  <Globe size={48} className="text-slate-700 mb-4 animate-pulse duration-10000" />
                  <p className="text-sm font-black text-white uppercase tracking-widest mb-1">No Blueprints Forged</p>
                  <p className="text-xs text-slate-500 font-bold max-w-sm leading-relaxed">Create your first core exam structure to begin mapping assessment logic and deploying to specific batches.</p>
                </div>
              ) : (
                runtimeViewChunk.map((test) => {
                  
                  // Compute Badge for Instances
                  let badgeClass = "bg-slate-800 text-slate-400 border-slate-700";
                  let badgeText = "BLUEPRINT";
                  
                  if (test.isInstance) {
                    if (test.status === 'live') {
                      badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      badgeText = "LIVE EXAM";
                    } else if (test.status === 'upcoming') {
                      badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      badgeText = "UPCOMING";
                    } else {
                      badgeClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
                      badgeText = "COMPLETED";
                    }
                  }
                  
                  // --------------------------------------------------------
                  // EXACT Match List View CSS (Ultra Compact Row)
                  // --------------------------------------------------------
                  if (viewMode === 'list') {
  return (
    <div key={test.id} className="flex items-center justify-between p-4 border-b border-slate-800/60 hover:bg-slate-800/20 transition-all group overflow-hidden">
       
       {/* Title & Identity */}
       <div className="flex items-center gap-4 w-[35%] shrink-0">
          <div className="w-1.5 h-10 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
          <div className="overflow-hidden">
             <h4 className="text-slate-200 group-hover:text-white font-bold text-sm truncate transition-colors">{test.title}</h4>
             {test.isInstance && (
               <p className="text-[10px] text-indigo-400 font-bold mt-0.5 truncate flex items-center gap-1"><Layers size={10}/> Series: {test.seriesTitle}</p>
             )}
             <div className="flex gap-2 items-center mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badgeClass}`}>{badgeText}</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest truncate">{test.isInstance ? test.originalId : test.id}</span>
             </div>
          </div>
       </div>

       {/* Highlighted Stats (FIXED OVERLAP HERE) */}
       <div className="hidden md:flex items-center justify-end gap-6 lg:gap-12 flex-1 pr-6 border-r border-slate-800/60">
          {test.isInstance ? (
             <>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.1em] mb-0.5">Start</p>
                 <p className="text-xs font-black text-indigo-400">{formatDeployDate(test.unlockDate)}</p>
              </div>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.1em] mb-0.5">End</p>
                 <p className="text-xs font-black text-amber-500 capitalize">{formatDeployDate(test.deadlineDate)}</p>
              </div>
             </>
          ) : (
             <>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.1em] mb-0.5">Level</p>
                 <p className="text-xs font-black text-indigo-400">{test.targetLevel || 'N/A'}</p>
              </div>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.1em] mb-0.5">Duration</p>
                 <p className="text-xs font-black text-amber-500 capitalize">{test.durationMinutes || 0} Mins</p>
              </div>
             </>
          )}
          <div className="text-right flex flex-col items-end shrink-0">
             <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.1em] mb-0.5">Staff</p>
             <div className="flex -space-x-1.5">
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

       {/* Action Buttons (FIXED OVERLAP HERE) */}
       <div className="flex items-center gap-1 pl-4 shrink-0 bg-[#0B1120] z-10">
          {test.isInstance ? (
             <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-inner">
               Managed in Series
             </div>
          ) : (
             <>
               <button onClick={() => triggerFormOpen(test)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all" title="Edit Blueprint"><Edit2 size={14}/></button>
               <button onClick={() => openDeploymentModal(test.id)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="Deploy to Series"><Send size={14}/></button>
               
               {/* 🚨 SECURITY: Only Lead Architect can Delete */}
               {test.authorId === currentUserId && (
                 <button onClick={() => removeExamInstance(test.id)} className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all" title="Delete Blueprint"><Trash2 size={14}/></button>
               )}
               
               <div className="w-px h-5 bg-slate-800 mx-1"></div>
               <button onClick={() => navigate(`/forge/mock-exam/${test.id}`)} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center gap-1 hover:bg-amber-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest ml-1" title="Forge Editor"><PenTool size={12}/> Forge</button>
             </>
          )}
       </div>
    </div>
  );
}

                  // --------------------------------------------------------
                  // PRESENTATION SCHEME B: Premium Grid View Cards
                  // --------------------------------------------------------
                  return (
                    <div key={test.id} className="p-8 rounded-[3rem] bg-[#0B1120]/95 backdrop-blur-xl border border-white/5 hover:border-slate-700 transition-all duration-300 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] blur-[100px] pointer-events-none transition-opacity group-hover:opacity-10" style={{ backgroundColor: test.visuals?.from || '#4F46E5' }}></div>
                      
                      <div>
                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-14 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                            <div>
                              <h4 className="text-xl font-black text-white tracking-tight leading-tight">{test.title}</h4>
                              <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border mt-2 inline-block ${badgeClass}`}>{badgeText}</span>
                              {test.isInstance && (
                                <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase tracking-widest flex items-center gap-1.5">
                                  <Layers size={12}/> {test.seriesTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {test.description ? (
                           <p className="text-xs text-slate-400 font-medium leading-relaxed mb-8 line-clamp-2 relative z-10">{test.description}</p>
                        ) : (
                           <div className="h-8 mb-8"></div>
                        )}

                        {test.isInstance ? (
                          <div className="grid grid-cols-2 gap-4 mb-8 p-5 rounded-[2rem] bg-slate-900/50 border border-slate-800/80 relative z-10 shadow-inner">
                             <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-indigo-500"/> Start Time</p>
                               <p className="text-sm font-black text-white tracking-wider">{formatDeployDate(test.unlockDate)}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-amber-500"/> End Time</p>
                               <p className="text-sm font-black text-white capitalize">{formatDeployDate(test.deadlineDate)}</p>
                             </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 mb-8 p-5 rounded-[2rem] bg-slate-900/50 border border-slate-800/80 relative z-10 shadow-inner">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><BookOpen size={12} className="text-indigo-500"/> Target Level</p>
                              <p className="text-base font-black text-white tracking-wider">{test.targetLevel || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-amber-500"/> Duration</p>
                              <p className="text-base font-black text-white capitalize">{test.durationMinutes || 0} Mins</p>
                            </div>
                          </div>
                        )}

                      </div>

                      <div className="grid grid-cols-4 gap-3 pt-6 border-t border-slate-800/60 relative z-10">
                        {test.isInstance ? (
                           <div className="col-span-4 h-12 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-inner">
                              Managed in Series Architect
                           </div>
                        ) : (
                           <>
                              <button onClick={() => triggerFormOpen(test)} className="h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center shadow-md" title="Edit"><Edit2 size={16}/></button>
                              <button onClick={() => openDeploymentModal(test.id)} className="h-12 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all flex items-center justify-center shadow-md" title="Deploy"><Send size={16}/></button>
                              
                              {/* 🚨 SECURITY: Only Lead Architect can Delete */}
                              {test.authorId === currentUserId ? (
                                <button onClick={() => removeExamInstance(test.id)} className="h-12 rounded-2xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 transition-all flex items-center justify-center shadow-md" title="Delete"><Trash2 size={16}/></button>
                              ) : (
                                <div className="h-12 rounded-2xl bg-slate-900/30 flex items-center justify-center text-slate-700" title="Only Lead can Delete"><ShieldAlert size={16}/></div>
                              )}

                              <button onClick={() => navigate(`/forge/mock-exam/${test.id}`)} className="h-12 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/20 hover:scale-105 transition-transform" title="Forge Editor"><PenTool size={16}/></button>
                           </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls Footer Dock */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-16 pt-8 border-t border-slate-800/80">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-4 rounded-2xl bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-md"><ChevronLeft size={18}/></button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button key={pageNumber} type="button" onClick={() => setCurrentPage(pageNumber)} className={`w-12 h-12 rounded-2xl text-sm font-black transition-all shadow-md ${currentPage === pageNumber ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-[#0B1120] border border-slate-800 text-slate-500 hover:border-slate-700'}`}>{pageNumber}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-4 rounded-2xl bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-md"><ChevronRight size={18}/></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================
         MODAL: ENTERPRISE CURRICULUM CROSS-DEPLOYMENT MATRIX
         ==================================================================== */}
      <AnimatePresence>
        {isSeriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSeriesModalOpen(false)} className="absolute inset-0" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[3rem] bg-[#0B1120] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10">
              
              <div className="p-8 md:p-10 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
                <div>
                  <h3 className="text-3xl font-black text-white flex items-center gap-4"><Send size={28} className="text-indigo-500"/> Blueprint Deployment Routing</h3>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.15em] ml-1">Assign this exam to active test series containers and set execution schedules.</p>
                </div>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-500 transition-all"><X size={18}/></button>
              </div>

              <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-5 ml-2 flex items-center gap-2"><Layers size={14}/> Step 1: Select Target Series Containers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {testSeriesList.map(series => {
                      const activeSelection = seriesAssignForm.selectedSeries.includes(series.id);
                      return (
                        <div key={series.id} onClick={() => processSeriesItemSelect(series.id)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-200 flex items-center justify-between shadow-lg ${activeSelection ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}>
                          <div>
                            <p className={`font-black text-base mb-1.5 ${activeSelection ? 'text-indigo-300' : 'text-slate-200'}`}>{series.title}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Batches Attached: {series.batches?.length || 0}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${activeSelection ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'}`}>
                            {activeSelection && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                    {testSeriesList.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/30">
                        <Target size={32} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Series Available</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">Create a Container in the Series Architect first.</p>
                      </div>
                    )}
                  </div>
                </div>

                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-slate-800/80 pt-10">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1.5 ml-2 flex items-center gap-2"><Clock size={14}/> Step 2: Deployment Timelines</h4>
                        <p className="text-[11px] font-bold text-slate-500 ml-2">Determine if timeline values track globally or mutate per configuration vector.</p>
                      </div>
                      <div className="flex bg-slate-900 rounded-[1.5rem] p-1.5 border border-slate-800 shrink-0 shadow-inner">
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'global' }))} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Uniform Schedule</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'custom' }))} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Custom Per Series</button>
                      </div>
                    </div>

                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className="p-8 rounded-[3rem] bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn shadow-inner">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-3">Global Unlock Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => configureDistributionSchedules('global', 'start', e.target.value)} className="w-full p-6 rounded-[2rem] bg-slate-950 border border-slate-800 text-white font-bold text-sm outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-3">Global Expiration Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => configureDistributionSchedules('global', 'end', e.target.value)} className="w-full p-6 rounded-[2rem] bg-slate-950 border border-slate-800 text-white font-bold text-sm outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 animate-fadeIn">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const instanceObject = testSeriesList.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className="p-8 rounded-[3rem] bg-slate-900/60 border border-slate-800/80 shadow-inner">
                              <h5 className="text-sm font-black text-indigo-400 mb-6 flex items-center gap-2"><Sparkles size={16}/> Custom Rule: {instanceObject?.title}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-3">Unlock Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => configureDistributionSchedules('custom', 'start', e.target.value, seriesId)} className="w-full p-5 rounded-[1.5rem] bg-slate-950 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-3">Expiration Date</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => configureDistributionSchedules('custom', 'end', e.target.value, seriesId)} className="w-full p-5 rounded-[1.5rem] bg-slate-950 border border-slate-800 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all" />
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

              <div className="p-8 md:p-10 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col md:flex-row justify-end gap-5">
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className="px-10 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-center">Cancel Mapping</button>
                <button type="button" onClick={commitDeploymentConfiguration} disabled={seriesAssignForm.selectedSeries.length === 0 || isSaving} className="px-12 py-5 rounded-[2rem] bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-600/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Push to Pipeline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}