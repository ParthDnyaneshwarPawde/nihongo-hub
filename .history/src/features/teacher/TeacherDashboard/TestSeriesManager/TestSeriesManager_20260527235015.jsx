import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, Database, FolderOpen, 
  Target, Edit3, Loader2, Calendar, Users, Lock, Globe, 
  Clock, ShieldAlert, FileText, ChevronRight
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
    tests: [] // Array of { testId, unlockDate, deadlineDate }
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userUid = auth.currentUser?.uid;
        if (!userUid) { setAccessDenied(true); return; }

        // Fetch Mock Tests
        const testsSnap = await getDocs(collection(db, 'mock_tests'));
        const fetchedTests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAvailableTests(fetchedTests);

        // Fetch Batches (Mocking a batches collection here, adjust to your actual path)
        const batchesSnap = await getDocs(collection(db, 'batches'));
        const fetchedBatches = batchesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
        setAvailableBatches(fetchedBatches);

        // Fetch Existing Test Series
        const seriesSnap = await getDocs(collection(db, 'test_series'));
        const fetchedSeries = seriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTestSeries(fetchedSeries);

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

  // Form Handlers
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

  // Curriculum Handlers
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

    // If they change the test, auto-fill global dates if applicable
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
    if (formData.tests.some(t => !t.testId)) return alert("Please select a test for all curriculum slots.");

    setIsSaving(true);
    try {
      const seriesId = editingId || `ts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const payload = {
        id: seriesId,
        authorId: auth.currentUser.uid,
        ...formData,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'test_series', seriesId), payload);
      setEditingId('');
      setFormData(initialFormState);
      
      // Refresh list
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Test Series? This will un-assign it from all batches.")) return;
    try {
      await deleteDoc(doc(db, 'test_series', id));
      setTestSeries(testSeries.filter(s => s.id !== id));
    } catch (error) { console.error(error); }
  };

  // Styles
  const inputBaseClass = `w-full p-3 rounded-xl border text-sm transition-all outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 focus:border-indigo-500 text-slate-200' : 'bg-white border-slate-300 focus:border-indigo-400 text-slate-900'}`;
  const labelClass = `block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const panelClass = `p-6 rounded-[2rem] border ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-white border-slate-200'}`;

  if (accessDenied) return <div className="min-h-screen flex items-center justify-center">Access Denied</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl px-6 py-4 flex items-center justify-between shadow-sm ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2"><FolderOpen size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> Exam Scheduler</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Assign Mock Tests to Batches</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SERIES ARCHITECT */}
        <div className="xl:col-span-7 flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Edit3 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> {editingId ? `Editing Series: ${editingId}` : 'Create New Test Series'}</h2>
            {editingId && <button onClick={() => { setEditingId(''); setFormData(initialFormState); }} className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>Cancel Edit</button>}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* META INFO */}
            <div className={panelClass}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={`${labelClass} !text-indigo-500`}>Series Title</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Summer N4 Bootcamp" className={`${inputBaseClass} !text-lg !font-black !py-3`} required />
                </div>
                <div>
                  <label className={labelClass}>Description (Optional)</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="A short description for the students..." rows="2" className={`${inputBaseClass} resize-y`} />
                </div>
              </div>
            </div>

            {/* BATCH ASSIGNMENT */}
            <div className={`${panelClass} border-emerald-500/30`}>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Assign to Batches</h3>
              </div>
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Students in these batches will see this series on their dashboard.</p>
              
              <div className="flex flex-wrap gap-3">
                {availableBatches.length > 0 ? availableBatches.map(batch => {
                  const isSelected = formData.assignedBatches.includes(batch.id);
                  return (
                    <button 
                      key={batch.id} 
                      type="button" 
                      onClick={() => toggleBatch(batch.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700') : (isDarkMode ? 'bg-[#0B1120] border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400')}`}
                    >
                      {batch.name}
                    </button>
                  );
                }) : (
                  <span className="text-xs italic text-slate-500">No active batches found.</span>
                )}
              </div>
            </div>

            {/* CURRICULUM BUILDER */}
            <div className={`${panelClass} border-amber-500/30`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                  <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Curriculum (Mock Tests)</h3>
                </div>
                <button type="button" onClick={addTestToSeries} className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-colors ${isDarkMode ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-amber-600 text-white hover:bg-amber-500'}`}><Plus size={12} className="inline mr-1"/> Add Exam</button>
              </div>

              <div className="space-y-4">
                {formData.tests.map((test, index) => {
                  // Check if the selected test has a global schedule
                  const selectedTestObj = availableTests.find(t => t.id === test.testId);
                  const isGlobal = selectedTestObj?.scheduling?.isGlobalSchedule === true;

                  return (
                    <div key={index} className={`p-5 rounded-2xl border flex flex-col gap-4 relative overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      
                      {/* Delete Button */}
                      <button type="button" onClick={() => removeTestFromSeries(index)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                      
                      <div className="pr-8">
                        <label className={labelClass}>Select Exam</label>
                        <select value={test.testId} onChange={(e) => handleTestChange(index, 'testId', e.target.value)} className={`${inputBaseClass} !font-bold`}>
                          <option value="">-- Choose a Mock Test --</option>
                          {availableTests.map(t => <option key={t.id} value={t.id}>{t.title} ({t.id})</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <label className={`${labelClass} ${isGlobal ? '!text-amber-500' : ''}`}>{isGlobal ? <Lock size={10} className="inline mr-1"/> : <Clock size={10} className="inline mr-1"/>} Unlock Date</label>
                          <input 
                            type="datetime-local" 
                            value={test.unlockDate} 
                            onChange={(e) => handleTestChange(index, 'unlockDate', e.target.value)} 
                            disabled={isGlobal}
                            className={`${inputBaseClass} ${isGlobal ? 'opacity-50 cursor-not-allowed border-amber-500/50 text-amber-500' : ''}`} 
                          />
                        </div>
                        <div className="relative">
                          <label className={`${labelClass} ${isGlobal ? '!text-amber-500' : ''}`}>{isGlobal ? <Lock size={10} className="inline mr-1"/> : <Clock size={10} className="inline mr-1"/>} Deadline</label>
                          <input 
                            type="datetime-local" 
                            value={test.deadlineDate} 
                            onChange={(e) => handleTestChange(index, 'deadlineDate', e.target.value)} 
                            disabled={isGlobal}
                            className={`${inputBaseClass} ${isGlobal ? 'opacity-50 cursor-not-allowed border-amber-500/50 text-amber-500' : ''}`} 
                          />
                        </div>
                      </div>

                      {isGlobal && (
                        <div className="mt-1 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                          <Globe size={14} className="text-amber-500 shrink-0" />
                          <p className="text-[10px] font-bold text-amber-500 leading-tight">This exam has a <strong>Global Schedule</strong> enforced by the Lead Author. You cannot change these dates.</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {formData.tests.length === 0 && (
                  <div className={`p-8 text-center rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No exams added yet. Click "Add Exam" to build the curriculum.</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isSaving ? 'opacity-50' : 'hover:-translate-y-0.5'} ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {editingId ? 'Update Series' : 'Publish Series'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: LIVE DATABASE */}
        <div className="xl:col-span-5 flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Database size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> Active Series</h3>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{testSeries.length} Total</span>
          </div>
          
          <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-[2rem] border shadow-sm p-4 space-y-4 ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-white border-slate-200'}`}>
            <AnimatePresence>
              {testSeries.map((series) => (
                <motion.div 
                  key={series.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border group transition-all hover:shadow-md ${isDarkMode ? 'bg-[#0B1120] border-slate-700 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className={`text-lg font-black truncate pr-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{series.title}</h4>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEdit(series)} className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-slate-200 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`}><Edit3 size={14}/></button>
                      <button onClick={() => handleDelete(series.id)} className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-slate-200 text-rose-600 hover:bg-rose-500 hover:text-white'}`}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><FileText size={12}/> {series.tests?.length || 0} Exams</span>
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><Users size={12}/> {series.assignedBatches?.length || 0} Batches</span>
                  </div>

                  {series.assignedBatches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {series.assignedBatches.map(bId => {
                        const bName = availableBatches.find(b => b.id === bId)?.name || bId;
                        return <span key={bId} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{bName}</span>
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {testSeries.length === 0 && !isLoading && (
              <div className="text-center py-12 opacity-50">
                <FolderOpen size={32} className="mx-auto mb-3" />
                <p className="text-sm font-bold">No Test Series published yet.</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}