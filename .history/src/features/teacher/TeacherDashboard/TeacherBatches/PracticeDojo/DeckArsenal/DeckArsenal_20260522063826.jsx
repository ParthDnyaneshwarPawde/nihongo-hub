import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Library, Plus, Search, 
  BookOpen, Lock, Unlock, Loader2, Edit3, 
  Globe, Layers, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2, Coins,ShieldAlert
} from 'lucide-react';
import { db } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export default function DeckArsenal() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { batchId, categoryId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); 
  
  const [marketAccess, setMarketAccess] = useState(true); 
  const [marketScope, setMarketScope] = useState('batch'); 
  // 🚨 ADD THIS
  const [accessDenied, setAccessDenied] = useState(false);

  const [decks, setDecks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // 🚨 UPDATED STATE: Added visibility, batchPrice, and globalPrice
  const [newDeck, setNewDeck] = useState({ 
    title: '', subtitle: '', color: 'from-indigo-500 to-purple-600', 
    targetModes: ['srs', 'drill'], visibility: 'batch', batchPrice: 0, globalPrice: 500 
  });

  const gradientOptions = [
    'from-indigo-500 to-purple-600', 'from-rose-500 to-pink-600',
    'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-500',
    'from-blue-500 to-cyan-500', 'from-slate-700 to-slate-900',
    'from-violet-600 to-fuchsia-600', 'from-cyan-400 to-sky-600',
    'from-fuchsia-500 to-orange-500', 'from-lime-400 to-emerald-600',
    'from-red-500 to-rose-700', 'from-blue-700 to-indigo-900'
  ];

useEffect(() => {
    const checkSecurityAndFetchData = async () => {
      setIsLoading(true);
      try {
        const userUid = auth.currentUser?.uid;
        if (!userUid || !batchId || !categoryId) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // 🚨 1. Check Master Authorization (Root Access)
        const lexSnap = await getDoc(doc(db, 'lexicons', categoryId));
        const isMaster = lexSnap.exists() && (lexSnap.data().accessIds || []).includes(userUid);

        // 🚨 2. Check Batch-Specific Authorization
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        const isBatchCollab = batchSnap.exists() && (batchSnap.data().teacherIds || []).includes(userUid);

        // 🚨 3. BOUNCER: Kick out if NOT Master AND NOT Batch Collab
        if (!isMaster && !isBatchCollab) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // 4. If passed, fetch Arsenal Data
        const practiceRef = doc(db, `batches/${batchId}/self_practice`, categoryId);
        const practiceSnap = await getDoc(practiceRef);
        
        if (practiceSnap.exists()) {
          const data = practiceSnap.data();
          setMarketAccess(data.marketAccess !== false); 
          setMarketScope(data.marketScope || 'batch');
        }

        const decksRef = collection(db, `batches/${batchId}/self_practice/${categoryId}/decks`);
        const q = query(decksRef, where("isOfficial", "==", true));
        const decksSnap = await getDocs(q);
        setDecks(decksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Failed to load Arsenal data:", error);
        setAccessDenied(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkSecurityAndFetchData();
  }, [batchId, categoryId]);

  const autoSaveSettings = async (newAccess, newScope) => {
    setSaveStatus('saving');
    try {
      const practiceRef = doc(db, `batches/${batchId}/self_practice`, categoryId);
      await setDoc(practiceRef, { marketAccess: newAccess, marketScope: newScope }, { merge: true });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000); 
    } catch (error) {
      console.error("Auto-save failed:", error);
      setSaveStatus('idle');
    }
  };

  const handleToggleAccess = () => {
    const newVal = !marketAccess;
    setMarketAccess(newVal);
    autoSaveSettings(newVal, marketScope);
  };

  const handleToggleScope = () => {
    const newVal = marketScope === 'global' ? 'batch' : 'global';
    setMarketScope(newVal);
    autoSaveSettings(marketAccess, newVal);
  };

  const handleCreateDeck = async () => {
    if (!newDeck.title.trim()) return alert("Title is required.");
    
    const deckId = `deck_${Date.now()}`;
    const deckData = {
      id: deckId,
      categoryId: categoryId, 
      originBatchId: batchId,
      isOfficial: true, 
      authorName: "Official Resource",
      title: newDeck.title,
      subtitle: newDeck.subtitle,
      coverColor: newDeck.color,
      targetModes: newDeck.targetModes,
      // 🚨 SAVE VISIBILITY AND PRICING
      visibility: newDeck.visibility, 
      batchPrice: Number(newDeck.batchPrice) || 0, 
      globalPrice: Number(newDeck.globalPrice) || 0,
      questionIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const deckRef = doc(db, `batches/${batchId}/self_practice/${categoryId}/decks`, deckId);
      await setDoc(deckRef, deckData);
      
      setDecks([...decks, deckData]);
      setIsCreateModalOpen(false);
      // Reset Modal
      setNewDeck({ title: '', subtitle: '', color: 'from-indigo-500 to-purple-600', targetModes: ['srs', 'drill'], visibility: 'batch', batchPrice: 0, globalPrice: 500 });
    } catch (error) {
      console.error("Failed to create deck:", error);
    }
  };

  const filteredDecks = decks.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) return <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B1120] text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}><Loader2 className="animate-spin" size={40} /></div>;

  if (accessDenied) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20">
          <ShieldAlert size={40}/>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
          You are not a collaborator or lead for this course, so you cannot access the deck arsenal for this batch.
        </p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-700 relative ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none ${isDarkMode ? 'opacity-20' : 'opacity-10'}`}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="max-w-[1400px] mx-auto px-6 pt-12 relative z-10 space-y-8">
        
        {/* HERO HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-start gap-5">
             <button onClick={() => navigate(-1)} className={`mt-2 p-3 rounded-2xl transition-all shadow-sm border hover:-translate-x-1 ${isDarkMode ? 'bg-[#151E2E] border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}>
               <ArrowLeft size={18}/>
             </button>
             <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
                    <Library size={16} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    Deck Arsenal <span className="w-1 h-1 rounded-full bg-indigo-500"></span> {categoryId}
                  </span>
                </div>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tighter mb-2 ${isDarkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400' : 'text-slate-900'}`}>
                  Official Resources
                </h2>
             </div>
          </div>

          <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shrink-0">
            <Plus size={16} /> Create Deck
          </button>
        </div>

        {/* SCALED DOWN MARKETPLACE CONSOLE */}
        <section className={`relative overflow-hidden rounded-[2rem] border shadow-xl ${isDarkMode ? 'bg-[#0F1523]/80 border-slate-800/80 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl'}`}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-6 justify-between items-center relative z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500"><Globe size={16} /></div>
                  Community Economy
                </h3>
                
                <AnimatePresence mode="wait">
                  {saveStatus === 'saving' && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Loader2 size={10} className="animate-spin" /> Syncing
                    </motion.span>
                  )}
                  {saveStatus === 'saved' && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                      <CheckCircle2 size={12} /> Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Allow students to browse and purchase decks made by their peers using earned <span className="text-amber-500">Koban 🪙</span>. Your official resources remain free.
              </p>
            </div>

            <div className={`flex flex-col sm:flex-row gap-2 p-2 rounded-[1.5rem] border ${isDarkMode ? 'bg-[#0B1120]/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              
              <div onClick={handleToggleAccess} className={`px-4 py-3 rounded-[1.25rem] flex items-center justify-between gap-6 transition-colors cursor-pointer select-none ${isDarkMode ? 'bg-[#151E2E] border border-slate-700/50 hover:border-slate-600' : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Market Access</p>
                  <p className={`text-xs font-bold flex items-center gap-1.5 ${marketAccess ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {marketAccess ? <><Unlock size={12}/> Enabled</> : <><Lock size={12}/> Disabled</>}
                  </p>
                </div>
                <div className={`relative w-12 h-6 shrink-0 rounded-full transition-colors shadow-inner ${marketAccess ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${marketAccess ? 'translate-x-7' : 'left-1'}`}></div>
                </div>
              </div>

              <div onClick={marketAccess ? handleToggleScope : undefined} className={`px-4 py-3 rounded-[1.25rem] flex items-center justify-between gap-6 transition-colors ${marketAccess ? 'cursor-pointer select-none' : 'opacity-50 grayscale pointer-events-none'} ${isDarkMode ? 'bg-[#151E2E] border border-slate-700/50 hover:border-slate-600' : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Market Scope</p>
                  <p className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {marketScope === 'global' ? <Globe size={12}/> : <ShieldCheck size={12}/>} 
                    {marketScope === 'global' ? 'Global App' : 'Batch Only'}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${marketScope === 'global' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                  Toggle
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DECKS GRID */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className={`text-xl font-black flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Master Decks <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-500`}>{filteredDecks.length}</span>
            </h3>
            <div className={`flex items-center gap-2 p-2.5 rounded-2xl border w-full sm:w-72 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20' : 'bg-white border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20'}`}>
              <Search size={16} className="text-slate-400 ml-1" />
              <input type="text" placeholder="Search decks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
            {filteredDecks.map(deck => (
              <div key={deck.id} className="relative group cursor-pointer" onClick={() => navigate(`/batch/${batchId}/arsenal/${categoryId}/deck/${deck.id}/forge`)}>
                
                <div className={`absolute inset-0 rounded-[2rem] rotate-3 transition-all duration-300 group-hover:rotate-[5deg] group-hover:translate-x-1.5 group-hover:-translate-y-1 border ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-200/80 border-slate-300'}`}></div>
                <div className={`absolute inset-0 rounded-[2rem] -rotate-2 transition-all duration-300 group-hover:-rotate-[3deg] group-hover:-translate-x-1.5 group-hover:-translate-y-1 border ${isDarkMode ? 'bg-slate-700/80 border-slate-600' : 'bg-slate-300/80 border-slate-400'}`}></div>

                <div className={`relative z-10 rounded-[2rem] border overflow-hidden flex flex-col h-full transition-all duration-300 group-hover:-translate-y-2 shadow-md group-hover:shadow-2xl ${isDarkMode ? 'bg-[#151E2E] border-slate-700 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10' : 'bg-white border-slate-200 group-hover:border-indigo-400 group-hover:shadow-indigo-500/10'}`}>
                  
                  {/* 🚨 COVER ART (Pricing Removed from here!) */}
                  <div className={`h-36 bg-gradient-to-br ${deck.coverColor} p-5 relative overflow-hidden flex flex-col justify-between border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                     <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay pointer-events-none"></div>
                     <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
                     
                     <div className="flex justify-between items-start relative z-10">
                        <span className="w-fit px-3 py-1 bg-black/40 backdrop-blur-md text-white/90 text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10 shadow-sm flex items-center gap-1.5">
                          <Sparkles size={10} className="text-amber-300"/> Official
                        </span>

                        <div className="flex flex-col items-end gap-1.5">
                          {deck.visibility === 'global' ? (
                            <span className="px-2 py-1 bg-indigo-500/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-indigo-400"><Globe size={10}/> Global</span>
                          ) : (
                            <span className="px-2 py-1 bg-black/20 backdrop-blur-md text-white/90 text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-white/10"><ShieldCheck size={10}/> Batch Only</span>
                          )}
                        </div>
                     </div>
                     <h4 className="text-2xl font-black text-white relative z-10 leading-tight drop-shadow-md">{deck.title}</h4>
                  </div>

                  {/* 🚨 BODY DETAILS (Pricing Added opposite the Subtitle) */}
                  <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-transparent to-black/5">
                    
                    <div className="flex justify-between items-start gap-4">
                      <p className={`text-xs font-bold line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{deck.subtitle || 'No subtitle provided.'}</p>
                      
                      {/* Tucked Pricing Badge */}
                      <div className="shrink-0 mt-0.5">
                        {deck.batchPrice > 0 ? (
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border shadow-sm ${isDarkMode ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            <Coins size={10}/> {deck.batchPrice}
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border shadow-sm ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            Free
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-4 mb-5">
                      {deck.targetModes.includes('srs') && <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'}`}>Cards</span>}
                      {deck.targetModes.includes('drill') && <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>Drills</span>}
                    </div>

                    {/* Bottom Footer */}
                    <div className={`pt-4 border-t flex justify-between items-center mt-auto ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Layers size={12} /> {deck.questionIds?.length || 0} Cards
                      </span>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${isDarkMode ? 'bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20' : 'bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'}`}>
                        <Edit3 size={12} /> Forge
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
            
            {filteredDecks.length === 0 && (
              <div className={`col-span-full py-16 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-300 bg-slate-50'}`}>
                <BookOpen size={40} className={`mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <h4 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Decks Forged Yet</h4>
                <p className="text-xs font-medium text-slate-500 max-w-sm">Create an official {categoryId} deck to equip your students.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 🚨 CREATE DECK MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2.5rem] border shadow-2xl p-8 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400"><BookOpen size={24} /></div>
                <div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Forge Deck</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Official Batch Resource</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Deck Title</label>
                  <input type="text" value={newDeck.title} onChange={e => setNewDeck({...newDeck, title: e.target.value})} placeholder="e.g., JLPT N5 Master Vocab" className={`w-full p-3.5 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10'}`} />
                </div>
                
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subtitle / Description</label>
                  <input type="text" value={newDeck.subtitle} onChange={e => setNewDeck({...newDeck, subtitle: e.target.value})} placeholder="e.g., The top 100 verbs for the exam." className={`w-full p-3.5 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10'}`} />
                </div>

                {/* 🚨 VISIBILITY & PRICING CONTROLS */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Visibility & Market</label>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setNewDeck({...newDeck, visibility: 'batch'})} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${newDeck.visibility === 'batch' ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-500 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-700 text-slate-500' : 'bg-transparent border-slate-200 text-slate-400')}`}>
                      <ShieldCheck size={18}/>
                      <span className="text-[10px] font-black uppercase tracking-widest">Batch Only</span>
                    </button>
                    <button onClick={() => setNewDeck({...newDeck, visibility: 'global'})} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${newDeck.visibility === 'global' ? (isDarkMode ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-emerald-50 border-emerald-500 text-emerald-600') : (isDarkMode ? 'bg-transparent border-slate-700 text-slate-500' : 'bg-transparent border-slate-200 text-slate-400')}`}>
                      <Globe size={18}/>
                      <span className="text-[10px] font-black uppercase tracking-widest">Global App</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Batch Price</label>
                      <div className="relative">
                        <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                        <input type="number" value={newDeck.batchPrice} onChange={e => setNewDeck({...newDeck, batchPrice: e.target.value})} className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {newDeck.visibility === 'global' && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                          <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ml-1 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>Global Price</label>
                          <div className="relative">
                            <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                            <input type="number" value={newDeck.globalPrice} onChange={e => setNewDeck({...newDeck, globalPrice: e.target.value})} className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-white focus:border-emerald-500' : 'bg-emerald-50 border-emerald-200 text-slate-900 focus:border-emerald-400'}`} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cover Gradient</label>
                  <div className="grid grid-cols-6 gap-3">
                    {gradientOptions.map((grad, i) => (
                      <button 
                        key={i} 
                        onClick={() => setNewDeck({...newDeck, color: grad})} 
                        className={`w-full aspect-square rounded-xl bg-gradient-to-br ${grad} transition-all ${newDeck.color === grad ? 'scale-110 ring-2 ring-indigo-500/50 shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'}`} 
                      />
                    ))}
                  </div>
                </div>

                <button onClick={handleCreateDeck} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 mt-4">
                  Initialize Deck
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}