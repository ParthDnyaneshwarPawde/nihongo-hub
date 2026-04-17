import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { RefreshCw, ShieldAlert, ArrowRight, Lock, Activity, User, Layers, CheckCircle2 } from 'lucide-react';
import SecureViewer from '@components/shared/SecureViewer';

// Hooks
import { useVaultResources } from './hooks/useVaultResources';
import { useSearchFilters } from './hooks/useSearchFilters';

// Components
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import LibraryGrid from './components/LibraryGrid';

export default function ResourceVault({ selectedCourseTitle, enrolledCourseTitles = [], currentUser }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [viewingPdf, setViewingPdf] = useState(null);

  const { activeBatch, loading, isEnrolled } = useVaultResources({
    selectedCourseTitle,
    enrolledCourseTitles
  });

  const {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    activeFilter,
    setActiveFilter
  } = useSearchFilters('ALL', 300);

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

  const rawAssets = activeBatch?.resources || [];
  const isVaultLocked = activeBatch?.isVaultLocked || false;
  const leadTeacher = activeBatch?.teacherNames?.[0] || "Sensei Admin";

  // Filter Engine (now using debounced query)
  const filteredAssets = rawAssets.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(debouncedQuery.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || asset.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

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
            <VaultMetric label="Assets" val={rawAssets.length} icon={<Layers size={16}/>} color="indigo" />
            <VaultMetric label="Security" val="Verified" icon={<CheckCircle2 size={16}/>} color="emerald" />
          </div>
        </div>
      </div>

      {/* 🛠️ NAVIGATION DOCK */}
      <div className="flex flex-col xl:flex-row items-center gap-4 sticky top-4 z-40">
        <CategoryFilter 
          activeFilter={activeFilter} 
          setActiveFilter={setActiveFilter} 
        />
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />
      </div>

      {/* 📚 KINETIC GRID ENGINE */}
      <LibraryGrid 
        assets={filteredAssets} 
        setViewingPdf={setViewingPdf} 
      />

      {/* 🚨 MODAL PLACEMENT - SECURE PDF VIEWER 🚨 */}
      {viewingPdf && createPortal(
        <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            zIndex: 2147483647, 
            backgroundColor: isDarkMode ? '#000000' : 'rgba(0,0,0,0.9)'
          }} className="animate-in fade-in duration-300 flex flex-col">
          <SecureViewer 
            fileUrl={viewingPdf.fileUrl.replace('yourdomain.com', 'darkviolet-gerbil-992793.hostingersite.com')} 
            userEmail={currentUser?.email || "Protected Student"}
            onClose={() => setViewingPdf(null)} 
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// Internal Helper for Dashboard
function VaultMetric({ label, val, icon, color }) {
  const { isDarkMode } = useTheme();
  const themes = {
    indigo: 'bg-indigo-600/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5',
    emerald: 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
  };
  return (
    <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-900/50 border-white/5 shadow-black/40' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${themes[color]}`}>{icon}</div>
      <div>
        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
        <p className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{val}</p>
      </div>
    </div>
  );
}