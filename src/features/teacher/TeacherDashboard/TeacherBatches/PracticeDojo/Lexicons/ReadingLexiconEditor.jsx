import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Plus, Save, Trash2, Database, BookOpen, 
  Target, Edit3, Quote, Info, UploadCloud, Loader2, 
  Fingerprint, Sparkles, AlertTriangle, RefreshCcw, SkipForward,
  Image as ImageIcon, Link as LinkIcon, Download, HelpCircle, AlignLeft, CheckCircle2,
  Volume2, ChevronUp, ChevronDown // 🚨 New icons imported
} from 'lucide-react';

export default function ReadingLexiconEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const categoryId = 'reading'; 

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // CSV & Collision Resolution State
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [csvStaging, setCsvStaging] = useState({ newItems: [], collidingItems: [] });
  const fileInputRef = useRef(null);
  
  // Step-by-Step Resolution State
  const [resolvingIndex, setResolvingIndex] = useState(0);
  const [resolvedCollisions, setResolvedCollisions] = useState([]);
  const [customNewId, setCustomNewId] = useState('');

  const [editingId, setEditingId] = useState('');
  
  const initialFormState = {
    customId: '', 
    titleJp: '', 
    titleEn: '', 
    jlpt: 'N5', 
    genre: 'story', 
    wordCount: '',
    imageUrl: '',
    targetVocab: '',   
    targetGrammar: '', 
    paragraphs: [],    
    questions: []      
  };
  const [formData, setFormData] = useState(initialFormState);

  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const genres = [
    { id: 'story', label: 'Story / Tale' },
    { id: 'article', label: 'News / Article' },
    { id: 'essay', label: 'Essay / Blog' },
    { id: 'conversation', label: 'Dialogue / Chat' },
    { id: 'notice', label: 'Notice / Flyer' },
    { id: 'email', label: 'Email / Letter' }
  ];

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const userUid = auth.currentUser?.uid;
      if (!userUid) return navigate('/');

      const lexiconRef = doc(db, 'lexicons', categoryId);
      const lexiconSnap = await getDoc(lexiconRef);
      
      if (!lexiconSnap.exists() || !(lexiconSnap.data().accessIds || []).includes(userUid)) {
        alert("🔒 UNAUTHORIZED: You do not have Root Access to this database.");
        return navigate('/teacher-dashboard'); 
      }

      const entriesRef = collection(db, `lexicons/${categoryId}/entries`);
      const snapshot = await getDocs(entriesRef);
      const sorted = snapshot.docs.map(doc => doc.data()).sort((a, b) => (b.jlpt || '').localeCompare(a.jlpt || ''));
      setEntries(sorted);
    } catch (error) {
      console.error("Error fetching readings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    const timeout = setTimeout(() => fetchEntries(), 500); 
    return () => clearTimeout(timeout);
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // 🚨 NATIVE TTS PREVIEWER
  const playNativeAudio = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  // 🚨 PARAGRAPH MANAGER (WITH REORDERING)
  const handleParagraphChange = (index, field, value) => {
    const updated = [...formData.paragraphs];
    updated[index][field] = value;
    setFormData({ ...formData, paragraphs: updated });
  };
  const addParagraph = () => setFormData({ ...formData, paragraphs: [...formData.paragraphs, { jp: '', en: '', note: '' }] });
  const removeParagraph = (index) => setFormData({ ...formData, paragraphs: formData.paragraphs.filter((_, i) => i !== index) });
  
  const moveParagraph = (index, direction) => {
    if (index + direction < 0 || index + direction >= formData.paragraphs.length) return;
    const newParas = [...formData.paragraphs];
    const temp = newParas[index];
    newParas[index] = newParas[index + direction];
    newParas[index + direction] = temp;
    setFormData({ ...formData, paragraphs: newParas });
  };

  // 🚨 QUIZ MANAGER (WITH REORDERING)
// 🚨 QUIZ MANAGER (WITH REORDERING & DYNAMIC OPTIONS)
  const handleQuestionChange = (index, field, value) => {
    const updated = [...formData.questions];
    updated[index][field] = value;
    setFormData({ ...formData, questions: updated });
  };
  
  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...formData.questions];
    updated[qIndex].options[optIndex] = value;
    setFormData({ ...formData, questions: updated });
  };

  // NEW: Add an extra option to a specific question
  const addOption = (qIndex) => {
    const updated = [...formData.questions];
    updated[qIndex].options.push('');
    setFormData({ ...formData, questions: updated });
  };

  // NEW: Remove an option from a specific question safely
  const removeOption = (qIndex, optIndex) => {
    const updated = [...formData.questions];
    if (updated[qIndex].options.length <= 2) {
      return alert("A question must have at least 2 options (e.g., True/False).");
    }
    
    updated[qIndex].options.splice(optIndex, 1);
    
    // Safety check: If they deleted the "Correct" answer, reset it to 0. 
    // If they deleted an option before the correct one, shift the index down.
    if (updated[qIndex].correctIndex === optIndex) {
      updated[qIndex].correctIndex = 0;
    } else if (updated[qIndex].correctIndex > optIndex) {
      updated[qIndex].correctIndex -= 1;
    }
    
    setFormData({ ...formData, questions: updated });
  };

  const addQuestion = () => setFormData({ 
    ...formData, 
    questions: [...formData.questions, { questionJp: '', questionEn: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }] 
  });
  
  const removeQuestion = (index) => setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== index) });

  const moveQuestion = (index, direction) => {
    if (index + direction < 0 || index + direction >= formData.questions.length) return;
    const newQs = [...formData.questions];
    const temp = newQs[index];
    newQs[index] = newQs[index + direction];
    newQs[index + direction] = temp;
    setFormData({ ...formData, questions: newQs });
  };

  // TEMPLATE GENERATOR
  const downloadTemplate = () => {
    const headers = "ID,TitleJp,TitleEn,JLPT,Genre,WordCount,ImageUrl,TargetVocab,TargetGrammar,ParaJp,ParaEn,ParaNote,QJp,QEn,QOpt0,QOpt1,QOpt2,QOpt3,QCorrect,QExp\n";
    const row1 = `rd_postoffice,郵便局での手紙,A Letter at the Post Office,N4,email,150,https://img.com/post.png,"郵便局, 切手","〜ために, 〜てもいい",昨日、郵便局[ゆうびんきょく]へ行きました。,Yesterday I went to the post office.,Notice the furigana syntax,,,,,,,\n`;
    const row2 = `rd_postoffice,,,,,,,,,,母に手紙[てがみ]を出しました。,I sent a letter to my mother.,,,,,,,,\n`;
    const row3 = `rd_postoffice,,,,,,,,,,,,どこへ行きましたか。,Where did they go?,銀行,郵便局,学校,病院,1,The text says they went to the post office.\n`;

    const templateCSV = headers + row1 + row2 + row3;
    const blob = new Blob([new Uint8Array([0xFEFF]), templateCSV], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Reading_Database_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVRow = (str) => {
    const result = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"' && str[i + 1] === '"') { curr += '"'; i++; } 
      else if (char === '"') { inQuotes = !inQuotes; } 
      else if (char === ',' && !inQuotes) { result.push(curr.trim()); curr = ''; } 
      else { curr += char; }
    }
    result.push(curr.trim());
    return result;
  };

  // CSV UPLOAD & COLLISION DETECTION
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingCSV(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let csvText = event.target.result;
        if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
        csvText = csvText.replace(/\r/g, '');

        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) { alert("CSV appears empty."); setIsUploadingCSV(false); return; }

        const headers = parseCSVRow(rows[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        const aggregatedData = {};

        for (let i = 1; i < rows.length; i++) {
          const rowValues = parseCSVRow(rows[i]);
          const entryData = {};
          headers.forEach((header, index) => { if (rowValues[index]) entryData[header] = rowValues[index]; });

          const trackingKey = entryData.id || entryData.titlejp;
          if (!trackingKey) continue; 

          if (!aggregatedData[trackingKey]) {
            aggregatedData[trackingKey] = {
              id: entryData.id || '', titleJp: entryData.titlejp || '', titleEn: entryData.titleen || '',
              jlpt: entryData.jlpt ? entryData.jlpt.toUpperCase() : 'N5', genre: entryData.genre ? entryData.genre.toLowerCase() : 'story',
              wordCount: entryData.wordcount || '', imageUrl: entryData.imageurl || '',
              targetVocab: entryData.targetvocab || '', targetGrammar: entryData.targetgrammar || '',
              paragraphs: [], questions: []
            };
          }

          if (entryData.parajp || entryData.paraen) {
            aggregatedData[trackingKey].paragraphs.push({ jp: entryData.parajp || '', en: entryData.paraen || '', note: entryData.paranote || '' });
          }
          if (entryData.qjp || entryData.qen) {
            aggregatedData[trackingKey].questions.push({ 
              questionJp: entryData.qjp || '', questionEn: entryData.qen || '', 
              options: [entryData.qopt0 || '', entryData.qopt1 || '', entryData.qopt2 || '', entryData.qopt3 || ''], 
              correctIndex: parseInt(entryData.qcorrect) || 0, explanation: entryData.qexp || ''
            });
          }
        }

        const newItems = [];
        const collidingItems = [];

        Object.values(aggregatedData).forEach(stagedItem => {
          let existingEntry = entries.find(e => e.id === stagedItem.id || (e.titleJp === stagedItem.titleJp && stagedItem.titleJp !== ''));
          let finalId = existingEntry ? existingEntry.id : (stagedItem.id || `rd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
          
          let mergedParas = existingEntry && existingEntry.paragraphs ? [...existingEntry.paragraphs] : [];
          stagedItem.paragraphs.forEach(newP => { if (!mergedParas.some(p => p.jp === newP.jp)) mergedParas.push(newP); });

          let mergedQs = existingEntry && existingEntry.questions ? [...existingEntry.questions] : [];
          stagedItem.questions.forEach(newQ => { if (!mergedQs.some(q => q.questionJp === newQ.questionJp)) mergedQs.push(newQ); });

          const finalPayload = { ...stagedItem, id: finalId, type: 'reading', paragraphs: mergedParas, questions: mergedQs };

          if (existingEntry) collidingItems.push({ id: finalId, payload: finalPayload });
          else newItems.push({ id: finalId, payload: finalPayload });
        });

        if (collidingItems.length > 0) {
          setCsvStaging({ newItems, collidingItems });
          setResolvingIndex(0);
          setResolvedCollisions([]);
          setCustomNewId('');
          setShowCollisionDialog(true);
        } else if (newItems.length > 0) {
          commitResolvedCSV(newItems, []);
        } else {
          alert("No valid entries found. Ensure 'ID' or 'TitleJp' column is filled.");
        }

      } catch (error) { alert(`Parsing Failed: ${error.message}`); } 
      finally {
        setIsUploadingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
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
    setIsUploadingCSV(true);
    setShowCollisionDialog(false);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      newItems.forEach(item => { batch.set(doc(db, `lexicons/${categoryId}/entries`, item.id), item.payload); count++; });
      resolvedItems.forEach(item => { batch.set(doc(db, `lexicons/${categoryId}/entries`, item.id), item.payload); count++; });

      if (count > 0) {
        await batch.commit();
        alert(`Successfully committed ${count} readings to the database.`);
        fetchEntries();
      } else {
        alert("Upload completed, but 0 new items were added (all duplicates skipped).");
      }
    } catch (error) { 
      alert(`Firebase Rejected Upload: ${error.message}`); 
    } finally {
      setIsUploadingCSV(false);
      setCsvStaging({ newItems: [], collidingItems: [] });
      setResolvedCollisions([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.titleJp || !formData.titleEn) return alert("Japanese and English titles are required!");
    
    setIsSaving(true);
    try {
      const entryId = editingId || (formData.customId ? formData.customId.trim() : `rd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      const payload = { id: entryId, type: 'reading', ...formData };
      delete payload.customId; 

      await setDoc(doc(db, `lexicons/${categoryId}/entries`, entryId), payload);
      setEditingId(''); setFormData(initialFormState); fetchEntries();
    } catch (error) { alert("Failed to save entry."); } finally { setIsSaving(false); }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      customId: '', titleJp: entry.titleJp || '', titleEn: entry.titleEn || '', jlpt: entry.jlpt || 'N5', 
      genre: entry.genre || 'story', wordCount: entry.wordCount || '', imageUrl: entry.imageUrl || '',
      targetVocab: entry.targetVocab || '', targetGrammar: entry.targetGrammar || '',
      paragraphs: entry.paragraphs || [], questions: entry.questions || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Permanently delete Reading ID: ${id}?`)) return;
    try { await deleteDoc(doc(db, `lexicons/${categoryId}/entries`, id)); fetchEntries(); } catch (error) {}
  };

  // UI HELPERS
  const inputBaseClass = `w-full p-2.5 rounded-lg border text-sm transition-all focus:ring-2 outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-200' : 'bg-white border-slate-300 focus:border-indigo-400 focus:ring-indigo-500/20 text-slate-900'}`;
  const labelClass = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const panelClass = `p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-slate-50 border-slate-200'}`;

  const currentCollision = showCollisionDialog ? csvStaging.collidingItems[resolvingIndex] : null;
  const currentDbItem = currentCollision ? entries.find(e => e.id === currentCollision.id) : null;

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      
      <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'} px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2"><BookOpen size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> Reading Architect</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Database: <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>Root Access</span></p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <Download size={14} /> Get CSV Template
          </button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingCSV} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isUploadingCSV ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'} ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
            {isUploadingCSV ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} {isUploadingCSV ? 'Forging...' : 'Bulk CSV'}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* THE ARCHITECT FORM */}
        <div className="xl:col-span-7 flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Edit3 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> {editingId ? `Editing: ${editingId}` : 'Forge New Reading Passage'}</h2>
            {editingId && <button onClick={() => { setEditingId(''); setFormData(initialFormState); }} className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>Cancel Edit</button>}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            
            <div className={panelClass}>
              {!editingId && (
                <div className="mb-4">
                  <label className={labelClass}><Fingerprint size={10} className="inline mr-1"/> Custom ID (Optional)</label>
                  <input type="text" name="customId" value={formData.customId} onChange={handleInputChange} placeholder="e.g., rd_n4_postoffice" className={inputBaseClass} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} !text-indigo-500`}>Title (Japanese)</label>
                  <input type="text" name="titleJp" value={formData.titleJp} onChange={handleInputChange} placeholder="郵便局での手紙" className={`${inputBaseClass} !text-lg !font-black !py-3`} required />
                </div>
                <div>
                  <label className={labelClass}>Title (English)</label>
                  <input type="text" name="titleEn" value={formData.titleEn} onChange={handleInputChange} placeholder="A Letter at the Post Office" className={`${inputBaseClass} !text-lg !font-bold !py-3`} required />
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><label className={labelClass}><Target size={10} className="inline mr-1"/> JLPT</label><select name="jlpt" value={formData.jlpt} onChange={handleInputChange} className={inputBaseClass}>{jlptLevels.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className={labelClass}><BookOpen size={10} className="inline mr-1"/> Genre</label><select name="genre" value={formData.genre} onChange={handleInputChange} className={inputBaseClass}>{genres.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                <div><label className={labelClass}>Word Count</label><input type="number" name="wordCount" value={formData.wordCount} onChange={handleInputChange} placeholder="e.g. 150" className={inputBaseClass} /></div>
                <div><label className={labelClass}><ImageIcon size={10} className="inline mr-1"/> Image URL (Opt)</label><input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://..." className={inputBaseClass} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className={labelClass}><LinkIcon size={10} className="inline mr-1"/> Target Vocab (Comma separated)</label>
                  <input type="text" name="targetVocab" value={formData.targetVocab} onChange={handleInputChange} placeholder="郵便局, 切手" className={inputBaseClass} />
                </div>
                <div>
                  <label className={labelClass}><LinkIcon size={10} className="inline mr-1"/> Target Grammar (Comma separated)</label>
                  <input type="text" name="targetGrammar" value={formData.targetGrammar} onChange={handleInputChange} placeholder="〜ために, 〜てもいい" className={inputBaseClass} />
                </div>
              </div>
            </div>

            <div className={`${panelClass} border-indigo-500/30`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`${labelClass} mb-0`}><AlignLeft size={10} className="inline mr-1"/> Paragraph Builder</label>
                <button type="button" onClick={addParagraph} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}><Plus size={12} className="inline"/> Add Block</button>
              </div>
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Furigana Syntax: Use <code>漢字[かんじ]</code> to automatically render ruby text.</p>
              
              <div className="space-y-4">
                {formData.paragraphs.map((para, index) => (
                  <div key={index} className={`flex gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'}`}>
                    
                    {/* 🚨 REORDER BUTTONS */}
                    <div className="flex flex-col gap-1 items-center justify-center border-r pr-3 mr-1 border-slate-200 dark:border-slate-700">
                      <button type="button" onClick={() => moveParagraph(index, -1)} disabled={index === 0} className={`p-1.5 rounded-lg transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}><ChevronUp size={16}/></button>
                      <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                      <button type="button" onClick={() => moveParagraph(index, 1)} disabled={index === formData.paragraphs.length - 1} className={`p-1.5 rounded-lg transition-colors ${index === formData.paragraphs.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}><ChevronDown size={16}/></button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className={`text-[9px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Japanese Block</label>
                          {/* 🚨 TTS NATIVE AUDIO BUTTON */}
                          <button type="button" onClick={() => playNativeAudio(para.jp)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-indigo-600 hover:bg-indigo-500/10'}`} title="Listen to Japanese Audio"><Volume2 size={14}/></button>
                        </div>
                        <textarea value={para.jp} onChange={(e) => handleParagraphChange(index, 'jp', e.target.value)} placeholder="昨日、郵便局[ゆうびんきょく]へ行きました。" rows="3" className={`${inputBaseClass} !font-bold resize-y`} />
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>English Translation</label>
                        <textarea value={para.en} onChange={(e) => handleParagraphChange(index, 'en', e.target.value)} placeholder="Yesterday, I went to the post office." rows="2" className={`${inputBaseClass} resize-y`} />
                      </div>
                      <input type="text" value={para.note} onChange={(e) => handleParagraphChange(index, 'note', e.target.value)} placeholder="Cultural note or context (Optional)" className={`${inputBaseClass} !text-xs !italic`} />
                    </div>
                    <button type="button" onClick={() => removeParagraph(index)} className="p-2 self-start text-rose-500 opacity-50 hover:opacity-100"><Trash2 size={16}/></button>
                  </div>
                ))}
                {formData.paragraphs.length === 0 && <div className={`text-center py-6 border-2 border-dashed rounded-xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'}`}><p className="text-[10px] font-bold uppercase tracking-widest">No paragraphs added.</p></div>}
              </div>
            </div>

            <div className={`${panelClass} border-amber-500/30`}>
              <div className="flex items-center justify-between mb-4">
                <label className={`${labelClass} mb-0`}><HelpCircle size={10} className="inline mr-1"/> Comprehension Quiz</label>
                <button type="button" onClick={addQuestion} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-amber-600 text-white hover:bg-amber-500'}`}><Plus size={12} className="inline"/> Add Question</button>
              </div>
              <div className="space-y-6">
                {formData.questions.map((q, qIndex) => (
                  <div key={qIndex} className={`flex gap-3 p-5 rounded-xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'}`}>
                    
                    {/* 🚨 REORDER BUTTONS */}
                    <div className="flex flex-col gap-1 items-center justify-start border-r pr-3 mr-1 pt-1 border-slate-200 dark:border-slate-700">
                      <button type="button" onClick={() => moveQuestion(qIndex, -1)} disabled={qIndex === 0} className={`p-1.5 rounded-lg transition-colors ${qIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}><ChevronUp size={16}/></button>
                      <span className="text-[10px] font-black text-slate-400">Q{qIndex + 1}</span>
                      <button type="button" onClick={() => moveQuestion(qIndex, 1)} disabled={qIndex === formData.questions.length - 1} className={`p-1.5 rounded-lg transition-colors ${qIndex === formData.questions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}><ChevronDown size={16}/></button>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className={`text-xs font-black uppercase ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Question Setup</h4>
                        <button type="button" onClick={() => removeQuestion(qIndex)} className="text-rose-500 opacity-50 hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="text" value={q.questionJp} onChange={(e) => handleQuestionChange(qIndex, 'questionJp', e.target.value)} placeholder="Question (Japanese)" className={`${inputBaseClass} !font-bold`} />
                          <input type="text" value={q.questionEn} onChange={(e) => handleQuestionChange(qIndex, 'questionEn', e.target.value)} placeholder="Question (English Translation)" className={inputBaseClass} />
                        </div>
                        {/* 🚨 DYNAMIC OPTIONS BUILDER */}
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              {/* Auto-generates A, B, C, D, E etc. */}
                              <span className={`text-[10px] font-bold w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              
                              <input 
                                type="text" 
                                value={opt} 
                                onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)} 
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`} 
                                className={`${inputBaseClass} !py-2`} 
                              />
                              
                              <input 
                                type="radio" 
                                name={`correct-${qIndex}`} 
                                checked={q.correctIndex === optIndex} 
                                onChange={() => handleQuestionChange(qIndex, 'correctIndex', optIndex)} 
                                className="w-4 h-4 cursor-pointer accent-amber-500 shrink-0" 
                                title="Mark as correct answer" 
                              />
                              
                              <button 
                                type="button" 
                                onClick={() => removeOption(qIndex, optIndex)} 
                                className="p-1.5 text-slate-400 hover:text-rose-500 shrink-0 transition-colors"
                                title="Delete Option"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          ))}
                          
                          <button 
                            type="button" 
                            onClick={() => addOption(qIndex)} 
                            className={`text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-1 transition-colors ${isDarkMode ? 'text-amber-500 hover:text-amber-400' : 'text-amber-600 hover:text-amber-500'}`}
                          >
                            <Plus size={10}/> Add Option
                          </button>
                        </div>
                        <div>
                          <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block flex items-center gap-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><CheckCircle2 size={10}/> Explanation for Correct Answer</label>
                          <input type="text" value={q.explanation} onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)} placeholder="Why is option correct?" className={`${inputBaseClass} !text-xs !italic`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isSaving ? 'opacity-50' : 'hover:-translate-y-0.5'} ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {editingId ? 'Update Document' : 'Publish Reading Passage'}
            </button>
          </form>
        </div>

        {/* LIVE DATABASE TABLE */}
        <div className="xl:col-span-5 flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Database size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> Published Readings</h3>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>{entries.length} Docs</span>
          </div>
          <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 backdrop-blur-xl">
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#0F1523]/90 border-slate-800 text-slate-500' : 'bg-white/90 border-slate-200 text-slate-400'}`}>
                  <th className="p-3 pl-4">Title & Meta</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className={`border-b last:border-b-0 group ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className="p-3 pl-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm truncate max-w-[200px]">{entry.titleJp}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>{entry.jlpt}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{entry.genre}</span>
                        </div>
                        <span className="font-medium text-xs truncate max-w-[250px] opacity-80">{entry.titleEn}</span>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right align-top">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(entry)} className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-slate-200 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`}><Edit3 size={12} /></button>
                        <button onClick={() => handleDelete(entry.id)} className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-slate-200 text-rose-600 hover:bg-rose-500 hover:text-white'}`}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* COLLISION RESOLUTION DIALOG */}
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
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Current DB</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{currentDbItem?.titleJp || 'Unknown'}</p>
                <p className={`text-xs font-mono opacity-60 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>ID: {currentDbItem?.id}</p>
              </div>

              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Incoming CSV</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{currentCollision.payload.titleJp}</p>
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

            {/* Action Buttons */}
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
    </div>
  );
}