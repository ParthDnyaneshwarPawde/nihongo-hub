import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, Plus, Archive, Activity, Sparkles, 
  Wind, Link2, Hash, MessageCircle, Edit3, Trash2, 
  Volume2, Globe, Eye, EyeOff, Lock, Unlock,
  Languages, Type, Edit, X, Info, Quote, GraduationCap, Loader2, ShieldAlert
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'; 

// 🚨 THE STRICT GOJŪON MATRICES
const hiraganaChart = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', null, null, null, 'を'],
  ['ん', null, null, null, null],
  // Dakuten & Handakuten
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']
];

const katakanaChart = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', null, 'ユ', null, 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', null, null, null, 'ヲ'],
  ['ン', null, null, null, null],
  // Dakuten & Handakuten
  ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
  ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
  ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
  ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
  ['パ', 'ピ', 'プ', 'ペ', 'ポ']
];

export default function VocabLexicon() {
  const { isDarkMode } = useTheme();
  const categoryId = 'vocab';
  const { batchId } = useParams(); 
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedEntry, setSelectedEntry] = useState(null);

  // 🚨 SECURITY & BOUNCER STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [hiddenWords, setHiddenWords] = useState([]);

  // DATABASE STATE
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const vocabCategories = [
    { id: 'all', label: 'All Vocabulary', jp: '全語彙', icon: Globe },
    { id: 'noun', label: 'Nouns', jp: '名詞', icon: Archive },
    { id: 'verb', label: 'Verbs', jp: '動詞', icon: Activity },
    { id: 'adjective', label: 'Adjectives', jp: '形容詞', icon: Sparkles },
    { id: 'adverb', label: 'Adverbs', jp: '副詞', icon: Wind },
    { id: 'particle', label: 'Particles', jp: '助詞', icon: Link2 },
    { id: 'counter', label: 'Counters', jp: '助数詞', icon: Hash },
    { id: 'expression', label: 'Expressions', jp: '挨拶', icon: MessageCircle },
  ];

  const charCategories = [
    { id: 'hiragana', label: 'Hiragana', jp: 'ひらがな', icon: Languages },
    { id: 'katakana', label: 'Katakana', jp: 'カタカナ', icon: Type },
    { id: 'kanji', label: 'Kanji', jp: '漢字', icon: Edit }, 
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

        // 4. Fetch Hidden Categories & Words for this Batch
        const overridesRef = doc(db, `batches/${batchId}/lexicon_overrides`, categoryId);
        const overridesSnap = await getDoc(overridesRef);
        if (overridesSnap.exists()) {
          setHiddenCategories(overridesSnap.data().hiddenCategories || []);
          setHiddenWords(overridesSnap.data().hiddenWords || []);
        }

        // 5. Fetch Vocab Entries
        const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
        const entriesSnap = await getDocs(entriesRef);
        setEntries(entriesSnap.docs.map(doc => doc.data()));

      } catch (error) { 
        console.error("Failed to fetch database or check security:", error); 
        setAccessDenied(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkSecurityAndFetchData();
  }, [batchId, categoryId]);

  const toggleCategoryVisibility = async (e, catId) => {
    e.stopPropagation();
    const newHidden = hiddenCategories.includes(catId) ? hiddenCategories.filter(id => id !== catId) : [...hiddenCategories, catId];
    setHiddenCategories(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenCategories: newHidden }, { merge: true }); } catch (error) { console.error(error); }
  };

  const toggleWordVisibility = async (e, wordId) => {
    e.stopPropagation(); 
    const newHidden = hiddenWords.includes(wordId) ? hiddenWords.filter(id => id !== wordId) : [...hiddenWords, wordId];
    setHiddenWords(newHidden);
    try { await setDoc(doc(db, `batches/${batchId}/lexicon_overrides`, categoryId), { hiddenWords: newHidden }, { merge: true }); } catch (error) { console.error(error); }
  };

  const playAudio = (e, urlField, defaultText) => {
    e.stopPropagation(); 
    const isUrl = (str) => {
      if (!str) return false;
      const cleanStr = str.toLowerCase();
      return cleanStr.includes('http') || cleanStr.includes('www.') || cleanStr.includes('.com') || cleanStr.includes('.mp3') || cleanStr.includes('.wav');
    };

    const speakNative = (text) => {
      if (!text || isUrl(text)) return; 
      if (!window.speechSynthesis) return alert("Your browser does not support text-to-speech.");
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP'; 
      utterance.rate = 0.85; 
      window.speechSynthesis.speak(utterance);
    };

    let url = urlField ? urlField.trim().replace(/^["']|["']$/g, '') : '';

    if (isUrl(url)) {
      if (!url.startsWith('http')) url = `https://${url}`;
      const audio = new Audio(url);
      audio.play().catch(err => {
        console.warn("Audio link blocked. Falling back to native voice.");
        speakNative(defaultText); 
      });
    } else if (url !== '') {
      speakNative(url);
    } else {
      speakNative(defaultText);
    }
  };

  const isCharView = ['hiragana', 'katakana', 'kanji'].includes(activeCategory);
  
  const displayData = entries.filter(entry => {
    let matchesCategory = false;
    if (isCharView) {
      matchesCategory = entry.type === activeCategory;
    } else {
      if (activeCategory === 'all') matchesCategory = entry.type === 'vocab';
      else matchesCategory = entry.type === 'vocab' && entry.pos === activeCategory;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (entry.english?.toLowerCase().includes(q)) || 
      (entry.meaning?.toLowerCase().includes(q)) || 
      (entry.kanji?.includes(q)) || 
      (entry.symbol?.includes(q)) || 
      (entry.kana?.includes(q)) ||
      (entry.romaji?.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (activeCategory === 'kanji') {
       const meaningA = a.english || a.meaning || '';
       const meaningB = b.english || b.meaning || '';
       return meaningA.localeCompare(meaningB); 
    }
    return 0; 
  });

  const getJlptColor = (level) => {
    switch(level) {
      case 'N5': return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'N4': return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'N3': return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200';
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
      
      <aside className={`w-full md:w-72 shrink-0 border-r md:min-h-screen md:sticky top-0 z-10 flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#0F1523]/80 border-slate-800 backdrop-blur-2xl' : 'bg-white/80 border-slate-200 backdrop-blur-2xl'}`}>
        <div className="p-6 md:p-8 flex-1">
          
          <div className="flex items-center gap-3 mb-10 group">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20`}>
              <BookOpen size={20} />
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-xl font-black tracking-tight leading-none">Vocab Lexicon</h2>
              {isMasterTeacher ? (
                <button 
                  onClick={() => navigate(`/lexicon/${categoryId}/edit`)}
                  className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 transition-all outline-none ${isDarkMode ? 'text-indigo-400/70 hover:text-indigo-400' : 'text-indigo-600/70 hover:text-indigo-600'}`}
                >
                  Master Database <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Master Database
                </span>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Vocabulary (語彙)</p>
              <div className="space-y-1">
                {vocabCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const isCategoryHidden = hiddenCategories.includes(cat.id);

                  return (
                    <div key={cat.id} className="relative group flex items-center">
                      <button onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isActive ? (isDarkMode ? 'bg-indigo-500/10 text-indigo-400 font-bold shadow-inner' : 'bg-indigo-50 text-indigo-600 font-bold shadow-sm') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium')} ${isCategoryHidden ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-3"><Icon size={16} className={isActive ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : 'opacity-50'} /><span className="text-sm">{cat.label}</span></div>
                        <span className={`text-[10px] font-black tracking-wider ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{cat.jp}</span>
                      </button>
                      {cat.id !== 'all' && (
                        <button onClick={(e) => toggleCategoryVisibility(e, cat.id)} className={`absolute right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isCategoryHidden ? (isDarkMode ? 'text-rose-400 hover:bg-rose-500/10 opacity-100' : 'text-rose-500 hover:bg-rose-50 opacity-100') : (isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-200')}`} title={isCategoryHidden ? "Hidden from Batch" : "Visible to Batch"}>
                          {isCategoryHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Characters (文字)</p>
              <div className="space-y-1">
                {charCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const isCategoryHidden = hiddenCategories.includes(cat.id);

                  return (
                    <div key={cat.id} className="relative group flex items-center">
                      <button onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isActive ? (isDarkMode ? 'bg-amber-500/10 text-amber-400 font-bold shadow-inner' : 'bg-amber-50 text-amber-600 font-bold shadow-sm') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium')} ${isCategoryHidden ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-3"><Icon size={16} className={isActive ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : 'opacity-50'} /><span className="text-sm">{cat.label}</span></div>
                        <span className={`text-[10px] font-black tracking-wider ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{cat.jp}</span>
                      </button>
                      <button onClick={(e) => toggleCategoryVisibility(e, cat.id)} className={`absolute right-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isCategoryHidden ? (isDarkMode ? 'text-rose-400 hover:bg-rose-500/10 opacity-100' : 'text-rose-500 hover:bg-rose-50 opacity-100') : (isDarkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-200')}`} title={isCategoryHidden ? "Hidden from Batch" : "Visible to Batch"}>
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
              {[...vocabCategories, ...charCategories].find(c => c.id === activeCategory)?.label || 'Vocabulary'}
            </h1>
            <p className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {displayData.length} entries. 
              {hiddenCategories.includes(activeCategory) && <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md"><EyeOff size={10}/> Hidden from Batch</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className={`flex items-center gap-2 p-2.5 rounded-2xl border w-full sm:w-64 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-400'}`}>
              <Search size={16} className="text-slate-400 ml-1" />
              <input type="text" placeholder="Search entries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} />
            </div>
          </div>
        </header>

        {!isCharView ? (
          /* TABLE VIEW FOR VOCABULARY */
          <div className={`overflow-x-auto rounded-[2rem] border shadow-sm custom-scrollbar ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#0F1523] border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <th className="p-5 font-bold w-12 text-center">Batch</th>
                  <th className="p-5 font-bold">Vocabulary</th>
                  <th className="p-5 font-bold">Meaning</th>
                  <th className="p-5 font-bold">Type</th>
                  <th className="p-5 font-bold">JLPT</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {displayData.map((word, index) => {
                    const isWordHidden = hiddenWords.includes(word.id);
                    return (
                      <motion.tr 
                        key={word.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedEntry(word)} 
                        className={`group border-b cursor-pointer transition-colors ${isDarkMode ? 'border-slate-800/50 hover:bg-slate-800/80' : 'border-slate-100 hover:bg-slate-50'} ${isWordHidden ? 'opacity-50 grayscale' : ''}`}
                      >
                        <td className="p-5 text-center align-middle">
                          <button onClick={(e) => toggleWordVisibility(e, word.id)} className={`p-2 rounded-lg transition-all ${isWordHidden ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100') : (isDarkMode ? 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50')}`} title={isWordHidden ? "Hidden from Batch" : "Visible to Batch"}>
                            {isWordHidden ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={(e) => playAudio(e, word.audioUrl, word.kanji || word.symbol)} 
                              className={`p-2 rounded-full transition-colors hidden sm:block opacity-0 group-hover:opacity-100 ${isDarkMode ? 'bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-slate-100 text-indigo-600 hover:bg-indigo-100'}`}
                            >
                              <Volume2 size={14} />
                            </button>
                            <div>
                              <span className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{word.kanji || word.symbol}</span>
                              <div className="flex flex-col mt-0.5">
                                <span className={`text-[10px] font-black tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{word.kana}</span>
                                <span className={`text-[10px] font-medium text-slate-500`}>{word.romaji}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5"><span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{word.english || word.meaning}</span></td>
                        <td className="p-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/50 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{word.pos}</span>
                          </div>
                        </td>
                        <td className="p-5"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getJlptColor(word.jlpt)}`}>{word.jlpt || 'N/A'}</span></td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

        ) : activeCategory === 'kanji' || searchQuery !== '' ? (
          /* STANDARD WRAPPING GRID FOR KANJI & SEARCHES */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
            <AnimatePresence>
              {displayData.map((char, index) => {
                const isCharHidden = hiddenWords.includes(char.id);
                return (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedEntry(char)} 
                    className={`group relative flex flex-col items-center justify-center p-4 h-32 sm:h-36 rounded-[1.5rem] border-2 border-b-[6px] cursor-pointer transition-all active:border-b-2 active:translate-y-[4px] hover:-translate-y-1 ${
                      isDarkMode 
                        ? 'bg-[#151E2E] border-slate-700 hover:bg-[#1A233A] hover:border-indigo-500' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-400'
                    } ${isCharHidden ? 'opacity-50 grayscale' : ''}`}
                  >
                    {char.jlpt && <span className={`absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getJlptColor(char.jlpt)}`}>{char.jlpt}</span>}
                    <button onClick={(e) => toggleWordVisibility(e, char.id)} className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 rounded-md transition-all ${isCharHidden ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                      {isCharHidden ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span className={`text-4xl sm:text-5xl font-black mt-2 mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{char.symbol || char.kanji}</span>
                    <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-center px-1 truncate w-full`}>{char.romaji || char.meaning}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

        ) : (
          /* TRADITIONAL 5-COLUMN CHART FOR KANA */
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 sm:gap-4 pb-12">
            {(activeCategory === 'hiragana' ? hiraganaChart : katakanaChart).map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                
                {rowIndex === 11 && (
                  <div className="col-span-5 flex items-center gap-4 py-4 opacity-50">
                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Dakuten (濁点)</span>
                    <div className={`h-px flex-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                  </div>
                )}

                <div className="grid grid-cols-5 gap-3 sm:gap-4">
                  {row.map((cellChar, colIndex) => {
                    if (cellChar === null) return <div key={colIndex} className="col-span-1"></div>;

                    const charEntry = displayData.find(d => (d.symbol === cellChar || d.kanji === cellChar));

                    if (!charEntry) {
                      return (
                        <div key={colIndex} className={`col-span-1 h-24 sm:h-28 md:h-32 rounded-2xl sm:rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all ${isDarkMode ? 'border-slate-800 text-slate-700' : 'border-slate-200 text-slate-300'}`}>
                          <span className="text-2xl sm:text-4xl font-black opacity-30">{cellChar}</span>
                        </div>
                      );
                    }

                    const isCharHidden = hiddenWords.includes(charEntry.id);
                    return (
                      <motion.div
                        key={colIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedEntry(charEntry)} 
                        className={`col-span-1 group relative flex flex-col items-center justify-center p-2 sm:p-4 h-24 sm:h-28 md:h-32 rounded-2xl sm:rounded-[1.5rem] border-2 border-b-[4px] sm:border-b-[6px] cursor-pointer transition-all active:border-b-2 active:translate-y-[2px] sm:active:translate-y-[4px] hover:-translate-y-1 ${
                          isDarkMode 
                            ? 'bg-[#151E2E] border-slate-700 hover:bg-[#1A233A] hover:border-indigo-500' 
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-400'
                        } ${isCharHidden ? 'opacity-50 grayscale' : ''}`}
                      >
                        <button onClick={(e) => toggleWordVisibility(e, charEntry.id)} className={`absolute top-1 right-1 sm:top-2 sm:right-2 p-1.5 rounded-md transition-all ${isCharHidden ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                          {isCharHidden ? <Lock size={10} sm:size={12} /> : <Unlock size={10} sm:size={12} />}
                        </button>
                        
                        <span className={`text-2xl sm:text-4xl font-black mt-2 mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{charEntry.symbol || charEntry.kanji}</span>
                        <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-center px-1 truncate w-full`}>
                          {charEntry.romaji || charEntry.meaning}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </main>

      {/* THE UPGRADED MOBILE-RESPONSIVE MODAL */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEntry(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`custom-scrollbar relative w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border shadow-2xl flex flex-col mt-auto sm:mt-0 ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`pt-16 pb-12 md:pt-20 md:pb-16 px-6 shrink-0 flex flex-col items-center border-b text-center relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-b from-[#1A233A] to-[#0F1523] border-slate-800' : 'bg-gradient-to-b from-indigo-50/50 to-white border-slate-200'}`}>
                
                <div className={`absolute -right-4 -bottom-16 md:-right-8 md:-bottom-20 text-[14rem] md:text-[20rem] font-black select-none pointer-events-none ${isDarkMode ? 'text-white/[0.03]' : 'text-slate-900/[0.03]'}`}>
                  {selectedEntry.kanji || selectedEntry.symbol}
                </div>

                <button onClick={() => setSelectedEntry(null)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}><X size={20} /></button>
                
                <button 
                  onClick={(e) => playAudio(e, selectedEntry.audioUrl, selectedEntry.kanji || selectedEntry.symbol)} 
                  className={`mb-6 p-3.5 rounded-full transition-all hover:scale-110 active:scale-95 z-10 relative ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-500 hover:text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'}`}
                >
                  <Volume2 size={24} />
                </button>
                
                <h2 className={`text-8xl md:text-9xl font-black mb-4 relative z-10 drop-shadow-lg leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedEntry.kanji || selectedEntry.symbol}
                </h2>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 relative z-10">
                  {selectedEntry.kana && <span className={`text-2xl font-black tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{selectedEntry.kana}</span>}
                  <span className={`text-base font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{selectedEntry.romaji}</span>
                </div>
              </div>

              <div className="p-6 sm:p-8 md:p-10 space-y-8 relative z-10 shrink-0">
                
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.pos && <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${isDarkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{selectedEntry.pos} • {selectedEntry.subType}</span>}
                  {selectedEntry.jlpt && <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${getJlptColor(selectedEntry.jlpt)}`}><GraduationCap size={12}/> {selectedEntry.jlpt}</span>}
                  {selectedEntry.strokes && <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{selectedEntry.strokes} Strokes</span>}
                </div>

                <div>
                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Primary Meaning</h4>
                  <p className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedEntry.english || selectedEntry.meaning}</p>
                </div>

                {selectedEntry.images && selectedEntry.images.filter(img => !img.isHidden).length > 0 && (
                  <div>
                     <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <ImageIcon size={14} /> Visual Reference
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedEntry.images.filter(img => !img.isHidden).map((img, i) => (
                        <img 
                          key={i} 
                          src={img.url} 
                          alt="Reference" 
                          className={`w-full h-40 md:h-48 object-contain p-4 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.type === 'kanji' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Onyomi (Chinese)
                      </h4>
                      <p className={`text-xl font-bold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedEntry.onyomi || '-'}</p>
                    </div>
                    <div className={`p-5 rounded-[1.5rem] border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Kunyomi (Japanese)
                      </h4>
                      <p className={`text-xl font-bold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedEntry.kunyomi || '-'}</p>
                    </div>
                  </div>
                )}

                {selectedEntry.notes && (
                  <div className={`p-5 rounded-[1.5rem] border flex gap-4 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <Info size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>Teacher Notes</h4>
                      <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-amber-200/80' : 'text-amber-800'}`}>{selectedEntry.notes}</p>
                    </div>
                  </div>
                )}

                {((selectedEntry.sentences && selectedEntry.sentences.length > 0) || (selectedEntry.examples && selectedEntry.examples.length > 0)) && (
                  <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Quote size={14} /> Context Examples
                    </h4>
                    <div className="space-y-3">
                      {selectedEntry.sentences?.map((sent, i) => (
                        <div key={i} className={`p-5 sm:p-6 rounded-[1.5rem] border transition-colors ${isDarkMode ? 'bg-[#151E2E] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <p className={`text-lg sm:text-xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sent.jp}</p>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sent.en}</p>
                        </div>
                      ))}
                      {selectedEntry.examples?.map((ex, i) => (
                        <div key={i} className={`p-4 sm:p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                          <p className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ex}</p>
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