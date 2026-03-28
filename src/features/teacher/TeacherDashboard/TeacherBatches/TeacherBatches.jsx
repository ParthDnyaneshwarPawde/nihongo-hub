import React, { useState } from 'react';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, 
  getDocs, deleteDoc, doc, where, getDoc,
  serverTimestamp // 🚨 ADD THIS ONE
} from 'firebase/firestore';
import { 
  FileText, Globe, Layers, Plus, Search, RotateCw, X, Shield, Lock, Unlock 
} from 'lucide-react';
import { auth, db } from '@services/firebase';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// Hooks
import { useTeacherBatches } from '@features/teacher/TeacherDashboard/TeacherBatches/hooks/useTeacherBatches';
import { useTeacherSearch } from '@features/teacher/TeacherDashboard/TeacherBatches/hooks/useTeacherSearch';

// Services
import { batchService } from '@features/teacher/TeacherDashboard/TeacherBatches/services/batchService';

// Extract Feature Components
import BatchCard from '@features/teacher/TeacherDashboard/TeacherBatches/components/BatchCard';
import StepOne from '@features/teacher/TeacherDashboard/TeacherBatches/components/BatchModal/StepOne';
import StepTwo from '@features/teacher/TeacherDashboard/TeacherBatches/components/BatchModal/StepTwo';
import InviteSection from '@features/teacher/TeacherDashboard/TeacherBatches/components/InviteSection';
import BackgroundCanvas from '@features/teacher/TeacherDashboard/TeacherBatches/components/BackgroundCanvas';

// Shared Components
import MetricCard from '@components/shared/MetricCard';
import StepBubble from '@components/shared/StepBubble';

// Other screens
import BatchCommandCenter from '@features/teacher/TeacherDashboard/TeacherBatches/BatchCommandCenter';

export default function TeacherBatches({ isDarkMode = false }) {
  const { myBatches, otherBatches, pendingInvites, loading, myRealName, pendingSentInvites } = useTeacherBatches();

const handleAcceptInvite = async (invite) => {
  console.log("📩 Accepting Invite Object:", invite); // 🚨 CHECK THIS IN CONSOLE
  
  if (!invite.batchId) {
    alert("This is an old, broken invite. Please delete it and send a new one.");
    return;
  }

  try {
    await batchService.acceptCollabRequest(
      invite.id, 
      invite.batchId, 
      auth.currentUser?.uid, 
      myRealName || "Sensei"
    );
    alert("Collaboration Started! 🤝");
  } catch (err) {
    console.error("🔥 Accept Error:", err);
  }
};

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

  // Form State
  const [newBatch, setNewBatch] = useState({
    title: '', level: 'JLPT N5', price: '0', isFree: true,
    description: '', bannerURL: '', timetableURL: '', curriculum: ''
  });

  const [keyPoints, setKeyPoints] = useState([]);
  const [pointInput, setPointInput] = useState('');
  const [couponInput, setCouponInput] = useState({ code: '', discount: '', maxUses: '' });
  const [addedCoupons, setAddedCoupons] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState(null);

  // Use the search hook
  const { teacherSearch, setTeacherSearch, foundTeachers } = useTeacherSearch(selectedTeachers);

  const totalAssets = React.useMemo(() => {
  return myBatches.reduce((acc, b) => {
    const s = b.stats || { pdfs: 0, audio: 0, mcqs: 0 };
    return acc + (s.pdfs + s.audio + s.mcqs);
  }, 0);
}, [myBatches]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Inside TeacherBatches.jsx

const handleRemoveCollaborator = async (teacher) => {
  try {
    // 1. Remove from the Cloud (Firestore)
    await batchService.removeCollaborator(
      editingBatchId, 
      teacher.uid, 
      teacher.displayName
    );

    // 2. Remove from the UI (State)
    setSelectedTeachers(prev => prev.filter(t => t.uid !== teacher.uid));
    
    alert("Collaborator removed successfully!");
  } catch (err) {
    console.error("Removal failed:", err);
    alert("Could not remove teacher. Check your internet or permissions.");
  }
};

const handleCancelInvite = async (inviteId) => {
  try {
    // Just delete the collabRequest document
    await batchService.rejectCollabRequest(inviteId); 
    // The hook 'useTeacherBatches' will automatically update the UI
  } catch (err) {
    console.error(err);
  }
};

  const openEditModal = (batch) => {
    setEditingBatchId(batch.id);
    
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
        if (id !== leadId) {
          existingCollabs.push({
            uid: id,
            displayName: batch.teacherNames[index] || "Unknown Sensei",
            isExisting: true
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
  
  try {
    if (!user) throw new Error("No user logged in.");

    const batchData = {
      ...newBatch,
      keyPoints,
      coupons: addedCoupons,
      price: newBatch.isFree ? 0 : parseFloat(newBatch.price || 0),
      updatedAt: serverTimestamp(),
    };

    let finalBatchId = editingBatchId;

    if (editingBatchId) {
      await updateDoc(doc(db, 'batches', editingBatchId), batchData);
    } else {
      const docRef = await addDoc(collection(db, 'batches'), {
        ...batchData,
        teacherIds: [user.uid],
        teacherNames: [myRealName || "Sensei"],
        stats: { pdfs: 0, audio: 0, mcqs: 0 },
        createdAt: serverTimestamp(),
      });
      finalBatchId = docRef.id;
    }

    // --- COLLAB LOGIC ---
    const newInvites = selectedTeachers.filter(t => !t.isExisting);
    let sentCount = 0;

    for (const teacher of newInvites) {
       const res = await batchService.sendCollabRequest(finalBatchId, teacher, myRealName);
       if (res?.success) sentCount++;
    }

    closeModal();

    // Custom feedback message
    if (sentCount > 0) {
      alert(`Vault Updated! 🚀 Sent ${sentCount} collaboration invite(s).`);
    } else {
      alert("Vault Updated Successfully! 🚀");
    }

  } catch (err) {
    console.error("❌ Save Error:", err);
    alert(`System Error: ${err.message}`);
  } finally {
    setIsSaving(false);
  }
};
  const closeModal = () => {
    setIsCreateModalOpen(false);
    setCurrentStep(1);
    setEditingBatchId(null);
    setNewBatch({ title: '', level: 'JLPT N5', price: '0', isFree: true, description: '', bannerURL: '', timetableURL: '', curriculum: '' });
    setKeyPoints([]);
    setAddedCoupons([]);
    setSelectedTeachers([]);
    setTeacherSearch('');
  };

  const handleDelete = async (e, batch) => {
    e.stopPropagation();
    if(window.confirm(`⚠️ Permanently remove ${batch.title}?`)) {
      await batchService.deleteBatch(batch.id);
    }
  };

  const filterList = (list) => list.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeFilter === 'All' ? true : activeFilter === 'Free' ? b.isFree : !b.isFree;
    return matchesSearch && matchesTab;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-indigo-500 animate-pulse text-xl">ACCESSING THE VAULT...</div>;

  return (
    <LayoutGroup>
      <div className={`h-full overflow-y-auto premium-scroll relative font-sans transition-colors duration-500 ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* 🔮 PREMIUM WEBGL KANJI ENVIRONMENT */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />
      <BackgroundCanvas isDarkMode={isDarkMode} />

      <div className="relative z-10 p-6 lg:p-10 space-y-12 max-w-[1500px] mx-auto">

        <InviteSection 
        invites={pendingInvites} 
        onAccept={batchService.acceptCollabRequest}
        onReject={batchService.rejectCollabRequest}
        isDark={isDarkMode}
      />
        
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

          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95, filter: 'brightness(1.2)' }}
            onClick={() => setIsCreateModalOpen(true)} className="group bg-indigo-600 outline-none hover:bg-indigo-500 text-white font-black py-5 px-10 rounded-[2rem] shadow-2xl shadow-indigo-600/30 flex items-center gap-4 transition-colors"
          >
            <Plus size={24}/>
            CREATE BATCH
          </motion.button>
        </header>

        {/* --- PENDING REQUESTS --- */}
        {pendingInvites && pendingInvites.length > 0 && (
          <section className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-inner animate-in fade-in slide-in-from-top-4">
            <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500 mb-6 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              Pending Invitations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingInvites.map(invite => (
                <div key={invite.id} className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div>
                    <h3 className="font-black text-lg mb-1">{invite.batchTitle}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">From Lead: {invite.leadTeacherName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={(e) => { e.preventDefault(); batchService.rejectCollabRequest(invite.id); }} className="flex-1 py-3 text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Decline</button>
                    <button type="button" onClick={(e) => { e.preventDefault(); handleAcceptInvite(invite); }} className="flex-[2] py-3 text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-indigo-500/50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Accept Offer</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  key={f} onClick={() => setActiveFilter(f)} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-colors outline-none ${activeFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{f}</motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* --- GRID --- */}
        <section className="pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
                show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { staggerChildren: 0.1, type: "spring", bounce: 0.4 } },
                exit: { opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.2 } }
              }}
              className="space-y-16"
            >
              <div>
                <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                   <Unlock size={14} /> My Managed Courses
                   <div className="h-px flex-1 bg-indigo-500/20" />
                </h2>
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
                      onDelete={(e) => handleDelete(e, b)} 
                    />
                  ))}
                </div>
                {myBatches.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-slate-800/50 rounded-[4rem] text-slate-500 font-bold uppercase tracking-[0.2em] text-sm">
                    Vault Empty. Generate your first course.
                  </div>
                )}
              </div>

              <div className="opacity-40 hover:opacity-100 transition-opacity duration-700 grayscale brightness-75">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 flex items-center gap-4">
                   <Lock size={14} /> Academy Database
                   <div className="h-px flex-1 bg-slate-800/30" />
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {filterList(otherBatches).map(b => (
                    <BatchCard key={b.id} batch={b} isDark={isDarkMode} canAccess={false} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* ================= 2-STEP ARCHITECT MODAL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-start justify-center p-4 lg:p-10 pt-12 lg:pt-24 overflow-y-auto premium-scroll">          
          <div className={`w-full max-w-6xl rounded-[4rem] border shadow-[0_0_80px_rgba(79,70,229,0.2)] relative overflow-hidden flex flex-col transition-all duration-700 ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
            
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
                <StepOne 
                  newBatch={newBatch} setNewBatch={setNewBatch} editingBatchId={editingBatchId}
                  couponInput={couponInput} setCouponInput={setCouponInput} 
                  addedCoupons={addedCoupons} setAddedCoupons={setAddedCoupons}
                  isCurrentUserLead={isCurrentUserLead} leadTeacherName={leadTeacherName}
                  teacherSearch={teacherSearch} setTeacherSearch={setTeacherSearch} 
                  foundTeachers={foundTeachers} selectedTeachers={selectedTeachers} 
                  setSelectedTeachers={setSelectedTeachers} onNext={() => setCurrentStep(2)}
                  pendingSentInvites={pendingSentInvites}
                  onRemoveCollaborator={handleRemoveCollaborator}
                  onCancelInvite={handleCancelInvite}
                />
              ) : (
                <StepTwo 
                  newBatch={newBatch} setNewBatch={setNewBatch} 
                  pointInput={pointInput} setPointInput={setPointInput}
                  keyPoints={keyPoints} setKeyPoints={setKeyPoints} 
                  isSaving={isSaving} editingBatchId={editingBatchId} 
                  onBack={() => setCurrentStep(1)}
                />
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
          onClose={() => setSelectedBatch(null)}
        />
      )}
    </div>
    </LayoutGroup>
  );
}