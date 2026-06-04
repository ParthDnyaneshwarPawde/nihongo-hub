import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, FolderOpen, 
  Edit2, Loader2, Users, Globe, Clock, 
  FileText, Search, Lock, User, Activity, 
  ShieldCheck, AlertTriangle, CheckCircle, MonitorSmartphone
} from 'lucide-react';

export default function TestSeriesManager() {
  const { isDarkMode } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // View State 
  const [activeTab, setActiveTab] = useState('architect'); // 'architect' | 'command_center'
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [testSeries, setTestSeries] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  
  // MOCK: Teacher list for collaborator assignment
  const mockTeachers = [
    { id: 't_001', name: 'System Admin' },
    { id: 't_002', name: 'Yuki Sensei' },
    { id: 't_003', name: 'Kenji Sensei' }
  ];

  const [editingId, setEditingId] = useState('');

  const initialFormState = {
    title: '',
    description: '',
    assignedBatches: [],
    collaborators: [], // 🚨 NEW: Collaborator Management
    tests: [] 
  };
  const [formData, setFormData] = useState(initialFormState);

  // Command Center State
  const [selectedProctorSeries, setSelectedProctorSeries] = useState('');
  const [selectedProctorTest, setSelectedProctorTest] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userUid = auth.currentUser?.uid;
        if (!userUid) { setAccessDenied(true); return; }

        const testsSnap = await getDocs(collection(db, 'mock_tests'));
        setAvailableTests(testsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const batchesSnap = await getDocs(collection(db, 'batches'));
        setAvailableBatches(batchesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id })));

        const seriesSnap = await getDocs(collection(db, 'test_series'));
        setTestSeries(seriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchData();
      else setAccessDenied(true);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleArrayItem = (field, id) => {
    const isSelected = formData[field].includes(id);
    setFormData({
      ...formData,
      [field]: isSelected ? formData[field].filter(i => i !== id) : [...formData[field], id]
    });
  };

  const addTestToSeries = () => {
    setFormData({
      ...formData,
      tests: [...formData.tests, { testId: '', unlockDate: '', deadlineDate: '' }]
    });
  };

  const removeTestFromSeries = (index) => {
    const newTests = [...formData.tests];
    newTests.splice(index, 1);
    setFormData({ ...formData, tests: newTests });
  };

  const handleTestChange = (index, field, value) => {
    const newTests = [...formData.tests];
    newTests[index][field] = value;

    if (field === 'testId') {
      const selectedTest = availableTests.find(t => t.id === value);
      if (selectedTest?.scheduling?.isGlobalSchedule) {
        newTests[index].unlockDate = selectedTest.scheduling.globalUnlockDate || '';
        newTests[index].deadlineDate = selectedTest.scheduling.globalDeadlineDate || '';
      } else {
        newTests[index].unlockDate = '';
        newTests[index].deadlineDate = '';
      }
    }
    setFormData({ ...formData, tests: newTests });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("Series Title is required!");
    if (formData.tests.length === 0) return alert("You must add at least one test to the series.");
    if (formData.tests.some(t => !t.testId)) return alert("Please select a test for all slots.");

    setIsSaving(true);
    try {
      const seriesId = editingId || `ts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payload = {
        id: seriesId,
        authorId: auth.currentUser?.uid || 'system_lead',
        ...formData,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'test_series', seriesId), payload);
      setEditingId('');
      setFormData(initialFormState);
      setIsBuilderOpen(false);
      
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      setTestSeries(seriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      alert(`Error saving series: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (series) => {
    setEditingId(series.id);
    setFormData({
      title: series.title || '',
      description: series.description || '',
      assignedBatches: series.assignedBatches || [],
      collaborators: series.collaborators || [],
      tests: series.tests || []
    });
    setIsBuilderOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Test Series?")) return;
    try {
      await deleteDoc(doc(db, 'test_series', id));
      setTestSeries(testSeries.filter(s => s.id !== id));
    } catch (error) { console.error(error); }
  };

  const filteredSeries = testSeries.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // 🚨 MOCK DATA: For Proctoring Dashboard Visualization
  const mockStudents = [
    { id: 's1', name: 'Tanaka Hiro', status: 'testing', score: null },
    { id: 's2', name: 'Sarah Connor', status: 'ready', score: null }, // Pre-flight key entered
    { id: 's3', name: 'John Doe', status: 'offline', score: null },
    { id: 's4', name: 'Akira Sato', status: 'submitted', score: 145 },
    { id: 's5', name: 'Emma Watson', status: 'testing', score: null },
  ];

  // Premium UI Classes
  const inputPremiumClass = `w-full p-4 rounded-2xl bg-[#0D1527]/80 border border-slate-800/80 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold`;
  const labelPremiumClass = `block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1`;

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 size={40} className="animate-spin text-rose-500" /></div>;

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 text-slate-200">
      
      {/* 🚨 TOP NAVIGATION TABS */}
      <div className="max-w-[1400px] w-full mx-auto mb-8 flex gap-6 border-b border-slate-800">
        <button 
          onClick={() => { setActiveTab('architect'); setIsBuilderOpen(false); }}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'architect' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Series Architect
        </button>
        <button 
          onClick={() => { setActiveTab('command_center'); setIsBuilderOpen(false); }}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'command_center' ? 'border-rose-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <Activity size={16} className={activeTab === 'command_center' ? 'text-rose-500' : 'text-slate-500'} /> Command Center
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* =========================================
             VIEW 1: ARCHITECT (GRID OR BUILDER)
            ========================================= */}
        {activeTab === 'architect' && !isBuilderOpen && (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full max-w-[1400px] w-full mx-auto"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <FolderOpen size={28} className="text-indigo-500" /> Series Management
                </h1>
                <p className="text-sm font-bold text-slate-500 mt-1">Build curriculums and assign collaborator permissions.</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-72 p-3 rounded-2xl bg-[#0D1527] border border-slate-800 flex items-center gap-3 focus-within:border-indigo-500/50 transition-all">
                  <Search size={18} className="text-slate-500" />
                  <input type="text" placeholder="Search series..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold text-white w-full placeholder:text-slate-600" />
                </div>
                <button 
                  onClick={() => { setEditingId(''); setFormData(initialFormState); setIsBuilderOpen(true); }}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus size={16} /> Create Series
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredSeries.map((series) => (
                <div 
                  key={series.id} 
                  className="relative p-8 rounded-[2rem] bg-gradient-to-br from-[#0B1120] to-[#0A0E17] border-2 border-indigo-500/30 hover:border-indigo-500 transition-all duration-300 shadow-[0_0_30px_rgba(99,102,241,0.05)] hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] group flex flex-col justify-between min-h-[280px]"
                >
                  <div className="absolute -top-4 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button onClick={() => handleEdit(series)} className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(series.id)} className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 transition-all"><Trash2 size={16} /></button>
                  </div>

                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="px-4 py-1.5 rounded-full bg-[#131C31] border border-slate-800 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        {series.assignedBatches?.length || 0} Batches
                      </div>
                      <div className="text-right">
                        <span className="block text-2xl font-black text-amber-400">{series.tests?.length || 0}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Exams</span>
                      </div>
                    </div>

                    <h4 className="text-2xl font-black text-white leading-tight mb-3">{series.title}</h4>
                    {series.description && <p className="text-sm font-medium text-slate-400 line-clamp-2">{series.description}</p>}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400"><User size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Lead: You</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Collabs: {series.collaborators?.length || 0} Assigned</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =========================================
             VIEW 2: SERIES BUILDER
            ========================================= */}
        {activeTab === 'architect' && isBuilderOpen && (
          <motion.div 
            key="builder"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full max-w-[1000px] w-full mx-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsBuilderOpen(false)} className="w-12 h-12 rounded-2xl bg-[#0D1527] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"><ArrowLeft size={20} /></button>
                <div>
                  <h2 className="text-2xl font-black text-white">{editingId ? "Edit Test Series" : "Create New Series"}</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Configure parameters and curriculum</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8 pb-20">
              
              {/* SECTION 1: Meta */}
              <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 mb-8"><Edit2 size={16} className="text-indigo-500"/> Series Information</h3>
                <div className="space-y-6">
                  <div>
                    <label className={labelPremiumClass}>Series Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Summer N4 Bootcamp" className={`${inputPremiumClass} !text-xl`} required />
                  </div>
                  <div>
                    <label className={labelPremiumClass}>Description (Optional)</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="A short description for the students..." rows="3" className={inputPremiumClass} />
                  </div>
                </div>
              </div>

              {/* 🚨 SECTION 2: ACCESS & COLLABORATORS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Users size={16} className="text-emerald-500"/> Batches</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {availableBatches.length > 0 ? availableBatches.map(batch => {
                      const isSelected = formData.assignedBatches.includes(batch.id);
                      return (
                        <button 
                          key={batch.id} type="button" onClick={() => toggleArrayItem('assignedBatches', batch.id)}
                          className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border-2 ${isSelected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#0D1527] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                        >
                          {batch.name}
                        </button>
                      );
                    }) : <span className="text-sm font-bold text-slate-600 italic">No batches created.</span>}
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><ShieldCheck size={16} className="text-rose-500"/> Collaborators</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {mockTeachers.map(teacher => {
                      const isSelected = formData.collaborators.includes(teacher.id);
                      return (
                        <button 
                          key={teacher.id} type="button" onClick={() => toggleArrayItem('collaborators', teacher.id)}
                          className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border-2 flex items-center gap-2 ${isSelected ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-[#0D1527] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                        >
                          <User size={14} /> {teacher.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Curriculum */}
              <div className="p-8 md:p-10 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><FileText size={16} className="text-amber-500"/> Curriculum Builder</h3>
                    <p className="text-xs font-medium text-slate-500 mt-2">Attach Mock Tests and configure their unlock schedules.</p>
                  </div>
                  <button type="button" onClick={addTestToSeries} className="px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"><Plus size={16}/> Add Exam</button>
                </div>

                <div className="space-y-6">
                  <AnimatePresence>
                    {formData.tests.map((test, index) => {
                      const selectedTestObj = availableTests.find(t => t.id === test.testId);
                      const isGlobal = selectedTestObj?.scheduling?.isGlobalSchedule === true;

                      return (
                        <motion.div 
                          key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                          className="p-6 md:p-8 rounded-[2rem] bg-[#0D1527] border border-slate-800 relative group"
                        >
                          <button type="button" onClick={() => removeTestFromSeries(index)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><Trash2 size={16}/></button>
                          
                          <div className="pr-14 mb-6">
                            <label className={labelPremiumClass}>Select Blueprint</label>
                            <select value={test.testId} onChange={(e) => handleTestChange(index, 'testId', e.target.value)} className={inputPremiumClass}>
                              <option value="">-- Choose a Mock Test --</option>
                              {availableTests.map(t => <option key={t.id} value={t.id}>{t.title} [{t.id}]</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className={`${labelPremiumClass} ${isGlobal ? '!text-amber-500' : ''}`}>{isGlobal ? <Lock size={12} className="inline mb-0.5 mr-1"/> : <Clock size={12} className="inline mb-0.5 mr-1"/>} Unlock Date</label>
                              <input type="datetime-local" value={test.unlockDate} onChange={(e) => handleTestChange(index, 'unlockDate', e.target.value)} disabled={isGlobal} className={`${inputPremiumClass} ${isGlobal ? 'opacity-50 cursor-not-allowed text-amber-500' : ''}`} />
                            </div>
                            <div>
                              <label className={`${labelPremiumClass} ${isGlobal ? '!text-amber-500' : ''}`}>{isGlobal ? <Lock size={12} className="inline mb-0.5 mr-1"/> : <Clock size={12} className="inline mb-0.5 mr-1"/>} Deadline</label>
                              <input type="datetime-local" value={test.deadlineDate} onChange={(e) => handleTestChange(index, 'deadlineDate', e.target.value)} disabled={isGlobal} className={`${inputPremiumClass} ${isGlobal ? 'opacity-50 cursor-not-allowed text-amber-500' : ''}`} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit */}
              <div className="sticky bottom-8 z-10">
                <button type="submit" disabled={isSaving} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(79,70,229,0.3)] transition-all active:scale-95">
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {editingId ? "Update Test Matrix" : "Publish Series"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* =========================================
             VIEW 3: COMMAND CENTER (PROCTORING)
            ========================================= */}
        {activeTab === 'command_center' && (
          <motion.div 
            key="proctoring"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="flex flex-col h-full max-w-[1400px] w-full mx-auto"
          >
            <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 mb-2">
                  <Activity size={28} className="text-rose-500" /> Live Command Center
                </h1>
                <p className="text-sm font-bold text-slate-500">Monitor active exams, verify pre-flight access keys, and review participation.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-4">
                <div className="w-64">
                  <label className={labelPremiumClass}>Scope: Test Series</label>
                  <select 
                    value={selectedProctorSeries} 
                    onChange={e => setSelectedProctorSeries(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#0D1527] border border-slate-800 text-white text-sm font-bold outline-none"
                  >
                    <option value="">-- Select Series --</option>
                    {testSeries.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="w-64">
                  <label className={labelPremiumClass}>Scope: Specific Exam</label>
                  <select 
                    value={selectedProctorTest} 
                    onChange={e => setSelectedProctorTest(e.target.value)}
                    disabled={!selectedProctorSeries}
                    className="w-full p-3.5 rounded-xl bg-[#0D1527] border border-slate-800 text-white text-sm font-bold outline-none disabled:opacity-50"
                  >
                    <option value="">-- Select Test --</option>
                    {/* Simplified for mock purposes */}
                    <option value="test_1">Mock Test N4 A</option>
                    <option value="test_2">Mock Test N4 B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="p-6 rounded-3xl bg-[#0D1527] border border-slate-800 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Assigned</span>
                <span className="text-4xl font-black text-white">{mockStudents.length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-1.5"><ShieldCheck size={14}/> Key Entered (Ready)</span>
                <span className="text-4xl font-black text-emerald-400">{mockStudents.filter(s => s.status === 'ready').length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1.5"><MonitorSmartphone size={14}/> In Progress</span>
                <span className="text-4xl font-black text-indigo-400">{mockStudents.filter(s => s.status === 'testing').length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-slate-800 border border-slate-700 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><CheckCircle size={14}/> Submitted</span>
                <span className="text-4xl font-black text-white">{mockStudents.filter(s => s.status === 'submitted').length}</span>
              </div>
            </div>

            {/* Live Student Grid */}
            <div className="p-8 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Users size={16} className="text-rose-500"/> Real-Time Participation</h3>
              </div>

              {selectedProctorTest ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {mockStudents.map(student => {
                    let statusColors = '';
                    let statusIcon = null;
                    let statusLabel = '';

                    if (student.status === 'offline') {
                      statusColors = 'border-slate-800 bg-[#0D1527] text-slate-500';
                      statusLabel = 'Offline / No Key';
                      statusIcon = <AlertTriangle size={14} />;
                    } else if (student.status === 'ready') {
                      statusColors = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
                      statusLabel = 'Pre-Flight Ready';
                      statusIcon = <ShieldCheck size={14} />;
                    } else if (student.status === 'testing') {
                      statusColors = 'border-indigo-500 bg-indigo-500/10 text-indigo-400';
                      statusLabel = 'Active Session';
                      statusIcon = <Activity size={14} className="animate-pulse" />;
                    } else if (student.status === 'submitted') {
                      statusColors = 'border-slate-700 bg-[#131C31] text-white';
                      statusLabel = `Score: ${student.score}`;
                      statusIcon = <CheckCircle size={14} />;
                    }

                    return (
                      <div key={student.id} className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${statusColors}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${student.status === 'offline' ? 'bg-slate-800 text-slate-600' : 'bg-white/10 text-current'}`}>
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm text-white">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                          {statusIcon} {statusLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-[#0D1527]/50">
                  <Activity size={40} className="text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">Select a Series and Exam above to monitor participation.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}