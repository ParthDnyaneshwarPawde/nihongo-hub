import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, addDoc, updateDoc,
  serverTimestamp, getDocs, deleteDoc, doc, where, getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  BookOpen, FileText, Mic2, HelpCircle, Users, ChevronRight, Plus, FolderOpen, 
  X, Loader2, Search, Filter, Sparkles, Shield, Copy, Check, DollarSign, 
  Globe, Lock, Unlock, Tag, Activity, Trash2, Zap, Layers, Image as ImageIcon,
  ListChecks, Layout, FileUp, ArrowRight, ArrowLeft, RotateCw, Pencil
} from 'lucide-react';
import BatchCommandCenter from './BatchCommandCenter';

export default function TeacherBatches({ isDarkMode = false }) {
  const [myBatches, setMyBatches] = useState([]);
  const [otherBatches, setOtherBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal & Step States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [isCurrentUserLead, setIsCurrentUserLead] = useState(true);
  const [leadTeacherName, setLeadTeacherName] = useState("");
  const [myRealName, setMyRealName] = useState("Sensei");

  // Form State
  const [newBatch, setNewBatch] = useState({
    title: '',
    level: 'JLPT N5',
    price: '0',
    isFree: true,
    description: '',
    bannerURL: '',
    timetableURL: '',
    curriculum: ''
  });

  const [keyPoints, setKeyPoints] = useState([]);
  const [pointInput, setPointInput] = useState('');
  const [couponInput, setCouponInput] = useState({ code: '', discount: '', maxUses: '' });
  const [addedCoupons, setAddedCoupons] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [foundTeachers, setFoundTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  const BATCH_LEVELS = ["JLPT N5", "JLPT N4", "JLPT N3", "JLPT N2", "JLPT N1", "Custom Course"];

  const [selectedBatch, setSelectedBatch] = useState(null);

  // --- TEACHER SEARCH LOGIC ---
  useEffect(() => {
    if (!teacherSearch.trim()) {
      setFoundTeachers([]);
      return;
    }

    const searchRegistry = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'teacher'));
        const querySnapshot = await getDocs(q);
        
        const results = [];
        const searchTerm = teacherSearch.toLowerCase().trim(); // Clean user input

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const uid = doc.id;
          
          // 1. Clean up database fields (removes trailing spaces like "Veeru ")
          const first = (data.firstName || '').trim();
          const last = (data.lastName || '').trim();
          const email = (data.email || '').toLowerCase().trim();
          const googleName = (data.displayName || '').trim();
          
          // 2. Display Name Logic: Google Name -> First + Last -> Unknown
          const constructedName = `${first} ${last}`.trim();
          const finalDisplayName = googleName || constructedName || 'Unknown Sensei';
          
          // 3. Match against anything (Name, Email, or UID)
          const matchesName = finalDisplayName.toLowerCase().includes(searchTerm);
          const matchesEmail = email.includes(searchTerm);
          const matchesUid = uid.toLowerCase().includes(searchTerm);

          const isMatch = matchesName || matchesEmail || matchesUid;
          const isNotMe = uid !== auth.currentUser?.uid;
          const isNotAlreadySelected = !selectedTeachers.some(t => t.uid === uid);

          if (isMatch && isNotMe && isNotAlreadySelected) {
            results.push({ 
              uid, 
              displayName: finalDisplayName,
              email: email || 'No email provided' 
            });
          }
        });
        
        setFoundTeachers(results);
      } catch (error) {
        console.error("Search Error:", error);
      }
    };

    const timeoutId = setTimeout(() => {
      searchRegistry();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [teacherSearch, selectedTeachers]);

  useEffect(() => {
    let unsubscribeSnap = () => {}; // Safe cleanup

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) { setLoading(false); return; }

      // 🚨 FIX: Fetch their actual name from the database if Google Name is missing
      let fetchedName = user.displayName;
      if (!fetchedName) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            // Stitches their first and last name together just like the search bar does!
            fetchedName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
          }
        } catch (err) { console.error("Name fetch error", err); }
      }
      setMyRealName(fetchedName || "Sensei"); // Save the real name to state

      // Continue fetching batches...
      const q = query(collection(db, 'batches'));
      unsubscribeSnap = onSnapshot(q, (snapshot) => {
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyBatches(all.filter(b => b.teacherIds?.includes(user.uid)));
        setOtherBatches(all.filter(b => !b.teacherIds?.includes(user.uid)));
        setLoading(false);
      }, () => setLoading(false));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnap(); 
    };
  }, []);

  const totalAssets = myBatches.reduce((acc, b) => {
    const s = b.stats || { pdfs: 0, audio: 0, mcqs: 0 };
    return acc + (s.pdfs + s.audio + s.mcqs);
  }, 0);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const openEditModal = (batch) => {
    setEditingBatchId(batch.id);
    
    // 🚨 NEW PERMISSION CHECK: Are they the original creator?
    const leadId = batch.teacherIds?.[0];
    const leadName = batch.teacherNames?.[0] || "Unknown Sensei";
    setIsCurrentUserLead(leadId === auth.currentUser?.uid);
    setLeadTeacherName(leadName);

    setNewBatch({
      title: batch.title,
      level: batch.level,
      price: batch.price,
      isFree: batch.isFree,
      description: batch.description || '',
      bannerURL: batch.bannerURL || '',
      timetableURL: batch.timetableURL || '',
      curriculum: batch.curriculum || ''
    });
    setKeyPoints(batch.keyPoints || []);
    setAddedCoupons(batch.coupons || []);
    
    if (batch.teacherIds && batch.teacherNames) {
      const existingCollabs = [];
      batch.teacherIds.forEach((id, index) => {
        // Exclude the Lead Teacher from the removable pill list
        if (id !== leadId) {
          existingCollabs.push({
            uid: id,
            displayName: batch.teacherNames[index] || "Unknown Sensei"
          });
        }
      });
      setSelectedTeachers(existingCollabs);
    } else {
      setSelectedTeachers([]);
    }
    
    setIsCreateModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const user = auth.currentUser;
    
    // 🚨 1. Smart merge: Always keep the creator (you), and add the selected collaborators
    // We use Set to prevent accidental duplicates
    const finalTeacherIds = [...new Set([user.uid, ...selectedTeachers.map(t => t.uid)])];
    // This uses the name we fetched from the 'users' collection in Step 3 earlier
// const finalTeacherNames = [...new Set([myRealName, ...selectedTeachers.map(t => t.displayName)])];

// 1. Pick the right Lead Name: If editing, keep the original. If new, use your real name.
const actualLeadName = editingBatchId ? leadTeacherName : myRealName;

// 2. Build the name list (Lead always goes first)
const finalTeacherNames = [...new Set([actualLeadName, ...selectedTeachers.map(t => t.displayName)])];

// 3. Attach to the batch data
batchData.teacherNames = finalTeacherNames;

    const batchData = {
      ...newBatch,
      price: newBatch.isFree ? 0 : parseFloat(newBatch.price),
      keyPoints,
      coupons: addedCoupons.map(c => ({ ...c, usedCount: c.usedCount || 0 })),
      // 🚨 2. We removed the "undefined" block. It now ALWAYS saves the teachers!
      teacherIds: finalTeacherIds,
      teacherNames: finalTeacherNames,
      updatedAt: serverTimestamp(),
    };

    // 🚨 FIX: Only update the collaborators array if the REAL LEAD is saving it.
    // If a co-teacher saves, this protects the original owner!
    if (!editingBatchId || isCurrentUserLead) {
      batchData.teacherIds = [...new Set([user.uid, ...selectedTeachers.map(t => t.uid)])];
      batchData.teacherNames = [...new Set([myRealName, ...selectedTeachers.map(t => t.displayName)])];
    }

    // Clean undefined for Firestore
    Object.keys(batchData).forEach(key => batchData[key] === undefined && delete batchData[key]);

    try {
      if (editingBatchId) {
        await updateDoc(doc(db, 'batches', editingBatchId), batchData);
      } else {
        await addDoc(collection(db, 'batches'), {
          ...batchData,
          stats: { pdfs: 0, audio: 0, mcqs: 0 },
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) { console.error("Save Error:", err); }
    setIsSaving(false);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setCurrentStep(1);
    setEditingBatchId(null);
    setNewBatch({ title: '', level: 'JLPT N5', price: '0', isFree: true, description: '', bannerURL: '', timetableURL: '', curriculum: '' });
    setKeyPoints([]);
    setAddedCoupons([]);
    setSelectedTeachers([]);
  };

  const filterList = (list) => list.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeFilter === 'All' ? true : activeFilter === 'Free' ? b.isFree : !b.isFree;
    return matchesSearch && matchesTab;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-indigo-500 animate-pulse text-xl">ACCESSING THE VAULT...</div>;

  return (
    <div className={`h-full overflow-y-auto premium-scroll relative font-sans transition-colors duration-500 ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* 🔮 PREMIUM BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />
      <div className={`fixed right-[-2%] bottom-[5%] text-[450px] font-black select-none pointer-events-none z-0 transition-opacity duration-1000 ${isDarkMode ? 'text-white opacity-[0.015]' : 'text-slate-900 opacity-[0.02]'}`}>
        武
      </div>

      <div className="relative z-10 p-6 lg:p-10 space-y-12 max-w-[1500px] mx-auto">
        
        {/* --- HERO SECTION --- */}
        <header className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-[0.2em] border border-indigo-500/20 flex items-center gap-2">
                <Shield size={12} /> SECURE PROTOCOL
              </span>
              <button onClick={() => { navigator.clipboard.writeText(auth.currentUser.uid); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${copied ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'}`}>
                {copied ? 'ID COPIED' : 'MY UID'}
              </button>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none">The <span className="text-indigo-600">Vault.</span></h1>
            <p className="text-slate-500 font-medium text-base max-w-xl leading-relaxed">Manage your premium course products, set limited-time coupons, and architect your student's learning journey.</p>
          </div>

          <button onClick={() => setIsCreateModalOpen(true)} className="group bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 px-10 rounded-[2rem] shadow-2xl shadow-indigo-600/30 flex items-center gap-4 transition-all active:scale-95">
            <Plus size={24}/>
            CREATE BATCH
          </button>
        </header>

        {/* --- METRICS --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricCard label="Active Batches" val={myBatches.length} icon={<Layers size={24}/>} color="indigo" isDark={isDarkMode} />
          <MetricCard label="Global Registry" val={otherBatches.length} icon={<Globe size={24}/>} color="rose" isDark={isDarkMode} />
          <MetricCard label="Total Materials" val={totalAssets} icon={<FileText size={24}/>} color="emerald" isDark={isDarkMode} />
        </section>

        {/* --- COMMAND BAR --- */}
        <section className={`p-4 rounded-[2.5rem] border flex flex-col md:flex-row gap-4 items-center backdrop-blur-xl sticky top-4 z-40 shadow-2xl transition-all ${isDarkMode ? 'bg-[#0F172A]/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-950/20 rounded-2xl border border-slate-700/40 flex-1 w-full transition-all focus-within:border-indigo-500">
            <Search size={18} className="text-slate-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search courses or Sensei..." className="bg-transparent outline-none text-sm font-bold w-full" />
          </div>
          <div className="flex items-center gap-2 pr-2">
            <button onClick={handleManualRefresh} className={`p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <RotateCw size={18} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
            </button>
            <div className="h-8 w-px bg-slate-800 mx-2" />
            <div className="flex gap-1 p-1 bg-slate-950/30 rounded-xl">
              {['All', 'Premium', 'Free'].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{f}</button>
              ))}
            </div>
          </div>
        </section>

        {/* --- GRID --- */}
        {/* --- COURSE GRIDS (Wider 2-Column Layout) --- */}
        <section className="space-y-16 pb-24">
          <div>
            <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
               <Unlock size={14} /> My Managed Courses
               <div className="h-px flex-1 bg-indigo-500/20" />
            </h2>
            {/* 🚨 GRID CHANGED: lg:grid-cols-2 instead of xl:grid-cols-3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {filterList(myBatches).map(b => (
                <BatchCard 
                  key={b.id} 
                  batch={b} 
                  onClick={() => setSelectedBatch(b)}
                  isDark={isDarkMode} 
                  canAccess={true} 
                  isLead={b.teacherIds?.[0] === auth.currentUser?.uid}
                  onEdit={() => openEditModal(b)} 
                  onDelete={(e) => {
                    e.stopPropagation();
                    if(window.confirm(`⚠️ Permanently remove ${b.title}?`)) deleteDoc(doc(db, 'batches', b.id));
                  }} 
                />
              ))}
            </div>
            {myBatches.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-slate-800/50 rounded-[4rem] text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">
                Vault Empty. Generate your first course.
              </div>
            )}
          </div>

          <div className="opacity-40 hover:opacity-100 transition-all duration-700 grayscale brightness-75">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
               <Lock size={14} /> Academy Database
               <div className="h-px flex-1 bg-slate-800/30" />
            </h2>
            {/* 🚨 GRID CHANGED: lg:grid-cols-2 instead of xl:grid-cols-3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {filterList(otherBatches).map(b => (
                <BatchCard key={b.id} batch={b} isDark={isDarkMode} canAccess={false} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ================= 2-STEP ARCHITECT MODAL ================= */}
      {isCreateModalOpen && (
  <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-start justify-center p-4 lg:p-10 pt-12 lg:pt-24 overflow-y-auto premium-scroll">          <div className={`w-full max-w-6xl rounded-[4rem] border shadow-[0_0_80px_rgba(79,70,229,0.2)] relative overflow-hidden flex flex-col transition-all duration-700 ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
            
            {/* Modal Character */}
            <div className="absolute -right-10 -top-10 text-[300px] font-black text-white/[0.02] select-none pointer-events-none">創</div>

            <div className="p-10 lg:p-14 border-b border-white/5 flex justify-between items-center relative z-10">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic">{editingBatchId ? 'Edit Product' : 'Course Architect'}</h2>
                <div className="flex items-center gap-4">
                  <StepBubble active={currentStep === 1} done={currentStep > 1} step={1} label="Sales Logic" />
                  <div className="w-16 h-px bg-slate-800" />
                  <StepBubble active={currentStep === 2} step={2} label="Visual Design" />
                </div>
              </div>
              <button onClick={closeModal} className="p-5 bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X /></button>
            </div>

            <form onSubmit={handleSaveBatch} className="flex-1 p-10 lg:p-14 relative z-10">
              {currentStep === 1 ? (
                /* STEP 1: LOGIC */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in slide-in-from-right-8 duration-500">
                  <div className="space-y-8">
                    <div className="space-y-3">
  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
    Product Title {editingBatchId && <span className="text-rose-500 ml-2">(LOCKED)</span>}
  </label>
  <input 
    required 
    value={newBatch.title} 
    onChange={e => setNewBatch({...newBatch, title: e.target.value})} 
    disabled={!!editingBatchId} // 🚨 THIS DISABLES IT DURING EDITING
    className={`w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white font-bold text-lg transition-all outline-none ${
      editingBatchId 
        ? 'opacity-50 cursor-not-allowed' // Visual feedback that it's locked
        : 'focus:border-indigo-500' 
    }`} 
    placeholder="Ex: Master N3 Vocabulary" 
  />
</div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Tier</label>
                        <select value={newBatch.level} onChange={e => setNewBatch({...newBatch, level: e.target.value})} className="w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white font-bold text-lg outline-none cursor-pointer">
                          {BATCH_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Model</label>
                        <button type="button" onClick={() => setNewBatch({...newBatch, isFree: !newBatch.isFree})} className={`w-full py-6 rounded-[2rem] font-black text-xs transition-all shadow-xl ${newBatch.isFree ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
                          {newBatch.isFree ? 'FREE ACCESS' : 'PREMIUM'}
                        </button>
                      </div>
                    </div>

                    {!newBatch.isFree && (
                      <div className="p-10 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10 space-y-8 shadow-inner animate-in zoom-in-95">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Listing Price (₹)</label>
                           <input type="number" value={newBatch.price} onChange={e => setNewBatch({...newBatch, price: e.target.value})} className="w-full p-6 rounded-3xl bg-slate-950 border border-slate-800 text-white font-black text-2xl shadow-inner outline-none" />
                        </div>
                        
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Limited Coupons</label>
                           <div className="grid grid-cols-3 gap-3">
                             <input placeholder="CODE" value={couponInput.code} onChange={e => setCouponInput({...couponInput, code: e.target.value.toUpperCase()})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
                             <input placeholder="-%" type="number" value={couponInput.discount} onChange={e => setCouponInput({...couponInput, discount: e.target.value})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
                             <input placeholder="MAX" type="number" value={couponInput.maxUses} onChange={e => setCouponInput({...couponInput, maxUses: e.target.value})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
                           </div>
                           <button type="button" onClick={() => { if(couponInput.code && couponInput.maxUses) { setAddedCoupons([...addedCoupons, couponInput]); setCouponInput({code:'', discount:'', maxUses:''}); }}} className="w-full py-4 bg-indigo-600/20 text-indigo-400 rounded-2xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 uppercase tracking-widest">Register Coupon</button>
                           <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto premium-scroll">
                              {addedCoupons.map((c, i) => <div key={i} className="bg-indigo-600 text-white text-[9px] px-4 py-2 rounded-xl flex items-center gap-3 font-black">{c.code} (-{c.discount}%) • Qty: {c.maxUses} <X size={12} className="cursor-pointer hover:rotate-90 transition-all" onClick={() => setAddedCoupons(addedCoupons.filter((_, idx) => idx !== i))} /></div>)}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8 flex flex-col">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Collaborators</label>
                    <div className="flex-1 bg-slate-950/50 p-10 rounded-[3rem] border border-slate-800 shadow-inner flex flex-col space-y-6">
                    {/* 🚨 STEP 5 FIX: ONLY SHOW SEARCH BAR TO THE LEAD TEACHER */}
                      {isCurrentUserLead && (
                        <>
   <div className="flex gap-2">
      <input 
        value={teacherSearch} 
        onChange={e => setTeacherSearch(e.target.value)} 
        className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all" 
        placeholder="Search Sensei Name or UID..." 
      />
      <button type="button" className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg hover:scale-105 transition-all">
        <Search size={20}/>
      </button>
   </div>
   
   {/* --- SEARCH RESULTS --- */}
   <div className="flex-1 overflow-y-auto premium-scroll pr-2 space-y-2">
      {teacherSearch.length === 0 ? (
        <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-slate-600">Type to search registry</p>
      ) : foundTeachers.length === 0 ? (
        <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No matching Sensei found</p>
      ) : (
        foundTeachers.map(t => (
          <div key={t.uid} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <div>
              <p className="text-xs font-black text-white">{t.displayName}</p>
              {/* Now shows their email instead of just the UID for easier identification */}
              <p className="text-[9px] font-bold text-slate-500 tracking-wider">{t.email}</p> 
            </div>
            <button 
              type="button" 
              onClick={() => {
                setSelectedTeachers([...selectedTeachers, t]);
                setTeacherSearch(''); 
              }} 
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
        ))
      )}
   </div></>
   )}
   
   {/* --- SELECTED COLLABORATORS --- */}
   <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-3">
     <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
       <Shield size={12}/> Verified Lead ({isCurrentUserLead ? "You" : leadTeacherName})
     </span>
     {selectedTeachers.map(t => (
       <span key={t.uid} className="bg-slate-800 text-white border border-slate-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
         {t.uid === auth.currentUser?.uid ? "You" : t.displayName}
         {isCurrentUserLead && (
           <X size={12} className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setSelectedTeachers(selectedTeachers.filter(st => st.uid !== t.uid))} />
         )}
       </span>
     ))}
   </div>
</div>
                    <button type="button" onClick={() => setCurrentStep(2)} className="w-full py-8 bg-white text-black font-black rounded-[2.5rem] flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-2xl uppercase tracking-[0.2em] text-sm">
                      Next: Design Interface <ArrowRight size={20}/>
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: MARKETING */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in slide-in-from-left-8 duration-500">
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><ImageIcon size={14}/> Course Banner Image (URL)</label>
                         <input value={newBatch.bannerURL} onChange={e => setNewBatch({...newBatch, bannerURL: e.target.value})} className="w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white text-sm outline-none focus:border-indigo-500 shadow-inner" placeholder="Direct Link (Unsplash/Imgur)" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><Layout size={14}/> Master Description</label>
                         <textarea required rows="8" value={newBatch.description} onChange={e => setNewBatch({...newBatch, description: e.target.value})} className="w-full p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white text-sm leading-loose outline-none focus:border-indigo-500 shadow-inner" placeholder="What makes this batch special?"></textarea>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2 flex items-center gap-2"><ListChecks size={14}/> Selling Points</label>
                         <div className="flex gap-2">
                           <input value={pointInput} onChange={e => setPointInput(e.target.value)} className="flex-1 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm" placeholder="Ex: Live Speaking Drills" />
                           <button type="button" onClick={() => { if(pointInput){ setKeyPoints([...keyPoints, pointInput]); setPointInput(''); }}} className="bg-white text-black p-5 rounded-2xl"><Plus size={20}/></button>
                         </div>
                         <div className="space-y-2 max-h-40 overflow-y-auto premium-scroll">
                            {keyPoints.map((p, i) => <div key={i} className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-xs text-white font-bold animate-in fade-in"><span>{p}</span><X size={14} className="cursor-pointer text-rose-500" onClick={() => setKeyPoints(keyPoints.filter((_, idx) => idx !== i))}/></div>)}
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-2">Curriculum Flow (Optional)</label>
                         <textarea rows="4" value={newBatch.curriculum} onChange={e => setNewBatch({...newBatch, curriculum: e.target.value})} className="w-full p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 text-white text-sm leading-relaxed" placeholder="Week 1: Foundations..."></textarea>
                      </div>

                      <div className="flex gap-4 pt-6">
                         <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 py-7 border-2 border-slate-800 text-slate-500 font-black rounded-[2.5rem] flex items-center justify-center gap-3 uppercase tracking-widest">
                           <ArrowLeft size={18} /> Back
                         </button>
                         <button type="submit" disabled={isSaving} className="flex-[2] py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-indigo-600/40 text-lg tracking-widest uppercase">
                           {isSaving ? <Loader2 className="animate-spin mx-auto"/> : editingBatchId ? "Save Updates" : "Deploy Batch"}
                         </button>
                      </div>
                   </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* --- THE BATCH COMMAND CENTER OVERLAY --- */}
      {selectedBatch && (
        <BatchCommandCenter 
          batch={myBatches.find(b => b.id === selectedBatch.id) || selectedBatch} 
          isDarkMode={isDarkMode} 
          onClose={() => setSelectedBatch(null)} // This lets the back button work!
        />
      )}
    </div>
  );
}

/* --- REUSABLE SUB-COMPONENTS --- */

function StepBubble({ step, active, done, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black border transition-all duration-500 ${done ? 'bg-emerald-500 border-emerald-500 text-white scale-90' : active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'border-slate-800 text-slate-600'}`}>
        {done ? <Check size={18}/> : step}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}

function MetricCard({ label, val, icon, color, isDark }) {
  const colors = { indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20', emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  return (
    <div className={`p-10 rounded-[3rem] border flex items-center justify-between transition-all hover:-translate-y-2 hover:shadow-2xl ${isDark ? 'bg-[#0B1120] border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">{label}</p>
        <p className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{val}</p>
      </div>
      <div className={`p-6 rounded-[1.5rem] border shadow-2xl ${colors[color]}`}>{icon}</div>
    </div>
  );
}

function BatchCard({ batch, isDark, canAccess, onDelete, onEdit, onClick, isLead }) {

  const names = batch.teacherNames || ["Unknown Sensei"];
  const ids = batch.teacherIds || [];
  const myUid = auth.currentUser?.uid;

  // If the Lead ID is mine, show "You". Otherwise show their name.
  const leadSensei = ids[0] === myUid ? "You" : names[0];

  // Map through collaborators: if one is me, swap name for "You"
  const collabs = names.slice(1).map((name, index) => 
    ids[index + 1] === myUid ? "You" : name
  );
  const stats = batch.stats || { pdfs: 0, audio: 0, mcqs: 0 };
  const accent = batch.isFree ? "emerald" : "indigo";

  // 🚨 NEW HIERARCHY LOGIC: Separates Lead from Collabs
  // const names = batch.teacherNames || ["Unknown Sensei"];
  // const leadSensei = names[0]; // The first person is the Owner/Lead
  // const collabs = names.slice(1); // Everyone else is a collaborator

  let collabText = "";
  if (collabs.length > 0) {
    const visibleCollabs = collabs.slice(0, 2);
    const extraCount = collabs.length - 2;
    collabText = visibleCollabs.join(', ') + (extraCount > 0 ? ` & +${extraCount}` : '');
  }

  return (
    <div 
      onClick={onClick} 
      className={`group relative p-1 rounded-[3.8rem] transition-all duration-700 cursor-pointer ${canAccess ? 'hover:-translate-y-3' : 'opacity-60'} ${isDark ? 'bg-slate-800 shadow-2xl' : 'bg-slate-200 shadow-xl'} ${batch.isFree ? 'hover:bg-emerald-500' : 'hover:bg-indigo-500'}`}
    >
      
      {canAccess && (
        <div className="absolute -top-3 -right-3 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
           {/* (Edit and Delete buttons stay the same) */}
           <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0A0F1C] hover:scale-110"><Pencil size={18} /></button>
           {/* 🚨 HIDE THE TRASH CAN IF THEY ARE NOT THE LEAD */}
           {isLead && (
             <button onClick={onDelete} className="w-12 h-12 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0A0F1C] hover:scale-110"><Trash2 size={18} /></button>
           )}
        </div>
      )}

      <div className={`relative h-full w-full rounded-[3.6rem] p-10 flex flex-col justify-between overflow-hidden ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        <div className="absolute -right-6 -bottom-6 text-9xl font-black opacity-[0.02] select-none group-hover:scale-110 transition-transform duration-1000">資</div>
        
        <div className="flex justify-between items-start mb-10 relative z-10">
          <div className={`px-5 py-2 rounded-xl border text-[9px] font-black tracking-widest uppercase ${batch.isFree ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>{batch.level}</div>
          {!batch.isFree && <div className="text-right">
             <span className="text-amber-500 font-black text-lg block">₹{batch.price}</span>
             {batch.coupons?.length > 0 && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{batch.coupons.length} CODES</span>}
          </div>}
        </div>

        <div className="mb-10 relative z-10">
          <h3 className={`text-3xl font-black leading-tight tracking-tight mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{batch.title}</h3>
          
          {/* 🚨 NEW STACKED TEAM UI */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-900/50 text-slate-500 border border-slate-800' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
               <Users size={18} />
            </div>
            <div className="flex flex-col justify-center py-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Lead: {leadSensei}
              </span>
              {collabs.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                  Collabs: {collabText}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/50 pt-8 mt-auto relative z-10">
          <div className="flex gap-6">
             <Stat icon={<FileText size={16}/>} count={stats.pdfs} color="text-blue-500" bg="bg-blue-500/10" />
             <Stat icon={<Mic2 size={16}/>} count={stats.audio} color="text-emerald-500" bg="bg-emerald-500/10" />
             <Stat icon={<HelpCircle size={16}/>} count={stats.mcqs} color="text-rose-500" bg="bg-rose-500/10" />
          </div>
          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${canAccess ? `bg-${accent}-600 text-white shadow-xl` : 'bg-slate-900 text-slate-700'}`}>
            {canAccess ? <ChevronRight size={24} /> : <Lock size={20}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, count, color, bg }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`p-2.5 rounded-xl ${bg} ${color} shadow-inner`}>{icon}</div>
      <span className="text-sm font-black text-slate-500">{count}</span>
    </div>
  );
}