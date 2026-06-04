import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, Search, Target, HelpCircle, ArrowLeft, Loader2, 
  Eye, EyeOff, CheckCircle2, XCircle, LayoutPanelLeft, LayoutPanelTop, 
  ChevronRight, BarChart3, Volume2, Sparkles, X, Edit3, Lock, Unlock, 
  ShieldAlert, SlidersHorizontal, ListAudio, Play, Pause, RotateCcw, RefreshCcw
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { collection, getDocs, doc, getDoc, query, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ListeningLexicon() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { batchId } = useParams(); 
  const categoryId = 'listening';

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚨 SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false); 
  const [hiddenIds, setHiddenIds] = useState([]);

  // 🚨 SEARCH & FILTER STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJlpt, setFilterJlpt] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // WORKSPACE STATE
  const [activeListening, setActiveListening] = useState(null);
  const [splitOrientation, setSplitOrientation] = useState('vertical'); 
  const [splitRatio, setSplitRatio] = useState(50); 
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // AUDIO & TRANSCRIPT STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [showJp, setShowJp] = useState(true);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const audioRef = useRef(null);

  // QUIZ STATE
  const [userAnswers, setUserAnswers] = useState({}); 
  const [showResults, setShowResults] = useState(false);

  const jlptOptions = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const topicOptions = [
    { id: 'conversation', label: 'Conversations' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'interview', label: 'Interviews' },
    { id: 'monologue', label: 'Monologues' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userUid = auth.currentUser?.uid;
        if (!userUid) { setAccessDenied(true); setIsLoading(false); return; }

        let masterAuth = false;
        let batchAuth = false;

        const lexSnap = await getDoc(doc(db, 'lexicons', categoryId));
        if (lexSnap.exists() && lexSnap.data().accessIds?.includes(userUid)) {
          masterAuth = true;
          setIsMasterTeacher(true);
        }

        if (batchId) {
          const batchSnap = await getDoc(doc(db, 'batches', batchId));
          if (batchSnap.exists() && batchSnap.data().teacherIds?.includes(userUid)) {
            batchAuth = true;
          }

          const overrideSnap = await getDoc(doc(db, `batches/${batchId}/lexicon_overrides/${categoryId}`));
          if (overrideSnap.exists()) {
            setHiddenIds(overrideSnap.data().hiddenAudio || []);
          }
        }

        if (!masterAuth && !batchAuth) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
        const snapshot = await getDocs(entriesRef);
        const allListening = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEntries(allListening);
      } catch (error) { 
        console.error("Failed to fetch database:", error); 
      } finally {
        setIsLoading(false);
      }
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if(user) fetchData();
      else { setAccessDenied(true); setIsLoading(false); }
    });
    return () => unsubscribe();
  }, [categoryId, batchId]);

  const toggleHideStatus = async (e, docId) => {
    e.stopPropagation();
    if (!batchId) return alert("Error: No Batch ID found in URL.");
    
    const isHidden = hiddenIds.includes(docId);
    const newHiddenIds = isHidden ? hiddenIds.filter(id => id !== docId) : [...hiddenIds, docId];
    setHiddenIds(newHiddenIds);
    
    try {
      const overrideRef = doc(db, `batches/${batchId}/lexicon_overrides/${categoryId}`);
      const snap = await getDoc(overrideRef);
      if (!snap.exists()) {
        await setDoc(overrideRef, { hiddenAudio: newHiddenIds });
      } else {
        await updateDoc(overrideRef, { hiddenAudio: isHidden ? arrayRemove(docId) : arrayUnion(docId) });
      }
    } catch (err) {
      console.error("Failed to update lock status", err);
      setHiddenIds(hiddenIds); 
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      let newRatio;
      if (splitOrientation === 'vertical') {
        const relativeX = e.clientX - containerRect.left;
        newRatio = (relativeX / containerRect.width) * 100;
      } else {
        const relativeY = e.clientY - containerRect.top;
        newRatio = (relativeY / containerRect.height) * 100;
      }
      if (newRatio > 25 && newRatio < 75) setSplitRatio(newRatio);
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = splitOrientation === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'auto';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, splitOrientation]);

  const handleOpenListening = (entry) => {
    setActiveListening(entry);
    setUserAnswers({});
    setShowResults(false);
    setSplitRatio(50);
    setIsPlaying(false);
    setReplayCount(0);
    setShowJp(true);
    setShowRomaji(false);
    setShowEn(false);
  };

  const handleAnswerSelect = (qIndex, optIndex) => {
    if (showResults) return; 
    setUserAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const calculateScore = () => {
    if (!activeListening || !activeListening.questions) return 0;
    let correct = 0;
    activeListening.questions.forEach((q, i) => { if (userAnswers[i] === q.correctIndex) correct++; });
    return Math.round((correct / activeListening.questions.length) * 100);
  };

  // AUDIO CONTROLS
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
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
    }
  };

  const filteredData = entries.filter(entry => {
    const matchJlpt = filterJlpt === 'all' || entry.jlpt === filterJlpt;
    const matchTopic = filterTopic === 'all' || entry.topic === filterTopic;

    const q = searchQuery.toLowerCase();
    const tagsArray = Array.isArray(entry.tags) ? entry.tags : (typeof entry.tags === 'string' ? entry.tags.split(',') : []);
    const searchTitle = (entry.titleJp || entry.title || entry.titleEn || '').toLowerCase();
    const searchDesc = (entry.description || entry.titleEn || '').toLowerCase();

    const matchSearch = searchTitle.includes(q) || searchDesc.includes(q) || tagsArray.some(tag => tag.toLowerCase().trim().includes(q));

    return matchJlpt && matchTopic && matchSearch;
  });

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
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20"><ShieldAlert size={40}/></div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 text-center max-w-md leading-relaxed">
          You are not a collaborator or lead for this course, so you cannot access the lexicon management for this batch.
        </p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>;

  // BUILD SAFE TRANSCRIPTS FOR WORKSPACE
  let activeTranscriptLines = [];
  if (activeListening) {
    if (Array.isArray(activeListening.transcript)) {
      activeTranscriptLines = activeListening.transcript;
    } else if (activeListening.transcript) {
      activeTranscriptLines = [activeListening.transcript];
    } else if (activeListening.transcriptJp || activeListening.transcriptEn) {
      activeTranscriptLines = [{ jp: activeListening.transcriptJp || '', en: activeListening.transcriptEn || '', romaji: activeListening.romaji || '' }];
    }
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {!activeListening && (
        <>
          <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className={`p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2"><Headphones size={24} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> Listening Library</h1>
                <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select an audio track to begin your immersion.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className={`flex flex-1 items-center gap-3 px-4 py-2.5 rounded-full min-w-[240px] transition-all ${isDarkMode ? 'bg-[#151E2E] focus-within:ring-1 focus-within:ring-slate-700' : 'bg-slate-100 focus-within:ring-1 focus-within:ring-slate-300'}`}>
                <Search size={14} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                <input type="text" placeholder="Search by title or topic..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
              </div>

              <button onClick={() => setIsFilterModalOpen(true)} title="Filter Library" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all relative ${isDarkMode ? 'bg-[#151E2E] text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'} ${(filterJlpt !== 'all' || filterTopic !== 'all') ? 'ring-2 ring-indigo-500' : ''}`}>
                <SlidersHorizontal size={16} />
                {(filterJlpt !== 'all' || filterTopic !== 'all') && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#0B1120]" />}
              </button>

              {isMasterTeacher && (
                <button 
                  onClick={() => navigate('/lexicon/listening/edit')} 
                  className={`p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-[#151E2E] text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Enter Architect Mode"
                >
                  <Edit3 size={16} />
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredData.map((doc, idx) => {
                const isHidden = hiddenIds.includes(doc.id);
                const trackTitle = doc.titleJp || doc.title || doc.titleEn || 'Untitled Audio';
                const trackDesc = doc.titleEn || doc.description || 'No description available.';
                
                return (
                  <motion.div 
                    key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, ease: "easeOut" }}
                    onClick={() => handleOpenListening(doc)}
                    className={`group relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all hover:-translate-y-1.5 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl ${isHidden ? 'opacity-70 grayscale-[30%]' : ''} ${isDarkMode ? 'bg-gradient-to-b from-[#151E2E] to-[#0F1523] border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-500/10' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/10'}`}
                  >
                    <button 
                      onClick={(e) => toggleHideStatus(e, doc.id)}
                      className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-all ${isHidden ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/40' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-emerald-400' : 'bg-slate-100 text-slate-500 hover:text-emerald-600')}`}
                      title={isHidden ? "Unlock to reveal to students" : "Lock to hide from students"}
                    >
                      {isHidden ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>

                    <div>
                      <div className="flex justify-between items-start mb-6 pr-8">
                        <div className="flex gap-2 items-center">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getJlptColor(doc.jlpt)}`}>
                            {doc.jlpt || 'N/A'}
                          </span>
                          {doc.topic && (
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                               <ListAudio size={10}/> {doc.topic}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {doc.timeLimit && <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><BarChart3 size={10}/> {doc.timeLimit}s</span>}
                          {doc.questions?.length > 0 && <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><HelpCircle size={10}/> {doc.questions.length}</span>}
                        </div>
                      </div>
                      
                      <h3 className={`text-2xl sm:text-3xl font-black tracking-tight mb-3 leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {trackTitle}
                      </h3>
                      <p className={`text-sm font-medium leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{trackDesc}</p>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isHidden ? 'text-rose-500' : (isDarkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600')}`}>
                        {isHidden ? 'Hidden from Students' : 'Begin Listening'}
                      </span>
                      <div className={`p-2 rounded-full transition-transform group-hover:translate-x-1 ${isHidden ? 'bg-rose-500/10 text-rose-500' : (isDarkMode ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600')}`}>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </main>
        </>
      )}

      {/* 🚨 THE IMMERSIVE WORKSPACE */}
      <AnimatePresence>
        {activeListening && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0A0F1C]' : 'bg-slate-100'}`}
          >
            <header className={`shrink-0 border-b px-4 py-3 flex items-center justify-between shadow-sm z-20 backdrop-blur-2xl ${isDarkMode ? 'bg-[#0F1523]/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveListening(null)} className={`p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`}><ArrowLeft size={18} /></button>
                <div className={`hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{activeListening.jlpt || 'N/A'}</span>
                  <span className="w-px h-3 bg-slate-400 opacity-30"></span>
                  <span className="text-xs font-bold truncate max-w-[250px]">{activeListening.titleJp || activeListening.title || 'Audio Practice'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSplitOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={`p-2.5 rounded-xl transition-all border shadow-sm ${isDarkMode ? 'bg-[#151E2E] text-slate-400 border-slate-700 hover:text-indigo-400 hover:border-indigo-500/50' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-300'}`}
                  title="Toggle Workspace Layout"
                >
                  {splitOrientation === 'vertical' ? <LayoutPanelTop size={16} /> : <LayoutPanelLeft size={16} />}
                </button>
              </div>
            </header>

            {/* AUDIO ENGINE ELEMENT (Hidden from view) */}
            <audio 
              ref={audioRef} 
              src={activeListening.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'} 
              onEnded={handleAudioEnded} 
            />

            <div ref={containerRef} className={`flex-1 overflow-hidden flex relative ${splitOrientation === 'vertical' ? 'flex-row' : 'flex-col'}`}>
              
              {/* PANE 1: AUDIO & TRANSCRIPT VIEW */}
              <div 
                className={`relative overflow-y-auto custom-scrollbar p-8 md:p-12 lg:p-16 transition-all duration-300 ease-out`}
                style={{ 
                  width: splitOrientation === 'vertical' ? `${splitRatio}%` : '100%',
                  height: splitOrientation === 'horizontal' ? `${splitRatio}%` : '100%'
                }}
              >
                <div className="max-w-3xl mx-auto pb-24">
                  <div className="mb-12 text-center sm:text-left border-b pb-12 border-slate-200 dark:border-slate-800">
                    <h1 className={`text-4xl sm:text-5xl font-black mb-8 leading-[1.2] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {activeListening.titleJp || activeListening.title || activeListening.titleEn}
                    </h1>
                    
                    {/* GIANT AUDIO CONTROLS */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-8">
                      <button 
                        onClick={togglePlay} 
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 border-b-[8px] active:border-b-2 active:translate-y-[6px] ${isDarkMode ? 'bg-indigo-600 border-indigo-800 text-white shadow-indigo-900/40' : 'bg-indigo-500 border-indigo-700 text-white shadow-indigo-500/30'}`}
                      >
                        {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                      </button>

                      <div className="flex gap-6 items-center">
                        <button 
                          onClick={handleReplay}
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors border-2 shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400'}`}
                          title="Restart Track"
                        >
                          <RotateCcw size={24} />
                        </button>
                        <div className="flex flex-col items-center sm:items-start">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Replays</span>
                          <span className={`text-3xl font-black font-mono leading-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{replayCount}</span>
                        </div>
                      </div>
                    </div>
                    {/* Notice for test audio if missing */}
                    {!activeListening.audioUrl && (
                      <p className="mt-4 text-xs font-bold text-amber-500 flex items-center justify-center sm:justify-start gap-2">
                        <ShieldAlert size={14}/> No URL provided. Playing fallback test audio.
                      </p>
                    )}
                  </div>

                  {/* 🚨 3-TIER TRANSCRIPT ENGINE */}
                  <div className="space-y-10">
                    <div className={`p-5 rounded-3xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className={`text-xs font-black uppercase tracking-widest ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Transcription:</span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setShowJp(!showJp)} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${showJp ? (isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white border text-slate-500')}`}>日本語</button>
                        <button onClick={() => setShowRomaji(!showRomaji)} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${showRomaji ? (isDarkMode ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white border text-slate-500')}`}>Romaji</button>
                        <button onClick={() => setShowEn(!showEn)} className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${showEn ? (isDarkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white') : (isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white border text-slate-500')}`}>English</button>
                      </div>
                    </div>

                    {activeTranscriptLines.length > 0 ? (
                      <div className="space-y-8">
                        {activeTranscriptLines.map((line, idx) => (
                          <div key={idx} className="relative">
                            <div className={`transition-all duration-300 overflow-hidden ${showJp ? 'opacity-100 mb-3' : 'opacity-0 h-0'}`}>
                              <p className={`text-2xl sm:text-3xl font-black leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{line.jp}</p>
                            </div>
                            <div className={`transition-all duration-300 overflow-hidden ${showRomaji ? 'opacity-100 mb-4' : 'opacity-0 h-0'}`}>
                              <p className={`text-base font-bold tracking-wide ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{line.romaji}</p>
                            </div>
                            {(showJp || showRomaji) && showEn && <hr className={`my-4 border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`} />}
                            <div className={`transition-all duration-300 overflow-hidden ${showEn ? 'opacity-100' : 'opacity-0 h-0'}`}>
                              <p className={`text-lg font-medium leading-relaxed ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{line.en}</p>
                            </div>
                            {idx < activeTranscriptLines.length - 1 && <hr className={`mt-8 border-t-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`} />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-10 rounded-[2rem] border-2 border-dashed text-center ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No transcript provided for this audio.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* GLASSMORPHISM DRAG BAR */}
              <div 
                onMouseDown={() => setIsDragging(true)}
                className={`relative flex items-center justify-center transition-all z-30 group
                  ${splitOrientation === 'vertical' ? 'w-4 cursor-col-resize flex-col -mx-2' : 'h-4 cursor-row-resize flex-row -my-2'}
                `}
              >
                <div className={`rounded-full shadow-sm transition-all duration-200 ${isDragging ? 'bg-indigo-500 scale-110 shadow-indigo-500/50' : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-400 group-hover:shadow-indigo-500/30'} 
                  ${splitOrientation === 'vertical' ? 'h-16 w-1.5' : 'w-16 h-1.5'}`}
                />
              </div>

              {/* PANE 2: THE QUIZ ENGINE */}
              <div 
                className={`overflow-y-auto custom-scrollbar p-6 md:p-10 transition-all duration-300 ease-out ${isDarkMode ? 'bg-[#0F1523] border-l border-slate-800' : 'bg-slate-50 border-l border-slate-200'}`}
                style={{ 
                  width: splitOrientation === 'vertical' ? `${100 - splitRatio}%` : '100%',
                  height: splitOrientation === 'horizontal' ? `${100 - splitRatio}%` : '100%'
                }}
              >
                <div className="max-w-2xl mx-auto space-y-8 pb-24">
                  
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"><Target size={20} /></div>
                      <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Comprehension Check</h2>
                    </div>
                  </div>

                  {activeListening.questions?.length > 0 ? (
                    <div className="space-y-10">
                      {activeListening.questions.map((q, qIndex) => {
                        const isCorrect = userAnswers[qIndex] === q.correctIndex;
                        const hasAnswered = userAnswers[qIndex] !== undefined;

                        return (
                          <div key={qIndex} className={`p-6 sm:p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${showResults ? (isCorrect ? 'border-emerald-500 bg-emerald-500/5 shadow-emerald-500/5' : 'border-rose-500 bg-rose-500/5 shadow-rose-500/5') : (isDarkMode ? 'border-slate-800 bg-[#151E2E] shadow-sm' : 'border-white bg-white shadow-md')}`}>
                            
                            <div className="mb-8">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border inline-block mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>Question {qIndex + 1}</span>
                              <p className={`text-xl sm:text-2xl font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{q.questionJp}</p>
                              {showEn && <p className={`text-sm font-medium mt-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{q.questionEn}</p>}
                            </div>

                            <div className="space-y-3">
                              {q.options.map((opt, optIndex) => {
                                const isSelected = userAnswers[qIndex] === optIndex;
                                const isActuallyCorrect = q.correctIndex === optIndex;
                                
                                let cardClass = `w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group `;
                                
                                if (showResults) {
                                  if (isActuallyCorrect) cardClass += 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
                                  else if (isSelected && !isActuallyCorrect) cardClass += 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 opacity-80';
                                  else cardClass += isDarkMode ? 'border-slate-800 bg-[#0B1120]/50 text-slate-600' : 'border-slate-200 bg-slate-50 text-slate-400';
                                } else {
                                  if (isSelected) cardClass += isDarkMode ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' : 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]';
                                  else cardClass += isDarkMode ? 'border-slate-700 bg-[#0B1120] text-slate-300 hover:border-slate-500 hover:bg-[#151E2E]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm';
                                }

                                return (
                                  <button key={optIndex} disabled={showResults} onClick={() => handleAnswerSelect(qIndex, optIndex)} className={cardClass}>
                                    <div className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 transition-all duration-300 ${showResults ? (isActuallyCorrect ? 'border-emerald-500 bg-emerald-500' : isSelected ? 'border-rose-500 bg-rose-500' : 'border-slate-300 dark:border-slate-700') : (isSelected ? 'border-indigo-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400')}`}>
                                      {showResults ? (
                                        isActuallyCorrect ? <CheckCircle2 size={14} className="text-white"/> : isSelected ? <XCircle size={14} className="text-white"/> : null
                                      ) : (
                                        <motion.div initial={false} animate={{ scale: isSelected ? 1 : 0 }} className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                      )}
                                    </div>
                                    <span className="font-bold text-base break-words break-all">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <AnimatePresence>
                              {showResults && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
                                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1120] border dark:border-slate-800 shadow-sm">
                                    <div className={`p-2 rounded-xl shrink-0 ${isCorrect ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                      <HelpCircle size={20} />
                                    </div>
                                    <div>
                                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>{isCorrect ? 'Correct reasoning' : 'Why it was incorrect'}</h4>
                                      <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{q.explanation || 'No explanation provided.'}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`p-10 rounded-[2.5rem] border-2 border-dashed text-center ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                      <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No questions available for this track.</p>
                    </div>
                  )}

                  {activeListening.questions?.length > 0 && (
                    <div className="mt-12 pt-8 flex flex-col items-center">
                      {!showResults ? (
                        <button 
                          onClick={() => setShowResults(true)}
                          disabled={Object.keys(userAnswers).length < activeListening.questions.length}
                          className={`w-full max-w-sm py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${Object.keys(userAnswers).length < activeListening.questions.length ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:-translate-y-1 shadow-xl shadow-indigo-500/30'}`}
                        >
                          <CheckCircle2 size={18} /> Grade My Answers
                        </button>
                      ) : (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full max-w-sm p-8 rounded-[2.5rem] border-2 text-center relative overflow-hidden ${calculateScore() >= 80 ? 'border-emerald-500 bg-emerald-500/5' : calculateScore() >= 50 ? 'border-amber-500 bg-amber-500/5' : 'border-rose-500 bg-rose-500/5'}`}>
                          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-3xl rounded-full opacity-20 ${calculateScore() >= 80 ? 'bg-emerald-500' : calculateScore() >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                          
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Final Listening Score</p>
                          <p className={`text-6xl font-black drop-shadow-sm mb-6 ${calculateScore() >= 80 ? 'text-emerald-500' : calculateScore() >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {calculateScore()}%
                          </p>
                          
                          <button onClick={() => { setUserAnswers({}); setShowResults(false); }} className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isDarkMode ? 'bg-[#151E2E] hover:bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}>
                            <RefreshCcw size={14} className="inline mr-2" /> Retake Quiz
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

    </div>
  );
}