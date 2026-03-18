import React, { useState, useEffect } from 'react';
import SecureViewer from './SecureViewer';
import { 
  Search, X, FileText, Download, Database, FileArchive, PlayCircle,
  RefreshCw, Eye, ShieldAlert, Info, Activity, Zap, 
  ArrowRight, Layers, CheckCircle2, User, Clock, Lock
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ResourceVault({ isDarkMode, selectedCourseTitle, enrolledCourseTitles = [], currentUser }) {
  const navigate = useNavigate();
  // Add this with your other states (searchQuery, activeFilter, etc.)
const [viewingPdf, setViewingPdf] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const isEnrolled = enrolledCourseTitles.includes(selectedCourseTitle);

  useEffect(() => {
    if (!selectedCourseTitle || !isEnrolled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'batches'),
      where('title', '==', selectedCourseTitle),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setActiveBatch({ id: doc.id, ...doc.data() });
      } else {
        setActiveBatch(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Vault Access Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedCourseTitle, isEnrolled]);

  // --- Logic Prep ---
  const rawAssets = activeBatch?.resources || [];
  const isVaultLocked = activeBatch?.isVaultLocked || false;
  const leadTeacher = activeBatch?.teacherNames?.[0] || "Sensei Admin";

  const filteredAssets = rawAssets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || asset.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <RefreshCw className="animate-spin text-indigo-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Establishing Secure Uplink...</p>
      </div>
    );
  }

  // --- 🚨 1. ENROLLMENT BOUNCER ---
  if (!isEnrolled) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
        <div className={`relative p-12 lg:p-20 text-center rounded-[4rem] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-rose-500/10 blur-[120px] rounded-full" />
          <div className="relative z-10 space-y-10">
            <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-rose-500/20 shadow-2xl">
               <ShieldAlert size={40} className="text-rose-500" />
            </div>
            <div className="space-y-4">
              <h2 className={`text-4xl lg:text-6xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Access <span className="text-rose-500">Locked.</span></h2>
              <p className={`text-sm font-bold uppercase tracking-[0.2em] leading-relaxed max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>To unlock the resources for <span className="text-indigo-500 font-black">{selectedCourseTitle}</span>, you must initialize enrollment in the catalog.</p>
            </div>
            <button onClick={() => navigate('/course-catalog?filter=free')} className="px-12 py-6 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-[2rem] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 mx-auto active:scale-95">Go to Course Catalog <ArrowRight size={20} /></button>
          </div>
        </div>
      </div>
    );
  }

  // --- 🚧 2. PRIVATE / MAINTENANCE MODE ---
  if (isVaultLocked) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700">
        <div className={`relative p-12 lg:p-20 text-center rounded-[4rem] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full" />
          <div className="relative z-10 space-y-10">
            <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-amber-500/20 shadow-2xl animate-pulse">
               <Lock size={40} className="text-amber-500" />
            </div>
            <div className="space-y-4">
              <h2 className={`text-4xl lg:text-6xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Vault <span className="text-amber-500">Restricted.</span></h2>
              <p className={`text-sm font-bold uppercase tracking-[0.2em] leading-relaxed max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sensei <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-black`}>{leadTeacher}</span> is currently organizing the archives. These resources will be visible shortly.</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border ${isDarkMode ? 'bg-slate-900 border-white/10 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
               <Activity size={14} className="animate-spin text-amber-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Protocol: Update in Progress</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 pb-32 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* 🚀 ELITE HEADER */}
      <div className={`relative p-10 lg:p-14 rounded-[3.5rem] border overflow-hidden shadow-2xl transition-all ${isDarkMode ? 'bg-[#0B1120] border-white/5 shadow-black/50' : 'bg-white border-slate-200'}`}>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-600/5 via-transparent to-rose-600/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex-1">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-inner mb-6 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
              <User size={14} className="text-indigo-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Instructor: {leadTeacher}</span>
            </div>
            <h1 className={`text-5xl lg:text-7xl font-black tracking-tighter leading-none mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {selectedCourseTitle} <span className="text-indigo-600">Vault.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Mastery Resources & Digital Archives</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
            <VaultMetric label="Assets" val={rawAssets.length} icon={<Layers size={16}/>} color="indigo" isDark={isDarkMode} />
            <VaultMetric label="Security" val="Verified" icon={<CheckCircle2 size={16}/>} color="emerald" isDark={isDarkMode} />
          </div>
        </div>
      </div>

      {/* 🛠️ NAVIGATION DOCK */}
      <div className="flex flex-col xl:flex-row items-center gap-4 sticky top-4 z-40">
        <div className={`p-2 rounded-[2.5rem] border backdrop-blur-xl shadow-2xl flex items-center gap-2 overflow-x-auto hide-scrollbar w-full xl:w-auto ${isDarkMode ? 'bg-slate-950/80 border-white/5' : 'bg-white/90 border-slate-200'}`}>
          {['ALL', 'CHEAT_SHEETS', 'AUDIO_PACKS', 'FLASHCARDS', 'MOCK_TESTS'].map((id) => (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${activeFilter === id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105' 
                  : isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              {id.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className={`relative flex-1 w-full xl:w-80 group`}>
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Search this Vault..." 
            className={`w-full pl-16 pr-8 py-5 rounded-[2.5rem] border font-black text-[11px] uppercase tracking-widest outline-none transition-all shadow-xl ${isDarkMode ? 'bg-slate-950 border-white/5 text-white focus:border-indigo-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-400'}`} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {filteredAssets.map((asset) => {
    const isPDF = asset.type === 'PDF';

    return (
      <div key={asset.id} className={`group relative flex flex-col p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
        
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-110 
            ${asset.type === 'AUDIO' ? 'bg-emerald-500/10 text-emerald-500' : isPDF ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
            {asset.type === 'AUDIO' ? <PlayCircle size={28}/> : isPDF ? <FileText size={28}/> : <FileArchive size={28}/>}
          </div>
          
          {/* Badge shows "View Only" for PDFs to signal protection */}
          <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isPDF ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : isDarkMode ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
             {isPDF ? <span className="flex items-center gap-1.5"><Lock size={12}/> Protected</span> : asset.size}
          </div>
        </div>

        <div className="relative z-10 flex-1 mb-10">
           <h3 className={`text-2xl font-black leading-tight tracking-tighter transition-colors group-hover:text-indigo-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
             {asset.title}
           </h3>
           <p className="text-xs font-bold text-slate-500 mt-3 italic line-clamp-2">"{asset.desc}"</p>
        </div>

        {/* 🚨 SECURE ACTION LOGIC 🚨 */}
        <div className="grid grid-cols-5 gap-2 relative z-10">
          {isPDF ? (
            /* PDF ONLY: No download link, only the Viewer trigger */
            <button 
              onClick={() => setViewingPdf(asset)} 
              className="col-span-5 py-5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Eye size={18} /> Open Secure Reader
            </button>
          ) : (
            /* OTHER FILES: Eye icon previews, Hard Copy downloads */
            <>
              <button 
                onClick={() => window.open(asset.fileUrl, '_blank')}
                className={`col-span-1 py-4 rounded-2xl flex items-center justify-center border transition-all ${isDarkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900'}`}
              >
                <Eye size={18} />
              </button>
              <a 
                href={asset.fileUrl} download
                className="col-span-4 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:opacity-90 shadow-xl transition-all"
              >
                <Download size={16} /> Hard Copy
              </a>
            </>
          )}
        </div>
        
        {/* Background Letter Watermark */}
        <div className={`absolute -bottom-6 -right-4 text-9xl font-black opacity-[0.03] select-none pointer-events-none ${isDarkMode ? 'text-white' : 'text-black'}`}>{asset.type.charAt(0)}</div>
      </div>
    );
  })}
</div>

{/* 🚨 MODAL PLACEMENT (Place this just before the very last </div>) 🚨 */}
{viewingPdf && (
  <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-300 flex flex-col">
    <SecureViewer 
      fileUrl={viewingPdf.fileUrl} 
      isDarkMode={isDarkMode} 
      userEmail={currentUser?.email || "Protected Student"}
      onClose={() => setViewingPdf(null)} // 👈 THIS IS THE LINE THAT CLOSES THE VIEWER
    />
  </div>
)}
    </div>
  );
}

function VaultMetric({ label, val, icon, color, isDark }) {
  const themes = {
    indigo: 'bg-indigo-600/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5',
    emerald: 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
  };
  return (
    <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 ${isDark ? 'bg-slate-900/50 border-white/5 shadow-black/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${themes[color]}`}>{icon}</div>
      <div>
        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
        <p className={`text-xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{val}</p>
      </div>
    </div>
  );
}