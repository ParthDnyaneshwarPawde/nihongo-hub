import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Lock, Unlock, Edit3, X, Play, Pause, 
  RotateCcw, GraduationCap, Loader2, ShieldAlert, 
  MessageCircle, Volume2, ArrowLeft, Headphones, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ListeningLexicon() {
  const { isDarkMode } = useTheme();
  const categoryId = 'listening';
  const { batchId } = useParams(); 
  const navigate = useNavigate();

  // 🚨 SEARCH & FILTER STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJlpt, setFilterJlpt] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState(null);

  // SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false);
  
  // BATCH OVERRIDES
  const [hiddenAudio, setHiddenAudio] = useState([]);

  // DATABASE STATE
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // CATEGORY MAPS
  const jlptOptions = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const topicOptions = [
    { id: 'conversation', label: 'Conversations' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'interview', label: 'Interviews' },
    { id: 'monologue', label: 'Monologues' },
  ];

  // 🚨 THE BOUNCER & FETCH LOGIC
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
          setHiddenAudio(overridesSnap.data().hiddenAudio || []); 
        }

        // 5. Fetch Listening Entries
        const q = query(collection(db, `lexicons/${categoryId}/entries`));
        const entriesSnap = await getDocs(q);
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

  // VISIBILITY TOGGLE (TRACK LEVEL)
  const toggleAudioVisibility = async (e, audioId) => {
    e.stopPropagation(); 
    const newHidden = hiddenAudio.includes(audioId) ? hiddenAudio.filter(id => id !== audioId) : [...hiddenAudio, audioId];
    setHiddenAudio(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenAudio: newHidden }, { merge: true }); } catch (error) {}
  };

  // DYNAMIC FILTERING
  const displayData = entries.filter(entry => {
    const matchJlpt = filterJlpt === 'all' || entry.jlpt === filterJlpt;
    const matchTopic = filterTopic === 'all' || entry.topic === filterTopic;

    const q = searchQuery.toLowerCase();
    const tagsArray = Array.isArray(entry.tags) ? entry.tags : (typeof entry.tags === 'string' ? entry.tags.split(',') : []);
    const searchTitle = (entry.titleJp || entry.title || entry.titleEn || '').toLowerCase();
    const searchDesc = (entry.description || entry.titleEn || '').toLowerCase();

    const matchSearch = searchTitle.includes(q) || searchDesc.includes(q) || tagsArray.some(tag => tag.toLowerCase().trim().includes(q));

    return matchJlpt && matchTopic && matchSearch;
  });

  // UI HELPERS
  const getJlptColor = (level) => {
    switch(level) {
      case 'N5': return isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600';
      case 'N4': return isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600';
      case 'N3': return isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600';
      case 'N2': return isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600';
      case 'N1': return isDarkMode ? 'bg-fuchsia-500/10 text-fuchsia-400' : 'bg-fuchsia-50 text-fuchsia-600';
      default: return isDarkMode ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-50 text-slate-600';
    }
  };

  if (accessDenied) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20"><ShieldAlert size={40}/></div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">You are not a collaborator or lead for this course, so you cannot access the lexicon management for this batch.</p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">Return to Dashboard</button>
      </div>
    );
  }

  if (isLoading) return <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B1120]' : 'bg-slate-50'}`}><Loader2 size={40} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className={`min-h-screen pb-32 animate-in fade-in duration-700 relative ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 🚨 THE SLEEK READING-STYLE HEADER */}
      <div className={`sticky top-0 z-40 border-b backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
             <button onClick={() => navigate(-1)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#151E2E] text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
               <ArrowLeft size={18}/>
             </button>
             <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Headphones size={20} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                  <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Listening Library</h2>
                </div>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select an audio track to begin your immersion.</p>
             </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* Pill Search Bar */}
            <div className={`flex flex-1 items-center gap-3 px-4 py-2.5 rounded-full min-w-[240px] transition-all ${isDarkMode ? 'bg-[#151E2E] focus-within:ring-1 focus-within:ring-slate-700' : 'bg-slate-100 focus-within:ring-1 focus-within:ring-slate-300'}`}>
              <Search size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
              <input type="text" placeholder="Search by title or topic..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
            </div>

            {/* The Compact Filter Button */}
            <button onClick={() => setIsFilterModalOpen(true)} title="Filter Library" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all relative ${isDarkMode ? 'bg-[#151E2E] text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'} ${(filterJlpt !== 'all' || filterTopic !== 'all') ? 'ring-2 ring-indigo-500' : ''}`}>
              <SlidersHorizontal size={16} />
              {(filterJlpt !== 'all' || filterTopic !== 'all') && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#0B1120]" />}
            </button>

            {/* Edit Master Button */}
            {isMasterTeacher && (
              <button onClick={() => navigate(`/lexicon/${categoryId}/edit`)} title="Edit Master Database" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#151E2E] text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                <Edit3 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-10 relative z-10">
        
        {/* CARDS GRID (Matched exactly to Reading Library Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {displayData.map((track, index) => {
              const isHidden = hiddenAudio.includes(track.id);
              const trackTitle = track.titleJp || track.title || track.titleEn || 'Untitled Audio';
              const trackDesc = track.titleEn || track.description || 'No description available.';

              return (
                <motion.div 
                  key={track.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedEntry(track)}
                  className={`group relative p-6 md:p-8 rounded-[2rem] border cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between min-h-[260px] ${
                    isDarkMode ? 'bg-[#151E2E]/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${isHidden ? 'opacity-70 grayscale' : ''}`}
                >
                  
                  {/* Top Row: Tags & Lock */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2 items-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getJlptColor(track.jlpt)}`}>
                        {track.jlpt || 'N/A'}
                      </span>
                      {track.topic && (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                           <Volume2 size={10}/> {track.topic}
                        </span>
                      )}
                    </div>

                    <button 
                      onClick={(e) => toggleAudioVisibility(e, track.id)} 
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isHidden 
                        ? (isDarkMode ? 'bg-rose-500/10 text-rose-500' : 'bg-rose-50 text-rose-600') 
                        : (isDarkMode ? 'bg-slate-800/50 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100' : 'bg-slate-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100')
                      }`}
                    >
                      {isHidden ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>

                  {/* Middle: Titles */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className={`text-2xl md:text-[28px] font-black tracking-tight mb-2 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{trackTitle}</h3>
                    <p className={`text-sm font-medium leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{trackDesc}</p>
                  </div>
                  
                  {/* Bottom Row */}
                  <div className="flex items-center justify-between mt-8">
                    {isHidden ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                        Hidden from Students
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-transparent select-none">
                        Available
                      </span>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900'}`}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {displayData.length === 0 && !isLoading && (
             <div className={`col-span-full py-20 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center ${isDarkMode ? 'border-slate-800 bg-[#151E2E]/50' : 'border-slate-300 bg-white/50'}`}>
               <Headphones size={40} className={`mb-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
               <h4 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Audio Found</h4>
               <p className="text-sm font-medium text-slate-500 max-w-md">Try adjusting your filters or searching for a different keyword.</p>
             </div>
          )}
        </div>
      </div>

      {/* 🚨 FILTER DIALOGUE MODAL */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFilterModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-sm rounded-[2rem] border shadow-2xl p-6 md:p-8 ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-white border-slate-200'}`}>
              
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-lg font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <SlidersHorizontal size={18} className="text-indigo-500" /> Filter Library
                </h3>
                <button onClick={() => setIsFilterModalOpen(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}><X size={16} /></button>
              </div>

              {/* JLPT Pills */}
              <div className="mb-8">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Proficiency (JLPT)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterJlpt('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterJlpt === 'all' ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>Any</button>
                  {jlptOptions.map(opt => (
                    <button key={opt} onClick={() => setFilterJlpt(opt)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterJlpt === opt ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>{opt}</button>
                  ))}
                </div>
              </div>

              {/* Topic Pills */}
              <div className="mb-8">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Topics (話題)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterTopic('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterTopic === 'all' ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>All Topics</button>
                  {topicOptions.map(opt => (
                    <button key={opt.id} onClick={() => setFilterTopic(opt.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterTopic === opt.id ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={() => setIsFilterModalOpen(false)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                Apply Filters
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
  
  const [showJp, setShowJp] = useState(false);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showEn, setShowEn] = useState(false);

  const audioRef = useRef(null);

  const modalTitle = entry.titleJp || entry.title || entry.titleEn || 'Untitled Audio';
  const modalDesc = entry.titleEn || entry.description || 'No description available.';

  let transcriptLines = [];
  if (Array.isArray(entry.transcript)) {
    transcriptLines = entry.transcript;
  } else if (entry.transcript) {
    transcriptLines = [entry.transcript];
  } else if (entry.transcriptJp || entry.transcriptEn) {
    transcriptLines = [{ jp: entry.transcriptJp || '', en: entry.transcriptEn || '', romaji: entry.romaji || '' }];
  }

  const isUrl = (str) => str && (str.includes('http') || str.includes('.mp3') || str.includes('.wav'));

  const togglePlay = () => {
    if (!entry.audioUrl) {
      if (!window.speechSynthesis) return alert("Browser does not support TTS.");
      window.speechSynthesis.cancel();
      const textToSpeak = transcriptLines[0]?.jp || modalTitle;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ja-JP';
      utterance.onend = () => { setIsPlaying(false); setReplayCount(prev => prev + 1); };
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
      return;
    }
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => { setIsPlaying(false); setReplayCount(prev => prev + 1); };
  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; audioRef.current.play();
      setIsPlaying(true); setReplayCount(prev => prev + 1);
    } else { togglePlay(); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`custom-scrollbar relative w-full max-w-3xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border shadow-2xl flex flex-col mt-auto sm:mt-0 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <div className={`pt-12 pb-8 px-6 sm:px-10 shrink-0 flex flex-col items-center border-b text-center relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-b from-[#1A233A] to-[#0F1523] border-slate-800' : 'bg-gradient-to-b from-indigo-50/50 to-white border-slate-200'}`}>
          <button onClick={onClose} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}><X size={20} /></button>
          
          {isUrl(entry.audioUrl) && <audio ref={audioRef} src={entry.audioUrl} onEnded={handleAudioEnded} />}

          <div className="flex flex-wrap gap-2 justify-center mb-6 relative z-10">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getJlptColor(entry.jlpt)}`}>{entry.jlpt || 'N/A'}</span>
            {entry.topic && <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{entry.topic}</span>}
          </div>

          <h2 className={`text-3xl md:text-4xl font-black mb-2 relative z-10 drop-shadow-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{modalTitle}</h2>
          <p className={`text-sm font-bold relative z-10 max-w-lg mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{modalDesc}</p>

          <div className="flex items-center gap-6 relative z-10">
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Replays</span>
              <span className={`text-xl font-black font-mono ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{replayCount}</span>
            </div>
            <button onClick={togglePlay} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 border-b-[6px] active:border-b-2 active:translate-y-[4px] ${isDarkMode ? 'bg-indigo-600 border-indigo-800 text-white shadow-indigo-900/20' : 'bg-indigo-500 border-indigo-700 text-white shadow-indigo-500/20'}`}>
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
            </button>
            <button onClick={handleReplay} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}><RotateCcw size={20} /></button>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8 relative z-10 shrink-0">
          <div className={`p-4 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reveal Transcript:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setShowJp(!showJp)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showJp ? (isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>日本語</button>
              <button onClick={() => setShowRomaji(!showRomaji)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showRomaji ? (isDarkMode ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>Romaji</button>
              <button onClick={() => setShowEn(!showEn)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${showEn ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border text-slate-500')}`}>English</button>
            </div>
          </div>

          {transcriptLines.length > 0 ? (
            <div className="space-y-6">
              {transcriptLines.map((line, idx) => (
                <div key={idx} className="relative">
                  <div className={`transition-all duration-300 overflow-hidden ${showJp ? 'opacity-100 max-h-40 mb-2' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-2xl sm:text-3xl font-black leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{line.jp}</p>
                  </div>
                  <div className={`transition-all duration-300 overflow-hidden ${showRomaji ? 'opacity-100 max-h-40 mb-3' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{line.romaji}</p>
                  </div>
                  {(showJp || showRomaji) && showEn && <hr className={`my-3 border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`} />}
                  <div className={`transition-all duration-300 overflow-hidden ${showEn ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'}`}>
                    <p className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{line.en}</p>
                  </div>
                  {idx < transcriptLines.length - 1 && <hr className={`mt-6 border-t-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`} />}
                </div>
              ))}
            </div>
          ) : (
            <div className={`p-8 rounded-2xl border border-dashed text-center ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No transcript provided for this audio.</p>
            </div>
          )}

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