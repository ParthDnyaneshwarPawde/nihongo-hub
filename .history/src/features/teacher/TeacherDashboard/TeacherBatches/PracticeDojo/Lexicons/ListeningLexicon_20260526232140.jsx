import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, Search, Target, Globe, EyeOff, Eye,
  Lock, Unlock, Edit3, X, Play, Pause, RotateCcw, Volume2,
  ListAudio, GraduationCap, Loader2, ShieldAlert, MessageCircle, Mic, Radio
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ListeningLexicon() {
  const { isDarkMode } = useTheme();
  const categoryId = 'listening';
  const { batchId } = useParams(); 
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // 🚨 SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false);
  
  // BATCH OVERRIDES
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [hiddenAudio, setHiddenAudio] = useState([]);

  // DATABASE STATE
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // CATEGORY MAPS
  const jlptCategories = [
    { id: 'all', label: 'All Audio', jp: '全音声', icon: Globe },
    { id: 'N5', label: 'N5 Basics', jp: 'N5聴解', icon: Target },
    { id: 'N4', label: 'N4 Beginner', jp: 'N4聴解', icon: Target },
    { id: 'N3', label: 'N3 Intermediate', jp: 'N3聴解', icon: Target },
    { id: 'N2', label: 'N2 Advanced', jp: 'N2聴解', icon: Target },
    { id: 'N1', label: 'N1 Fluent', jp: 'N1聴解', icon: Target },
  ];

  const topicCategories = [
    { id: 'conversation', label: 'Conversations', jp: '会話', icon: MessageCircle },
    { id: 'announcement', label: 'Announcements', jp: 'アナウンス', icon: Radio },
    { id: 'interview', label: 'Interviews', jp: 'インタビュー', icon: Mic },
    { id: 'monologue', label: 'Monologues', jp: '独白', icon: ListAudio },
  ];

  // 🚨 THE BOUNCER LOGIC
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsLoading(true);
        if (!user || !batchId || !categoryId) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        const userUid = user.uid;
        let masterAuth = false;
        let batchAuth = false;

        // 1. Check Master Authorization
        const lexiconRef = doc(db, 'lexicons', categoryId);
        const lexiconSnap = await getDoc(lexiconRef);
        if (lexiconSnap.exists() && (lexiconSnap.data().accessIds || []).includes(userUid)) {
          masterAuth = true;
          setIsMasterTeacher(true);
        }

        // 2. Check Batch Authorization
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        if (batchSnap.exists() && (batchSnap.data().teacherIds || []).includes(userUid)) {
          batchAuth = true;
        }

        // 3. BOUNCER
        if (!masterAuth && !batchAuth) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // 4. Fetch Hidden Overrides for this Batch
        const overridesRef = doc(db, `batches/${batchId}/lexicon_overrides`, categoryId);
        const overridesSnap = await getDoc(overridesRef);
        if (overridesSnap.exists()) {
          setHiddenCategories(overridesSnap.data().hiddenCategories || []);
          setHiddenAudio(overridesSnap.data().hiddenAudio || []); 
        }

        // 5. Fetch Listening Entries
        const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
        const entriesSnap = await getDocs(entriesRef);
        const allListening = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEntries(allListening);

      } catch (error) { 
        console.error("Failed to fetch database or check security:", error); 
        setAccessDenied(true);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [batchId, categoryId]);

  // VISIBILITY TOGGLES
  const toggleCategoryVisibility = async (e, catId) => {
    e.stopPropagation();
    const newHidden = hiddenCategories.includes(catId) ? hiddenCategories.filter(id => id !== catId) : [...hiddenCategories, catId];
    setHiddenCategories(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenCategories: newHidden }, { merge: true }); } catch (error) {}
  };

  const toggleAudioVisibility = async (e, audioId) => {
    e.stopPropagation(); 
    const newHidden = hiddenAudio.includes(audioId) ? hiddenAudio.filter(id => id !== audioId) : [...hiddenAudio, audioId];
    setHiddenAudio(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenAudio: newHidden }, { merge: true }); } catch (error) {}
  };

  // DYNAMIC FILTERING
  const displayData = entries.filter(entry => {
    let matchesCategory = false;
    if (activeCategory === 'all') matchesCategory = true;
    else if (['N5', 'N4', 'N3', 'N2', 'N1'].includes(activeCategory)) matchesCategory = entry.jlpt === activeCategory;
    else matchesCategory = entry.topic === activeCategory; 

    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (entry.title?.toLowerCase().includes(q)) || 
      (entry.description?.toLowerCase().includes(q)) || 
      (entry.tags?.some(tag => tag.toLowerCase().includes(q)));

    return matchesCategory && matchesSearch;
  });

  // UI HELPERS
  const getJlptColor = (level) => {
    switch(level) {
      case 'N5': return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'N4': return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'N3': return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200';
      case 'N2': return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200';
      case 'N1': return isDarkMode ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200';
      default: return isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // 🚨 ACCESS DENIED SCREEN
  if (accessDenied) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20">
          <ShieldAlert size={40}/>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
          You are not a collaborator or lead for this course, so you cannot access the lexicon management for this batch.
        </p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 ${isDarkMode ? 'opacity-20' : 'opacity-10'}`}></div>
      
      {/* SIDEBAR */}
      <aside className={`w-full md:w-72 shrink-0 border-r md:min-h-screen md:sticky top-0 z-10 flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#0F1523]/80 border-slate-800 backdrop-blur-2xl' : 'bg-white/80 border-slate-200 backdrop-blur-2xl'}`}>
        <div className="p-6 md:p-8 flex-1">
          
          <div className="flex items-center gap-3 mb-10 group">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
              <Headphones size={20} />
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-black tracking-tight leading-none">Listening Lexicon</h2>
              {isMasterTeacher ? (
                <button 
                  onClick={() => navigate(`/lexicon/${categoryId}/edit`)}
                  className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 transition-all outline-none ${isDarkMode ? 'text-indigo-400/70 hover:text-indigo-400' : 'text-indigo-600/70 hover:text-indigo-600'}`}
                >
                  Edit Database <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Master Database
                </span>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* JLPT TIERS */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Proficiency (JLPT)</p>
              <div className="space-y-1">
                {jlptCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const isCategoryHidden = hiddenCategories.includes(cat.id);

                  return (
                    <div key={cat.id} className="relative group flex items-center">
                      <button onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isActive ? (isDarkMode ? 'bg-indigo-500/10 text-indigo-400 font-bold shadow-inner' : 'bg-indigo-50 text-indigo-600 font-bold shadow-sm') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium')} ${isCategoryHidden ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-3"><Icon size={16} className={isActive ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : 'opacity-50'} /><span className="text-sm">{cat.label}</span></div>
                      </button>
                      {cat.id !== 'all' && (
                        <button onClick={(e) => toggleCategoryVisibility(e, cat.id)} className={`absolute right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isCategoryHidden ? (isDarkMode ? 'text-rose-400 hover:bg-rose-500/10 opacity-100' : 'text-rose-500 hover:bg-rose-50 opacity-100') : (isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-200')}`}>
                          {isCategoryHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOPICAL CATEGORIES */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Topics (話題)</p>
              <div className="space-y-1">
                {topicCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const isCategoryHidden = hiddenCategories.includes(cat.id);

                  return (
                    <div key={cat.id} className="relative group flex items-center">
                      <button onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isActive ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 font-bold shadow-inner' : 'bg-amber-50 text-amber-600 font-bold shadow-sm') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium')} ${isCategoryHidden ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-3"><Icon size={16} className={isActive ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : 'opacity-50'} /><span className="text-sm">{cat.label}</span></div>
                        <span className={`text-[10px] font-black tracking-wider ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{cat.jp}</span>
                      </button>
                      <button onClick={(e) => toggleCategoryVisibility(e, cat.id)} className={`absolute right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isCategoryHidden ? (isDarkMode ? 'text-rose-400 hover:bg-rose-500/10 opacity-100' : 'text-rose-500 hover:bg-rose-50 opacity-100') : (isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-200')}`}>
                        {isCategoryHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative z-10 p-6 md:p-10 max-w-[1200px] w-full mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className={`text-3xl font-black tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {[...jlptCategories, ...topicCategories].find(c => c.id === activeCategory)?.label || 'Listening'}
            </h1>
            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {displayData.length} audio tracks. 
              {hiddenCategories.includes(activeCategory) && <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md"><EyeOff size={10}/> Hidden</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className={`flex items-center gap-2 p-2.5 rounded-2xl border w-full sm:w-64 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20' : 'bg-white border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20'}`}>
              <Search size={16} className="text-slate-400 ml-1" />
              <input type="text" placeholder="Search tracks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
            </div>
          </div>
        </header>

        {/* LISTENING CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {displayData.map((track, index) => {
              const isHidden = hiddenAudio.includes(track.id);
              return (
                <motion.div 
                  key={track.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedEntry(track)}
                  className={`group relative p-6 rounded-[2rem] border-2 border-b-[6px] cursor-pointer transition-all active:border-b-2 active:translate-y-[4px] hover:-translate-y-1 flex flex-col justify-between ${
                    isDarkMode ? 'bg-[#151E2E] border-slate-700 hover:bg-[#1A233A] hover:border-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-400'
                  } ${isHidden ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-2">
                      <span className={`w-fit px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getJlptColor(track.jlpt)}`}>
                        {track.jlpt || 'N/A'}
                      </span>
                      {track.topic && <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{track.topic}</span>}
                    </div>

                    <button 
                      onClick={(e) => toggleAudioVisibility(e, track.id)} 
                      className={`p-2 rounded-xl transition-all ${isHidden ? (isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500') : (isDarkMode ? 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 opacity-0 group-hover:opacity-100')}`}
                    >
                      {isHidden ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>

                  <div>
                    <h3 className={`text-xl font-black tracking-tight mb-1 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{track.title}</h3>
                    <p className={`text-xs font-bold line-clamp-2 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{track.description}</p>
                    
                    <div className={`p-3 rounded-2xl flex items-center gap-3 transition-colors ${isDarkMode ? 'bg-[#0B1120] group-hover:bg-indigo-500/10' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
                      <div className={`p-2 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'} transition-colors`}>
                        <Play size={14} fill="currentColor" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'}`}>Listen Now</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* 🚨 LISTENING MODAL & PLAYER */}
      <AnimatePresence>
        {selectedEntry && (
          <ListeningModal 
            entry={selectedEntry} 
            onClose={() => setSelectedEntry(null)} 
            isDarkMode={isDarkMode} 
            getJlptColor={getJlptColor} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// 🚨 DEDICATED LISTENING MODAL COMPONENT
// ==========================================
function ListeningModal({ entry, onClose, isDarkMode, getJlptColor }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  
  // Progressive Reveal States
  const [showJp, setShowJp] = useState(false);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showEn, setShowEn] = useState(false);

  const audioRef = useRef(null);

  // Parse Native TTS vs Hosted URL
  const isUrl = (str) => str && (str.includes('http') || str.includes('.mp3') || str.includes('.wav'));

  const togglePlay = () => {
    if (!entry.audioUrl) {
      // Fallback Native TTS Playback
      if (!window.speechSynthesis) return alert("Browser does not support TTS.");
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(entry.transcript?.[0]?.jp || entry.title);
      utterance.lang = 'ja-JP';
      utterance.onend = () => {
        setIsPlaying(false);
        setReplayCount(prev => prev + 1);
      };
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setReplayCount(prev => prev + 1);
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      setReplayCount(prev => prev + 1);
    } else {
      togglePlay(); // Re-trigger Native TTS
    }
  };

  // Safe parsing for transcripts (Supports array of lines or single block)
  const transcriptLines = Array.isArray(entry.transcript) ? entry.transcript : (entry.transcript ? [entry.transcript] : []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`custom-scrollbar relative w-full max-w-3xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border shadow-2xl flex flex-col mt-auto sm:mt-0 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}
      >
        
        {/* MODAL HEADER & PLAYER */}
        <div className={`pt-12 pb-8 px-6 sm:px-10 shrink-0 flex flex-col items-center border-b text-center relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-b from-[#1A233A] to-[#0F1523] border-slate-800' : 'bg-gradient-to-b from-indigo-50/50 to-white border-slate-200'}`}>
          <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}><X size={20} /></button>
          
          {isUrl(entry.audioUrl) && (
            <audio ref={audioRef} src={entry.audioUrl} onEnded={handleAudioEnded} />
          )}

          <div className="flex flex-wrap gap-2 justify-center mb-6 relative z-10">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getJlptColor(entry.jlpt)}`}><GraduationCap size={12} className="inline mr-1 mb-0.5"/>{entry.jlpt || 'N/A'}</span>
            {entry.topic && <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{entry.topic}</span>}
          </div>

          <h2 className={`text-3xl md:text-4xl font-black mb-2 relative z-10 drop-shadow-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{entry.title}</h2>
          <p className={`text-sm font-bold relative z-10 max-w-lg mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{entry.description}</p>

          {/* 🚨 THE PLAYER CONTROLS */}
          <div className="flex items-center gap-6 relative z-10">
            
            {/* Replay Counter Display */}
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Replays</span>
              <span className={`text-xl font-black font-mono ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{replayCount}</span>
            </div>

            {/* Main Play Button */}
            <button 
              onClick={togglePlay} 
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 border-b-[6px] active:border-b-2 active:translate-y-[4px] ${isDarkMode ? 'bg-indigo-600 border-indigo-800 text-white shadow-indigo-900/20' : 'bg-indigo-500 border-indigo-700 text-white shadow-indigo-500/20'}`}
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
            </button>

            {/* Quick Replay Button */}
            <button 
              onClick={handleReplay}
              title="Restart Audio"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}
            >
              <RotateCcw size={20} />
            </button>

          </div>
        </div>

        {/* MODAL BODY: TRANSCRIPTS */}
        <div className="p-6 sm:p-10 space-y-8 relative z-10 shrink-0">
          
          {/* Progressive Reveal Controls */}
          <div className={`p-4 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reveal Transcript:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setShowJp(!showJp)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showJp ? (isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>日本語</button>
              <button onClick={() => setShowRomaji(!showRomaji)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showRomaji ? (isDarkMode ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>Romaji</button>
              <button onClick={() => setShowEn(!showEn)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showEn ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>English</button>
            </div>
          </div>

          {/* Transcript Content with Dividers */}
          {transcriptLines.length > 0 ? (
            <div className="space-y-6">
              {transcriptLines.map((line, idx) => (
                <div key={idx} className="relative">
                  
                  {/* Japanese Text */}
                  <div className={`transition-all duration-300 overflow-hidden ${showJp ? 'opacity-100 max-h-40 mb-2' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-2xl sm:text-3xl font-black leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{line.jp}</p>
                  </div>
                  
                  {/* Romaji Text */}
                  <div className={`transition-all duration-300 overflow-hidden ${showRomaji ? 'opacity-100 max-h-40 mb-3' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{line.romaji}</p>
                  </div>

                  {/* Divider strictly between Japanese block and English block */}
                  {(showJp || showRomaji) && showEn && (
                    <hr className={`my-3 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`} />
                  )}

                  {/* English Text */}
                  <div className={`transition-all duration-300 overflow-hidden ${showEn ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{line.en}</p>
                  </div>

                  {/* Major Divider between separate transcript lines (if more than 1) */}
                  {idx < transcriptLines.length - 1 && (
                     <hr className={`mt-6 border-t-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-8 rounded-2xl border border-dashed text-center ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No transcript provided for this audio.</p>
            </div>
          )}

          {/* Teacher Notes (If any) */}
          {entry.notes && (
            <div className={`mt-8 p-5 rounded-2xl border flex gap-4 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <MessageCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>Context / Note</h4>
                <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-amber-200/80' : 'text-amber-800'}`}>{entry.notes}</p>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}