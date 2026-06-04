import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, Target, HelpCircle, ArrowLeft, Loader2, 
  Eye, EyeOff, CheckCircle2, XCircle, LayoutPanelLeft, LayoutPanelTop, 
  GripVertical, GripHorizontal, ChevronRight, BarChart3, Volume2, Sparkles,
  Type, Sliders, X, Bookmark, Edit3, Highlighter, SlidersHorizontal, Lock, Unlock, ShieldAlert, Headphones, RefreshCcw
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { collection, getDocs, doc, getDoc, query, where, limit, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// SMART FURIGANA PARSER
const parseFurigana = (text, highlightMap, onWordClick, showHighlights) => {
  if (!text) return null;
  const highlightWords = Object.keys(highlightMap);

  const checkHighlight = (word, isRuby) => {
    let baseClass = isRuby ? "mx-[1px] " : "";
    if (!showHighlights) return baseClass + "transition-colors duration-200";

    const type = highlightMap[word];
    if (type === 'vocab') return baseClass + "cursor-pointer text-emerald-700 dark:text-emerald-300 border-b-[2.5px] border-dotted border-emerald-400 dark:border-emerald-600 hover:bg-emerald-500/10 rounded-t px-0.5 transition-colors duration-200";
    if (type === 'grammar') return baseClass + "cursor-pointer text-fuchsia-700 dark:text-fuchsia-300 border-b-[2.5px] border-dotted border-fuchsia-400 dark:border-fuchsia-600 hover:bg-fuchsia-500/10 rounded-t px-0.5 transition-colors duration-200";
    
    return baseClass + "cursor-pointer hover:bg-slate-500/10 rounded px-0.5 transition-colors duration-200";
  };

  const getRtColor = (word) => {
    if (showHighlights && highlightMap[word] === 'vocab') return 'text-emerald-600 dark:text-emerald-400';
    if (showHighlights && highlightMap[word] === 'grammar') return 'text-fuchsia-600 dark:text-fuchsia-400';
    return 'text-emerald-600 dark:text-emerald-500'; 
  };

  const handleInteraction = (e, word) => {
    if (!showHighlights) return; 
    e.stopPropagation();
    onWordClick(word);
  };

  const parts = text.split(/([^\s\[\]]+?\[.*?\])/g);
  const sortedTargets = [...highlightWords].sort((a, b) => b.length - a.length);
  const targetRegex = sortedTargets.length > 0 ? new RegExp(`(${sortedTargets.map(escapeRegExp).join('|')})`, 'g') : null;

  return parts.map((part, index) => {
    const match = part.match(/(.+?)\[(.*?)\]/);
    if (match) {
      const fullBase = match[1];
      const furigana = match[2];

      if (fullBase.includes('|')) {
        const borderIndex = fullBase.lastIndexOf('|');
        const cleanPrefix = fullBase.substring(0, borderIndex);
        const targetedKanji = fullBase.substring(borderIndex + 1);

        return (
          <React.Fragment key={index}>
            {cleanPrefix}
            <ruby onClick={(e) => handleInteraction(e, targetedKanji)} className={checkHighlight(targetedKanji, true)}>
              {targetedKanji}
              <rt className={`text-[0.6em] font-bold select-none tracking-normal normal-case antialiased -translate-y-0.5 transition-colors ${getRtColor(targetedKanji)}`}>{furigana}</rt>
            </ruby>
          </React.Fragment>
        );
      }
      return (
        <ruby key={index} onClick={(e) => handleInteraction(e, fullBase)} className={checkHighlight(fullBase, true)}>
          {fullBase}
          <rt className={`text-[0.6em] font-bold select-none tracking-normal normal-case antialiased -translate-y-0.5 transition-colors ${getRtColor(fullBase)}`}>{furigana}</rt>
        </ruby>
      );
    }

    if (targetRegex) {
      const subParts = part.split(targetRegex);
      return subParts.map((subWord, swIdx) => {
        if (!subWord) return null;
        if (highlightMap[subWord]) return <span key={`t-${index}-${swIdx}`} onClick={(e) => handleInteraction(e, subWord)} className={checkHighlight(subWord, false)}>{subWord}</span>;
        
        const normalWords = subWord.split(/([、。！\?\s])/g);
        return normalWords.map((nWord, nwIdx) => {
          if (!nWord) return null;
          if (/[、。！\?\s]/.test(nWord)) return <span key={`punc-${index}-${swIdx}-${nwIdx}`}>{nWord}</span>;
          return <span key={`norm-${index}-${swIdx}-${nwIdx}`} onClick={(e) => handleInteraction(e, nWord)} className={checkHighlight(nWord, false)}>{nWord}</span>;
        });
      });
    }

    const words = part.split(/([、。！\?\s])/g);
    return words.map((word, wIdx) => {
      if (/[、。！\?\s]/.test(word)) return <span key={`punc-${index}-${wIdx}`}>{word}</span>;
      if (!word) return null;
      return <span key={`word-${index}-${wIdx}`} onClick={(e) => handleInteraction(e, word)} className={checkHighlight(word, false)}>{word}</span>;
    });
  });
};

export default function ReadingLexicon() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { batchId } = useParams(); 
  const categoryId = 'reading';

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // const [searchQuery, setSearchQuery] = useState('');
  
  // 🚨 NEW FILTER STATES
  const [filterJlpt, setFilterJlpt] = useState('all');
  const [filterGenre, setFilterGenre] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // 🚨 FILTER OPTIONS
  const jlptOptions = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const genreOptions = [
    { id: 'story', label: 'Story / Tale' },
    { id: 'news', label: 'News / Article' },
    { id: 'essay', label: 'Essay / Blog' },
    { id: 'dialogue', label: 'Dialogue / Chat' },
    { id: 'notice', label: 'Notice / Flyer' },
    { id: 'email', label: 'Email / Letter' }
  ];
  
  // 🚨 SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false); // Can Edit & Lock
  const [hiddenIds, setHiddenIds] = useState([]);

  // WORKSPACE STATE
  const [activeReading, setActiveReading] = useState(null);
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState('vertical'); 
  const [splitRatio, setSplitRatio] = useState(50); 
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const [userAnswers, setUserAnswers] = useState({}); 
  const [showResults, setShowResults] = useState(false);

  // TYPOGRAPHY CONFIG 
  const [showTypeControls, setShowTypeControls] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false); 
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('reading_fontSize')) || 20);
  const [lineSpacing, setLineSpacing] = useState(() => parseFloat(localStorage.getItem('reading_lineSpacing')) || 2.5);

  useEffect(() => {
    localStorage.setItem('reading_fontSize', fontSize);
    localStorage.setItem('reading_lineSpacing', lineSpacing);
  }, [fontSize, lineSpacing]);

  const [dictionaryMap, setDictionaryMap] = useState({}); 
  const [highlightMap, setHighlightMap] = useState({}); 
  const [lookupTarget, setLookupTarget] = useState(null); 
  const [isBuildingDict, setIsBuildingDict] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userUid = auth.currentUser?.uid;
        if (!userUid) { setAccessDenied(true); setIsLoading(false); return; }

        let masterAuth = false;
        let batchAuth = false;

        // 🚨 THE BOUNCER LOGIC
        // 1. Check if they are a Master Teacher (God Mode)
        const lexSnap = await getDoc(doc(db, 'lexicons', categoryId));
        if (lexSnap.exists() && lexSnap.data().accessIds?.includes(userUid)) {
          masterAuth = true;
          setIsMasterTeacher(true);
        }

        // 2. Check if they are a Collaborator/Lead for this specific Batch
        if (batchId) {
          const batchSnap = await getDoc(doc(db, 'batches', batchId));
          if (batchSnap.exists() && batchSnap.data().teacherIds?.includes(userUid)) {
            batchAuth = true;
          }

          // Fetch the hidden words list
          const overrideSnap = await getDoc(doc(db, `batches/${batchId}/lexicon_overrides/${categoryId}`));
          if (overrideSnap.exists()) {
            setHiddenIds(overrideSnap.data().hiddenPara || []);
          }
        }

        // 3. EXECUTE BOUNCER: If neither, kick them out
        if (!masterAuth && !batchAuth) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // 4. If passed, fetch Lexicon DB Entries
        const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
        const snapshot = await getDocs(entriesRef);
        const allReadings = snapshot.docs.map(d => d.data()).filter(e => e.type === 'reading');
        setEntries(allReadings);
      } catch (error) { 
        console.error("Failed to fetch database:", error); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [categoryId, batchId]);

  // BATCH LEVEL LOCK/HIDE FUNCTION
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
        await setDoc(overrideRef, { hiddenPara: newHiddenIds });
      } else {
        await updateDoc(overrideRef, { hiddenPara: isHidden ? arrayRemove(docId) : arrayUnion(docId) });
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

  const playNativeAudio = (text) => {
    if (!text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      let cleanText = text.replace(/\[.*?\]/g, '');
      cleanText = cleanText.replace(/\|/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85; 

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
      if (jaVoice) utterance.voice = jaVoice;

      window.speechSynthesis.speak(utterance);
    } catch (error) { console.error(error); }
  };

  const loadTargetDictionary = async (entry) => {
    setIsBuildingDict(true);
    
    const rawVocab = (entry.targetVocab || '').split(',').map(s => s.trim()).filter(Boolean);
    const rawGrammar = (entry.targetGrammar || '').split(',').map(s => s.trim()).filter(Boolean);

    const newDict = {};
    const newHighlightMap = {};

    const processTokens = async (tokens, defaultType) => {
      for (const token of tokens) {
        try {
          const explicitMatch = token.match(/^(.+?)[:：]\s*\[(.+?)\]$/);
          
          if (explicitMatch) {
            const rawWord = explicitMatch[1].trim();
            const cleanWord = rawWord.replace(/^[〜~]+/, '').trim(); 
            const id = explicitMatch[2].trim();
            const collectionName = id.startsWith('gr_') ? 'grammar' : id.startsWith('k_') ? 'kanji' : 'vocab';
            
            const snap = await getDoc(doc(db, `lexicons/${collectionName}/entries`, id));
            if (snap.exists()) {
              newDict[cleanWord] = snap.data();
              newHighlightMap[cleanWord] = defaultType;
            } else {
              newDict[cleanWord] = { isRawString: true, text: cleanWord, placeholder: "ID not found in database." };
              newHighlightMap[cleanWord] = defaultType;
            }
          } 
          else if (token.startsWith('[') && token.endsWith(']')) {
            const id = token.slice(1, -1).trim();
            const collectionName = id.startsWith('gr_') ? 'grammar' : id.startsWith('k_') ? 'kanji' : 'vocab';
            
            const snap = await getDoc(doc(db, `lexicons/${collectionName}/entries`, id));
            if (snap.exists()) {
              const data = snap.data();
              let hitText = data.kanji || data.symbol || data.grammar || id;
              hitText = hitText.replace(/^[〜~]+/, '').trim(); 
              newDict[hitText] = data;
              newHighlightMap[hitText] = defaultType;
            }
          } 
          else {
            const collectionTarget = defaultType === 'grammar' ? 'grammar' : 'vocab';
            const fieldTarget = defaultType === 'grammar' ? 'grammar' : 'kanji';
            
            const cleanToken = token.replace(/^[〜~]+/, '').trim(); 
            
            const dbQuery = query(collection(db, `lexicons/${collectionTarget}/entries`), where(fieldTarget, '==', cleanToken), limit(1));
            const snap = await getDocs(dbQuery);
            
            if (!snap.empty) {
              newDict[cleanToken] = snap.docs[0].data();
              newHighlightMap[cleanToken] = defaultType;
            } else {
              newDict[cleanToken] = { isRawString: true, text: token };
              newHighlightMap[cleanToken] = defaultType;
            }
          }
        } catch (err) {
          console.error("Dictionary link error:", err);
        }
      }
    };

    await processTokens(rawVocab, 'vocab');
    await processTokens(rawGrammar, 'grammar');

    setDictionaryMap(newDict);
    setHighlightMap(newHighlightMap);
    setIsBuildingDict(false);
  };

  const handleOpenReading = (entry) => {
    setActiveReading(entry);
    setUserAnswers({});
    setShowResults(false);
    setIsStudyMode(false);
    setSplitRatio(50);
    setLookupTarget(null);
    setShowTypeControls(false);
    setShowHighlights(false); 
    
    loadTargetDictionary(entry);
  };

  const handleWordClick = (word) => {
    if (!activeReading) return;
    
    if (dictionaryMap[word]) {
      setLookupTarget({ word, data: dictionaryMap[word], type: highlightMap[word] });
    } else {
      setLookupTarget({ word, data: { isRawString: true, text: word, placeholder: "Definition not mapped." }, type: 'raw' });
    }
  };

  const handleAnswerSelect = (qIndex, optIndex) => {
    if (showResults) return; 
    setUserAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const calculateScore = () => {
    if (!activeReading) return 0;
    let correct = 0;
    activeReading.questions.forEach((q, i) => { if (userAnswers[i] === q.correctIndex) correct++; });
    return Math.round((correct / activeReading.questions.length) * 100);
  };

  const filteredData = entries.filter(entry => {
    // Check dropdowns
    const matchJlpt = filterJlpt === 'all' || entry.jlpt === filterJlpt;
    const matchGenre = filterGenre === 'all' || 
      (entry.genre && entry.genre.toLowerCase() === filterGenre.toLowerCase());

    // Check search query
    const q = searchQuery.toLowerCase();
    const searchTitleJp = (entry.titleJp || '').toLowerCase();
    const searchTitleEn = (entry.titleEn || '').toLowerCase();
    const matchSearch = searchTitleJp.includes(q) || searchTitleEn.includes(q);

    return matchJlpt && matchGenre && matchSearch;
  });

  // 🚨 ACCESS DENIED SCREEN
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

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {!activeReading && (
        <>
          <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className={`p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2"><BookOpen size={24} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> Reading Library</h1>
                <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select a passage to begin your immersion.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className={`flex items-center gap-3 p-3 rounded-2xl border w-full sm:w-80 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-400'}`}>
                <Search size={18} className="text-slate-400 ml-1" />
                <input type="text" placeholder="Search by title or topic..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-sm font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
              </div>

              <button 
                onClick={() => setIsFilterModalOpen(true)} 
                title="Filter Library" 
                className={`p-3 shrink-0 rounded-2xl transition-all border relative shadow-sm ${isDarkMode ? 'bg-[#151E2E] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50'} ${(filterJlpt !== 'all' || filterGenre !== 'all') ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <SlidersHorizontal size={18} />
                {(filterJlpt !== 'all' || filterGenre !== 'all') && <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[#0B1120]" />}
              </button>
              
              {/* 🚨 ONLY MASTER TEACHER CAN SEE EDIT BUTTON */}
              {isMasterTeacher && (
                <button 
                  onClick={() => navigate('/lexicon/reading/edit')} 
                  className={`p-3 rounded-2xl border transition-all opacity-30 hover:opacity-100 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-indigo-500/20' : 'bg-slate-200 border-slate-300 text-indigo-600 hover:bg-indigo-50'}`}
                  title="Enter Architect Mode"
                >
                  <Edit3 size={18} />
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredData.map((doc, idx) => {
                const isHidden = hiddenIds.includes(doc.id);
                
                return (
                  <motion.div 
                    key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, ease: "easeOut" }}
                    onClick={() => handleOpenReading(doc)}
                    className={`group relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all hover:-translate-y-1.5 flex flex-col justify-between min-h-[260px] shadow-sm hover:shadow-xl ${isHidden ? 'opacity-70 grayscale-[30%]' : ''} ${isDarkMode ? 'bg-gradient-to-b from-[#151E2E] to-[#0F1523] border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-500/10' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/10'}`}
                  >
                    {/* 🚨 ANY APPROVED COLLABORATOR CAN USE LOCK BUTTON */}
                    <button 
                      onClick={(e) => toggleHideStatus(e, doc.id)}
                      className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-all ${isHidden ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/40' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-emerald-400' : 'bg-slate-100 text-slate-500 hover:text-emerald-600')}`}
                      title={isHidden ? "Unlock to reveal to students" : "Lock to hide from students"}
                    >
                      {isHidden ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>

                    <div>
                      <div className="flex justify-between items-start mb-6 pr-8">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                          {doc.jlpt || 'N/A'}
                        </span>
                        <div className="flex gap-2">
                          {doc.wordCount && <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><BarChart3 size={10}/> {doc.wordCount}w</span>}
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><HelpCircle size={10}/> {doc.questions?.length || 0}</span>
                        </div>
                      </div>
                      
                      <h3 className={`text-2xl sm:text-3xl font-black tracking-tight mb-3 leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {doc.titleJp}
                      </h3>
                      <p className={`text-sm font-medium leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{doc.titleEn}</p>
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isHidden ? 'text-rose-500' : (isDarkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600')}`}>
                        {isHidden ? 'Hidden from Students' : 'Begin Reading'}
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

      {/* THE IMMERSIVE WORKSPACE */}
      <AnimatePresence>
        {activeReading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0A0F1C]' : 'bg-slate-100'}`}
          >
            <header className={`shrink-0 border-b px-4 py-3 flex items-center justify-between shadow-sm z-20 backdrop-blur-2xl ${isDarkMode ? 'bg-[#0F1523]/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveReading(null)} className={`p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`}><ArrowLeft size={18} /></button>
                <div className={`hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{activeReading.jlpt}</span>
                  <span className="w-px h-3 bg-slate-400 opacity-30"></span>
                  <span className="text-xs font-bold truncate max-w-[250px]">{activeReading.titleJp}</span>
                  {isBuildingDict && <Loader2 size={12} className="animate-spin text-emerald-500" title="Building Dictionary Map..." />}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHighlights(!showHighlights)} 
                  className={`p-2.5 rounded-xl transition-all border shadow-sm ${showHighlights ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-400 text-indigo-600') : (isDarkMode ? 'bg-[#151E2E] text-slate-400 border-slate-700 hover:text-white' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900')}`}
                  title="Toggle Interactions & Highlights"
                >
                  <Highlighter size={16} className={showHighlights ? '' : 'opacity-50'}/>
                </button>

                <button 
                  onClick={() => setShowTypeControls(!showTypeControls)} 
                  className={`p-2.5 rounded-xl transition-all border shadow-sm ${showTypeControls ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-400 text-indigo-600') : (isDarkMode ? 'bg-[#151E2E] text-slate-400 border-slate-700 hover:text-white' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900')}`}
                  title="Typography Adjustments"
                >
                  <Type size={16} />
                </button>

                <button 
                  onClick={() => setIsStudyMode(!isStudyMode)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isStudyMode ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200') : (isDarkMode ? 'bg-[#151E2E] text-slate-400 border border-slate-700 hover:text-white' : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-900')}`}
                >
                  {isStudyMode ? <Eye size={14}/> : <EyeOff size={14}/>} 
                  <span className="hidden sm:inline">Translation Mode</span>
                </button>
                
                <div className="w-px h-6 bg-slate-400 opacity-30 mx-2"></div>
                
                <button 
                  onClick={() => setSplitOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={`p-2.5 rounded-xl transition-all border shadow-sm ${isDarkMode ? 'bg-[#151E2E] text-slate-400 border-slate-700 hover:text-indigo-400 hover:border-indigo-500/50' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600 hover:border-indigo-300'}`}
                  title="Toggle Workspace Layout"
                >
                  {splitOrientation === 'vertical' ? <LayoutPanelTop size={16} /> : <LayoutPanelLeft size={16} />}
                </button>
              </div>
            </header>

            <AnimatePresence>
              {showTypeControls && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className={`border-b p-4 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center shadow-inner ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5"><Type size={12}/> Text Scaling</span>
                      <span>{fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className={`px-2.5 py-1 rounded border text-xs font-black ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-100 border-slate-300'}`}>A-</button>
                      <input type="range" min="14" max="36" step="2" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-slate-300 dark:bg-slate-700" />
                      <button onClick={() => setFontSize(Math.min(36, fontSize + 2))} className={`px-2.5 py-1 rounded border text-xs font-black ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-100 border-slate-300'}`}>A+</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5"><Sliders size={12}/> Line Breathing Room</span>
                      <span>{lineSpacing}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setLineSpacing(Math.max(1.8, parseFloat((lineSpacing - 0.2).toFixed(1))))} className={`px-2.5 py-1 rounded border text-xs font-black ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-100 border-slate-300'}`}>Tight</button>
                      <input type="range" min="1.8" max="3.6" step="0.2" value={lineSpacing} onChange={(e) => setLineSpacing(parseFloat(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-slate-300 dark:bg-slate-700" />
                      <button onClick={() => setLineSpacing(Math.min(3.6, parseFloat((lineSpacing + 0.2).toFixed(1))))} className={`px-2.5 py-1 rounded border text-xs font-black ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-100 border-slate-300'}`}>Loose</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={containerRef} className={`flex-1 overflow-hidden flex relative ${splitOrientation === 'vertical' ? 'flex-row' : 'flex-col'}`}>
              
              {/* PANE 1: E-READER VIEW */}
              <div 
                onClick={() => setLookupTarget(null)}
                className={`relative overflow-y-auto custom-scrollbar p-8 md:p-12 lg:p-16 transition-all duration-300 ease-out`}
                style={{ 
                  width: splitOrientation === 'vertical' ? `${splitRatio}%` : '100%',
                  height: splitOrientation === 'horizontal' ? `${splitRatio}%` : '100%'
                }}
              >
                
                <AnimatePresence>
                  {lookupTarget && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky top-0 z-40 mx-auto w-full max-w-sm mb-6 p-5 rounded-2xl border-2 shadow-2xl flex flex-col backdrop-blur-xl ${lookupTarget.type === 'grammar' ? 'border-fuchsia-500/50' : 'border-emerald-500/50'} ${isDarkMode ? 'bg-[#0F1523]/95 text-white' : 'bg-white/95 text-slate-900'}`}
                    >
                      <div className={`flex items-center justify-between border-b pb-3 mb-3 dark:border-slate-800 border-slate-200`}>
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${lookupTarget.type === 'grammar' ? 'text-fuchsia-500' : 'text-emerald-500'}`}>
                          <Bookmark size={14}/> Context {lookupTarget.type === 'grammar' ? 'Grammar' : 'Dictionary'}
                        </span>
                        <button onClick={() => setLookupTarget(null)} className="p-1 rounded-lg dark:hover:bg-slate-800 hover:bg-slate-100 text-slate-400 hover:text-slate-200"><X size={16}/></button>
                      </div>

                      {lookupTarget.data.isRawString ? (
                        <div>
                          <div className="text-3xl font-black mb-1">{lookupTarget.word}</div>
                          <p className="text-sm font-medium text-slate-400">{lookupTarget.data.placeholder || "No formal database entry attached to this word."}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-3xl font-black">{lookupTarget.data.kanji || lookupTarget.data.symbol || lookupTarget.data.grammar}</div>
                              <div className={`text-sm font-bold ${lookupTarget.type === 'grammar' ? 'text-fuchsia-500' : 'text-emerald-500'}`}>{lookupTarget.data.kana || lookupTarget.data.romaji || lookupTarget.data.structure}</div>
                            </div>
                            {(lookupTarget.data.audioUrl || lookupTarget.word) && (
                              <button onClick={() => playNativeAudio(lookupTarget.word)} className={`p-2.5 rounded-full transition-colors ${lookupTarget.type === 'grammar' ? 'bg-fuchsia-500/20 text-fuchsia-500 hover:bg-fuchsia-500 hover:text-white' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}>
                                <Volume2 size={16} />
                              </button>
                            )}
                          </div>
                          <div className="p-3 rounded-xl dark:bg-[#151E2E] bg-slate-50 border dark:border-slate-700 border-slate-200">
                            <p className="text-sm font-bold leading-relaxed">{lookupTarget.data.english || lookupTarget.data.meaning}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {lookupTarget.data.pos && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-800 text-slate-300">{lookupTarget.data.pos}</span>}
                            {lookupTarget.data.jlpt && <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${lookupTarget.type === 'grammar' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{lookupTarget.data.jlpt}</span>}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-w-2xl mx-auto pb-24" onClick={() => setLookupTarget(null)}>
                  <div className="mb-12 text-center sm:text-left border-b pb-8 border-slate-200 dark:border-slate-800">
                    <h1 className={`text-4xl sm:text-5xl font-black mb-4 leading-[1.2] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeReading.titleJp}</h1>
                    {isStudyMode && <p className={`text-lg font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{activeReading.titleEn}</p>}
                  </div>

                  {activeReading.imageUrl && (
                    <div className="mb-12 rounded-[2rem] overflow-hidden border-4 shadow-xl dark:border-slate-800 border-white">
                      <img src={activeReading.imageUrl} alt="Reading Context" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <div className="space-y-10">
                    {activeReading.paragraphs?.map((para, idx) => (
                      <div key={idx} className="group relative">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 w-full overflow-hidden">
                            <p 
                              className={`font-medium tracking-wide break-words break-all whitespace-pre-wrap transition-all duration-300 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}
                              style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}
                            >
                              {parseFurigana(para.jp, highlightMap, handleWordClick, showHighlights)}
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => playNativeAudio(para.jp)} 
                            className={`shrink-0 p-2.5 rounded-full transition-all duration-200 opacity-30 hover:opacity-100 hover:scale-110 shadow-sm mt-1 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200'}`}
                            title="Play Audio (Shadowing)"
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {isStudyMode && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className={`mt-6 p-5 rounded-2xl border-l-4 ${isDarkMode ? 'bg-[#151E2E] border-indigo-500/50 text-slate-300' : 'bg-slate-50 border-indigo-400 text-slate-600'}`}>
                                <p className="text-[15px] font-medium leading-relaxed">{para.en}</p>
                                {para.note && (
                                  <div className="mt-3 flex items-start gap-2">
                                    <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400/90">{para.note}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
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

                  <div className="space-y-10">
                    {activeReading.questions?.map((q, qIndex) => {
                      const isCorrect = userAnswers[qIndex] === q.correctIndex;
                      const hasAnswered = userAnswers[qIndex] !== undefined;

                      return (
                        <div key={qIndex} className={`p-6 sm:p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${showResults ? (isCorrect ? 'border-emerald-500 bg-emerald-500/5 shadow-emerald-500/5' : 'border-rose-500 bg-rose-500/5 shadow-rose-500/5') : (isDarkMode ? 'border-slate-800 bg-[#151E2E] shadow-sm' : 'border-white bg-white shadow-md')}`}>
                          
                          <div className="mb-8">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border inline-block mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>Question {qIndex + 1}</span>
                            <p className={`text-xl sm:text-2xl font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{q.questionJp}</p>
                            {isStudyMode && <p className={`text-sm font-medium mt-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{q.questionEn}</p>}
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

                  <div className="mt-12 pt-8 flex flex-col items-center">
                    {!showResults ? (
                      <button 
                        onClick={() => setShowResults(true)}
                        disabled={Object.keys(userAnswers).length < activeReading.questions.length}
                        className={`w-full max-w-sm py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${Object.keys(userAnswers).length < activeReading.questions.length ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:-translate-y-1 shadow-xl shadow-indigo-500/30'}`}
                      >
                        <CheckCircle2 size={18} /> Grade My Answers
                      </button>
                    ) : (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full max-w-sm p-8 rounded-[2.5rem] border-2 text-center relative overflow-hidden ${calculateScore() >= 80 ? 'border-emerald-500 bg-emerald-500/5' : calculateScore() >= 50 ? 'border-amber-500 bg-amber-500/5' : 'border-rose-500 bg-rose-500/5'}`}>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-3xl rounded-full opacity-20 ${calculateScore() >= 80 ? 'bg-emerald-500' : calculateScore() >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                        
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Final Reading Score</p>
                        <p className={`text-6xl font-black drop-shadow-sm mb-6 ${calculateScore() >= 80 ? 'text-emerald-500' : calculateScore() >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {calculateScore()}%
                        </p>
                        
                        <button onClick={() => { setUserAnswers({}); setShowResults(false); }} className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isDarkMode ? 'bg-[#151E2E] hover:bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}>
                          <RefreshCcw size={14} className="inline mr-2" /> Retake Quiz
                        </button>
                      </motion.div>
                    )}
                  </div>
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

              {/* Genre Pills */}
              <div className="mb-8">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Genre (ジャンル)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterGenre('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterGenre === 'all' ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>All Genres</button>
                  {genreOptions.map(opt => (
                    <button key={opt.id} onClick={() => setFilterGenre(opt.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterGenre === opt.id ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-600' : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300')}`}>{opt.label}</button>
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