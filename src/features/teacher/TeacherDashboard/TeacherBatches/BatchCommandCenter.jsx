import React, { useState, useEffect } from 'react';
import { Map, Database, Users, Settings, ArrowLeft, ExternalLink } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
// 🚨 IMPORT YOUR TWO NEW FUNCTIONAL COMPONENTS HERE:
// Make sure BatchVaultEditor.jsx and BatchRoster.jsx are saved in the same folder!
import BatchVaultEditor from '@features/teacher/TeacherDashboard/TeacherBatches/BatchVaultEditor'; 
import BatchRoster from '@features/teacher/TeacherDashboard/TeacherBatches/BatchRoster';    
import BatchSettings from '@features/teacher/TeacherDashboard/TeacherBatches/BatchSettings';           

export default function BatchCommandCenter({ batch, onClose, isDarkMode }) {
  // We default to VAULT so you can see it immediately when it opens
  const [activeView, setActiveView] = useState('VAULT'); 
  const [realName, setRealName] = useState("Loading...");
useEffect(() => {
  const fetchTeacherName = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      // 1. Try to get name from Auth Profile first (Fastest)
      if (user.displayName) {
        setRealName(user.displayName);
        return;
      }

      // 2. Otherwise, fetch from your 'users' collection in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setRealName(userDoc.data().name || userDoc.data().fullName);
      }
    }
  };
  fetchTeacherName();
}, []);
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col animate-in slide-in-from-bottom-10 duration-500 ${isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 🚀 TOP HEADER (Global context and exit) */}
      <header className={`h-20 px-8 flex items-center justify-between border-b shrink-0 ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-6">
          <button onClick={onClose} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${batch.isFree ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {batch.isFree ? 'Free Access' : 'Premium'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{batch.level}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">{batch.title}</h2>
          </div>
        </div>

        <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
          Preview as Student <ExternalLink size={14} />
        </button>
      </header>

      {/* 🎛️ MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Sub-Navigation (RED THEMED) */}
        <aside className={`w-72 border-r flex flex-col p-6 space-y-2 shrink-0 ${isDarkMode ? 'bg-[#0B1120]/50 border-slate-800' : 'bg-white/50 border-slate-200'}`}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Command Center</p>
          
          <CommandTab 
            icon={<Map size={18}/>} label="Path Builder" sub="Learn Section Map" 
            isActive={activeView === 'PATH_BUILDER'} onClick={() => setActiveView('PATH_BUILDER')} isDark={isDarkMode} 
          />
          <CommandTab 
            icon={<Database size={18}/>} label="Vault Manager" sub="PDFs, ZIPs, Audio" 
            isActive={activeView === 'VAULT'} onClick={() => setActiveView('VAULT')} isDark={isDarkMode} 
          />
          <CommandTab 
            icon={<Users size={18}/>} label="Student Roster" sub="Approvals & Access" 
            isActive={activeView === 'ROSTER'} onClick={() => setActiveView('ROSTER')} isDark={isDarkMode} 
          />
          <CommandTab 
            icon={<Settings size={18}/>} label="Batch Settings" sub="Pricing & Promo" 
            isActive={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} isDark={isDarkMode} 
          />
        </aside>

        {/* Right Side: The Active Tool Canvas */}
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
          
          {activeView === 'PATH_BUILDER' && (
            <div className="animate-in fade-in duration-300">
               <h1 className="text-3xl font-black mb-4">Curriculum Map Builder</h1>
               <p className="text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-800 p-10 rounded-3xl text-center font-bold uppercase tracking-widest text-xs">
                 Path Builder Engine coming in Phase 3...
               </p>
            </div>
          )}

          {/* 🚨 THE VAULT EDITOR */}
          {activeView === 'VAULT' && (
            <div className="animate-in fade-in duration-300">
              <BatchVaultEditor batchData={batch} isDarkMode={isDarkMode} />
            </div>
          )}

          {/* 🚨 THE STUDENT ROSTER */}
          {activeView === 'ROSTER' && (
            <div className="animate-in fade-in duration-300">
              <BatchRoster batchData={batch} isDarkMode={isDarkMode} />
            </div>
          )}

          {activeView === 'SETTINGS' && (
            <div className="animate-in fade-in duration-300">
    <BatchSettings 
       batchData={batch} 
       isDarkMode={isDarkMode} 
    />
  </div>
          )}

        </main>
      </div>
    </div>
  );
}

// Micro-component for the sleek sidebar tabs (Updated with Red/Rose Theme)
function CommandTab({ icon, label, sub, isActive, onClick, isDark }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left ${isActive ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
    >
      <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-black">{label}</p>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-rose-200' : 'text-slate-400'}`}>{sub}</p>
      </div>
    </button>
  );
}