import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { db, auth } from '@services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Plus, Save, Trash2, Database, Headphones, 
  Target, Edit3, Info, UploadCloud, Loader2, Radio,
  Fingerprint, Sparkles, AlertTriangle, RefreshCcw, SkipForward,
  Link as LinkIcon, Download, HelpCircle, CheckCircle2,
  Volume2, Image as ImageIcon, AlignLeft, ChevronUp, ChevronDown, Edit2, Search
} from 'lucide-react';

export default function ListeningLexiconEditor() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const categoryId = 'listening'; 

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
    taskType: 'task_based', 
    audioUrl: '',
    referenceImageUrl: '', // Overall context image (e.g., a map they have to follow)
    targetVocab: '',   
    targetGrammar: '', 
    transcriptJp: '',
    transcriptEn: '',
    questions: []      
  };
  const [formData, setFormData] = useState(initialFormState);

  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const taskTypes = [
    { id: 'task_based', label: 'Task-Based (課題理解)' },
    { id: 'point_comp', label: 'Point Comprehension (ポイント理解)' },
    { id: 'summary', label: 'Summary / Outline (概要理解)' },
    { id: 'quick_response', label: 'Quick Response (即時応答)' },
    { id: 'integrated', label: 'Integrated (統合理解)' }
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
      console.error("Error fetching listening docs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    const timeout = setTimeout(() => fetchEntries(), 500); 
    return () => clearTimeout(timeout);
  }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const playNativeAudio = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  // 🚨 DYNAMIC QUIZ MANAGER (TEXT + IMAGES)
  const handleQuestionChange = (index, field, value) => {
    const updated = [...formData.questions];
    updated[index][field] = value;
    setFormData({ ...formData, questions: updated });
  };
  
  const handleOptionChange = (qIndex, optIndex, field, value) => {
    const updated = [...formData.questions];
    updated[qIndex].options[optIndex][field] = value;
    setFormData({ ...formData, questions: updated });
  };

  const addOption = (qIndex) => {
    const updated = [...formData.questions];
    updated[qIndex].options.push({ text: '', imageUrl: '' });
    setFormData({ ...formData, questions: updated });
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...formData.questions];
    if (updated[qIndex].options.length <= 2) return alert("A question must have at least 2 options.");
    updated[qIndex].options.splice(optIndex, 1);
    if (updated[qIndex].correctIndex === optIndex) updated[qIndex].correctIndex = 0;
    else if (updated[qIndex].correctIndex > optIndex) updated[qIndex].correctIndex -= 1;
    setFormData({ ...formData, questions: updated });
  };

  const addQuestion = () => setFormData({ 
    ...formData, 
    questions: [...formData.questions, { 
      preQuestion: '', mainQuestion: '', questionImageUrl: '', 
      options: [{text:'', imageUrl:''}, {text:'', imageUrl:''}, {text:'', imageUrl:''}, {text:'', imageUrl:''}], 
      correctIndex: 0, explanation: '' 
    }] 
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

  // 🚨 TEMPLATE GENERATOR
  const downloadTemplate = () => {
    const headers = "ID,TitleJp,TitleEn,JLPT,TaskType,AudioUrl,RefImageUrl,TargetVocab,TargetGrammar,TranscriptJp,TranscriptEn,PreQ,MainQ,QImg,QOpt0Txt,QOpt0Img,QOpt1Txt,QOpt1Img,QOpt2Txt,QOpt2Img,QOpt3Txt,QOpt3Img,QCorrect,QExp\n";
    // Example includes text + image options for A and B, leaving C and D blank for a True/False visual question
    const row1 = `ls_weather,天気予報,Weather Forecast,N4,point_comp,https://audio.mp3,,天気,〜でしょう,明日は晴れるでしょう。,It will be sunny tomorrow.,明日の天気はどうなりますか。,What will the weather be tomorrow?,,晴れ,https://img.com/sun.png,雨,https://img.com/rain.png,,,,0,The audio says sunny.\n`;
    
    const templateCSV = headers + row1;
    const blob = new Blob([new Uint8Array([0xFEFF]), templateCSV], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Listening_Database_Template.csv');
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

  // 🚨 CSV UPLOAD & AGGREGATOR
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
              jlpt: entryData.jlpt ? entryData.jlpt.toUpperCase() : 'N5', 
              taskType: entryData.tasktype ? entryData.tasktype.toLowerCase() : 'task_based',
              audioUrl: entryData.audiourl || '', referenceImageUrl: entryData.refimageurl || '',
              targetVocab: entryData.targetvocab || '', targetGrammar: entryData.targetgrammar || '',
              transcriptJp: entryData.transcriptjp || '', transcriptEn: entryData.transcripten || '',
              questions: []
            };
          }

          if (entryData.mainq || entryData.preq) {
            // Build the options array dynamically from CSV columns
            const parsedOptions = [];
            if (entryData.qopt0txt || entryData.qopt0img) parsedOptions.push({ text: entryData.qopt0txt || '', imageUrl: entryData.qopt0img || '' });
            if (entryData.qopt1txt || entryData.qopt1img) parsedOptions.push({ text: entryData.qopt1txt || '', imageUrl: entryData.qopt1img || '' });
            if (entryData.qopt2txt || entryData.qopt2img) parsedOptions.push({ text: entryData.qopt2txt || '', imageUrl: entryData.qopt2img || '' });
            if (entryData.qopt3txt || entryData.qopt3img) parsedOptions.push({ text: entryData.qopt3txt || '', imageUrl: entryData.qopt3img || '' });
            
            // Fallback: If no options are provided, guarantee at least 2 empty ones
            if (parsedOptions.length === 0) {
              parsedOptions.push({ text: '', imageUrl: '' }, { text: '', imageUrl: '' });
            }

            aggregatedData[trackingKey].questions.push({ 
              preQuestion: entryData.preq || '', 
              mainQuestion: entryData.mainq || '', 
              questionImageUrl: entryData.qimg || '',
              options: parsedOptions, 
              correctIndex: parseInt(entryData.qcorrect) || 0, 
              explanation: entryData.qexp || ''
            });
          }
        }

        const newItems = [];
        const collidingItems = [];

        Object.values(aggregatedData).forEach(stagedItem => {
          let existingEntry = entries.find(e => e.id === stagedItem.id || (e.titleJp === stagedItem.titleJp && stagedItem.titleJp !== ''));
          let finalId = existingEntry ? existingEntry.id : (stagedItem.id || `ls_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
          
          let mergedQs = existingEntry && existingEntry.questions ? [...existingEntry.questions] : [];
          stagedItem.questions.forEach(newQ => { if (!mergedQs.some(q => q.mainQuestion === newQ.mainQuestion)) mergedQs.push(newQ); });

          const finalPayload = { ...stagedItem, id: finalId, type: 'listening', questions: mergedQs };

          if (existingEntry) collidingItems.push({ id: finalId, payload: finalPayload, existing: existingEntry });
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
          alert("No valid entries found.");
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

    if (action === 'overwrite') newResolved.push(currentItem);
    else if (action === 'save_as_new') {
      const generatedId = customNewId.trim() || `${currentItem.id}_new_${Math.floor(Math.random() * 1000)}`;
      newResolved.push({ id: generatedId, payload: { ...currentItem.payload, id: generatedId } });
    }

    const nextIndex = resolvingIndex + 1;
    if (nextIndex < csvStaging.collidingItems.length) {
      setResolvingIndex(nextIndex); setCustomNewId('');
    } else commitResolvedCSV(csvStaging.newItems, newResolved);
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
    setIsUploadingCSV(true); setShowCollisionDialog(false);
    try {
      const batch = writeBatch(db);
      let count = 0;
      newItems.forEach(item => { batch.set(doc(db, `lexicons/${categoryId}/entries`, item.id), item.payload); count++; });
      resolvedItems.forEach(item => { batch.set(doc(db, `lexicons/${categoryId}/entries`, item.id), item.payload); count++; });

      if (count > 0) {
        await batch.commit();
        alert(`Successfully committed ${count} listening tracks.`);
        fetchEntries();
      } else alert("Upload completed, 0 new items added.");
    } catch (error) { alert(`Firebase Rejected Upload: ${error.message}`); } 
    finally {
      setIsUploadingCSV(false); setCsvStaging({ newItems: [], collidingItems: [] }); setResolvedCollisions([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.titleJp || !formData.audioUrl) return alert("Japanese Title and Audio URL are required!");
    
    setIsSaving(true);
    try {
      const entryId = editingId || (formData.customId ? formData.customId.trim() : `ls_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      const payload = { id: entryId, type: 'listening', ...formData };
      delete payload.customId; 

      await setDoc(doc(db, `lexicons/${categoryId}/entries`, entryId), payload);
      setEditingId(''); setFormData(initialFormState); fetchEntries();
    } catch (error) { alert("Failed to save entry."); } finally { setIsSaving(false); }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    
    // Safety check for legacy options format (converting strings to objects)
    const parsedQuestions = (entry.questions || []).map(q => {
      const safeOptions = (q.options || []).map(opt => {
        if (typeof opt === 'string') return { text: opt, imageUrl: '' };
        return { text: opt.text || '', imageUrl: opt.imageUrl || '' };
      });
      // Ensure min 2 options exist
      while (safeOptions.length < 2) safeOptions.push({ text: '', imageUrl: '' });
      return { ...q, options: safeOptions };
    });

    setFormData({
      customId: '', titleJp: entry.titleJp || '', titleEn: entry.titleEn || '', jlpt: entry.jlpt || 'N5', 
      taskType: entry.taskType || 'task_based', audioUrl: entry.audioUrl || '', referenceImageUrl: entry.referenceImageUrl || '',
      targetVocab: entry.targetVocab || '', targetGrammar: entry.targetGrammar || '',
      transcriptJp: entry.transcriptJp || '', transcriptEn: entry.transcriptEn || '', questions: parsedQuestions
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Permanently delete Listening Track ID: ${id}?`)) return;
    try { await deleteDoc(doc(db, `lexicons/${categoryId}/entries`, id)); fetchEntries(); } catch (error) {}
  };

  const inputBaseClass = `w-full p-2.5 rounded-lg border text-sm transition-all focus:ring-2 outline-none ${isDarkMode ? 'bg-[#0B1120] border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 text-slate-200' : 'bg-white border-slate-300 focus:border-indigo-400 focus:ring-indigo-500/20 text-slate-900'}`;
  const labelClass = `block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const panelClass = `p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0F1523] border-slate-800' : 'bg-slate-50 border-slate-200'}`;

  const currentCollision = showCollisionDialog ? csvStaging.collidingItems[resolvingIndex] : null;
  const currentDbItem = currentCollision ? currentCollision.existing : null;

  return (
    <div className={`min-h-screen font-sans flex flex-col ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* 🚨 COLLISION RESOLUTION DIALOG */}
      {showCollisionDialog && currentCollision && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl p-6 md:p-8 rounded-[2rem] border shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#0F1523] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertTriangle size={24} /></div>
                <div>
                  <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ID Collision Detected</h2>
                  <p className={`text-[10px] font-bold uppercase tracking-widest text-rose-500`}>Conflict {resolvingIndex + 1} of {csvStaging.collidingItems.length}</p>
                </div>
              </div>
              <button onClick={() => { setShowCollisionDialog(false); setCsvStaging({newItems:[], collidingItems:[]}); setResolvedCollisions([]); }} className={`text-[10px] font-bold uppercase tracking-widest hover:underline ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cancel Upload</button>
            </div>
            
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

            <div className="mb-6">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assign New ID (Optional)</label>
              <input type="text" value={customNewId} onChange={(e) => setCustomNewId(e.target.value)} placeholder={`e.g., ${currentCollision.id}_alt`} className={inputBaseClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => handleResolveCollision('overwrite')} className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white shadow-sm">Overwrite</button>
              <button onClick={() => handleResolveCollision('save_as_new')} className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">Save As New</button>
              <button onClick={() => handleResolveCollision('skip')} className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>Skip</button>
            </div>

            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Bulk Actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => handleResolveAll('overwrite')} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center border ${isDarkMode ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-rose-300 text-rose-600 hover:bg-rose-50'}`}><RefreshCcw size={14} className="inline mr-2" /> Overwrite All Remaining</button>
                <button onClick={() => handleResolveAll('skip')} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center border ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}><SkipForward size={14} className="inline mr-2" /> Skip All Remaining</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-40 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'} px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}><ArrowLeft size={16} /></button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2"><Headphones size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}/> Listening Architect</h1>
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
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Edit3 size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> {editingId ? `Editing: ${editingId}` : 'Forge New Listening Track'}</h2>
            {editingId && <button onClick={() => { setEditingId(''); setFormData(initialFormState); }} className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>Cancel Edit</button>}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            
            <div className={panelClass}>
              {!editingId && (
                <div className="mb-4">
                  <label className={labelClass}><Fingerprint size={10} className="inline mr-1"/> Custom ID (Optional)</label>
                  <input type="text" name="customId" value={formData.customId} onChange={handleInputChange} placeholder="e.g., ls_n4_weather" className={inputBaseClass} />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`${labelClass} !text-indigo-500`}>Title (Japanese)</label>
                  <input type="text" name="titleJp" value={formData.titleJp} onChange={handleInputChange} placeholder="天気予報" className={`${inputBaseClass} !text-lg !font-black !py-3`} required />
                </div>
                <div>
                  <label className={labelClass}>Title (English)</label>
                  <input type="text" name="titleEn" value={formData.titleEn} onChange={handleInputChange} placeholder="Weather Forecast" className={`${inputBaseClass} !text-lg !font-bold !py-3`} required />
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><label className={labelClass}><Target size={10} className="inline mr-1"/> JLPT</label><select name="jlpt" value={formData.jlpt} onChange={handleInputChange} className={inputBaseClass}>{jlptLevels.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className={labelClass}><Radio size={10} className="inline mr-1"/> Task Type</label><select name="taskType" value={formData.taskType} onChange={handleInputChange} className={inputBaseClass}>{taskTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                <div className="col-span-2"><label className={`${labelClass} !text-fuchsia-500`}><Volume2 size={10} className="inline mr-1"/> Main Audio URL (Required)</label><input type="text" name="audioUrl" value={formData.audioUrl} onChange={handleInputChange} placeholder="https://d1ux...mp3" className={inputBaseClass} required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-1"><label className={labelClass}><ImageIcon size={10} className="inline mr-1"/> Reference Image (Opt)</label><input type="text" name="referenceImageUrl" value={formData.referenceImageUrl} onChange={handleInputChange} placeholder="Image for 'Look at picture'..." className={inputBaseClass} /></div>
                <div><label className={labelClass}><LinkIcon size={10} className="inline mr-1"/> Target Vocab</label><input type="text" name="targetVocab" value={formData.targetVocab} onChange={handleInputChange} placeholder="天気, 晴れ" className={inputBaseClass} /></div>
                <div><label className={labelClass}><LinkIcon size={10} className="inline mr-1"/> Target Grammar</label><input type="text" name="targetGrammar" value={formData.targetGrammar} onChange={handleInputChange} placeholder="〜でしょう" className={inputBaseClass} /></div>
              </div>
            </div>

            <div className={`${panelClass} border-indigo-500/30`}>
              <div className="flex items-center justify-between mb-4">
                <label className={`${labelClass} mb-0`}><AlignLeft size={10} className="inline mr-1"/> Master Transcript</label>
                <button type="button" onClick={() => playNativeAudio(formData.transcriptJp)} className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}><Volume2 size={12} className="inline mr-1"/> Test TTS</button>
              </div>
              <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Furigana Syntax: Use <code>漢字[かんじ]</code> to automatically render ruby text.</p>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Japanese Transcript</label>
                  <textarea name="transcriptJp" value={formData.transcriptJp} onChange={handleInputChange} placeholder="女の人と男の人が話しています..." rows="6" className={`${inputBaseClass} !font-bold resize-y`} />
                </div>
                <div>
                  <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>English Translation (Hidden by default)</label>
                  <textarea name="transcriptEn" value={formData.transcriptEn} onChange={handleInputChange} placeholder="A man and woman are talking..." rows="4" className={`${inputBaseClass} resize-y`} />
                </div>
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
                    
                    {/* Reorder Buttons */}
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
                          <div>
                            <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pre-Question (Asked before audio)</label>
                            <input type="text" value={q.preQuestion} onChange={(e) => handleQuestionChange(qIndex, 'preQuestion', e.target.value)} placeholder="e.g., 男の人は何を買いますか。" className={`${inputBaseClass} !font-bold`} />
                          </div>
                          <div>
                            <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Main Question (Asked after audio)</label>
                            <input type="text" value={q.mainQuestion} onChange={(e) => handleQuestionChange(qIndex, 'mainQuestion', e.target.value)} placeholder="e.g., 男の人は何を買いますか。" className={`${inputBaseClass} !font-bold`} />
                          </div>
                          <div className="md:col-span-2">
                             <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Question Image URL (Optional)</label>
                             <input type="text" value={q.questionImageUrl} onChange={(e) => handleQuestionChange(qIndex, 'questionImageUrl', e.target.value)} placeholder="https://..." className={`${inputBaseClass}`} />
                          </div>
                        </div>

                        {/* 🚨 DYNAMIC OPTIONS BUILDER (Text + Image) */}
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
                          <label className={`text-[9px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Options (Provide Text, Image, or Both)</label>
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className={`p-3 rounded-lg border flex gap-3 items-center ${isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <span className={`text-[10px] font-black w-4 shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{String.fromCharCode(65 + optIndex)}.</span>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input 
                                  type="text" 
                                  value={opt.text} 
                                  onChange={(e) => handleOptionChange(qIndex, optIndex, 'text', e.target.value)} 
                                  placeholder={`Text Option ${String.fromCharCode(65 + optIndex)}`} 
                                  className={`${inputBaseClass} !py-1.5`} 
                                />
                                <input 
                                  type="text" 
                                  value={opt.imageUrl} 
                                  onChange={(e) => handleOptionChange(qIndex, optIndex, 'imageUrl', e.target.value)} 
                                  placeholder={`Image URL (Optional)`} 
                                  className={`${inputBaseClass} !py-1.5 !font-mono text-xs`} 
                                />
                              </div>

                              <div className="shrink-0 flex items-center gap-3 pl-2 border-l border-slate-300 dark:border-slate-600">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={`correct-${qIndex}`} checked={q.correctIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctIndex', optIndex)} className="w-4 h-4 accent-amber-500" title="Mark as correct answer" />
                                  <span className="text-[9px] font-bold uppercase text-amber-500">Correct</span>
                                </label>
                                <button type="button" onClick={() => removeOption(qIndex, optIndex)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors" title="Delete Option"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ))}
                          <button type="button" onClick={() => addOption(qIndex)} className={`text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-1 transition-colors ${isDarkMode ? 'text-amber-500 hover:text-amber-400' : 'text-amber-600 hover:text-amber-500'}`}><Plus size={10}/> Add Option Slot</button>
                        </div>
                        
                        <div>
                          <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block flex items-center gap-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}><CheckCircle2 size={10}/> Explanation for Correct Answer</label>
                          <input type="text" value={q.explanation} onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)} placeholder="Why is this option correct?" className={`${inputBaseClass} !text-xs !italic`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${isSaving ? 'opacity-50' : 'hover:-translate-y-0.5'} ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {editingId ? 'Update Document' : 'Publish Listening Track'}
            </button>
          </form>
        </div>

        {/* LIVE DATABASE TABLE */}
        <div className="xl:col-span-5 flex flex-col h-full max-h-[85vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Database size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} /> Published Tracks</h3>
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
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{entry.taskType?.replace('_', ' ')}</span>
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
    </div>
  );
}