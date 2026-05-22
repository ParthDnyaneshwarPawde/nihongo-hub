import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Plus, Save, Trash2, Database, Workflow, 
  Target, Activity, Edit3, Quote, Info, UploadCloud, Loader2, 
  Fingerprint, Sparkles, AlertTriangle, RefreshCcw, SkipForward,
  Image as ImageIcon, Volume2, Link as LinkIcon, Split, Download
} from 'lucide-react';

export default function GrammarLexiconEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const categoryId = 'grammar'; 

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // CSV State
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [csvStaging, setCsvStaging] = useState({ newItems: [], collidingItems: [] });
  const fileInputRef = useRef(null);

  const [resolvingIndex, setResolvingIndex] = useState(0);
  const [resolvedCollisions, setResolvedCollisions] = useState([]);
  const [customNewId, setCustomNewId] = useState('');

  const [editingId, setEditingId] = useState('');
  
  const initialFormState = {
    customId: '', 
    grammar: '', 
    meaning: '', 
    structure: '', 
    jlpt: 'N5', 
    subType: 'conjugation', 
    formality: 'standard', 
    connectionRules: '',   
    relatedGrammar: '',    
    images: [],    
    notes: [],     
    sentences: []  
  };
  const [formData, setFormData] = useState(initialFormState);

  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  
  const functionalTypes = [
    { id: 'conjugation', label: 'Conjugation / Form' },
    { id: 'conditional', label: 'Conditional (If/When)' },
    { id: 'conjunction', label: 'Conjunction (Connecting)' },
    { id: 'ending', label: 'Sentence Ending' },
    { id: 'particle', label: 'Particle (Compound)' },
    { id: 'keigo', label: 'Keigo (Honorifics)' },
  ];
  
  const formalityLevels = [
    { id: 'casual', label: 'Casual (Plain)' },
    { id: 'standard', label: 'Standard (Desu/Masu)' },
    { id: 'business', label: 'Business / Formal' },
    { id: 'literary', label: 'Literary / Written' },
  ];
  
  const noteTypes = [
    { id: 'info', label: 'Info (Standard)', color: 'blue' },
    { id: 'warning', label: 'Warning (Mistakes)', color: 'amber' },
    { id: 'tip', label: 'Tip (Shortcut)', color: 'emerald' },
    { id: 'danger', label: 'Danger (Strict Rule)', color: 'rose' }
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
      console.error("Error fetching grammar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    const timeout = setTimeout(() => fetchEntries(), 500); 
    return () => clearTimeout(timeout);
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // ARRAY MANAGERS
  const handleArrayChange = (arrayName, index, field, value) => {
    const updatedArray = [...formData[arrayName]];
    updatedArray[index][field] = value;
    setFormData({ ...formData, [arrayName]: updatedArray });
  };
  
  const addArrayItem = (arrayName, emptyObject) => {
    setFormData({ ...formData, [arrayName]: [...formData[arrayName], emptyObject] });
  };
  
  const removeArrayItem = (arrayName, index) => {
    setFormData({ ...formData, [arrayName]: formData[arrayName].filter((_, i) => i !== index) });
  };

  const handleSentenceChange = (index, field, value) => {
    const updatedSentences = [...formData.sentences];
    updatedSentences[index][field] = value;
    setFormData({ ...formData, sentences: updatedSentences });
  };

  const addSentence = () => {
    setFormData({ ...formData, sentences: [...formData.sentences, { jp: '', en: '', note: '' }] });
  };

  const removeSentence = (index) => {
    setFormData({ ...formData, sentences: formData.sentences.filter((_, i) => i !== index) });
  };

  // NATIVE TTS PREVIEWER
  const playNativeAudio = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  // 🚨 1. DYNAMIC TEMPLATE GENERATOR
  const downloadTemplate = () => {
    const headers = "ID,Grammar,Meaning,Structure,JLPT,SubType,Formality,ConnectionRules,RelatedGrammar,NoteText,NoteType,ImageUrl,ImageCaption,ExampleJP,ExampleEN,ExampleNote\n";
    
    // Example 1: Single Item
    const row1 = `gr_kamo,〜かもしれない,might / maybe,Plain + かもしれない,N4,ending,standard,Noun/Na-Adj (drop da),〜はずだ,Roughly 50% chance.,info,,,明日は雨かもしれない。,It might rain tomorrow.,Casual prediction\n`;
    
    // Example 2: Multiple Items (ID and Grammar MUST be repeated on every row to group them!)
    const row2 = `gr_tara,〜たら,if / when,Verb (Ta form) + ら,N4,conditional,standard,V-Ta form,〜ば,Focuses on sequence.,info,https://example.com/img1.jpg,Condition Diagram,日本に着いたら電話して。,When you arrive call me.,Temporal usage\n`;
    const row3 = `gr_tara,〜たら,,,,,,,,Do not use for absolute natural facts.,warning,,,,,\n`;
    const row4 = `gr_tara,〜たら,,,,,,,,,,,お金があったら車を買う。,If I had money I'd buy a car.,Hypothetical\n`;

    const templateCSV = headers + row1 + row2 + row3 + row4;
    // The Uint8Array(0xFEFF) adds a BOM so Microsoft Excel reads the Japanese characters correctly!
    const blob = new Blob([new Uint8Array([0xFEFF]), templateCSV], { type: 'text/csv;charset=utf-8;' }); 
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Grammar_Database_Template.csv');
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

  // 🚨 DOWNLOAD TEMPLATE GENERATOR
  // const downloadTemplate = () => {
  //   const templateCSV = `ID,Grammar,Meaning,Structure,JLPT,SubType,Formality,ConnectionRules,RelatedGrammar,NoteText,NoteType,ImageUrl,ImageCaption,ExampleJP,ExampleEN,ExampleNote\ngr_template_tara,〜たら,if / when,Verb (Ta form) + ら,N4,conditional,standard,V-Ta form,〜ば,This is a teacher note.,info,https://example.com/image.jpg,Fig 1: Timeline,日本に着いたら電話して。,When you arrive in Japan call me.,Temporal use.\n`;
    
  //   const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
  //   const link = document.createElement('a');
  //   link.href = URL.createObjectURL(blob);
  //   link.setAttribute('download', 'Grammar_Database_Template.csv');
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  // 🚨 BULLETPROOF CSV AGGREGATOR (With invisible character scrubbing)
  // 🚨 2. BULLETPROOF CSV AGGREGATOR
  // 🚨 BULLETPROOF CSV AGGREGATOR (With Parser Debugging)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingCSV(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        console.log("📄 1. READING CSV FILE...");
        let csvText = event.target.result;
        
        if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
        csvText = csvText.replace(/\r/g, '');

        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) {
          alert("CSV appears empty.");
          setIsUploadingCSV(false);
          return;
        }

        // Parse Headers
        const headers = parseCSVRow(rows[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
        console.log("📊 2. DETECTED HEADERS:", headers);

        const aggregatedData = {};

        // Pass 1: Aggregate rows in memory
        for (let i = 1; i < rows.length; i++) {
          const rowValues = parseCSVRow(rows[i]);
          const entryData = {};
          
          headers.forEach((header, index) => { 
            if (rowValues[index]) entryData[header] = rowValues[index]; 
          });

          // 🚨 Relaxed Strictness: Must have EITHER an ID or a Grammar string
          if (!entryData.grammar && !entryData.id) {
            console.warn(`⚠️ Row ${i + 1} skipped: Missing both ID and Grammar.`);
            continue; 
          }
          
          const trackingKey = entryData.id || entryData.grammar;

          if (!aggregatedData[trackingKey]) {
            console.log(`✨ Found new Grammar Point: ${trackingKey}`);
            aggregatedData[trackingKey] = {
              id: entryData.id || '',
              grammar: entryData.grammar || '',
              meaning: entryData.meaning || entryData.english || '',
              structure: entryData.structure || '',
              jlpt: entryData.jlpt ? entryData.jlpt.toUpperCase() : 'N5',
              subType: entryData.subtype ? entryData.subtype.toLowerCase() : 'conjugation',
              formality: entryData.formality ? entryData.formality.toLowerCase() : 'standard',
              connectionRules: entryData.connectionrules || '',
              relatedGrammar: entryData.relatedgrammar || '',
              images: [], notes: [], sentences: []
            };
          }

          // Push arrays safely
          if (entryData.notetext) {
            aggregatedData[trackingKey].notes.push({ text: entryData.notetext || '', type: entryData.notetype || 'info' });
          }
          if (entryData.imageurl) {
            aggregatedData[trackingKey].images.push({ url: entryData.imageurl || '', caption: entryData.imagecaption || '' });
          }
          if (entryData.examplejp || entryData.exampleen) {
            aggregatedData[trackingKey].sentences.push({ jp: entryData.examplejp || '', en: entryData.exampleen || '', note: entryData.examplenote || '' });
          }
        }

        console.log("🧩 3. AGGREGATED DATA RESULT:", aggregatedData);

        const newItems = [];
        const collidingItems = [];

        Object.values(aggregatedData).forEach(stagedItem => {
          let existingEntry = null;
          if (stagedItem.id) existingEntry = entries.find(e => e.id === stagedItem.id);
          if (!existingEntry && stagedItem.grammar) existingEntry = entries.find(e => e.grammar === stagedItem.grammar);

          let finalId = existingEntry ? existingEntry.id : (stagedItem.id || `gr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
          
          let mergedSentences = existingEntry && existingEntry.sentences ? [...existingEntry.sentences] : [];
          stagedItem.sentences.forEach(newSent => { if (!mergedSentences.some(s => s.jp === newSent.jp)) mergedSentences.push(newSent); });

          let mergedImages = existingEntry && existingEntry.images ? [...existingEntry.images] : (existingEntry?.imageUrl ? [{url: existingEntry.imageUrl, caption: ''}] : []);
          stagedItem.images.forEach(newImg => { if (!mergedImages.some(i => i.url === newImg.url)) mergedImages.push(newImg); });

          let mergedNotes = existingEntry && existingEntry.notes ? (Array.isArray(existingEntry.notes) ? [...existingEntry.notes] : [{text: existingEntry.notes, type: 'info'}]) : [];
          stagedItem.notes.forEach(newNote => { if (!mergedNotes.some(n => n.text === newNote.text)) mergedNotes.push(newNote); });

          const finalPayload = { 
            ...stagedItem, 
            id: finalId, 
            type: 'grammar', 
            sentences: mergedSentences.map(s => ({ jp: s.jp || '', en: s.en || '', note: s.note || '' })), 
            images: mergedImages.map(img => ({ url: img.url || '', caption: img.caption || '' })), 
            notes: mergedNotes.map(n => ({ text: n.text || '', type: n.type || 'info' })) 
          };

          if (existingEntry) collidingItems.push({ id: finalId, payload: finalPayload });
          else newItems.push({ id: finalId, payload: finalPayload });
        });

        console.log("⚖️ 4. COLLISION CHECK: ", { newItems, collidingItems });
        // setCsvStaging({ newItems, collidingItems });

        if (collidingItems.length > 0) {
          setCsvStaging({ newItems, collidingItems });
          setResolvingIndex(0);
          setResolvedCollisions([]);
          setCustomNewId('');
          setShowCollisionDialog(true);
        } else if (newItems.length > 0) {
          commitResolvedCSV(newItems, []); 
        } else {
          alert("⚠️ CSV Processing failed. No valid grammar points found.");
        }
      } catch (error) {
        console.error("CSV Parsing Error Details:", error);
        alert(`Failed to parse CSV: ${error.message}`);
      } finally {
        setIsUploadingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsText(file);
  };

  // 🚨 NEW COLLISION RESOLVERS
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
        alert(`Successfully committed ${count} grammar points to the database.`);
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
    if (!formData.grammar || !formData.meaning) return alert("Grammar point and meaning are required!");
    
    setIsSaving(true);
    try {
      const entryId = editingId || (formData.customId ? formData.customId.trim() : `gr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      
      const payload = { 
        id: entryId, 
        type: 'grammar', 
        ...formData 
      };
      delete payload.customId; 

      await setDoc(doc(db, `lexicons/${categoryId}/entries`, entryId), payload);
      
      setEditingId(''); 
      setFormData(initialFormState); 
      fetchEntries();
    } catch (error) { 
      alert("Failed to save entry."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    
    const parsedNotes = Array.isArray(entry.notes) ? entry.notes : (entry.notes ? [{ text: entry.notes, type: 'info' }] : []);
    const parsedImages = Array.isArray(entry.images) ? entry.images : (entry.imageUrl ? [{ url: entry.imageUrl, caption: '' }] : []);

    setFormData({
      customId: '', 
      grammar: entry.grammar || '', 
      meaning: entry.meaning || entry.english || '', 
      structure: entry.structure || '',
      jlpt: entry.jlpt || 'N5', 
      subType: entry.subType || 'conjugation', 
      formality: entry.formality || 'standard',
      connectionRules: entry.connectionRules || '', 
      relatedGrammar: entry.relatedGrammar || '',
      images: parsedImages, 
      notes: parsedNotes, 
      sentences: entry.sentences || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Permanently delete Grammar ID: ${id}?`)) return;
    try { 
      await deleteDoc(doc(db, `lexicons/${categoryId}/entries`, id)); 
      fetchEntries(); 
    } catch (error) { 
      console.error("Error deleting entry:", error); 
    }
  };

  // UI TAILWIND HELPERS
  const inputBaseClass = `w-full p-2.5 rounded-lg border text-sm transition-all focus:ring-2 outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-200' : 'bg-white border-slate-300 focus:border-indigo-400 focus:ring-indigo-500/20 text-slate-900'}`;
  const labelClass = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const panelClass = `p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-slate-50 border-slate-200'}`;

  const getNoteColorClasses = (type) => {
    switch(type) {
      case 'warning': return isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-300 bg-amber-50';
      case 'tip': return isDarkMode ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50';
      case 'danger': return isDarkMode ? 'border-rose-500/30 bg-rose-500/5' : 'border-rose-300 bg-rose-50';
      default: return isDarkMode ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-300 bg-indigo-50';
    }
  };

  const currentCollision = showCollisionDialog ? csvStaging.collidingItems[resolvingIndex] : null;
  const currentDbItem = currentCollision ? entries.find(e => e.id === currentCollision.id) : null;

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      
      <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'} px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Workflow size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> 
              Grammar Forge
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Database: <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>Root Access</span>
            </p>
          </div>
        </div>
        
        {/* 🚨 TEMPLATE AND BULK UPLOAD BUTTONS */}
        {/* 🚨 3. TEMPLATE AND BULK UPLOAD BUTTONS */}
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadTemplate}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Download size={14} /> Get CSV Template
          </button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploadingCSV} 
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isUploadingCSV ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'} ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}
          >
            {isUploadingCSV ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} 
            {isUploadingCSV ? 'Forging...' : 'Bulk CSV'}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        <div className="xl:col-span-7 flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar pr-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Edit3 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> 
              {editingId ? `Editing: ${editingId}` : 'Forge New Formula'}
            </h2>
            {editingId && (
              <button 
                onClick={() => { setEditingId(''); setFormData(initialFormState); }} 
                className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            
            <div className={panelClass}>
              {!editingId && (
                <div className="mb-4">
                  <label className={labelClass}>
                    <Fingerprint size={10} className="inline mr-1"/> Custom ID (Optional)
                  </label>
                  <input 
                    type="text" 
                    name="customId" 
                    value={formData.customId} 
                    onChange={handleInputChange} 
                    placeholder="e.g., gr_tara_conditional" 
                    className={inputBaseClass} 
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} !text-indigo-500`}>Grammar Point (Japanese)</label>
                  <input 
                    type="text" 
                    name="grammar" 
                    value={formData.grammar} 
                    onChange={handleInputChange} 
                    placeholder="e.g., 〜てもいい" 
                    className={`${inputBaseClass} !text-lg !font-black !py-3`} 
                    required 
                  />
                </div>
                <div>
                  <label className={labelClass}>Primary Meaning (English)</label>
                  <input 
                    type="text" 
                    name="meaning" 
                    value={formData.meaning} 
                    onChange={handleInputChange} 
                    placeholder="e.g., is allowed to..." 
                    className={`${inputBaseClass} !text-lg !font-bold !py-3`} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}><Target size={10} className="inline mr-1"/> JLPT</label>
                  <select name="jlpt" value={formData.jlpt} onChange={handleInputChange} className={inputBaseClass}>
                    {jlptLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}><Activity size={10} className="inline mr-1"/> Function</label>
                  <select name="subType" value={formData.subType} onChange={handleInputChange} className={inputBaseClass}>
                    {functionalTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}><Workflow size={10} className="inline mr-1"/> Formality Register</label>
                  <select name="formality" value={formData.formality} onChange={handleInputChange} className={inputBaseClass}>
                    {formalityLevels.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={`${labelClass} !text-fuchsia-500`}>
                    <Workflow size={10} className="inline mr-1"/> Formation Structure
                  </label>
                  <input 
                    type="text" 
                    name="structure" 
                    value={formData.structure} 
                    onChange={handleInputChange} 
                    placeholder="e.g., V-て form + もいい" 
                    className={`${inputBaseClass} !font-mono`} 
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <Split size={10} className="inline mr-1"/> Connection Rules
                  </label>
                  <input 
                    type="text" 
                    name="connectionRules" 
                    value={formData.connectionRules} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Noun+no, Na-Adj+na" 
                    className={inputBaseClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <LinkIcon size={10} className="inline mr-1"/> Related Grammar (Compare)
                  </label>
                  <input 
                    type="text" 
                    name="relatedGrammar" 
                    value={formData.relatedGrammar} 
                    onChange={handleInputChange} 
                    placeholder="e.g., 〜てはいけない" 
                    className={inputBaseClass} 
                  />
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex items-center justify-between mb-3">
                <label className={`${labelClass} mb-0`}>
                  <Info size={10} className="inline mr-1"/> Multiple Teacher Notes
                </label>
                <button 
                  type="button" 
                  onClick={() => addArrayItem('notes', { text: '', type: 'info' })} 
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'}`}
                >
                  <Plus size={12} className="inline"/> Add Note
                </button>
              </div>
              <div className="space-y-3">
                {formData.notes.map((note, index) => (
                  <div key={index} className={`flex flex-col sm:flex-row gap-2 p-3 rounded-xl border ${getNoteColorClasses(note.type)}`}>
                    <select 
                      value={note.type} 
                      onChange={(e) => handleArrayChange('notes', index, 'type', e.target.value)} 
                      className={`shrink-0 p-2 rounded-lg text-xs font-bold outline-none bg-transparent border-none ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      {noteTypes.map(nt => <option key={nt.id} value={nt.id}>{nt.label}</option>)}
                    </select>
                    <textarea 
                      value={note.text} 
                      onChange={(e) => handleArrayChange('notes', index, 'text', e.target.value)} 
                      placeholder="Explain nuances, warnings, or tricks..." 
                      rows="2" 
                      className={`flex-1 p-2 rounded-lg bg-transparent border-none text-sm outline-none resize-none ${isDarkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
                    ></textarea>
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('notes', index)} 
                      className="p-2 self-start text-rose-500 opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={panelClass}>
              <div className="flex items-center justify-between mb-3">
                <label className={`${labelClass} mb-0`}>
                  <ImageIcon size={10} className="inline mr-1"/> Diagrams & Images
                </label>
                <button 
                  type="button" 
                  onClick={() => addArrayItem('images', { url: '', caption: '' })} 
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'}`}
                >
                  <Plus size={12} className="inline"/> Add Image
                </button>
              </div>
              <div className="space-y-3">
                {formData.images.map((img, index) => (
                  <div key={index} className={`flex gap-2 p-3 rounded-xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        value={img.url} 
                        onChange={(e) => handleArrayChange('images', index, 'url', e.target.value)} 
                        placeholder="Image URL (https://...)" 
                        className={`${inputBaseClass} !font-mono`} 
                      />
                      <input 
                        type="text" 
                        value={img.caption} 
                        onChange={(e) => handleArrayChange('images', index, 'caption', e.target.value)} 
                        placeholder="Caption (e.g., Fig 1.1: Giving Direction)" 
                        className={inputBaseClass} 
                      />
                    </div>
                    {img.url && (
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                        <img src={img.url} alt="Preview" className="w-full h-full object-cover opacity-50"/>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => removeArrayItem('images', index)} 
                      className="p-2 self-start text-rose-500 opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${panelClass} border-indigo-500/30`}>
              <div className="flex items-center justify-between mb-3">
                <label className={`${labelClass} mb-0`}>
                  <Quote size={10} className="inline mr-1"/> Context Examples
                </label>
                <button 
                  type="button" 
                  onClick={addSentence} 
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                >
                  <Plus size={12} className="inline"/> Add Sentence
                </button>
              </div>
              <div className="space-y-3">
                {formData.sentences.map((sent, index) => (
                  <div key={index} className={`flex gap-2 p-3 rounded-xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={sent.jp} 
                          onChange={(e) => handleSentenceChange(index, 'jp', e.target.value)} 
                          placeholder="Japanese Sentence" 
                          className={`${inputBaseClass} !font-bold`} 
                        />
                        <button 
                          type="button" 
                          onClick={() => playNativeAudio(sent.jp)} 
                          title="Test TTS" 
                          className={`p-2.5 rounded-lg transition-colors ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={sent.en} 
                        onChange={(e) => handleSentenceChange(index, 'en', e.target.value)} 
                        placeholder="English Translation" 
                        className={inputBaseClass} 
                      />
                      <input 
                        type="text" 
                        value={sent.note} 
                        onChange={(e) => handleSentenceChange(index, 'note', e.target.value)} 
                        placeholder="Sentence Context Note (Optional)" 
                        className={`${inputBaseClass} !text-xs !italic`} 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeSentence(index)} 
                      className="p-2 self-start text-rose-500 opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving} 
              className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isSaving ? 'opacity-50' : 'hover:-translate-y-0.5'} ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
              {editingId ? 'Update Record' : 'Commit to Database'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-5 flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Database size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> Live Database
            </h3>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
              {entries.length} Entries
            </span>
          </div>
          <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 backdrop-blur-xl">
                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#0F1523]/90 border-slate-800 text-slate-500' : 'bg-white/90 border-slate-200 text-slate-400'}`}>
                  <th className="p-3 pl-4">Formula & ID</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className={`border-b last:border-b-0 group ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className="p-3 pl-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm">{entry.grammar}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>{entry.jlpt}</span>
                          {entry.images && entry.images.length > 0 && <ImageIcon size={12} className="text-emerald-500" />}
                          {entry.notes && entry.notes.length > 0 && <Info size={12} className="text-amber-500" />}
                        </div>
                        <span className="font-medium text-xs truncate max-w-[250px] opacity-80">{entry.meaning || entry.english}</span>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(entry)} 
                          className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-slate-200 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.id)} 
                          className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-slate-200 text-rose-600 hover:bg-rose-500 hover:text-white'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CSV COLLISION DIALOG */}
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
            
            {/* Cards Comparison (Tailored for Grammar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* CURRENT DB CARD */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Current DB</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{currentDbItem?.grammar || 'Unknown'}</p>
                <p className={`text-xs font-mono opacity-60 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>ID: {currentDbItem?.id}</p>
              </div>

              {/* INCOMING CSV CARD */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                <h4 className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Incoming CSV</h4>
                <p className={`text-3xl font-black mb-1 truncate ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{currentCollision.payload.grammar}</p>
                <p className={`text-xs font-mono opacity-60 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>ID: {currentCollision.id}</p>
              </div>
            </div>

            {/* Custom ID Input */}
            <div className="mb-6">
              <label className={labelClass}>Assign New ID (Optional)</label>
              <input 
                type="text" 
                value={customNewId} 
                onChange={(e) => setCustomNewId(e.target.value)} 
                placeholder={`e.g., ${currentCollision.id}_alt`} 
                className={inputBaseClass} 
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
    </div>
  );
}