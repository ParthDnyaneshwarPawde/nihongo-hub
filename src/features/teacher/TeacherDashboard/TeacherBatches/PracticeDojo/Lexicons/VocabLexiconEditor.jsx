import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Upload, FileSpreadsheet, Plus, 
  Trash2, Loader2, Link2, Volume2, Info, Image as ImageIcon,
  ShieldAlert, Eye, EyeOff, BookOpen, Activity, Sparkles, Archive, Hash, MessageCircle, Type, 
  ChevronDown, AlertTriangle, Database, Edit2, Search, RefreshCcw, SkipForward
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, query, orderBy, limit, startAfter, getDocs, deleteDoc } from 'firebase/firestore';

const generatePrefix = (type) => {
  if (type === 'vocab') return 'v';
  if (type === 'kanji') return 'k';
  if (type === 'hiragana') return 'hg';
  if (type === 'katakana') return 'kk';
  return 'x';
};

const generateId = (type) => `${generatePrefix(type)}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

export default function VocabLexiconEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const categoryId = 'vocab';
  
  // SECURITY STATE
  const [isAuthorized, setIsAuthorized] = useState(null); 

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState('manual'); 
  
  // 🚨 CSV COLLISION ENGINE STATE (Cleaned and fully updated)
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [csvStaging, setCsvStaging] = useState({ newItems: [], collidingItems: [] });
  const [resolvingIndex, setResolvingIndex] = useState(0);
  const [resolvedCollisions, setResolvedCollisions] = useState([]);
  const [customNewId, setCustomNewId] = useState('');

  // DYNAMIC FORM STATE
  const [entryType, setEntryType] = useState('vocab'); 
  
  const [customId, setCustomId] = useState(''); 
  const [symbol, setSymbol] = useState(''); 
  const [kana, setKana] = useState(''); 
  const [romaji, setRomaji] = useState('');
  const [meaning, setMeaning] = useState('');
  const [jlpt, setJlpt] = useState('N5');
  
  const [pos, setPos] = useState('noun');
  const [subType, setSubType] = useState('Standard');
  
  const [onyomi, setOnyomi] = useState('');
  const [kunyomi, setKunyomi] = useState('');
  const [strokes, setStrokes] = useState('');
  
  const [audioUrl, setAudioUrl] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  
  const [sentences, setSentences] = useState([{ jp: '', en: '' }]);
  const [examples, setExamples] = useState(['']); 
  const [images, setImages] = useState([]); 

  const fileInputRef = useRef(null);

  // DATABASE PAGINATION & SEARCH STATE
  const [dbEntries, setDbEntries] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMoreDb, setHasMoreDb] = useState(true);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [tableSearch, setTableSearch] = useState(''); 

  // INITIAL LOAD
  useEffect(() => {
    const verifyAccess = async () => {
      const userUid = auth.currentUser?.uid;
      if (!userUid || !categoryId) return setIsAuthorized(false);
      try {
        const lexiconRef = doc(db, 'lexicons', categoryId);
        const snap = await getDoc(lexiconRef);
        if (snap.exists() && (snap.data().accessIds || []).includes(userUid)) {
          setIsAuthorized(true);
          loadDatabasePreview();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        setIsAuthorized(false);
      }
    };
    verifyAccess();
  }, [categoryId]);

  // FETCH DB PREVIEW
  const loadDatabasePreview = async (loadMore = false) => {
    if (isLoadingDb) return;
    setIsLoadingDb(true);
    try {
      const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
      let q = query(entriesRef, orderBy('updatedAt', 'desc'), limit(15));
      if (loadMore && lastDoc) q = query(entriesRef, orderBy('updatedAt', 'desc'), startAfter(lastDoc), limit(15));

      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => doc.data());
      
      setDbEntries(loadMore ? prev => [...prev, ...fetched] : fetched);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMoreDb(snap.docs.length === 15);
    } catch (error) {
      console.error("Failed to load db preview:", error);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const getSubTypes = (partOfSpeech) => {
    switch(partOfSpeech) {
      case 'verb': return ['Godan (U)', 'Ichidan (Ru)', 'Irregular (Suru/Kuru)', 'Transitive', 'Intransitive'];
      case 'adjective': return ['I-Adj', 'Na-Adj', 'No-Adj'];
      case 'noun': return ['Standard', 'Suru-Noun', 'Pronoun', 'Proper Noun'];
      default: return ['Standard', 'Case', 'Binding', 'Ending'];
    }
  };

  const handlePosChange = (e) => {
    setPos(e.target.value);
    setSubType(getSubTypes(e.target.value)[0]); 
  };

  // LOAD EXISTING ENTRY INTO FORM FOR EDITING
  const loadIntoEditor = (entry) => {
    setEntryType(entry.type || 'vocab');
    setCustomId(entry.id);
    setSymbol(entry.kanji || entry.symbol || '');
    setKana(entry.kana || '');
    setRomaji(entry.romaji || '');
    setMeaning(entry.english || entry.meaning || '');
    setJlpt(entry.jlpt || 'N5');
    setPos(entry.pos || 'noun');
    setSubType(entry.subType || 'Standard');
    setOnyomi(entry.onyomi || '');
    setKunyomi(entry.kunyomi || '');
    setStrokes(entry.strokes ? entry.strokes.toString() : '');
    setAudioUrl(entry.audioUrl || '');
    setTeacherNotes(entry.notes || '');
    setImages(entry.images || []);
    setSentences(entry.sentences?.length > 0 ? entry.sentences : [{ jp: '', en: '' }]);
    setExamples(entry.examples?.length > 0 ? entry.examples : ['']);
    
    setActiveTab('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // DELETE ENTRY
  const handleDeleteEntry = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete entry ${id}?`)) return;
    try {
      await deleteDoc(doc(db, `lexicons/${categoryId}/entries`, id));
      setDbEntries(prev => prev.filter(e => e.id !== id));
      alert("Entry deleted.");
    } catch (error) {
      alert("Failed to delete entry.");
    }
  };

  // SAVE MANUAL ENTRY
  const handleSaveEntry = async () => {
    if (!symbol.trim() && entryType !== 'vocab') return alert("Symbol/Character is required.");
    if (!meaning.trim() && entryType === 'vocab') return alert("Meaning is required.");

    setIsSaving(true);
    try {
      const cleanImages = images.filter(img => img.url.trim() !== '');
      const finalId = customId.trim() || generateId(entryType);

      let payload = {
        id: finalId, type: entryType, jlpt, romaji, audioUrl: audioUrl || null, notes: teacherNotes || null, images: cleanImages, updatedAt: new Date().toISOString()
      };

      if (entryType === 'vocab') {
        payload = { ...payload, kanji: symbol, kana, english: meaning, pos, subType, sentences: sentences.filter(s => s.jp.trim() !== '') };
      } else if (entryType === 'kanji') {
        payload = { ...payload, symbol, meaning, onyomi, kunyomi, strokes: parseInt(strokes) || 0, examples: examples.filter(ex => ex.trim() !== '') };
      } else {
        payload = { ...payload, symbol, examples: examples.filter(ex => ex.trim() !== '') };
      }

      const docRef = doc(db, `lexicons/${categoryId}/entries`, payload.id);
      
      if (customId.trim() && !dbEntries.find(e => e.id === finalId)) {
        const existing = await getDoc(docRef);
        if (existing.exists() && !window.confirm(`ID "${finalId}" already exists. Overwrite?`)) {
          setIsSaving(false); return;
        }
      }

      await setDoc(docRef, payload);
      alert("Entry saved successfully!");
      
      // Reset Form
      setCustomId(''); setSymbol(''); setKana(''); setRomaji(''); setMeaning('');
      setSentences([{ jp: '', en: '' }]); setExamples(['']); setImages([]);
      setAudioUrl(''); setTeacherNotes(''); setOnyomi(''); setKunyomi(''); setStrokes('');
      
      loadDatabasePreview(); 
    } catch (error) {
      alert("Failed to save entry.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🚨 NEW CSV AGGREGATOR & RESOLVER FUNCTIONS
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split(/\r?\n/).filter(row => row.trim());
        if (rows.length < 2) { setIsImporting(false); return alert("Empty CSV."); }
        
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        const newItems = [];
        const collidingItems = [];

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
          if (values.length < 2) continue;

          const rowData = {};
          headers.forEach((h, idx) => { rowData[h] = values[idx] || ''; });

          const derivedType = rowData.type || 'vocab';
          const intendedId = rowData.id || generateId(derivedType);

          const parsedImages = rowData.imageurls ? rowData.imageurls.split(';').map(u => ({ url: u.trim(), isHidden: false })).filter(i => i.url) : [];
          const parsedExamples = rowData.examples ? rowData.examples.split(';').map(e => e.trim()).filter(e => e) : [];
          const parsedSentences = rowData.sentences ? rowData.sentences.split(';').map(s => {
            const parts = s.split('|');
            return { jp: parts[0]?.trim() || '', en: parts[1]?.trim() || '' };
          }).filter(s => s.jp) : [];

          const payload = {
            id: intendedId, type: derivedType, jlpt: rowData.jlpt || 'N5',
            kanji: rowData.kanji || rowData.symbol || '', kana: rowData.kana || '',
            romaji: rowData.romaji || '', english: rowData.english || rowData.meaning || '',
            pos: rowData.pos || 'noun', subType: rowData.subtype || 'Standard',
            onyomi: rowData.onyomi || '', kunyomi: rowData.kunyomi || '',
            strokes: parseInt(rowData.strokes) || 0, audioUrl: rowData.audiourl || null,
            notes: rowData.notes || null, images: parsedImages, examples: parsedExamples,
            sentences: parsedSentences, updatedAt: new Date().toISOString()
          };

          if (rowData.id) {
            const docRef = doc(db, `lexicons/${categoryId}/entries`, intendedId);
            const existingSnap = await getDoc(docRef);
            if (existingSnap.exists()) {
              collidingItems.push({ id: intendedId, payload: payload, existing: existingSnap.data() });
              continue;
            }
          }
          newItems.push({ id: intendedId, payload: payload });
        }

        if (collidingItems.length > 0) {
          setCsvStaging({ newItems, collidingItems });
          setResolvingIndex(0);
          setResolvedCollisions([]);
          setCustomNewId('');
          setShowCollisionDialog(true);
        } else if (newItems.length > 0) {
          commitResolvedCSV(newItems, []);
        } else {
          alert("No valid entries found.");
        }
      } catch (error) {
        alert(`Parsing Failed: ${error.message}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = null;
      }
    };
    reader.readAsText(file);
  };

  const handleResolveCollision = (action) => {
    const currentItem = csvStaging.collidingItems[resolvingIndex];
    let newResolved = [...resolvedCollisions];

    if (action === 'overwrite') {
      newResolved.push(currentItem);
    } else if (action === 'save_as_new') {
      const generatedId = customNewId.trim() || `${currentItem.id}_new_${Math.floor(Math.random() * 1000)}`;
      newResolved.push({ id: generatedId, payload: { ...currentItem.payload, id: generatedId } });
    }

    const nextIndex = resolvingIndex + 1;
    if (nextIndex < csvStaging.collidingItems.length) {
      setResolvingIndex(nextIndex);
      setCustomNewId('');
    } else {
      commitResolvedCSV(csvStaging.newItems, newResolved);
    }
  };

  const handleResolveAll = (action) => {
    let finalResolved = [...resolvedCollisions];
    if (action === 'overwrite') {
      const remainingItems = csvStaging.collidingItems.slice(resolvingIndex);
      finalResolved = [...finalResolved, ...remainingItems];
    }
    commitResolvedCSV(csvStaging.newItems, finalResolved);
  };

  const commitResolvedCSV = async (newItems, resolvedItems) => {
    setIsImporting(true);
    setShowCollisionDialog(false);
    try {
      let batch = writeBatch(db);
      let count = 0;
      let totalCommitted = 0;
      const allItems = [...newItems, ...resolvedItems];

      for (const item of allItems) {
        batch.set(doc(db, `lexicons/${categoryId}/entries`, item.id), item.payload);
        count++;
        totalCommitted++;

        if (count >= 490) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) await batch.commit();

      if (totalCommitted > 0) {
        alert(`Successfully imported ${totalCommitted} entries!`);
        loadDatabasePreview(); 
      } else {
        alert("Upload completed, but 0 new items were added (all duplicates skipped).");
      }
    } catch (error) { 
      alert(`Firebase Rejected Upload: ${error.message}`); 
    } finally {
      setIsImporting(false);
      setCsvStaging({ newItems: [], collidingItems: [] });
      setResolvedCollisions([]);
    }
  };

  const downloadTemplate = (type) => {
    let csvContent = "";
    if (type === 'vocab') {
      csvContent = "ID,Type,JLPT,Kanji,Kana,Romaji,English,POS,SubType,AudioUrl,ImageUrls,Notes,Sentences\nv_example1,vocab,N5,食べる,たべる,taberu,to eat,verb,Ichidan (Ru),https://audio.mp3,https://img1.png;https://img2.png,Teacher note here,私はりんごを食べる。|I eat an apple.;ビルが高い。|Building is tall.";
    } else if (type === 'kanji') {
      csvContent = "ID,Type,JLPT,Symbol,Meaning,Onyomi,Kunyomi,Strokes,AudioUrl,ImageUrls,Notes,Examples\nk_example1,kanji,N5,水,Water,スイ,みず,4,https://audio.mp3,https://stroke.png,Common radical,水 (みず) - Water;水曜日 (すいようび) - Wednesday";
    } else {
      csvContent = "ID,Type,Symbol,Romaji,AudioUrl,ImageUrls,Notes,Examples\nhg_example1,hiragana,あ,a,https://audio.mp3,https://stroke.png,First character,あそこ - Over there;ありがとう - Thank you";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `Lexicon_${type}_Template.csv`;
    link.click();
  };

  const getJlptColor = (level) => {
    switch(level) {
      case 'N5': return isDarkMode ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-emerald-600 border-emerald-200 bg-emerald-50';
      case 'N4': return isDarkMode ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 'text-blue-600 border-blue-200 bg-blue-50';
      case 'N3': return isDarkMode ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-amber-600 border-amber-200 bg-amber-50';
      default: return isDarkMode ? 'text-slate-400 border-slate-500/20 bg-slate-500/10' : 'text-slate-600 border-slate-200 bg-slate-50';
    }
  };

  const filteredDbEntries = dbEntries.filter(entry => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    
    return (
      (entry.kanji?.toLowerCase().includes(q)) ||
      (entry.symbol?.toLowerCase().includes(q)) ||
      (entry.kana?.toLowerCase().includes(q)) ||
      (entry.romaji?.toLowerCase().includes(q)) ||
      (entry.english?.toLowerCase().includes(q)) ||
      (entry.meaning?.toLowerCase().includes(q)) ||
      (entry.id?.toLowerCase().includes(q)) ||
      (entry.type?.toLowerCase().includes(q)) ||
      (entry.jlpt?.toLowerCase().includes(q)) ||
      (entry.pos?.toLowerCase().includes(q)) ||
      (entry.subType?.toLowerCase().includes(q)) ||
      (entry.strokes?.toString().includes(q))
    );
  });

  if (isAuthorized === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>;
  if (isAuthorized === false) return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      <ShieldAlert size={80} className="text-rose-500 mb-6 drop-shadow-lg" />
      <h1 className="text-4xl font-black mb-2">Access Denied</h1>
      <button onClick={() => navigate(-1)} className="mt-8 px-8 py-4 bg-indigo-600 text-white font-black uppercase rounded-2xl flex items-center gap-2"><ArrowLeft size={18} /> Return</button>
    </div>
  );

  // 🚨 COLLISION UI HELPERS
  const currentCollision = showCollisionDialog ? csvStaging.collidingItems[resolvingIndex] : null;
  const currentDbItem = currentCollision ? currentCollision.existing : null;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B1120] text-slate-200' : 'bg-slate-50 text-slate-900'} pb-32 relative`}>
      
      {/* 🚨 UPDATED COLLISION RESOLUTION DIALOG */}
      {showCollisionDialog && currentCollision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl p-6 md:p-8 rounded-[2rem] border shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}>
            
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID Collision Detected</h2>
                  <p className={`text-[10px] font-bold uppercase tracking-widest text-rose-500`}>
                    Conflict {resolvingIndex + 1} of {csvStaging.collidingItems.length}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowCollisionDialog(false); setCsvStaging({newItems:[], collidingItems:[]}); setResolvedCollisions([]); }} className={`text-[10px] font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cancel Upload</button>
            </div>
            
            {/* Cards Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* CURRENT DB CARD */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Current DB</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentDbItem?.kanji || currentDbItem?.symbol || currentDbItem?.kana || 'Unknown'}
                </p>
                <p className={`text-xs font-mono opacity-60 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>ID: {currentDbItem?.id}</p>
              </div>

              {/* INCOMING CSV CARD */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Incoming CSV</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  {currentCollision.payload.kanji || currentCollision.payload.symbol || currentCollision.payload.kana || 'Unknown'}
                </p>
                <p className={`text-xs font-mono opacity-60 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>ID: {currentCollision.id}</p>
              </div>
            </div>

            {/* Custom ID Input */}
            <div className="mb-6">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assign New ID (Optional)</label>
              <input 
                type="text" 
                value={customNewId} 
                onChange={(e) => setCustomNewId(e.target.value)} 
                placeholder={`e.g., ${currentCollision.id}_alt`} 
                className={`w-full p-2.5 rounded-lg border text-sm transition-all focus:ring-2 outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-200' : 'bg-white border-slate-300 focus:border-indigo-400 focus:ring-indigo-500/20 text-slate-900'}`} 
              />
            </div>

            {/* Step-by-Step Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={() => handleResolveCollision('overwrite')} 
                className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
              >
                Overwrite
              </button>
              <button 
                onClick={() => handleResolveCollision('save_as_new')} 
                className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
              >
                Save As New
              </button>
              <button 
                onClick={() => handleResolveCollision('skip')} 
                className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                Skip
              </button>
            </div>

            {/* BULK ACTIONS */}
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Bulk Actions (Applies to all {csvStaging.collidingItems.length - resolvingIndex} remaining)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => handleResolveAll('overwrite')} 
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center border ${isDarkMode ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-rose-300 text-rose-600 hover:bg-rose-50'}`}
                >
                  <RefreshCcw size={14} className="inline mr-2" /> Overwrite All Remaining
                </button>
                <button 
                  onClick={() => handleResolveAll('skip')} 
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center border ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                >
                  <SkipForward size={14} className="inline mr-2" /> Skip All Remaining
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">Lexicon Core Editor</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Master Database Access</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-10 space-y-10">

        <div className={`flex p-1.5 rounded-2xl border w-fit mx-auto ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <button onClick={() => setActiveTab('manual')} className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'manual' ? (isDarkMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-lg') : 'text-slate-500'}`}>Manual Entry</button>
          <button onClick={() => setActiveTab('bulk')} className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'bulk' ? (isDarkMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-600 text-white shadow-lg') : 'text-slate-500'}`}><FileSpreadsheet size={16}/> CSV Bulk</button>
        </div>

        <AnimatePresence mode="wait">
          
          {/* BULK UPLOAD TAB */}
          {activeTab === 'bulk' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`max-w-4xl mx-auto p-10 rounded-[2.5rem] border text-center ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
              <FileSpreadsheet size={48} className={`mx-auto mb-6 ${isDarkMode ? 'text-emerald-500/50' : 'text-emerald-200'}`} />
              <h2 className="text-2xl font-black mb-2">Mass CSV Upload</h2>
              <p className={`text-sm font-bold max-w-xl mx-auto mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Download a template below. Arrays like Images, Sentences, and Examples must be separated by semicolons (;). Sentences must be formatted as Japanese|English.</p>
              
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <button onClick={() => downloadTemplate('vocab')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Template: Vocab</button>
                <button onClick={() => downloadTemplate('kanji')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Template: Kanji</button>
                <button onClick={() => downloadTemplate('kana')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>Template: Kana</button>
              </div>

              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current.click()} disabled={isImporting} className={`mx-auto px-8 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isImporting ? 'bg-emerald-500/50 text-white/50 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/20 active:scale-95'}`}>
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} {isImporting ? 'Processing...' : 'Upload CSV File'}
              </button>
            </motion.div>
          )}

          {/* MANUAL ENTRY TAB */}
          {activeTab === 'manual' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto space-y-8">
              
              <div className={`p-2 rounded-[2rem] border flex gap-2 w-fit overflow-x-auto ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                {['vocab', 'kanji', 'hiragana', 'katakana'].map(type => (
                  <button key={type} onClick={() => setEntryType(type)} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase transition-all ${entryType === type ? (isDarkMode ? 'bg-[#0B1120] text-indigo-400 border-slate-700 border' : 'bg-slate-100 text-indigo-600 border border-slate-200') : 'text-slate-500'}`}>{type}</button>
                ))}
              </div>

              <div className={`p-8 md:p-10 rounded-[2.5rem] border shadow-sm space-y-8 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
                
                {/* Custom ID */}
                <div className={`pb-8 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <label className={`text-[10px] font-black uppercase flex items-center gap-2 mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}><Hash size={12}/> Document ID</label>
                  <input type="text" value={customId} onChange={e => setCustomId(e.target.value)} placeholder={`Leave blank to auto-generate: ${generatePrefix(entryType)}_xxxx`} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                </div>

                {/* Primary Data */}
                <div>
                  <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}><BookOpen size={16}/> Primary Data</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">{entryType === 'vocab' ? 'Vocab / Kanji' : 'Character / Symbol'}</label>
                      <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder={entryType === 'vocab' ? 'e.g., 食べる' : (entryType === 'kanji' ? 'e.g., 水' : 'e.g., あ')} className={`w-full p-4 text-2xl rounded-2xl border font-black outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                    </div>
                    {entryType === 'vocab' && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Kana Reading</label>
                        <input type="text" value={kana} onChange={e => setKana(e.target.value)} placeholder="e.g., たべる" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                      </div>
                    )}
                    {(entryType === 'vocab' || entryType === 'kanji') && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">English Meaning</label>
                        <input type="text" value={meaning} onChange={e => setMeaning(e.target.value)} placeholder={entryType === 'vocab' ? "e.g., to eat" : "e.g., Water"} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Romaji</label>
                      <input type="text" value={romaji} onChange={e => setRomaji(e.target.value)} placeholder={entryType === 'vocab' ? "e.g., taberu" : "e.g., a"} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                    </div>
                    {(entryType === 'vocab' || entryType === 'kanji') && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">JLPT Level</label>
                        <select value={jlpt} onChange={e => setJlpt(e.target.value)} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}><option value="N5">N5</option><option value="N4">N4</option><option value="N3">N3</option><option value="N2">N2</option><option value="N1">N1</option><option value="None">None</option></select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linguistic Tags */}
                {entryType === 'vocab' && (
                  <div className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}><Archive size={16}/> Linguistic Tags</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Part of Speech</label><select value={pos} onChange={handlePosChange} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}><option value="noun">Noun</option><option value="verb">Verb</option><option value="adjective">Adjective</option><option value="adverb">Adverb</option><option value="particle">Particle</option><option value="expression">Expression</option></select></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Sub Type</label><select value={subType} onChange={e => setSubType(e.target.value)} className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>{getSubTypes(pos).map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                    </div>
                  </div>
                )}

                {/* Kanji Details */}
                {entryType === 'kanji' && (
                  <div className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><Type size={16}/> Kanji Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Onyomi</label><input type="text" value={onyomi} onChange={e => setOnyomi(e.target.value)} placeholder="e.g., スイ (sui)" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Kunyomi</label><input type="text" value={kunyomi} onChange={e => setKunyomi(e.target.value)} placeholder="e.g., みず (mizu)" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} /></div>
                      <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Strokes</label><input type="number" value={strokes} onChange={e => setStrokes(e.target.value)} placeholder="e.g., 4" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} /></div>
                    </div>
                  </div>
                )}

                {/* Media & Content */}
                <div className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className={`text-xs font-black uppercase mb-6 flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}><Volume2 size={16}/> Media & Content</h3>
                  <div className="space-y-6">
                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2"><Link2 size={12} className="inline mr-1"/> Audio URL</label><input type="text" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://d1uxf3y2sxsff6.cloudfront.net/..." className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} /></div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black uppercase text-slate-500"><ImageIcon size={12} className="inline mr-1"/> Images (Vocab/Stroke Order)</label>
                        <button type="button" onClick={() => setImages([...images, { url: '', isHidden: false }])} className="px-2 py-1 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 flex items-center gap-1"><Plus size={10}/> Add Image</button>
                      </div>
                      <div className="space-y-3">
                        {images.map((img, i) => (
                          <div key={i} className={`flex items-center gap-3 p-2 rounded-2xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <button type="button" onClick={() => { const newImgs = [...images]; newImgs[i].isHidden = !newImgs[i].isHidden; setImages(newImgs); }} className={`p-2 rounded-xl ${img.isHidden ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-400'}`} title="Toggle Visibility">{img.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            <input type="text" placeholder="https://image-url.png" value={img.url} onChange={e => { const newImgs = [...images]; newImgs[i].url = e.target.value; setImages(newImgs); }} className={`flex-1 p-2 bg-transparent text-sm font-bold outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                            <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2"><Info size={12} className="inline mr-1"/> Teacher Notes</label><textarea value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} placeholder="Add conjugation rules, exceptions, or context tips here..." className={`w-full p-4 rounded-2xl border text-sm font-bold resize-none h-24 outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} /></div>
                  </div>
                </div>

                {/* Array Builder */}
                <div className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xs font-black uppercase flex items-center gap-2 ${isDarkMode ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}><MessageCircle size={16}/> {entryType === 'vocab' ? 'Sentences' : 'Examples'}</h3>
                    <button type="button" onClick={() => entryType === 'vocab' ? setSentences([...sentences, {jp:'', en:''}]) : setExamples([...examples, ''])} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-fuchsia-500/20 text-fuchsia-400 flex items-center gap-1"><Plus size={12}/> Add</button>
                  </div>
                  <div className="space-y-4">
                    {entryType === 'vocab' && sentences.map((sent, i) => (
                      <div key={i} className={`p-4 rounded-2xl border flex gap-4 ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex-1 space-y-3">
                          <input type="text" placeholder="e.g., 私はりんごを食べる。" value={sent.jp} onChange={e => { const newSents = [...sentences]; newSents[i].jp = e.target.value; setSentences(newSents); }} className={`w-full bg-transparent text-sm font-bold outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                          <div className={`h-px w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                          <input type="text" placeholder="e.g., I eat an apple." value={sent.en} onChange={e => { const newSents = [...sentences]; newSents[i].en = e.target.value; setSentences(newSents); }} className={`w-full bg-transparent text-xs font-bold outline-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                        <button type="button" onClick={() => setSentences(sentences.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 self-center"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {entryType !== 'vocab' && examples.map((ex, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded-2xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <input type="text" placeholder={entryType === 'kanji' ? "e.g., 水曜日 (すいようび) - Wednesday" : "e.g., ありがとう - Thank you"} value={ex} onChange={e => { const newEx = [...examples]; newEx[i] = e.target.value; setExamples(newEx); }} className={`flex-1 p-2 bg-transparent text-sm font-bold outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                        <button type="button" onClick={() => setExamples(examples.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Entry */}
                <div className={`pt-8 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button onClick={handleSaveEntry} disabled={isSaving} className={`px-8 py-4 rounded-xl text-sm font-black uppercase flex items-center gap-2 ${isSaving ? 'bg-indigo-500/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Entry
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚨 FULL-FEATURED LIVE DATABASE PREVIEW TABLE */}
        <div className="pt-10 pb-10 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                <Database size={16}/> Live Database Inspector
              </h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border mt-2 inline-block ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                Loaded {dbEntries.length} entries
              </span>
            </div>

            {/* 🚨 TABLE SEARCH FILTER */}
            <div className={`flex items-center gap-2 p-2.5 rounded-2xl border w-full sm:w-64 shadow-sm transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-800 focus-within:border-indigo-500' : 'bg-white border-slate-200 focus-within:border-indigo-400'}`}>
              <Search size={16} className="text-slate-400 ml-1" />
              <input 
                type="text" 
                placeholder="Filter loaded entries..." 
                value={tableSearch} 
                onChange={e => setTableSearch(e.target.value)} 
                className={`bg-transparent border-none outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} 
              />
            </div>
          </div>

          <div className={`overflow-x-auto rounded-[2rem] border shadow-sm custom-scrollbar ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#0F1523] border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <th className="p-5 font-bold">ID / Type</th>
                  <th className="p-5 font-bold">Symbol</th>
                  <th className="p-5 font-bold">Meaning</th>
                  <th className="p-5 font-bold">Tags</th>
                  <th className="p-5 font-bold">Media</th>
                  <th className="p-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDbEntries.length === 0 ? (
                  <tr><td colSpan="6" className="p-10 text-center text-sm font-bold text-slate-500">No entries found matching filter.</td></tr>
                ) : (
                  filteredDbEntries.map((entry) => (
                    <tr key={entry.id} className={`border-b transition-colors ${isDarkMode ? 'border-slate-800/50 hover:bg-slate-800/80' : 'border-slate-100 hover:bg-slate-50'}`}>
                      {/* ID & TYPE */}
                      <td className="p-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-xs font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{entry.id}</span>
                          <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>{entry.type}</span>
                        </div>
                      </td>
                      {/* ENTRY & KANA */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{entry.kanji || entry.symbol}</span>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-bold text-slate-400`}>{entry.kana || entry.romaji}</span>
                            {entry.onyomi && <span className={`text-[9px] font-bold text-emerald-400`}>{entry.onyomi} / {entry.kunyomi}</span>}
                          </div>
                        </div>
                      </td>
                      {/* MEANING */}
                      <td className="p-5 text-sm font-bold text-slate-500 max-w-[200px] truncate" title={entry.english || entry.meaning}>{entry.english || entry.meaning || '-'}</td>
                      {/* TAGS (JLPT / POS / STROKES) */}
                      <td className="p-5">
                        <div className="flex flex-wrap gap-1">
                          {entry.jlpt && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getJlptColor(entry.jlpt)}`}>{entry.jlpt}</span>}
                          {entry.pos && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{entry.pos}</span>}
                          {entry.strokes && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{entry.strokes} str</span>}
                        </div>
                      </td>
                      {/* MEDIA ICONS */}
                      <td className="p-5">
                        <div className="flex gap-2">
                          {entry.audioUrl && <Volume2 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} title="Contains Audio" />}
                          {entry.images?.length > 0 && <ImageIcon size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} title={`${entry.images.length} Images`} />}
                          {entry.notes && <Info size={16} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} title="Contains Notes" />}
                        </div>
                      </td>
                      {/* ACTIONS */}
                      <td className="p-5 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => loadIntoEditor(entry)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-slate-200'}`} title="Load into Editor"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteEntry(entry.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`} title="Permanently Delete"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {hasMoreDb && dbEntries.length > 0 && (
              <button onClick={() => loadDatabasePreview(true)} disabled={isLoadingDb} className={`w-full p-4 flex items-center justify-center gap-2 text-xs font-black uppercase transition-colors ${isDarkMode ? 'bg-[#0F1523] hover:bg-slate-800 text-indigo-400' : 'bg-slate-50 hover:bg-slate-100 text-indigo-600'}`}>
                {isLoadingDb ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />} Load More Entries
              </button>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}