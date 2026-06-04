import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc, query, collectionGroup, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Plus, Save, Edit2, Target, Settings, PenTool, 
  Clock, ShieldAlert, Users, Search, X, Check, 
  Send, Filter, LayoutGrid, LayoutList, Activity, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, Globe, Sparkles, Trash2, Loader2,
  Shield, ArrowRight, BookOpen, Layers, RotateCw, Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@context/ThemeContext';

export default function ExamCreatorTab() {
  const { isDarkMode } = useTheme();
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

  const [accessRequests, setAccessRequests] = useState([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

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
  const inputBase = `w-full p-6 rounded-[2rem] border font-bold text-lg transition-all outline-none shadow-inner ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-sm border-slate-800/80 text-white focus:border-indigo-500 focus:bg-slate-900 hover:border-slate-700 [color-scheme:dark] force-white-text' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-slate-50 hover:border-slate-300 [color-scheme:light] force-dark-text'}`;
  const labelPremiumClass = `block text-[10px] font-black uppercase tracking-[0.2em] ml-2 mb-3 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  // ==========================================
  // DATABASE SYNC ENGINE
  // ==========================================
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
        collaborators: d.data().collaborators || [], 
        authorId: d.data().authorId || '', 
        visuals: d.data().visuals || { from: '#4F46E5', to: '#7C3AED' }
      })).filter(exam => exam.authorId === uid || (exam.collaborators && exam.collaborators.includes(uid))); 

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
          
          console.log("AUTHORIZED TEACHERS LOADED:", strictlyTeachers);
          setTeacherList(strictlyTeachers);
        }
      } catch (e) {
        console.warn("User fetch fallback initiated.");
      }

      // 4. FETCH PENDING ACCESS REQUESTS (🚨 Fixed to Root Collection Query)
      try {
        const reqQuery = query(
          collection(db, 'exam_access_requests'), 
          where('ownerId', '==', uid), 
          where('status', '==', 'pending')
        );
        const reqSnaps = await getDocs(reqQuery);
        setAccessRequests(reqSnaps.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })));
      } catch (err) {
        console.warn("Requests sync skipped.", err);
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
// ==========================================
  // STAFF MUTATION MECHANICS (COLLABORATORS)
  // ==========================================
  const foundTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return [];
    
    // 🚨 SAFETY FALLBACK: Prevent .includes() crash
    const currentCollabs = examForm.collaborators || []; 
    
    return teacherList.filter(t => 
      t.id !== currentUserId && 
      !currentCollabs.includes(t.id) &&
      (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
       (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase())))
    );
  }, [teacherSearch, teacherList, examForm.collaborators, currentUserId]);

const addCollaborator = async (teacherId) => {
    // 1. Update UI instantly
    const newCollabs = [...(examForm.collaborators || []), teacherId];
    setExamForm(prev => ({ ...prev, collaborators: newCollabs }));
    setTeacherSearch('');

    // 2. 🚨 INSTANT DATABASE SYNC (If editing an existing blueprint)
    if (editingId) {
      try {
        await updateDoc(doc(db, 'mock_tests', editingId), { collaborators: newCollabs });
        // Keep the background dashboard in sync without reloading
        setMockTests(prev => prev.map(t => t.id === editingId ? { ...t, collaborators: newCollabs } : t));
      } catch (err) {
        console.error("Failed to push collab to database:", err);
      }
    }
  };

  const removeCollaborator = async (teacherId) => {
    // 1. Update UI instantly
    const newCollabs = (examForm.collaborators || []).filter(id => id !== teacherId);
    setExamForm(prev => ({ ...prev, collaborators: newCollabs }));

    // 2. 🚨 INSTANT DATABASE SYNC (If editing an existing blueprint)
    if (editingId) {
      try {
        await updateDoc(doc(db, 'mock_tests', editingId), { collaborators: newCollabs });
        // Keep the background dashboard in sync without reloading
        setMockTests(prev => prev.map(t => t.id === editingId ? { ...t, collaborators: newCollabs } : t));
      } catch (err) {
        console.error("Failed to remove collab from database:", err);
      }
    }
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
// Create virtual "Deployed Instances" based on the mappings inside testSeriesList
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
            
            const startDateStr = deployment.unlockDate || deployment.testUnlockDate;
            const endDateStr = deployment.deadlineDate || deployment.testDeadlineDate;
            const mode = deployment.executionMode || 'manual'; // Default legacy to manual
            const override = deployment.statusOverride; // 'staged', 'live', 'archived'

            // 1. Calculate what the SYSTEM CLOCK says
            let clockStatus = 'upcoming';
            const hasStart = isValidDate(startDateStr);
            const hasEnd = isValidDate(endDateStr);

            if (!hasStart && !hasEnd) {
              clockStatus = 'upcoming'; 
            } else if (hasStart && !hasEnd) {
              const start = new Date(startDateStr).getTime();
              clockStatus = now >= start ? 'live' : 'upcoming';
            } else if (!hasStart && hasEnd) {
              const end = new Date(endDateStr).getTime();
              clockStatus = now > end ? 'over' : 'live';
            } else if (hasStart && hasEnd) {
              const start = new Date(startDateStr).getTime();
              const end = new Date(endDateStr).getTime();
              
              if (now > end) clockStatus = 'over';
              else if (now >= start && now <= end) clockStatus = 'live'; 
              else clockStatus = 'upcoming'; 
            }

            // 2. Apply the ENGINE PROTOCOL (Override vs Clock)
            let finalStatus = 'upcoming';

            if (mode === 'manual') {
              // FULL MANUAL: Ignore the clock entirely. Only manual overrides matter.
              if (override === 'live') finalStatus = 'live';
              else if (override === 'archived') finalStatus = 'over';
              else finalStatus = 'upcoming'; // 'staged'
            } else {
              // AUTO & HYBRID: Let the clock decide, UNLESS the proctor hits the manual Kill Switch
              if (override === 'live') finalStatus = 'live';
              else if (override === 'archived') finalStatus = 'over';
              else finalStatus = clockStatus; // 'staged' default falls back to the system clock!
            }

            instances.push({
              ...blueprint,
              id: `${series.id}_${blueprint.id}`, 
              originalId: blueprint.id, 
              isInstance: true,
              seriesTitle: series.title,
              seriesId: series.id,
              unlockDate: startDateStr,
              deadlineDate: endDateStr,
              status: finalStatus,
              executionMode: mode
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

  const handleAcceptRequest = async (req) => {
    setIsSaving(true);
    try {
      // 1. Add the requester to the Exam's Collaborator Array
      const examRef = doc(db, 'mock_tests', req.testId);
      const examSnap = await getDoc(examRef);
      if (examSnap.exists()) {
        const collabs = examSnap.data().collaborators || [];
        if (!collabs.includes(req.requesterId)) {
          await updateDoc(examRef, { collaborators: [...collabs, req.requesterId] });
        }
      }

      // 2. Automatically Add the Exam to the Requester's Series Matrix
      const seriesRef = doc(db, 'test_series', req.seriesId);
      const seriesSnap = await getDoc(seriesRef);
      if (seriesSnap.exists()) {
        const tests = seriesSnap.data().tests || [];
        if (!tests.find(t => t.testId === req.testId)) {
          await updateDoc(seriesRef, { 
            tests: [...tests, { 
              testId: req.testId, executionMode: 'auto', accessKey: '', 
              unlockDate: '', deadlineDate: '', entryLockoutMinutes: 0, 
              allowPostDeadline: false, postDeadlineEndDate: '' 
            }] 
          });
        }
      }

      // 3. Mark the Request as Approved
      await updateDoc(req.ref, { status: 'approved' });
      
      // Update UI
      setAccessRequests(prev => prev.filter(r => r.id !== req.id));
      await fetchAllData(currentUserId);
      alert("Request approved! The teacher now has access.");
    } catch (err) {
      alert("Failed to approve request: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // RENDER UI DOM BLOCK
  // ==========================================
  if (isLoading) {
    return (
      <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#090E1A]' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-amber-500" />
          <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Synchronizing Data Modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20 pt-8">
      
      {/* Dynamic State Tab Headers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Target size={28} className="text-amber-500" /> Exam Blueprint Forge
          </h1>
          <p className={`text-sm font-bold mt-2 ml-10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Design high-fidelity custom assessment templates. Execution rules are managed in the Series Architect.</p>
        </div>

        {/* 🚨 WRAP BUTTONS IN A FLEX ROW 🚨 */}
        <div className="flex items-center gap-4">
          
          {/* THE NEW NOTIFICATION BELL */}
          {accessRequests.length > 0 && (
            <button 
              onClick={() => setIsRequestsModalOpen(true)} 
              className="px-6 py-5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-500 hover:text-white transition-all animate-pulse"
            >
              <Bell size={18} /> Requests ({accessRequests.length})
            </button>
          )}

          {/* YOUR ORIGINAL CREATE BUTTON */}
          {!isExamFormOpen && (
            <button 
              onClick={() => triggerFormOpen()} 
              className="px-8 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_10px_40px_rgba(245,158,11,0.2)] transition-all duration-300 active:scale-95 shrink-0"
            >
              <Plus size={18} /> Create Blueprint
            </button>
          )}
        </div>
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
                <div className={`p-8 rounded-[3rem] border space-y-6 shadow-inner relative overflow-hidden ${isDarkMode ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-500/20'}`}></div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-2 flex items-center gap-2 relative z-10 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    <Settings size={14}/> Visual Identity Setup
                  </label>
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div>
                      <p className={`text-[9px] uppercase font-bold mb-2 ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gradient Start Point</p>
                      <div className={`p-1 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-300 hover:border-indigo-500'}`}>
                        <input type="color" name="visuals.from" value={examForm.visuals.from} onChange={handleFormInput} className="w-full h-12 rounded-[1.5rem] cursor-pointer border-none bg-transparent" />
                      </div>
                    </div>
                    <div>
                      <p className={`text-[9px] uppercase font-bold mb-2 ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gradient End Point</p>
                      <div className={`p-1 rounded-[2rem] border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-300 hover:border-indigo-500'}`}>
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
                  <div className={`flex-1 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] border shadow-2xl flex flex-col relative overflow-hidden ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white/80 border-slate-200'}`}>
                    <div className={`absolute top-[-50px] right-[-50px] w-64 h-64 blur-[80px] rounded-full pointer-events-none ${isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-500/10'}`}></div>
                    
                    {/* 🚨 SECURITY LOCK: Only show Search Bar to the Lead Architect */}
                    {(!editingId || currentUserId === examForm.authorId) ? (
                      <>
                        {/* Search Bar */}
                        <div className="flex gap-3 relative z-10 mb-6 shrink-0">
                          <input 
                            value={teacherSearch} 
                            onChange={e => setTeacherSearch(e.target.value)} 
                            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} 
                            className={`flex-1 border rounded-2xl px-6 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`} 
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
                              <Users size={40} className={`mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`} />
                              <p className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search Registry to Add</p>
                            </div>
                          ) : foundTeachers.length === 0 ? (
                            <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No matching Sensei found</p>
                          ) : (
                            foundTeachers.map(t => (
                              <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40' : 'bg-indigo-50 border-indigo-200 hover:border-indigo-400'}`}>
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-indigo-950 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border-indigo-300 text-indigo-700'}`}>{t.avatar}</div>
                                  <div>
                                    <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.name}</p>
                                    <p className={`text-[9px] font-bold tracking-wider mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.email}</p> 
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
                        <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Access Restricted</p>
                        <p className={`text-[10px] font-bold mt-2 text-center max-w-[200px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Only the Lead Architect can manage collaborators.</p>
                      </div>
                    )}
                    
                    {/* Team Registry Pills */}
                    <div className={`pt-8 mt-6 border-t flex flex-wrap gap-3 relative z-10 shrink-0 ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
                      <span className={`border text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-inner ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
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
                              className={`border text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-md hover:border-rose-500/50 transition-colors group ${isDarkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300'}`}
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
            <div className={`flex gap-5 sticky bottom-6 z-30 backdrop-blur-xl p-4 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-xl mx-auto mt-12 ${isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200'}`}>
              <button type="button" onClick={closeForm} className="px-8 py-4 rounded-[1.5rem] text-[10px] font-black text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-[0.2em]">Discard</button>
              <button type="submit" disabled={isSaving} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 ${isDarkMode ? 'bg-white text-black' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
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
 <div className={`flex items-center justify-between border rounded-[1rem] p-2 mb-6 ${isDarkMode ? 'bg-[#0B1120]/40 border-slate-800' : 'bg-white border-slate-200'}`}>
   <div className="flex items-center gap-2">
      <button onClick={() => setActiveFilter('all')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'all' ? (isDarkMode ? 'bg-slate-800/80 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:text-slate-700'}`}>
         <Filter size={14}/> All Blueprints
      </button>
      <button onClick={() => setActiveFilter('active')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'active' ? (isDarkMode ? 'bg-slate-800/80 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:text-slate-700'}`}>
         <Activity size={14}/> Active Execution
      </button>
      <button onClick={() => setActiveFilter('upcoming')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'upcoming' ? (isDarkMode ? 'bg-slate-800/80 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:text-slate-700'}`}>
         <Calendar size={14}/> Staged / Upcoming
      </button>
      <button onClick={() => setActiveFilter('over')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === 'over' ? (isDarkMode ? 'bg-slate-800/80 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-500 hover:text-slate-700'}`}>
         <CheckCircle2 size={14}/> Archived Pipeline
      </button>
   </div>
   <div className="flex items-center gap-1 pr-2">
      {/* 🚨 REFRESH BUTTON ADDED RIGHT HERE 🚨 */}
      <button onClick={() => fetchAllData(currentUserId)} className={`p-2 rounded-md transition-all ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`} title="Refresh Data">
         <RotateCw size={16} className={isLoading ? "animate-spin text-amber-500" : ""} />
      </button>
      
      <div className={`w-px h-5 mx-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`}></div> {/* Tiny vertical separator */}

      <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? (isDarkMode ? 'bg-slate-800/80 text-amber-500' : 'bg-slate-100 text-amber-600') : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={16}/></button>
      <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? (isDarkMode ? 'bg-slate-800/80 text-amber-500' : 'bg-slate-100 text-amber-600') : 'text-slate-500 hover:text-slate-700'}`}><LayoutList size={16}/></button>
   </div>
 </div>

            {/* Render Window */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col space-y-1.5"}>
              {runtimeViewChunk.length === 0 ? (
                <div className={`py-24 border-2 border-dashed rounded-[3rem] flex flex-col items-center text-center px-4 col-span-full ${isDarkMode ? 'border-slate-800/60 bg-[#0B1120]/40' : 'border-slate-300 bg-white/40'}`}>
                  <Globe size={48} className="text-slate-400 mb-4 animate-pulse duration-10000" />
                  <p className={`text-sm font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Blueprints Forged</p>
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
    <div key={test.id} className={`flex items-center justify-between p-4 border-b transition-all group overflow-hidden ${isDarkMode ? 'border-slate-800/60 hover:bg-slate-800/20' : 'border-slate-200 hover:bg-slate-50'}`}>
       
       {/* Title & Identity */}
       <div className="flex items-center gap-4 w-[35%] shrink-0">
          <div className="w-1.5 h-10 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
          <div className="overflow-hidden">
             <h4 className={`font-bold text-sm truncate transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{test.title}</h4>
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
       <div className={`hidden md:flex items-center justify-end gap-6 lg:gap-12 flex-1 pr-6 border-r ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
          {test.isInstance ? (
             <>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em] mb-0.5">Start</p>
                 <p className="text-xs font-black text-indigo-500">{formatDeployDate(test.unlockDate)}</p>
              </div>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em] mb-0.5">End</p>
                 <p className="text-xs font-black text-amber-500 capitalize">{formatDeployDate(test.deadlineDate)}</p>
              </div>
             </>
          ) : (
             <>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em] mb-0.5">Level</p>
                 <p className="text-xs font-black text-indigo-500">{test.targetLevel || 'N/A'}</p>
              </div>
              <div className="text-right shrink-0">
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em] mb-0.5">Duration</p>
                 <p className="text-xs font-black text-amber-500 capitalize">{test.durationMinutes || 0} Mins</p>
              </div>
             </>
          )}
          <div className="text-right flex flex-col items-end shrink-0">
             <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em] mb-0.5">Staff</p>
             <div className="flex -space-x-1.5">
                <div className={`w-5 h-5 rounded-full bg-indigo-600 border flex items-center justify-center text-[7px] font-black text-white z-10 ${isDarkMode ? 'border-[#0B1120]' : 'border-white'}`} title="Lead Architect">L</div>
                {test.collaborators?.slice(0, 3).map(id => {
                  const matchedStaff = teacherList.find(x => x.id === id);
                  return matchedStaff ? (
                    <div key={id} className={`w-5 h-5 rounded-full border flex items-center justify-center text-[7px] font-black ${isDarkMode ? 'bg-slate-800 border-[#0B1120] text-slate-300' : 'bg-slate-200 border-white text-slate-600'}`} title={matchedStaff.name}>{matchedStaff.avatar}</div>
                  ) : null;
                })}
             </div>
          </div>
       </div>

       {/* Action Buttons (FIXED OVERLAP HERE) */}
       <div className={`flex items-center gap-1 pl-4 shrink-0 z-10 ${isDarkMode ? 'bg-[#0B1120]' : 'bg-transparent'}`}>
          {test.isInstance ? (
             <div className={`px-4 py-2 rounded-xl border text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-inner ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
               Managed in Series
             </div>
          ) : (
             <>
               <button onClick={() => triggerFormOpen(test)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-slate-800/10 transition-all" title="Edit Blueprint"><Edit2 size={14}/></button>
               <button onClick={() => openDeploymentModal(test.id)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all" title="Deploy to Series"><Send size={14}/></button>
               
               {/* 🚨 SECURITY: Only Lead Architect can Delete */}
               {test.authorId === currentUserId && (
                 <button onClick={() => removeExamInstance(test.id)} className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all" title="Delete Blueprint"><Trash2 size={14}/></button>
               )}
               
               <div className={`w-px h-5 mx-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
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
                    <div key={test.id} className={`p-8 rounded-[3rem] backdrop-blur-xl border transition-all duration-300 shadow-2xl flex flex-col justify-between group relative overflow-hidden ${isDarkMode ? 'bg-[#0B1120]/95 border-white/5 hover:border-slate-700' : 'bg-white/95 border-slate-200 hover:border-slate-300'}`}>
                      <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] blur-[100px] pointer-events-none transition-opacity group-hover:opacity-10" style={{ backgroundColor: test.visuals?.from || '#4F46E5' }}></div>
                      
                      <div>
                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-14 rounded-full shadow-lg" style={{ background: `linear-gradient(to bottom, ${test.visuals?.from || '#4F46E5'}, ${test.visuals?.to || '#7C3AED'})` }}></div>
                            <div>
                              <h4 className={`text-xl font-black tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.title}</h4>
                              <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border mt-2 inline-block ${badgeClass}`}>{badgeText}</span>
                              {test.isInstance && (
                                <p className="text-[10px] font-bold text-indigo-500 mt-2 uppercase tracking-widest flex items-center gap-1.5">
                                  <Layers size={12}/> {test.seriesTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {test.description ? (
                           <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 line-clamp-2 relative z-10">{test.description}</p>
                        ) : (
                           <div className="h-8 mb-8"></div>
                        )}

                        {test.isInstance ? (
                          <div className={`grid grid-cols-2 gap-4 mb-8 p-5 rounded-[2rem] border relative z-10 shadow-inner ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                             <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-indigo-500"/> Start Time</p>
                               <p className={`text-sm font-black tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatDeployDate(test.unlockDate)}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-amber-500"/> End Time</p>
                               <p className={`text-sm font-black capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatDeployDate(test.deadlineDate)}</p>
                             </div>
                          </div>
                        ) : (
                          <div className={`grid grid-cols-2 gap-4 mb-8 p-5 rounded-[2rem] border relative z-10 shadow-inner ${isDarkMode ? 'bg-slate-900/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><BookOpen size={12} className="text-indigo-500"/> Target Level</p>
                              <p className={`text-base font-black tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.targetLevel || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><Clock size={12} className="text-amber-500"/> Duration</p>
                              <p className={`text-base font-black capitalize ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.durationMinutes || 0} Mins</p>
                            </div>
                          </div>
                        )}

                      </div>

                      <div className={`grid grid-cols-4 gap-3 pt-6 border-t relative z-10 ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
                        {test.isInstance ? (
                           <div className={`col-span-4 h-12 rounded-2xl border flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-inner ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              Managed in Series Architect
                           </div>
                        ) : (
                           <>
                              <button onClick={() => triggerFormOpen(test)} className={`h-12 rounded-2xl transition-all flex items-center justify-center shadow-md ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Edit"><Edit2 size={16}/></button>
                              <button onClick={() => openDeploymentModal(test.id)} className="h-12 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white transition-all flex items-center justify-center shadow-md" title="Deploy"><Send size={16}/></button>
                              
                              {/* 🚨 SECURITY: Only Lead Architect can Delete */}
                              {test.authorId === currentUserId ? (
                                <button onClick={() => removeExamInstance(test.id)} className="h-12 rounded-2xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 transition-all flex items-center justify-center shadow-md" title="Delete"><Trash2 size={16}/></button>
                              ) : (
                                <div className={`h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-slate-900/30 text-slate-700' : 'bg-slate-50 text-slate-400'}`} title="Only Lead can Delete"><ShieldAlert size={16}/></div>
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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[3rem] border shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden z-10 ${isDarkMode ? 'bg-[#0B1120] border-white/10' : 'bg-white border-slate-200'}`}>
              
              <div className={`p-8 md:p-10 border-b flex items-center justify-between backdrop-blur-md ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <h3 className={`text-3xl font-black flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Send size={28} className="text-indigo-500"/> Blueprint Deployment Routing</h3>
                  <p className={`text-xs font-bold mt-2 uppercase tracking-[0.15em] ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assign this exam to active test series containers and set execution schedules.</p>
                </div>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-500' : 'bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600'}`}><X size={18}/></button>
              </div>

              <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                <div>
                  <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-5 ml-2 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}><Layers size={14}/> Step 1: Select Target Series Containers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {testSeriesList.map(series => {
                      const activeSelection = seriesAssignForm.selectedSeries.includes(series.id);
                      return (
                        <div key={series.id} onClick={() => processSeriesItemSelect(series.id)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-200 flex items-center justify-between shadow-lg ${activeSelection ? (isDarkMode ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10' : 'bg-indigo-50 border-indigo-500') : (isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}`}>
                          <div>
                            <p className={`font-black text-base mb-1.5 ${activeSelection ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-700') : (isDarkMode ? 'text-slate-200' : 'text-slate-700')}`}>{series.title}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Batches Attached: {series.batches?.length || 0}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${activeSelection ? 'bg-indigo-500 border-indigo-500 text-white' : (isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white')}`}>
                            {activeSelection && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                    {testSeriesList.length === 0 && (
                      <div className={`col-span-full py-12 text-center border-2 border-dashed rounded-[2rem] ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-300 bg-slate-50'}`}>
                        <Target size={32} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                        <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No Series Available</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">Create a Container in the Series Architect first.</p>
                      </div>
                    )}
                  </div>
                </div>

                {seriesAssignForm.selectedSeries.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t pt-10 ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
                      <div>
                        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-1.5 ml-2 flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}><Clock size={14}/> Step 2: Deployment Timelines</h4>
                        <p className={`text-[11px] font-bold ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Determine if timeline values track globally or mutate per configuration vector.</p>
                      </div>
                      <div className={`flex rounded-[1.5rem] p-1.5 border shrink-0 shadow-inner ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'global' }))} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'global' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-700'}`}>Uniform Schedule</button>
                        <button type="button" onClick={() => setSeriesAssignForm(p => ({ ...p, schedulingMode: 'custom' }))} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${seriesAssignForm.schedulingMode === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-700'}`}>Custom Per Series</button>
                      </div>
                    </div>

                    {seriesAssignForm.schedulingMode === 'global' ? (
                      <div className={`p-8 rounded-[3rem] border grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn shadow-inner ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Global Unlock Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.start} onChange={(e) => configureDistributionSchedules('global', 'start', e.target.value)} className={`w-full p-6 rounded-[2rem] border font-bold text-sm outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'}`} />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Global Expiration Clock</label>
                          <input type="datetime-local" value={seriesAssignForm.globalSchedule.end} onChange={(e) => configureDistributionSchedules('global', 'end', e.target.value)} className={`w-full p-6 rounded-[2rem] border font-bold text-sm outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'}`} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fadeIn">
                        {seriesAssignForm.selectedSeries.map(seriesId => {
                          const seriesData = testSeriesList.find(s => s.id === seriesId);
                          return (
                            <div key={seriesId} className={`p-6 rounded-[2rem] border shadow-md flex flex-col md:flex-row md:items-center gap-6 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="w-1/3 shrink-0">
                                <p className={`font-black text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{seriesData?.title}</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1 flex items-center gap-1.5"><Layers size={10}/> Series Architecture</p>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-2">Unlock Clock</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.start || ''} onChange={(e) => configureDistributionSchedules('custom', 'start', e.target.value, seriesId)} className={`w-full p-4 rounded-xl border font-bold text-xs outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'}`} />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-2">Expiration Clock</label>
                                  <input type="datetime-local" value={seriesAssignForm.customSchedules[seriesId]?.end || ''} onChange={(e) => configureDistributionSchedules('custom', 'end', e.target.value, seriesId)} className={`w-full p-4 rounded-xl border font-bold text-xs outline-none transition-all shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'}`} />
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

              <div className={`p-8 md:p-10 border-t flex items-center justify-end gap-5 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <button type="button" onClick={() => setIsSeriesModalOpen(false)} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>Abort Sequence</button>
                <button type="button" onClick={commitDeploymentConfiguration} disabled={isSaving || seriesAssignForm.selectedSeries.length === 0} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 shadow-xl ${isDarkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Deploy Architectures
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCESS REQUESTS MODAL */}
      <AnimatePresence>
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-2xl border rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <h3 className={`text-2xl font-black flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Bell className="text-indigo-500"/> Incoming Access Requests</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Teachers requesting access to your Blueprints</p>
                </div>
                <button onClick={() => setIsRequestsModalOpen(false)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-rose-500 hover:text-white' : 'bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600'}`}><X size={16}/></button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-4">
                {accessRequests.length === 0 ? (
                  <p className="text-slate-500 text-center font-bold">No pending requests.</p>
                ) : (
                  accessRequests.map(req => (
                    <div key={req.id} className={`p-6 rounded-[2rem] border flex items-center justify-between ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><span className="text-indigo-500">{req.requesterName}</span> wants to use:</p>
                        <p className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{req.testTitle}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Target Series: {req.seriesTitle}</p>
                      </div>
                      <button onClick={() => handleAcceptRequest(req)} disabled={isSaving} className="px-6 py-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Accept & Deploy
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}