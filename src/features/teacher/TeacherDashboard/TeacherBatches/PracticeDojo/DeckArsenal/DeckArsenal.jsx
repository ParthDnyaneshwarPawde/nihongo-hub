import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Library, Plus, Search, Settings, 
  BookOpen, Lock, Unlock, Loader2, Edit3, Trash2, 
  Globe, Layers
} from 'lucide-react';
import { db } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export default function DeckArsenal() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { batchId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // 🚨 BATCH SETTINGS STATE
  const [marketAccess, setMarketAccess] = useState(true); 
  const [marketScope, setMarketScope] = useState('batch'); 

  // 🚨 OFFICIAL DECKS STATE
  const [decks, setDecks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ title: '', subtitle: '', color: 'from-indigo-500 to-purple-600', targetModes: ['srs', 'drill'] });

  const gradientOptions = [
    'from-indigo-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-slate-700 to-slate-900'
  ];

  useEffect(() => {
    const fetchArsenalData = async () => {
      if (!batchId) return;
      setIsLoading(true);
      try {
        // 1. Fetch Batch Marketplace Settings
        const batchRef = doc(db, `batches`, batchId);
        const batchSnap = await getDoc(batchRef);
        
        if (batchSnap.exists()) {
          const data = batchSnap.data();
          setMarketAccess(data.marketAccess !== false); 
          setMarketScope(data.marketScope || 'batch');
        }

        // 2. Fetch Official Decks created by this teacher for this batch
        const decksRef = collection(db, 'marketplace_decks');
        const q = query(decksRef, where("originBatchId", "==", batchId), where("isOfficial", "==", true));
        const decksSnap = await getDocs(q);
        
        const loadedDecks = [];
        decksSnap.forEach(d => loadedDecks.push({ id: d.id, ...d.data() }));
        setDecks(loadedDecks);

      } catch (error) {
        console.error("Failed to load Arsenal data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArsenalData();
  }, [batchId]);

  const handleSaveMarketSettings = async () => {
    setIsSavingSettings(true);
    try {
      const batchRef = doc(db, `batches`, batchId);
      await setDoc(batchRef, { marketAccess, marketScope }, { merge: true });
    } catch (error) {
      console.error("Failed to save market settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeck.title.trim()) return alert("Title is required.");
    
    const deckId = `deck_${Date.now()}`;
    const deckData = {
      id: deckId,
      originBatchId: batchId,
      isOfficial: true, 
      authorName: "Official Resource",
      title: newDeck.title,
      subtitle: newDeck.subtitle,
      coverColor: newDeck.color,
      targetModes: newDeck.targetModes,
      visibility: 'batch', 
      price: 0, 
      freeForOriginBatch: true,
      questionIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'marketplace_decks', deckId), deckData);
      setDecks([...decks, deckData]);
      setIsCreateModalOpen(false);
      setNewDeck({ title: '', subtitle: '', color: 'from-indigo-500 to-purple-600', targetModes: ['srs', 'drill'] });
    } catch (error) {
      console.error("Failed to create deck:", error);
      alert("Failed to create deck.");
    }
  };

  const filteredDecks = decks.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) return <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B1120] text-indigo-400' : 'bg-slate-50 text-indigo-600'}`}><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-700 relative ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>
      
      <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10 space-y-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-900/20`}>
                <Library size={18} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Deck Arsenal</span>
            </div>
            <h2 className={`text-4xl font-black tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Official Resources
            </h2>
            <p className={`font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage official batch study decks and control student access to the community marketplace.
            </p>
          </div>

          <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 shrink-0">
            <Plus size={18} /> Create Deck
          </button>
        </div>

        {/* 🚨 MARKETPLACE SETTINGS */}
        <section className={`p-8 rounded-[2.5rem] border shadow-sm ${isDarkMode ? 'bg-[#151E2E]/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col lg:flex-row gap-8 justify-between">
            <div className="max-w-xl">
              <h3 className={`text-lg font-black flex items-center gap-2 mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Globe className="text-emerald-500" size={20} /> Community Marketplace Settings
              </h3>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Control what student-generated decks your class can see and purchase with their earned Koban. Official resources are always visible.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              {/* Access Toggle */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-6 ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Market Access</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{marketAccess ? 'Enabled' : 'Disabled'}</p>
                </div>
                <button onClick={() => setMarketAccess(!marketAccess)} className={`relative w-12 h-6 shrink-0 rounded-full transition-colors ${marketAccess ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${marketAccess ? 'translate-x-7' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Scope Toggle */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-6 ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'} ${!marketAccess ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Market Scope</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{marketScope === 'global' ? 'Global App' : 'This Batch Only'}</p>
                </div>
                <button onClick={() => setMarketScope(marketScope === 'global' ? 'batch' : 'global')} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border transition-colors ${marketScope === 'global' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                  {marketScope === 'global' ? 'Global' : 'Batch'}
                </button>
              </div>
              
              <button onClick={handleSaveMarketSettings} disabled={isSavingSettings} className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${isSavingSettings ? 'bg-slate-800 text-slate-500' : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                {isSavingSettings ? <Loader2 size={20} className="animate-spin"/> : <Settings size={20} />}
              </button>
            </div>
          </div>
        </section>

        {/* 🚨 OFFICIAL DECKS GRID */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Official Decks ({filteredDecks.length})</h3>
            <div className={`flex items-center gap-2 p-2 rounded-2xl border w-full sm:w-72 ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-400'}`}>
              <Search size={18} className="text-slate-500 ml-2" />
              <input type="text" placeholder="Search decks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm font-bold w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDecks.map(deck => (
              <div key={deck.id} className={`group relative rounded-[2rem] border overflow-hidden transition-all hover:-translate-y-1 ${isDarkMode ? 'bg-[#151E2E] border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'}`}>
                
                {/* Visual Header */}
                <div className={`h-32 bg-gradient-to-br ${deck.coverColor} p-6 relative overflow-hidden flex flex-col justify-end`}>
                   <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                   <h4 className="text-xl font-black text-white relative z-10 leading-tight">{deck.title}</h4>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{deck.subtitle || 'No subtitle provided.'}</p>
                  
                  <div className="flex items-center gap-2">
                    {deck.targetModes.includes('srs') && <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>SRS</span>}
                    {deck.targetModes.includes('drill') && <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>Drill</span>}
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ml-auto flex items-center gap-1 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <Layers size={10} /> {deck.questionIds?.length || 0} Cards
                    </span>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                    {/* 🚨 Updated Route to match "Arsenal" */}
                    <button onClick={() => navigate(`/batch/${batchId}/arsenal/deck/${deck.id}/forge`)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                      <Edit3 size={14} /> Open Forge
                    </button>
                  </div>
                </div>

              </div>
            ))}
            
            {filteredDecks.length === 0 && (
              <div className={`col-span-full py-16 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
                <BookOpen size={48} className="text-slate-500 mb-4 opacity-50" />
                <h4 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Decks Found</h4>
                <p className="text-sm font-medium text-slate-500">Create an official deck to get started.</p>
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
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-lg rounded-[2.5rem] border shadow-2xl p-8 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}>
              
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400"><BookOpen size={24} /></div>
                <div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create Deck</h3>
                  <p className="text-xs font-bold text-slate-500">Official Batch Resource</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Deck Title</label>
                  <input type="text" value={newDeck.title} onChange={e => setNewDeck({...newDeck, title: e.target.value})} placeholder="e.g., JLPT N5 Master Vocab" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                </div>
                
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subtitle / Description</label>
                  <input type="text" value={newDeck.subtitle} onChange={e => setNewDeck({...newDeck, subtitle: e.target.value})} placeholder="e.g., The top 100 verbs for the exam." className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                </div>

                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cover Gradient</label>
                  <div className="flex flex-wrap gap-3">
                    {gradientOptions.map((grad, i) => (
                      <button 
                        key={i} 
                        onClick={() => setNewDeck({...newDeck, color: grad})} 
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} transition-transform ${newDeck.color === grad ? 'scale-110 ring-4 ring-white shadow-xl' : 'hover:scale-105 opacity-50 hover:opacity-100'}`} 
                      />
                    ))}
                  </div>
                </div>

                <button onClick={handleCreateDeck} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-colors mt-4">
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