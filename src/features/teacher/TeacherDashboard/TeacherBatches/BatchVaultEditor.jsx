import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  UploadCloud, FileText, Trash2, Check, Lock, PlayCircle, 
  Loader2, FileArchive, Layers, ExternalLink, Search, 
  Database, ShieldCheck, ArrowRight, X, RefreshCw,
  HardDriveDownload, Users, Share2, Info, EyeOff, Eye, 
  Clock, AlertTriangle, CheckCircle2, FileQuestion, ChevronRight,
  ShieldAlert, Activity, User, Zap, MousePointer2
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@services/firebase';
import { getAuth } from 'firebase/auth';

/**
 * BATCH VAULT EDITOR - ARCHITECT MASTER V6.2 (ZIP UPDATE)
 * Features: ZIP Filtering, Side-Adaptive Tooltips, Dynamic Teacher Identity, Mode Adaptation
 */
export default function BatchVaultEditor({ batchData }) {
  const { isDarkMode } = useTheme();
  // --- 1. DYNAMIC IDENTITY ENGINE ---
  const [activeUserName, setActiveUserName] = useState("Teacher Admin");

  useEffect(() => {
    const fetchIdentity = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        if (user.displayName) {
          setActiveUserName(user.displayName);
        } else {
          try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
              setActiveUserName(userSnap.data().name || userSnap.data().fullName || "Teacher Admin");
            }
          } catch (e) { console.error("Identity Core Failure:", e); }
        }
      }
    };
    fetchIdentity();
  }, []);

  // --- 2. CORE STATE ARCHITECTURE ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // Filters: ALL, PDF, AUDIO, ZIP
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState({ show: false, msg: '', type: 'success' });

  // Deployment Form State
  const [formData, setFormData] = useState({
    title: '', desc: '', category: 'CHEAT_SHEETS', type: 'PDF', file: null
  });

  // --- 3. ANALYTICS & ASSET SYNC ---
  const assets = batchData?.resources || [];
  const isLocked = batchData?.isVaultLocked || false;
  
  // Total Payload calculation (Synchronized variable name)
  const totalSize = assets.reduce((acc, curr) => acc + parseFloat(curr.size || 0), 0).toFixed(1);

  // Advanced Filtering Engine
  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || a.type === filterType;
    return matchesSearch && matchesType;
  });

  // --- 4. COMMAND HANDLERS ---
  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: '', type: 'success' }), 4000);
  };

  const copyInvite = () => {
    const link = `${window.location.origin}/enroll/${batchData.id}`;
    const msg = `Konnichiwa! 🌸\nNew master resources are live for ${batchData.level}.\nSecure Access: ${link}\n- Sent by ${activeUserName}`;
    navigator.clipboard.writeText(msg);
    setCopySuccess(true);
    showNotify("WhatsApp Invite ready to paste");
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleVaultLock = async () => {
    try {
      const batchRef = doc(db, 'batches', batchData.id);
      await updateDoc(batchRef, { isVaultLocked: !isLocked });
      showNotify(isLocked ? "Vault Protocol: PUBLIC" : "Vault Protocol: PRIVATE", "success");
    } catch (err) { showNotify("Auth Permission Denied", "error"); }
  };

  // Drag & Drop Helpers
  const onDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFormData({ ...formData, file: e.dataTransfer.files[0] });
      showNotify("Payload Staged");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) return;
    setIsUploading(true);
    setUploadProgress(10); 

    try {
      const payload = new FormData();
      payload.append('file', formData.file);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          const newAsset = {
            id: `ASSET_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            title: formData.title,
            desc: formData.desc,
            category: formData.category,
            type: formData.type,
            size: (formData.file.size / (1024 * 1024)).toFixed(1) + ' MB',
            fileUrl: result.url,
            uploadedBy: activeUserName,
            timestamp: new Date().toISOString()
          };

          await updateDoc(doc(db, 'batches', batchData.id), { resources: arrayUnion(newAsset) });
          setIsUploading(false);
          setShowUploadForm(false);
          showNotify("Deployment Successful");
          setFormData({ title: '', desc: '', category: 'CHEAT_SHEETS', type: 'PDF', file: null });
        }
      });
      xhr.open("POST", "https://darkviolet-gerbil-992793.hostingersite.com/upload_vault_asset_rename.php");
      xhr.send(payload);
    } catch (err) { setIsUploading(false); showNotify("Server Link Error", "error"); }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`⚠️ PURGE: Permanently remove "${asset.title}"?`)) return;
    try {
      await updateDoc(doc(db, 'batches', batchData.id), { resources: arrayRemove(asset) });
      showNotify("Asset Nuked");
    } catch (error) { showNotify("Delete Refused", "error"); }
  };

  return (
    <div className={`space-y-6 sm:space-y-10 animate-in fade-in duration-1000 pb-32 max-w-7xl mx-auto px-4 custom-scrollbar ${isDarkMode ? 'dark' : ''}`}>
      
      {/* 🔔 GLOBAL SYSTEM TOAST */}
      {notification.show && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 border backdrop-blur-xl ${notification.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-white/10 text-white'}`}>
          {notification.type === 'error' ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} className="text-emerald-500" />}
          <p className="text-xs font-black uppercase tracking-[0.2em]">{notification.msg}</p>
        </div>
      )}

      {/* 🏗️ PRIMARY CONTROL CENTER */}
      <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-7 rounded-[3rem] border backdrop-blur-xl shadow-2xl ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.8rem] bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/30">
             <Database size={28} />
          </div>
          <div>
            <h2 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{batchData.title} <span className="text-rose-600">Vault.</span></h2>
            <div className="flex items-center gap-2.5 mt-1">
               <Activity size={14} className="text-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operator: <span className={isDarkMode ? 'text-white' : 'text-slate-700'}>{activeUserName}</span></p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button onClick={toggleVaultLock} className={`p-4 rounded-2xl border transition-all shadow-md ${isLocked ? 'bg-rose-600/10 border-rose-600/20 text-rose-500' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-500'}`}>
            {isLocked ? <EyeOff size={20}/> : <Eye size={20}/>}
          </button>
          <button onClick={copyInvite} className={`flex-1 xl:flex-none px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-md ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-indigo-500' : 'bg-slate-50 border-slate-100 text-slate-600 hover:text-indigo-600'}`}>
            {copySuccess ? <Check size={16} className="text-emerald-500"/> : <Share2 size={16}/>} Invite
          </button>
          <button onClick={() => setShowUploadForm(!showUploadForm)} className="flex-1 xl:flex-none px-10 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500 shadow-xl transition-all flex items-center justify-center gap-3">
            {showUploadForm ? <X size={18}/> : <UploadCloud size={18}/>} {showUploadForm ? 'Abort' : 'Deploy'}
          </button>
        </div>
      </div>

      {/* 📊 ELITE METRIC GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <EliteStat label="Payload Mass" val={totalSize} unit="MB" color="rose" icon={<HardDriveDownload size={20}/>} />
        <EliteStat label="Archives" val={assets.length} unit="Units" color="indigo" icon={<Layers size={20}/>} />
        <EliteStat label="Enrolled" val={batchData.enrolledCount || 0} unit="Users" color="emerald" icon={<Users size={20}/>} />
        <EliteStat label="Batch Level" val={batchData.level} color="amber" icon={<ShieldCheck size={20}/>} />
      </div>

      {/* 🛰️ UPLOAD TERMINAL */}
      {showUploadForm && (
        <form 
          onSubmit={handleUpload} 
          onDragOver={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`p-10 lg:p-14 rounded-[4rem] border shadow-2xl space-y-10 animate-in zoom-in-95 relative overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900/10">
             <div className="h-full bg-rose-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
            <div className={`lg:col-span-1 relative border-2 border-dashed rounded-[3rem] p-10 text-center transition-all flex flex-col items-center justify-center gap-6 
              ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-105 shadow-2xl' : 
                formData.file ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 hover:border-rose-500 bg-slate-950/50'}`}>
              <input type="file" required onChange={e => setFormData({...formData, file: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              {formData.file ? <Check className="text-emerald-500" size={48} /> : <UploadCloud className="text-slate-700" size={48} />}
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{formData.file ? formData.file.name : 'Target Source'}</p>
            </div>
            
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Master Title Signature..." className={`w-full p-5 rounded-2xl border text-xs font-black outline-none focus:border-rose-500 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                <div className="flex gap-2">
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`flex-[2] p-5 rounded-2xl border text-[10px] font-black uppercase outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="CHEAT_SHEETS">Cheat Sheets</option>
                    <option value="AUDIO_PACKS">Audio Packs</option>
                    <option value="FLASHCARDS">Anki Decks</option>
                    <option value="MOCK_TESTS">Mock Tests</option>
                    <option value="VOCAB">Vocab</option>
                    <option value="GRAMMAR">Grammar</option>
                    <option value="KANJI">Kanji</option>
                  </select>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={`flex-1 p-5 rounded-2xl border text-[10px] font-black uppercase outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="PDF">PDF</option>
                    <option value="AUDIO">MP3</option>
                    <option value="ZIP">ZIP</option>
                  </select>
                </div>
              </div>
              <textarea rows="3" required value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} placeholder="Detailed Internal Meta Description (Visible on Hover)..." className={`w-full p-6 rounded-[2rem] border text-xs font-bold outline-none focus:border-rose-500 transition-all resize-none shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
            </div>
          </div>
          <button type="submit" disabled={isUploading || !formData.file} className="w-full py-8 rounded-[2.5rem] bg-rose-600 text-white font-black text-xs uppercase tracking-[0.5em] hover:bg-rose-500 transition-all flex items-center justify-center gap-4 shadow-2xl">
             {isUploading ? <><Loader2 className="animate-spin" size={24} /> Transmitting {uploadProgress}%</> : <>Authorize Deployment <ArrowRight size={20}/></>}
          </button>
        </form>
      )}

      {/* 📁 ASSET INVENTORY HUB (Adaptive UI) */}
      <div className={`rounded-[3.5rem] border overflow-visible shadow-2xl ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Toolbar - FIXED ROUNDED TOP */}
        <div className={`px-10 py-7 border-b flex flex-col md:flex-row justify-between items-center gap-8 rounded-t-[3.5rem] ${isDarkMode ? 'bg-slate-900/20 border-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-4">
             <Layers size={20} className="text-rose-600" />
             <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Master Archives Inventory</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className={`relative w-full sm:w-80 group`}>
              <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-rose-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="QUERY ARCHIVES..." className={`w-full pl-14 pr-6 py-3.5 border rounded-2xl font-black text-[10px] outline-none focus:border-rose-500 transition-all shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
            </div>
            {/* UPDATED: Added ZIP filter option */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`p-3.5 border rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-600'}`}>
               <option value="ALL">ALL FORMATS</option>
               <option value="PDF">PDF DOCUMENTS</option>
               <option value="AUDIO">AUDIO PACKS</option>
               <option value="ZIP">COMPRESSED ZIP</option>
            </select>
          </div>
        </div>

        {/* List Body */}
        <div className={`flex flex-col divide-y ${isDarkMode ? 'divide-slate-800/30' : 'divide-slate-100'}`}>
          {filteredAssets.length === 0 ? (
            <div className="p-32 text-center text-slate-800 font-black uppercase tracking-[0.5em] text-[11px]">Vault Buffer Cleared.</div>
          ) : (
            filteredAssets.map((asset, idx) => (
              <div key={asset.id} className={`group relative flex flex-col md:flex-row md:items-center justify-between p-6 sm:px-12 sm:py-5 transition-all gap-6 md:gap-0 ${isDarkMode ? 'hover:bg-white/[0.015]' : 'hover:bg-slate-50'}`}>
                
                <div className="flex items-center gap-8">
                  <div className={`text-[10px] font-black w-4 group-hover:text-rose-500 transition-colors ${isDarkMode ? 'text-slate-800' : 'text-slate-300'}`}>{(idx + 1).toString().padStart(2, '0')}</div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-3 
                    ${asset.type === 'AUDIO' ? 'bg-emerald-500/10 text-emerald-500' : 
                      asset.type === 'ZIP' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    {asset.type === 'AUDIO' ? <PlayCircle size={24}/> : asset.type === 'ZIP' ? <FileArchive size={24}/> : <FileText size={24}/>}
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <p className={`font-black text-base group-hover:text-rose-500 transition-colors max-w-[180px] sm:max-w-none truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{asset.title}</p>
                      
                      {/* 🕵️ THE SIDE-ADAPTIVE TOOLTIP (Pops RIGHT, never cut) */}
                      <div className="relative group/info">
                        <div className={`p-2 rounded-full border cursor-help transition-all shadow-inner ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900'}`}><Info size={14} /></div>
                        
                        <div className={`absolute left-full ml-6 top-1/2 -translate-y-1/2 w-80 p-7 rounded-[2.5rem] border shadow-[50px_0_120px_rgba(0,0,0,0.7)] opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[600] pointer-events-none translate-x-4 group-hover/info:translate-x-0 backdrop-blur-3xl ${isDarkMode ? 'bg-[#0F172A]/98 border-white/10' : 'bg-white border-slate-200'}`}>
                          <div className="space-y-5">
                            <div className={`pb-4 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                              <p className="text-[9px] font-black uppercase text-rose-500 mb-2 tracking-[0.2em]">Asset Intelligence</p>
                              <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{asset.desc}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                               <div><p className="text-[8px] text-slate-500 uppercase mb-1">Signature</p><p className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{asset.type}</p></div>
                               <div><p className="text-[8px] text-slate-500 uppercase mb-1">Payload</p><p className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{asset.size}</p></div>
                               <div><p className="text-[8px] text-slate-500 uppercase mb-1">Operator</p><p className="text-[11px] font-black text-emerald-500">{asset.uploadedBy}</p></div>
                               <div><p className="text-[8px] text-slate-500 uppercase mb-1">Category</p><p className="text-[11px] font-black text-indigo-500 whitespace-nowrap">{asset.category.replace('_', ' ')}</p></div>
                            </div>
                            <div className={`pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                              <div className="flex justify-between items-center">
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Clock size={10}/> {new Date(asset.timestamp).toLocaleDateString()}</p>
                                <p className="text-[8px] font-black uppercase text-slate-400">ID: {asset.id.slice(-8)}</p>
                              </div>
                            </div>
                          </div>
                          <div className={`absolute top-1/2 -left-3 -translate-y-1/2 border-[12px] border-transparent ${isDarkMode ? 'border-r-[#0F172A]/98' : 'border-r-white'}`}></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-700 mt-1">{asset.type} • Secured Private Link</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <a href={asset.fileUrl.replace('yourdomain.com', 'darkviolet-gerbil-992793.hostingersite.com')} target="_blank" rel="noopener" className={`flex-1 md:flex-none p-4 border rounded-2xl transition-all shadow-inner flex justify-center ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}><ExternalLink size={20} /></a>
                  <button onClick={() => handleDelete(asset)} className="flex-1 md:flex-none p-4 bg-rose-600/10 border border-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-xl hover:shadow-rose-600/30 flex justify-center"><Trash2 size={20} /></button>
                  <div className="hidden sm:block pl-4"><ChevronRight size={18} className={`transition-colors ${isDarkMode ? 'text-slate-900 group-hover:text-rose-600' : 'text-slate-100 group-hover:text-rose-500'}`} /></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🔗 SYSTEM FOOTER - FIXED BLEED & DYNAMIC META */}
        <div className={`px-12 py-6 border-t flex justify-between items-center rounded-b-[3.5rem] ${isDarkMode ? 'bg-slate-950/60 border-slate-800/30' : 'bg-slate-50 border-slate-100'}`}>
           <div className="flex items-center gap-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol 6.2.0 Secure</p>
              <div className="h-4 w-px bg-slate-800"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Zap size={10} className="text-amber-500" /> Latency: Minimal</p>
           </div>
           <div className="flex items-center gap-3">
             <User size={12} className="text-rose-600" />
             <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Authenticated: <span className={isDarkMode ? 'text-slate-300' : 'text-slate-900'}>{activeUserName}</span></p>
           </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ELITE COMPACT METRIC CARD
 */
function EliteStat({ label, val, unit, color, icon }) {
  const { isDarkMode } = useTheme();
  const themes = {
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10'
  };

  return (
    <div className={`relative group p-6 rounded-[2.5rem] border transition-all hover:-translate-y-1 shadow-2xl ${isDarkMode ? 'bg-[#0B1120] border-slate-800 hover:border-slate-700 shadow-rose-900/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 blur-3xl opacity-10 rounded-full ${themes[color]}`}></div>
      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-inner ${themes[color]}`}>{icon}</div>
        <div className={`p-1.5 rounded-lg border opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
          <Zap size={10} className={themes[color].split(' ')[0]} />
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1.5 leading-none">{label}</p>
        <div className="flex items-baseline gap-1.5">
           <span className={`text-3xl font-black group-hover:scale-105 transition-transform origin-left block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{val}</span>
           {unit && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit}</span>}
        </div>
      </div>
    </div>
  );
}