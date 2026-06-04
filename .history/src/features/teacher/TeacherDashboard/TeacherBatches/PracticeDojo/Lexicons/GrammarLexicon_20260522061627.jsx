import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, Target, Activity, GitBranch, Link2, 
  MessageSquare, ArrowUpToLine, Globe, EyeOff, Eye,
  Lock, Unlock, Edit3, X, Info, Quote, GraduationCap, Loader2, Workflow,
  Volume2, Lightbulb, AlertTriangle, AlertCircle, Image as ImageIcon, Link as LinkIcon, Split, ShieldAlert
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export default function GrammarLexicon() {
  const { isDarkMode } = useTheme();
  const categoryId = 'grammar';
  const { batchId } = useParams(); 
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // 🚨 SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [hiddenGrammar, setHiddenGrammar] = useState([]);

  // DATABASE STATE
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // CATEGORY MAPS
  const jlptCategories = [
    { id: 'all', label: 'All Grammar', jp: '全文法', icon: Globe },
    { id: 'N5', label: 'N5 Basics', jp: 'N5文法', icon: Target },
    { id: 'N4', label: 'N4 Beginner', jp: 'N4文法', icon: Target },
    { id: 'N3', label: 'N3 Intermediate', jp: 'N3文法', icon: Target },
    { id: 'N2', label: 'N2 Advanced', jp: 'N2文法', icon: Target },
    { id: 'N1', label: 'N1 Fluent', jp: 'N1文法', icon: Target },
  ];

  const functionalCategories = [
    { id: 'conjugation', label: 'Conjugations', jp: '動詞の活用', icon: Activity },
    { id: 'conditional', label: 'Conditionals', jp: '条件', icon: GitBranch },
    { id: 'conjunction', label: 'Conjunctions', jp: '接続詞', icon: Link2 },
    { id: 'ending', label: 'Sentence Endings', jp: '文末表現', icon: MessageSquare },
    { id: 'keigo', label: 'Keigo', jp: '敬語', icon: ArrowUpToLine },
  ];

  // 🚨 THE BOUNCER LOGIC
  useEffect(() => {
    const checkSecurityAndFetchData = async () => {
      try {
        setIsLoading(true);
        const userUid = auth.currentUser?.uid;
        
        if (!userUid || !batchId || !categoryId) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        let masterAuth = false;
        let batchAuth = false;

        // 1. Check Master Authorization (Root Access)
        const lexiconRef = doc(db, 'lexicons', categoryId);
        const lexiconSnap = await getDoc(lexiconRef);
        if (lexiconSnap.exists() && (lexiconSnap.data().accessIds || []).includes(userUid)) {
          masterAuth = true;
          setIsMasterTeacher(true);
        }

        // 2. Check Batch-Specific Authorization
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        if (batchSnap.exists() && (batchSnap.data().teacherIds || []).includes(userUid)) {
          batchAuth = true;
        }

        // 3. EXECUTE BOUNCER: Kick out if neither condition is met
        if (!masterAuth && !batchAuth) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // 4. Fetch Hidden Categories & Grammar for this Batch
        const overridesRef = doc(db, `batches/${batchId}/lexicon_overrides`, categoryId);
        const overridesSnap = await getDoc(overridesRef);
        if (overridesSnap.exists()) {
          setHiddenCategories(overridesSnap.data().hiddenCategories || []);
          setHiddenGrammar(overridesSnap.data().hiddenGrammar || []); 
        }

        // 5. Fetch Grammar Entries
        const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
        const entriesSnap = await getDocs(entriesRef);
        const allGrammar = entriesSnap.docs.map(doc => doc.data()).filter(e => e.type === 'grammar');
        setEntries(allGrammar);

      } catch (error) { 
        console.error("Failed to fetch database or check security:", error); 
        setAccessDenied(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkSecurityAndFetchData();
  }, [batchId, categoryId]);

  // VISIBILITY TOGGLES
  const toggleCategoryVisibility = async (e, catId) => {
    e.stopPropagation();
    const newHidden = hiddenCategories.includes(catId) ? hiddenCategories.filter(id => id !== catId) : [...hiddenCategories, catId];
    setHiddenCategories(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenCategories: newHidden }, { merge: true }); } catch (error) {}
  };

  const toggleGrammarVisibility = async (e, grammarId) => {
    e.stopPropagation(); 
    const newHidden = hiddenGrammar.includes(grammarId) ? hiddenGrammar.filter(id => id !== grammarId) : [...hiddenGrammar, grammarId];
    setHiddenGrammar(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenGrammar: newHidden }, { merge: true }); } catch (error) {}
  };

  // NATIVE TTS PREVIEWER
  const playNativeAudio = (text, e) => {
    if (e) e.stopPropagation();
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  // DYNAMIC FILTERING
  const displayData = entries.filter(entry => {
    let matchesCategory = false;
    if (activeCategory === 'all') matchesCategory = true;
    else if (['N5', 'N4', 'N3', 'N2', 'N1'].includes(activeCategory)) matchesCategory = entry.jlpt === activeCategory;
    else matchesCategory = entry.subType === activeCategory; 

    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (entry.english?.toLowerCase().includes(q)) || 
      (entry.meaning?.toLowerCase().includes(q)) || 
      (entry.grammar?.includes(q)) || 
      (entry.structure?.toLowerCase().includes(q));

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

  const getNoteStyle = (type) => {
    switch(type) {
      case 'warning': return { icon: AlertTriangle, colorClass: isDarkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600' };
      case 'tip': return { icon: Lightbulb, colorClass: isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600' };
      case 'danger': return { icon: AlertCircle, colorClass: isDarkMode ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600' };
      default: return { icon: Info, colorClass: isDarkMode ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600' };
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

  // SAFE ARRAY PARSERS FOR MODAL
  const renderNotes = selectedEntry ? (Array.isArray(selectedEntry.notes) ? selectedEntry.notes : (selectedEntry.notes ? [{ text: selectedEntry.notes, type: 'info' }] : [])) : [];
  const renderImages = selectedEntry ? (Array.isArray(selectedEntry.images) ? selectedEntry.images : (selectedEntry.imageUrl ? [{ url: selectedEntry.imageUrl, caption: '' }] : [])) : [];
  const renderSentences = selectedEntry?.sentences || [];

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 ${isDarkMode ? 'opacity-20' : 'opacity-10'}`}></div>
      
      {/* SIDEBAR */}
      <aside className={`w-full md:w-72 shrink-0 border-r md:min-h-screen md:sticky top-0 z-10 flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#0F1523]/80 border-slate-800 backdrop-blur-2xl' : 'bg-white/80 border-slate-200 backdrop-blur-2xl'}`}>
        <div className="p-6 md:p-8 flex-1">
          
          <div className="flex items-center gap-3 mb-10 group">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
              <Workflow size={20} />
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-black tracking-tight leading-none">Grammar Lexicon</h2>
              {isMasterTeacher && (
                <button 
                  onClick={() => navigate(`/lexicon/${categoryId}/edit`)}
                  className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 transition-all outline-none ${isDarkMode ? 'text-indigo-400/70 hover:text-indigo-400' : 'text-indigo-600/70 hover:text-indigo-600'}`}
                >
                  Edit Database <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
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

            {/* FUNCTIONAL CATEGORIES */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Function (機能)</p>
              <div className="space-y-1">
                {functionalCategories.map((cat) => {
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
              {[...jlptCategories, ...functionalCategories].find(c => c.id === activeCategory)?.label || 'Grammar'}
            </h1>
            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {displayData.length} grammar points. 
              {hiddenCategories.includes(activeCategory) && <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md"><EyeOff size={10}/> Hidden</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className={`flex items-center gap-2 p-2.5 rounded-2xl border w-full sm:w-64 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20' : 'bg-white border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20'}`}>
              <Search size={16} className="text-slate-400 ml-1" />
              <input type="text" placeholder="Search formulas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
            </div>
          </div>
        </header>

        {/* GRAMMAR LISTING CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {displayData.map((gram, index) => {
              const isGramHidden = hiddenGrammar.includes(gram.id);
              return (
                <motion.div 
                  key={gram.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedEntry(gram)}
                  className={`group relative p-6 rounded-[2rem] border-2 border-b-[6px] cursor-pointer transition-all active:border-b-2 active:translate-y-[4px] hover:-translate-y-1 flex flex-col justify-between ${
                    isDarkMode ? 'bg-[#151E2E] border-slate-700 hover:bg-[#1A233A] hover:border-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-400'
                  } ${isGramHidden ? 'opacity-50 grayscale' : ''}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getJlptColor(gram.jlpt)}`}>
                      {gram.jlpt || 'N/A'}
                    </span>
                    <button 
                      onClick={(e) => toggleGrammarVisibility(e, gram.id)} 
                      className={`p-2 rounded-xl transition-all ${isGramHidden ? (isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-500') : (isDarkMode ? 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 opacity-0 group-hover:opacity-100')}`}
                    >
                      {isGramHidden ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>

                  <div>
                    <h3 className={`text-3xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{gram.grammar || gram.kanji || gram.symbol}</h3>
                    <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{gram.english || gram.meaning}</p>
                    
                    {gram.structure && (
                      <div className={`p-3 rounded-xl border flex items-center gap-2 ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                        <Workflow size={14} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                        <span className={`text-xs font-bold font-mono ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>{gram.structure}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* THE UPGRADED DETAIL MODAL */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEntry(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`custom-scrollbar relative w-full max-w-3xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border shadow-2xl flex flex-col mt-auto sm:mt-0 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}
            >
              
              <div className={`pt-12 pb-10 px-6 sm:px-10 shrink-0 flex flex-col items-start border-b relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-b from-[#1A233A] to-[#0F1523] border-slate-800' : 'bg-gradient-to-b from-indigo-50/50 to-white border-slate-200'}`}>
                <button onClick={() => setSelectedEntry(null)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}><X size={20} /></button>
                
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getJlptColor(selectedEntry.jlpt)}`}><GraduationCap size={12} className="inline mr-1 mb-0.5"/>{selectedEntry.jlpt || 'N/A'}</span>
                  {selectedEntry.subType && <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{selectedEntry.subType}</span>}
                  {selectedEntry.formality && <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{selectedEntry.formality}</span>}
                </div>

                <h2 className={`text-4xl md:text-5xl font-black mb-2 relative z-10 drop-shadow-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedEntry.grammar || selectedEntry.kanji || selectedEntry.symbol}
                </h2>
                <p className={`text-xl font-bold relative z-10 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{selectedEntry.meaning || selectedEntry.english}</p>
              </div>

              <div className="p-6 sm:p-10 space-y-8 relative z-10 shrink-0">

                {(selectedEntry.structure || selectedEntry.connectionRules || selectedEntry.relatedGrammar) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEntry.structure && (
                      <div className={`p-5 rounded-2xl border-l-4 md:col-span-2 ${isDarkMode ? 'bg-[#151E2E] border-indigo-500 border-t-slate-800 border-r-slate-800 border-b-slate-800' : 'bg-slate-50 border-indigo-500 border-t-slate-200 border-r-slate-200 border-b-slate-200'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Workflow size={12} /> Formation</h4>
                        <p className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedEntry.structure}</p>
                      </div>
                    )}
                    {selectedEntry.connectionRules && (
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Split size={12} /> Connects To</h4>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedEntry.connectionRules}</p>
                      </div>
                    )}
                    {selectedEntry.relatedGrammar && (
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><LinkIcon size={12} /> Compare With</h4>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedEntry.relatedGrammar}</p>
                      </div>
                    )}
                  </div>
                )}

                {renderNotes.length > 0 && (
                  <div className="space-y-3">
                    {renderNotes.map((note, idx) => {
                      const style = getNoteStyle(note.type);
                      const NoteIcon = style.icon;
                      return (
                        <div key={idx} className={`p-5 rounded-2xl border flex gap-4 ${style.colorClass}`}>
                          <NoteIcon size={20} className="shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">{note.type || 'Note'}</h4>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap opacity-90">{note.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {renderImages.length > 0 && (
                  <div className="space-y-4">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <ImageIcon size={14} /> Diagrams
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderImages.map((img, idx) => (
                        <div key={idx} className={`rounded-xl overflow-hidden border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                          <img src={img.url} alt={img.caption || 'Grammar Diagram'} className="w-full h-auto object-cover" />
                          {img.caption && <div className={`p-3 text-xs font-bold text-center border-t ${isDarkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>{img.caption}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {renderSentences.length > 0 && (
                  <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Quote size={14} /> Example Sentences
                    </h4>
                    <div className="space-y-3">
                      {renderSentences.map((sent, i) => (
                        <div key={i} className={`p-5 sm:p-6 rounded-[1.5rem] border transition-colors ${isDarkMode ? 'bg-[#151E2E] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <p className={`text-lg sm:text-xl font-black leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sent.jp}</p>
                            <button 
                              onClick={(e) => playNativeAudio(sent.jp, e)} 
                              title="Play Japanese Audio"
                              className={`shrink-0 p-2.5 rounded-full transition-all ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`}
                            >
                              <Volume2 size={16} />
                            </button>
                          </div>
                          <p className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sent.en}</p>
                          {sent.note && (
                            <div className={`p-3 rounded-lg text-xs font-medium border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                              <Lightbulb size={12} className="inline mr-1 mb-0.5 opacity-70" /> {sent.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}