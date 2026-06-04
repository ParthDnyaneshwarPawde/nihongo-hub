import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, Database, FolderOpen, 
  Target, Edit3, Loader2, Users, Lock, Globe, 
  Clock, FileText, LayoutDashboard, Video, UserCheck, Search,
  BookMarked, Calendar, SlidersHorizontal, Bell, Zap, HelpCircle
} from 'lucide-react';

export default function TestSeriesManager() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data State
  const [testSeries, setTestSeries] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  
  const [editingId, setEditingId] = useState('');

  const initialFormState = {
    title: '',
    description: '',
    assignedBatches: [],
    tests: [] 
  };
  const [formData, setFormData] = useState(initialFormState);

  const jlptOptions = ['N5', 'N4', 'N3', 'N2', 'N1'];

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
      } {
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

  const toggleBatch = (batchId) => {
    const isSelected = formData.assignedBatches.includes(batchId);
    setFormData({
      ...formData,
      assignedBatches: isSelected 
        ? formData.assignedBatches.filter(id => id !== batchId)
        : [...formData.assignedBatches, batchId]
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
      tests: series.tests || []
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Test Series?")) return;
    try {
      await deleteDoc(doc(db, 'test_series', id));
      setTestSeries(testSeries.filter(s => s.id !== id));
    } catch (error) { console.error(error); }
  };

  const handleForgeBridge = () => {
    alert("Initiating Mock Test Assembly Line... Redirecting to Forge Architect Mode.");
  };

  // Verbatim styling classes based on image_684b1f.png
  const inputBaseClass = `w-full p-4 rounded-xl border text-sm font-medium transition-all duration-200 outline-none bg-[#0D1527]/60 border-slate-800 focus:border-indigo-500/50 text-slate-100 placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/5`;
  const labelClass = `block text-xs font-black uppercase tracking-widest mb-2.5 text-indigo-400/80`;
  const panelClass = `p-8 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-[#111A2E] to-[#0D1424] shadow-inner`;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#090E1A]"><Loader2 size={40} className="animate-spin text-rose-500" /></div>;

  return (
    <div className="min-h-screen bg-[#090E1A] font-sans flex text-slate-200 overflow-hidden select-none">
      
      {/* 1. MASTER LEFT SIDEBAR (Sensei Panel Navigation Wrapper) */}
      <aside className="w-[280px] shrink-0 border-r border-slate-900 bg-[#0C1222] flex flex-col justify-between p-6">
        <div className="space-y-8">
          {/* Brand Heading */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-500/20">🌸</div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white leading-none">Sensei Panel</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1 block">Nihongo Hub</span>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 px-3">Control</p>
              <div className="space-y-1">
                <button onClick={() => navigate('/teacher-dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all"><LayoutDashboard size={16}/> Dashboard</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all"><Video size={16}/> Live Classroom</button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all"><UserCheck size={16}/> Student Database</button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 px-3">Management</p>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all"><BookMarked size={16}/> Course Materials</button>
                {/* Active Menu State Pill Background */}
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 to-pink-600 shadow-md shadow-rose-600/10 transition-all"><Calendar size={16}/> Exam Scheduler</button>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Account Badge */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3 shadow-lg shadow-indigo-600/10">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-xs text-white">PK</div>
          <div>
            <h4 className="text-xs font-black text-white leading-none">Parther King</h4>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mt-1 block">Verified Lead</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CORE LAYOUT WINDOW */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#090E1A]">
        
        {/* Top Navbar */}
        <nav className="h-20 border-b border-slate-900 bg-[#090E1A] px-8 flex items-center justify-between">
          <div className="w-96 p-3 rounded-xl bg-[#131C31] border border-slate-800/80 flex items-center gap-3 focus-within:border-slate-700 transition-all">
            <Search size={16} className="text-slate-500" />
            <input type="text" placeholder="Search students..." className="bg-transparent border-none outline-none text-xs font-bold text-white w-full placeholder:text-slate-600" />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-xl bg-[#131C31] border border-slate-800 flex items-center justify-center text-amber-400 hover:bg-slate-800/40 transition-all"><Zap size={16} fill="currentColor" /></button>
            <button className="w-10 h-10 rounded-xl bg-[#131C31] border border-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-800/40 transition-all"><Bell size={16} /></button>
          </div>
        </nav>

        {/* View Main Panel Wrapper */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 max-w-[1500px] w-full mx-auto">
          
          {/* Action Header Context View */}
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 rounded-xl border border-slate-800 bg-[#131C31]/50 hover:bg-[#131C31] text-slate-300 transition-all"><ArrowLeft size={16} /></button>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2"><FolderOpen size={22} className="text-rose-500" /> Exam Scheduler</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-0.5">Assign Mock Tests to Batches</p>
            </div>
          </div>

          {/* Setup Architecture Workspace Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* BUILD PANEL */}
            <div className="xl:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Edit3 size={14} className="text-rose-500" /> {editingId ? "Modify Test Matrix" : "Create New Test Series"}</h2>
                {editingId && <button onClick={() => { setEditingId(''); setFormData(initialFormState); }} className="text-[9px] uppercase tracking-widest font-black bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all">Discard Changes</button>}
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {/* Core Parameters */}
                <div className={panelClass}>
                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Series Title</label>
                      <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Summer N4 Bootcamp" className={inputBaseClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Description (Optional)</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="A short description for the students..." rows="3" className={inputBaseClass} />
                    </div>
                  </div>
                </div>

                {/* Batch Distribution List */}
                <div className={panelClass}>
                  <label className={labelClass}>Assign to Batches</label>
                  <p className="text-xs text-slate-500 mb-4 font-medium">Select target student pools allowed to attempt this specific deployment configuration.</p>
                  <div className="flex flex-wrap gap-2.5">
                    {availableBatches.length > 0 ? availableBatches.map(batch => {
                      const isSelected = formData.assignedBatches.includes(batch.id);
                      return (
                        <button 
                          key={batch.id} type="button" onClick={() => toggleBatch(batch.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 border ${isSelected ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5' : 'bg-[#0D1527]/60 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          {batch.name}
                        </button>
                      );
                    }) : <span className="text-xs font-bold text-slate-600 italic">No batches created in global configuration.</span>}
                  </div>
                </div>

                {/* Target Curriculum Items */}
                <div className={panelClass}>
                  <div className="flex items-center justify-between mb-6">
                    <label className={labelClass}>Curriculum Construction</label>
                    <button type="button" onClick={addTestToSeries} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/10 transition-all flex items-center gap-1.5"><Plus size={12}/> Attach Exam</button>
                  </div>

                  <div className="space-y-4">
                    {formData.tests.map((test, index) => {
                      const selectedTestObj = availableTests.find(t => t.id === test.testId);
                      const isGlobal = selectedTestObj?.scheduling?.isGlobalSchedule === true;

                      return (
                        <div key={index} className="p-6 rounded-2xl bg-[#090F1A]/80 border border-slate-800/80 relative flex flex-col gap-4">
                          <button type="button" onClick={() => removeTestFromSeries(index)} className="absolute top-4 right-4 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                          
                          <div className="pr-8">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Select Mock Test</label>
                            <select value={test.testId} onChange={(e) => handleTestChange(index, 'testId', e.target.value)} className={`${inputBaseClass} !font-bold`}>
                              <option value="">-- Choose Blueprint --</option>
                              {availableTests.map(t => <option key={t.id} value={t.id}>{t.title} [{t.id}]</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className={`text-[10px] font-black uppercase tracking-wider block mb-2 ${isGlobal ? 'text-amber-500' : 'text-slate-500'}`}>{isGlobal ? "🔒 Global Unlock Time" : "Test Unlock Date"}</label>
                              <input type="datetime-local" value={test.unlockDate} onChange={(e) => handleTestChange(index, 'unlockDate', e.target.value)} disabled={isGlobal} className={`${inputBaseClass} ${isGlobal ? 'opacity-40 border-amber-500/30 text-amber-500 bg-amber-500/5 cursor-not-allowed' : ''}`} />
                            </div>
                            <div>
                              <label className={`text-[10px] font-black uppercase tracking-wider block mb-2 ${isGlobal ? 'text-amber-500' : 'text-slate-500'}`}>{isGlobal ? "🔒 Global Expiration" : "Test Deadline Date"}</label>
                              <input type="datetime-local" value={test.deadlineDate} onChange={(e) => handleTestChange(index, 'deadlineDate', e.target.value)} disabled={isGlobal} className={`${inputBaseClass} ${isGlobal ? 'opacity-40 border-amber-500/30 text-amber-500 bg-amber-500/5 cursor-not-allowed' : ''}`} />
                            </div>
                          </div>

                          {isGlobal && (
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-2.5">
                              <Globe size={14} className="text-amber-500" />
                              <p className="text-[10px] font-bold text-amber-400 leading-tight">Enforcing hard global schedule constraints defined within the original test forge workspace.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {formData.tests.length === 0 && (
                      <div className="p-10 border-2 border-dashed border-slate-900 rounded-2xl flex flex-col items-center text-slate-600">
                        <Calendar size={28} className="mb-2" />
                        <span className="text-xs font-bold">No examination maps populated into this configuration.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  {/* Dynamic Action Trigger to launch assembly/forge page */}
                  <button type="button" onClick={handleForgeBridge} className="w-1/3 py-4 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-800 bg-[#131C31]/40 hover:bg-[#131C31] text-slate-300 transition-all flex items-center justify-center gap-2"><SlidersHorizontal size={14}/> Assemble Forge</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 transition-all">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editingId ? "Update Test Matrix" : "Publish Test Series"}</button>
                </div>
              </form>
            </div>

            {/* LIVE REGISTRY LISTING */}
            <div className="xl:col-span-5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Database size={14} className="text-rose-500" /> Published Master Pools</h3>
                <span className="text-[10px] font-black px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">{testSeries.length} Records</span>
              </div>

              <div className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence>
                  {testSeries.map((series) => (
                    <motion.div 
                      key={series.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-6 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-[#111A2E] to-[#0D1424] group hover:border-slate-700 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-base font-black text-white group-hover:text-rose-400 transition-colors duration-200">{series.title}</h4>
                          <span className="text-[10px] font-mono text-slate-500 block mt-1">UUID: {series.id}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                          <button onClick={() => handleEdit(series)} className="p-2 rounded-xl bg-slate-800/80 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-slate-700 transition-all"><Edit3 size={12}/></button>
                          <button onClick={() => handleDelete(series.id)} className="p-2 rounded-xl bg-slate-800/80 text-rose-400 hover:bg-rose-500 hover:text-white border border-slate-700 transition-all"><Trash2 size={12}/></button>
                        </div>
                      </div>

                      {series.description && <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4 line-clamp-2">{series.description}</p>}

                      <div className="flex items-center gap-4 border-t border-slate-900 pt-4 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><FileText size={12}/> {series.tests?.length || 0} Modules</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Users size={12}/> {series.assignedBatches?.length || 0} Distributions</span>
                      </div>

                      {series.assignedBatches?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {series.assignedBatches.map(bId => {
                            const bName = availableBatches.find(b => b.id === bId)?.name || bId;
                            return <span key={bId} className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[#090F1A] border border-slate-800 text-slate-400 shadow-sm">{bName}</span>
                          })}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}