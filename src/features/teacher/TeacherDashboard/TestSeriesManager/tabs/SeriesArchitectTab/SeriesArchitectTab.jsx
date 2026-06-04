import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ArrowLeft, Plus, Save, Trash2, FolderOpen, Edit2, Loader2, Users, 
  Search, X, Check, ShieldCheck, Server, BookOpen, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

export default function SeriesArchitectTab() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentView, setCurrentView] = useState('grid'); // 'grid' | 'settings'
  const [searchQuery, setSearchQuery] = useState('');

  const [testSeries, setTestSeries] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [teacherList, setTeacherList] = useState([]);

  const [editingId, setEditingId] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  const initialFormState = { title: '', description: '', targetLevel: 'Mixed', assignedBatches: [], collaborators: [], authorId: '' };
  const [formData, setFormData] = useState(initialFormState);

  const fetchAllData = async (uid) => {
    if (!uid) return;
    setIsLoading(true);
    try {
      const seriesSnap = await getDocs(collection(db, 'test_series'));
      setTestSeries(seriesSnap.docs.map(d => ({ id: d.id, ...d.data(), tests: d.data().tests || [] }))
        .filter(s => s.authorId === uid || (s.collaborators && s.collaborators.includes(uid))));

      const batchesSnap = await getDocs(collection(db, 'batches'));
      setAvailableBatches(batchesSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, teacherIds: d.data().teacherIds || [] }))
        .filter(b => b.teacherIds.includes(uid)));

      const staffSnap = await getDocs(collection(db, 'users'));
      setTeacherList(staffSnap.docs.map(d => {
        const data = d.data();
        let fullName = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown Sensei';
        return { id: d.id, name: fullName, email: data.email || '', role: (data.role || 'student').toLowerCase(), avatar: fullName !== 'Unknown Sensei' ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST' };
      }).filter(u => ['teacher', 'instructor', 'admin', 'sensei'].includes(u.role)));

    } catch (error) { console.error("Data Sync Error:", error); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) { setCurrentUserId(user.uid); fetchAllData(user.uid); } });
    return () => unsubscribe();
  }, []);

  const handleOpenSettings = (series = null) => {
    if (series) {
      setEditingId(series.id);
      setFormData({ title: series.title || '', description: series.description || '', targetLevel: series.targetLevel || 'Mixed', assignedBatches: series.assignedBatches || [], collaborators: series.collaborators || [], authorId: series.authorId || currentUserId });
    } else {
      setEditingId(''); setFormData({ ...initialFormState, collaborators: [currentUserId], authorId: currentUserId });
    }
    setTeacherSearch(''); setBatchSearch(''); setCurrentView('settings');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert("Series Title is required.");
    setIsSaving(true);
    try {
      const sId = editingId || `ts_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'test_series', sId), { id: sId, ...formData, authorId: formData.authorId || currentUserId, updatedAt: new Date().toISOString() }, { merge: true });
      await fetchAllData(currentUserId); setCurrentView('grid');
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const deleteSeries = async (id) => {
    if (!window.confirm("Permanently delete this Series and all its matric assignments?")) return;
    await deleteDoc(doc(db, 'test_series', id));
    setTestSeries(prev => prev.filter(s => s.id !== id));
  };

  const toggleCollab = async (id) => {
    const newCollabs = formData.collaborators.includes(id) ? formData.collaborators.filter(x => x !== id) : [...formData.collaborators, id];
    setFormData(prev => ({ ...prev, collaborators: newCollabs }));
    if (editingId) {
      try {
        await updateDoc(doc(db, 'test_series', editingId), { collaborators: newCollabs });
        setTestSeries(prev => prev.map(s => s.id === editingId ? { ...s, collaborators: newCollabs } : s));
      } catch (err) { console.error(err); }
    }
  };

  const toggleBatch = async (id) => {
    const newBatches = formData.assignedBatches.includes(id) ? formData.assignedBatches.filter(x => x !== id) : [...formData.assignedBatches, id];
    setFormData(prev => ({ ...prev, assignedBatches: newBatches }));
    if (editingId) {
      try {
        await updateDoc(doc(db, 'test_series', editingId), { assignedBatches: newBatches });
        setTestSeries(prev => prev.map(s => s.id === editingId ? { ...s, assignedBatches: newBatches } : s));
      } catch (err) { console.error(err); }
    }
  };

  const foundTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return [];
    return teacherList.filter(t => t.id !== currentUserId && !(formData.collaborators||[]).includes(t.id) && (t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase()))));
  }, [teacherSearch, teacherList, formData.collaborators, currentUserId]);

  const inputClass = `w-full px-5 h-14 rounded-2xl ${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner`;
  const labelClass = `block text-[10px] font-black uppercase tracking-widest ml-2 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 size={48} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-full max-w-[1500px] w-full mx-auto relative select-none pb-20 pt-8">
      <AnimatePresence mode="wait">
        
        {currentView === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
              <div>
                <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><FolderOpen size={28} className="text-indigo-500" /> Series Architect</h1>
                <p className="text-sm font-bold text-slate-500 mt-2 ml-10">Package curriculums and mandate global execution protocols.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-72 h-14 px-4 rounded-[1.5rem] flex items-center gap-3 border ${isDarkMode ? 'bg-[#0D1527] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <Search size={18} className="text-slate-500" />
                  <input type="text" placeholder="Search series..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-sm font-bold w-full ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                </div>
                <button onClick={() => handleOpenSettings()} className="px-8 h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-105 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                  <Plus size={18} /> Create Series
                </button>
              </div>
            </div>

            {testSeries.length === 0 ? (
              <div className={`py-32 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] ${isDarkMode ? 'border-slate-800/80 bg-[#0A0E17]/50' : 'border-slate-300 bg-slate-100/50'}`}>
                <FolderOpen size={64} className={`${isDarkMode ? 'text-slate-700' : 'text-slate-300'} mb-6`}/>
                <p className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>No Series Established</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {testSeries.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(series => (
                  <div key={series.id} className={`p-8 md:p-10 rounded-[2.5rem] border shadow-2xl flex flex-col justify-between group overflow-hidden relative transition-all hover:border-indigo-500/50 ${isDarkMode ? 'bg-[#0B1120]/95 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <button onClick={() => handleOpenSettings(series)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'}`}><Edit2 size={18}/></button>
                      {series.authorId === currentUserId && <button onClick={() => deleteSeries(series.id)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-rose-500 hover:bg-rose-500 hover:border-rose-500 hover:text-white' : 'bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'}`}><Trash2 size={18}/></button>}
                    </div>
                    
                    <div>
                      <span className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6 inline-block">Target: {series.targetLevel || 'Mixed'}</span>
                      <h4 className={`text-2xl font-black leading-tight mb-3 pr-12 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{series.title}</h4>
                      <p className={`text-sm font-medium line-clamp-2 min-h-[40px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{series.description || 'No description provided.'}</p>
                    </div>

                    <div className={`mt-10 pt-6 border-t flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex flex-col gap-1">
                        <p><Users size={14} className="inline mb-0.5 mr-1 text-emerald-500"/> {series.assignedBatches?.length || 0} Batches</p>
                        <p><ShieldCheck size={14} className="inline mb-0.5 mr-1 text-indigo-500"/> {series.collaborators?.length || 1} Staff</p>
                      </div>
                      {/* 🚨 NAVIGATE TO NEW MATRIX URL */}
                      <button onClick={() => navigate(`/test-series/${series.id}/matrix`)} className="px-8 h-12 rounded-[1.5rem] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-inner">
                        <Server size={16}/> Matrix ({series.tests.length})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {currentView === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-[1200px] mx-auto w-full pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800/80 pb-6">
              <div className="flex items-center gap-6">
                <button onClick={() => setCurrentView('grid')} className={`w-14 h-14 rounded-[1.5rem] border flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#0D1527] border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'}`}><ArrowLeft size={24} /></button>
                <div>
                  <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{editingId ? "Series Configuration" : "New Series Identity"}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Metadata, Access Constraints, and Batch Targeting</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-10">
              <div className={`p-8 md:p-10 rounded-[3rem] border shadow-2xl space-y-8 ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><BookOpen size={16} className="text-indigo-500"/> Core Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className={labelClass}>Series Title</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. 2026 Core Execution" />
                  </div>
                  <div>
                    <label className={labelClass}>Target Level</label>
                    <select value={formData.targetLevel} onChange={e => setFormData({...formData, targetLevel: e.target.value})} className={`${inputClass} appearance-none cursor-pointer`}>
                      <option value="Mixed">Mixed Levels</option><option value="JLPT N5">JLPT N5</option><option value="JLPT N4">JLPT N4</option><option value="JLPT N3">JLPT N3</option><option value="JLPT N2">JLPT N2</option><option value="JLPT N1">JLPT N1</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Curriculum Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} min-h-[120px] py-4 resize-y`} placeholder="Provide context to the students about what this series entails..." />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className={`p-8 md:p-10 rounded-[3rem] border shadow-2xl flex flex-col h-[500px] ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className={labelClass}><Users size={16} className="inline mr-2 text-emerald-500"/> Batch Targeting</label>
                    <span className={`px-3 py-1 rounded border text-[10px] font-black ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{formData.assignedBatches.length} Selected</span>
                  </div>
                  <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)} className={`${inputClass} pl-12 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`} placeholder="Search your batches..." />
                  </div>
                  <div className={`flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-t pt-6 ${isDarkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                    {availableBatches.filter(b => b.name.toLowerCase().includes(batchSearch.toLowerCase())).map(batch => {
                      const isSelected = formData.assignedBatches.includes(batch.id);
                      return (
                        <div key={batch.id} onClick={() => toggleBatch(batch.id)} className={`p-5 rounded-2xl flex items-center justify-between border-2 cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : (isDarkMode ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}`}>
                          <span className={`text-sm font-black ${isSelected ? 'text-emerald-500' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>{batch.name}</span>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {isSelected ? <Check size={16}/> : <Plus size={16}/>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-8 md:p-10 rounded-[3rem] border shadow-2xl flex flex-col h-[500px] ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <label className={labelClass}><ShieldCheck size={16} className="inline mr-2 text-indigo-500"/> Co-Architects</label>
                    <span className={`px-3 py-1 rounded border text-[10px] font-black ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{(formData.collaborators||[]).length} Assigned</span>
                  </div>
                  {(!editingId || currentUserId === formData.authorId) ? (
                    <>
                      <div className="flex gap-3 mb-6 relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10"/>
                        <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} onKeyDown={e => {if(e.key==='Enter') e.preventDefault()}} className={`${inputClass} pl-12 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`} placeholder="Search by name or email..." />
                      </div>
                      <div className={`flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-y py-4 mb-4 min-h-[150px] ${isDarkMode ? 'border-slate-800/80' : 'border-slate-100'}`}>
                        {teacherSearch.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <Users size={32} className="text-slate-500 mb-3" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Search Registry</p>
                          </div>
                        ) : foundTeachers.length === 0 ? (
                          <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No Sensei Found</p>
                        ) : (
                          foundTeachers.map(t => (
                            <div key={t.id} className={`p-4 rounded-2xl flex items-center justify-between border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isDarkMode ? 'bg-indigo-950 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>{t.avatar}</div>
                                <div><p className={`text-xs font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.name}</p><p className="text-[9px] font-bold text-slate-500 tracking-wider">{t.email}</p></div>
                              </div>
                              <button type="button" onClick={() => toggleCollab(t.id)} className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all"><Plus size={16}/></button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl mb-6 ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'}`}>
                      <ShieldAlert size={40} className="text-indigo-500 mb-4 opacity-50"/>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Security Lock</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 text-center max-w-[200px]">Only the Lead Architect can manage collaborators.</p>
                    </div>
                  )}
                    <div className="flex flex-wrap gap-2 pt-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-[10px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest flex items-center shadow-inner">Lead (You)</span>
                    <AnimatePresence>
                      {(formData.collaborators || []).filter(id => id !== currentUserId).map(id => {
                        const t = teacherList.find(x => x.id === id);
                        if (!t) return null;
                        return (
                          <motion.span layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} key={id} className={`border text-[10px] font-black px-4 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 shadow-md ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                            {t.name}
                            {(!editingId || currentUserId === formData.authorId) && <X size={12} className="cursor-pointer text-slate-500 hover:text-rose-500 transition-colors ml-1" onClick={() => toggleCollab(id)}/>}
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button type="submit" disabled={isSaving} className={`w-full md:w-auto md:px-20 h-16 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all ${isDarkMode ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.15)]' : 'bg-slate-900 text-white shadow-[0_0_40px_rgba(15,23,42,0.15)]'}`}>
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {editingId ? "Update Series Core" : "Initialize Series"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}