import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Loader2, Sparkles, Upload, 
  Download, FileSpreadsheet, ChevronDown, Layers, 
  Zap, Target, Lock, Unlock, Globe, ShieldCheck, Coins, ShieldAlert
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { db, auth } from '@services/firebase'; 
import { collection, serverTimestamp, doc, writeBatch, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from '@/context/ThemeContext'; 

import QuestionAccordion from './components/QuestionAccordion';
import ForgeActionButtons from './components/ForgeActionButtons';

const generateUniqueId = () => Date.now() + Math.random().toString(36).substr(2, 9);

function parseCSVRow(str) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < str.length; i++) {
    if (inQuote) {
      if (str[i] === '"') {
        if (i < str.length - 1 && str[i+1] === '"') { cur += '"'; i++; } 
        else { inQuote = false; }
      } else { cur += str[i]; }
    } else {
      if (str[i] === '"') { inQuote = true; } 
      else if (str[i] === ',') { result.push(cur.trim()); cur = ''; } 
      else { cur += str[i]; }
    }
  }
  result.push(cur.trim());
  return result;
}

export default function DeckForge() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const { batchId, categoryId, deckId } = useParams();

  // 🚨 SECURITY STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isMasterTeacher, setIsMasterTeacher] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [importId, setImportId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  
  // 🚨 DECK IDENTITY STATE
  const [deckTitle, setDeckTitle] = useState('');
  const [deckSubtitle, setDeckSubtitle] = useState('');
  const [deckColor, setDeckColor] = useState('from-indigo-500 to-purple-600');

  // 🚨 VISIBILITY & PRICING STATE
  const [visibility, setVisibility] = useState('batch');
  const [batchPrice, setBatchPrice] = useState(0);
  const [globalPrice, setGlobalPrice] = useState(500);

  // PLAY RULES STATE
  const [xpReward, setXpReward] = useState(50);
  const [passPercentage, setPassPercentage] = useState(80);
  const [requireSrs, setRequireSrs] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const [templateType, setTemplateType] = useState('mixed');

  const [questions, setQuestions] = useState([{ 
    id: generateUniqueId(), dbId: null, customId: '', isExpanded: true, type: 'single_choice',
    subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: true,
    tags: '', compatibleEngines: ['srs', 'drill'], 
    prompt: '', srsFrontHtml: '', srsBackHtml: '', mediaUrl: '', 
    timeLimit: 45, points: 4, negativePoints: 1,
    options: [
      { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0 }, 
      { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0 }
    ],
    hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false
  }]);

  const [batchName, setBatchName] = useState("");

  const gradientOptions = [
    'from-indigo-500 to-purple-600', 'from-rose-500 to-pink-600',
    'from-emerald-400 to-teal-600', 'from-amber-400 to-orange-500',
    'from-blue-500 to-cyan-500', 'from-slate-700 to-slate-900',
    'from-violet-600 to-fuchsia-600', 'from-cyan-400 to-sky-600',
    'from-fuchsia-500 to-orange-500', 'from-lime-400 to-emerald-600',
    'from-red-500 to-rose-700', 'from-blue-700 to-indigo-900'
  ];

  useEffect(() => {
    const fetchBatchName = async () => {
      if (!batchId) return;
      try {
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        if (batchSnap.exists()) setBatchName(batchSnap.data().title || batchSnap.data().name); 
      } catch (error) { console.error(error); }
    };
    fetchBatchName();
  }, [batchId]);

  // 🚨 BULLETPROOF SECURITY & FETCH ENGINE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!deckId) return; 
      setIsLoading(true);
      try {
        if (!user || !batchId || !categoryId) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        const userUid = user.uid;

        // 1. Check Master Authorization
        const lexSnap = await getDoc(doc(db, 'lexicons', categoryId));
        const masterAuth = lexSnap.exists() && (lexSnap.data().accessIds || []).includes(userUid);
        setIsMasterTeacher(masterAuth);

        // 2. Check Batch-Specific Authorization
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        const batchAuth = batchSnap.exists() && (batchSnap.data().teacherIds || []).includes(userUid);

        // 3. THE BOUNCER
        if (!masterAuth && !batchAuth) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        setAccessDenied(false);

        // 4. AUTHORIZED: Fetch Existing Deck
        const deckRef = doc(db, `batches/${batchId}/self_practice/${categoryId}/decks`, deckId);
        const deckSnap = await getDoc(deckRef);

        if (deckSnap.exists()) {
          const data = deckSnap.data();
          
          setDeckTitle(data.title || '');
          setDeckSubtitle(data.subtitle || '');
          setDeckColor(data.coverColor || 'from-indigo-500 to-purple-600');
          
          setVisibility(data.visibility || 'batch');
          setBatchPrice(data.batchPrice !== undefined ? data.batchPrice : 0);
          setGlobalPrice(data.globalPrice !== undefined ? data.globalPrice : 500);

          setXpReward(data.xpReward !== undefined ? data.xpReward : 50);
          setPassPercentage(data.drillPassTarget !== undefined ? data.drillPassTarget : 80);
          setRequireSrs(data.requireSrsFirst !== undefined ? data.requireSrsFirst : true);
          setIsLocked(data.isLocked !== undefined ? data.isLocked : false);

          const qIds = data.questionIds || [];
          
          if (qIds.length > 0) {
            const questionPromises = qIds.map(id => getDoc(doc(db, `question_bank/${batchId}/questions`, id)));
            const questionSnaps = await Promise.all(questionPromises);

            const loadedQs = questionSnaps.filter(snap => snap.exists()).map(snap => {
              const qData = snap.data();
              let extractedCustomId = typeof qData.id === 'string' && qData.id.startsWith('q_') ? qData.id.replace('q_', '').replace(/^0+/, '') || '0' : ''; 
              
              const safeOptions = qData.options && qData.options.length > 0 
                ? qData.options.map(o => ({ ...o, uid: o.uid || generateUniqueId() })) 
                : [{ id: 1, uid: generateUniqueId(), text: qData.expectedAnswer || '', isCorrect: true, count: 0 }];

              return {
                id: generateUniqueId(), dbId: qData.id || snap.id, customId: extractedCustomId, isExpanded: false, 
                type: qData.type || 'single_choice', subType: qData.subType || 'reading', difficulty: qData.difficulty || 'mid',
                topic: qData.topic || '', subTopic: qData.subTopic || '', allowSecondAttempt: qData.secondAttempt || false,
                tags: qData.tags ? (Array.isArray(qData.tags) ? qData.tags.join(', ') : qData.tags) : '', 
                compatibleEngines: qData.compatibleEngines || ['srs', 'drill'], 
                prompt: qData.promptText || '', srsFrontHtml: qData.srsFrontHtml || '', srsBackHtml: qData.srsBackHtml || '',
                mediaUrl: qData.mediaUrl || '', timeLimit: qData.idealTimeSeconds || 45, points: qData.points || 4, negativePoints: qData.negativePoints || 1, 
                options: safeOptions, hint: qData.hintText || '', solutionText: qData.officialSolution?.text || '', solutionVideoUrl: qData.officialSolution?.videoUrl || '', isDeleted: false
              };
            });
            setQuestions(loadedQs);
          }
        }
      } catch (error) { 
        console.error(error); 
        setAccessDenied(true); 
      } finally { 
        setIsLoading(false); 
      }
    });

    return () => unsubscribe();
  }, [batchId, categoryId, deckId]);

  // ==========================================
  // 🚨 BULK IMPORT LOGIC
  // ==========================================
  const downloadCsvTemplate = () => {
    const baseHeaders = "Question ID,Format,Target Modes,Prompt,SRS Front,SRS Back,Points,Expected Time,Topic,Sub Topic,Difficulty,Category,Allow Second Attempt,Penalty,Hint,Official Solution,Solution Video URL,Media URL,Tags,";
    let headers = ""; let samples = "";
    if (templateType === 'text_input' || templateType === 'kanji_draw') {
       headers = baseHeaders + "Expected Answer\n";
       if (templateType === 'text_input') samples = '"10502","text_input","srs, drill","Type the romaji for 水.","<h2>水</h2>","<p>mizu (water)</p>","4","20","Reading","Romaji","mid","General","TRUE","1","It means water.","水 is read as mizu.","","","water, romaji","mizu"\n';
       else samples = '"10503","kanji_draw","drill","Draw the kanji for Fire.","","","4","60","Kanji","Writing","hard","General","FALSE","2","It looks like a campfire.","","","","fire, writing","火"\n';
    } else {
       headers = baseHeaders + "Correct Options (Comma separated),Option 1,Option 2,Option 3,Option 4,Option 5,Option 6\n";
       if (templateType === 'multiple_choice') samples = '"90002","multiple_choice","drill","Select ALL the words that represent colors.","","","4","45","Vocabulary","Adjectives","mid","General","TRUE","1","Think of a rainbow.","Aka (red) and Ao (blue) are colors.","","","colors, multi","1, 4","Red (あか)","Car (くるま)","Dog (いぬ)","Blue (あお)","Apple (りんご)",""\n';
       else if (templateType === 'single_choice') samples = '"90001","single_choice","srs, drill","What is the correct meaning of 猫?","<h2>猫</h2>","<p>Cat (neko)</p>","4","30","Vocabulary","N5 Nouns","easy","General","FALSE","1","It meows.","猫 (neko) translates to cat.","","","vocab, animal","2","Dog","Cat","Bird","Fish","",""\n';
       else samples = '"90001","single_choice","srs, drill","What is the correct meaning of 猫?","<h2>猫</h2>","<p>Cat (neko)</p>","4","30","Vocabulary","N5 Nouns","easy","General","FALSE","1","It meows.","猫 (neko) translates to cat.","","","vocab, animal","2","Dog","Cat","Bird","Fish","",""\n' + '"90002","multiple_choice","drill","Select ALL the colors.","","","4","45","Vocabulary","Adjectives","mid","General","TRUE","1","Think rainbow.","Aka and Ao.","","","colors","1, 4","Red","Car","Dog","Blue","Apple",""\n';
    }
    const blob = new Blob([headers + samples], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.setAttribute('href', url); a.setAttribute('download', `DeckForge_Template_${templateType}.csv`); a.click();
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split(/\r?\n/).filter(row => row.trim());
      if (rows.length < 2) { setIsImporting(false); return alert("Empty CSV."); }
      
      const headers = parseCSVRow(rows[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const parsedQuestions = [];

      for (let i = 1; i < rows.length; i++) {
        const values = parseCSVRow(rows[i]);
        if (values.length < 2 || !values[0]) continue; 
        const rowData = {}; headers.forEach((h, idx) => { rowData[h] = values[idx] || ''; });

        const type = (rowData.format || rowData.type || 'single_choice').toLowerCase().replace(' ', '_');
        const customId = rowData.questionid || rowData.id || ''; 
        const validModes = (rowData.targetmodes || rowData.modes || 'srs, drill').split(',').map(m => m.trim().toLowerCase()).filter(m => m !== '');
        
        const qOptions = [];
        const optionKeys = Object.keys(rowData).filter(k => k.startsWith('option') && k !== 'options' && !k.includes('correct'));
        optionKeys.sort((a, b) => parseInt(a.replace('option', '')) - parseInt(b.replace('option', '')));

        const correctIndices = (rowData.correctoptions || "1").toString().split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        if (correctIndices.length === 0) correctIndices.push(1);

        optionKeys.forEach((optKey, idx) => {
          if (rowData[optKey] && rowData[optKey].trim() !== '') {
            const optNumber = parseInt(optKey.replace('option', '')) || (idx + 1);
            qOptions.push({ id: optNumber, uid: generateUniqueId(), text: rowData[optKey].trim(), isCorrect: correctIndices.includes(optNumber), count: 0 });
          }
        });

        if (qOptions.length > 0 && !qOptions.some(o => o.isCorrect)) qOptions[0].isCorrect = true;
        const expectedAns = rowData.expectedanswer || rowData.expectedkanji;
        if (expectedAns && qOptions.length === 0) qOptions.push({ id: 1, uid: generateUniqueId(), text: expectedAns, isCorrect: true, count: 0 });

        const finalOptions = (type === 'text_input' || type === 'kanji_draw') 
          ? [{ id: 1, uid: generateUniqueId(), text: expectedAns || rowData.option1 || '', isCorrect: true, count: 0 }] : qOptions;

        parsedQuestions.push({
          id: generateUniqueId(), dbId: null, customId: customId, isExpanded: false,
          type: type, subType: 'reading', difficulty: rowData.difficulty || 'mid',
          topic: rowData.topic || '', subTopic: rowData.subtopic || '',
          allowSecondAttempt: String(rowData.allowsecondattempt).toLowerCase() === 'true',
          tags: rowData.tags || '', compatibleEngines: validModes.length ? validModes : ['srs', 'drill'], 
          prompt: rowData.prompt || '', srsFrontHtml: rowData.srsfront || '', srsBackHtml: rowData.srsback || '',  
          mediaUrl: rowData.mediaurl || '', timeLimit: parseInt(rowData.expectedtime) || 45,
          points: parseInt(rowData.points) || 4, negativePoints: parseFloat(rowData.penalty) || 1,
          options: finalOptions.length ? finalOptions : [{ id: 1, uid: generateUniqueId(), text: 'Option 1', isCorrect: true, count: 0 }],
          hint: rowData.hint || '', solutionText: rowData.officialsolution || '', solutionVideoUrl: rowData.solutionvideourl || '', isDeleted: false
        });
      }
      if (parsedQuestions.length > 0) {
        setQuestions(prev => [...prev, ...parsedQuestions]);
        alert(`Successfully imported ${parsedQuestions.length} questions!`);
      } 
      setIsImporting(false); e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const handleImportQuestion = async () => {
    if (!importId.trim()) return alert("Please enter a Question ID.");
    setIsImporting(true);
    try {
      const qRef = doc(db, `question_bank/${batchId}/questions`, importId.trim());
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const data = qSnap.data();
        let extractedCustomId = typeof data.id === 'string' && data.id.startsWith('q_') ? data.id.replace('q_', '').replace(/^0+/, '') || '0' : ''; 
        let finalEngines = data.compatibleEngines || ['srs', 'drill'];
        const engines = data.compatibleEngines || ['exam'];
        if (!engines.includes('srs') && !engines.includes('drill')) {
           alert("Notice: Exam question cloned into a new Drill question.");
           finalEngines = ['drill']; extractedCustomId = '';
        }
        const safeOptions = data.options?.length > 0 ? data.options.map(o => ({ ...o, uid: generateUniqueId() })) : [{ id: 1, uid: generateUniqueId(), text: data.expectedAnswer || '', isCorrect: true, count: 0 }];
        setQuestions([...questions, {
          id: generateUniqueId(), dbId: null, customId: extractedCustomId, isExpanded: true, compatibleEngines: finalEngines,
          type: data.type || 'single_choice', subType: data.subType || 'reading', difficulty: data.difficulty || 'mid',
          topic: data.topic || '', subTopic: data.subTopic || '', allowSecondAttempt: data.secondAttempt || false,
          tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(', ') : data.tags) : '', prompt: data.promptText || '', srsFrontHtml: data.srsFrontHtml || '', 
          srsBackHtml: data.srsBackHtml || '', mediaUrl: data.mediaUrl || '', timeLimit: data.idealTimeSeconds || 45, 
          points: data.points || 4, negativePoints: data.negativePoints || 1, options: safeOptions, 
          hint: data.hintText || '', solutionText: data.officialSolution?.text || '', solutionVideoUrl: data.officialSolution?.videoUrl || '', isDeleted: false
        }]);
        setImportId(''); 
      } else alert("Question not found.");
    } catch (error) { console.error(error); alert("Failed to import question."); } finally { setIsImporting(false); }
  };

  const handleAddQuestion = () => setQuestions([...questions, { 
    id: generateUniqueId(), dbId: null, customId: '', compatibleEngines: ['srs', 'drill'], isExpanded: true, type: 'single_choice', subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: false, tags: '', prompt: '', srsFrontHtml: '', srsBackHtml: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1, 
    options: [{ id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0 }, { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0 }], hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false 
  }]);
  
  const handleRemoveQuestion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isDeleted: true, deletedAt: Date.now() } : q));
  const toggleQuestionExpansion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q));
  const updateQuestionField = (qId, field, value) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      if (field === 'type' && (value === 'kanji_draw' || value === 'text_input')) return { ...q, [field]: value, options: [{ id: 1, uid: generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: 0 }] }; 
      return { ...q, [field]: value }; 
    } return q; 
  }));
  const handleAddOption = (qId) => setQuestions(questions.map(q => {
    if (q.id === qId) return { ...q, options: [...q.options, { id: (q.options.length > 0 ? Math.max(...q.options.map(o => Number(o.id) || 0)) + 1 : 1), uid: generateUniqueId(), text: '', isCorrect: false, count: 0 }] }; return q;
  }));
  const handleRemoveOption = (qId, optId) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      const filteredOptions = q.options.filter(o => o.id !== optId); 
      if (filteredOptions.length > 0 && !filteredOptions.some(o => o.isCorrect)) filteredOptions[0].isCorrect = true;
      return { ...q, options: filteredOptions }; 
    } return q; 
  }));
  const updateOptionText = (qId, optId, newText) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text: newText } : o) } : q));
  const setCorrectOption = (qId, correctOptId) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      if (q.type === 'single_choice') return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId })) };
      return { ...q, options: q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o) }; 
    } return q; 
  }));

  // ==========================================
  // 🚨 BULLETPROOF SAVE FUNCTION
  // ==========================================
  const handleSaveDeck = async () => {
    const activeQs = questions.filter(q => !q.isDeleted);
    
    const invalidQ = activeQs.find(q => {
      if (q.compatibleEngines.includes('drill') && (!q.prompt || !q.prompt.trim())) return true;
      if (q.compatibleEngines.includes('srs') && (!q.srsFrontHtml || !q.srsFrontHtml.trim())) return true;
      return false;
    });

    if (invalidQ) return alert("Please fill out the Drill Prompt or SRS Front HTML for all active questions.");
    
    const actualTeacherId = auth.currentUser?.uid || "unknown_teacher";
    setIsSaving(true);
    
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'question_bank', batchId), { batchId, batchName, updatedAt: serverTimestamp() }, { merge: true });

      const lightweightIds = [];

      activeQs.forEach((q) => {
        let finalQId = q.dbId 
            ? q.dbId 
            : (q.customId?.toString().trim() !== '' ? `q_${String(q.customId).padStart(8, '0')}` : `q_${Math.floor(10000000 + Math.random() * 90000000)}`);
        
        let cleanOptions = (q.type === 'text_input' || q.type === 'kanji_draw') 
            ? [{ id: q.options[0]?.id || Date.now(), uid: q.options[0]?.uid || generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0 }] 
            : q.options;

        const safeTags = (typeof q.tags === 'string' ? q.tags : '').split(',').map(t => t.trim()).filter(t => t !== '');

        batch.set(doc(db, `question_bank/${batchId}/questions`, finalQId), {
          id: finalQId, authorId: actualTeacherId, type: q.type, subType: q.subType, topic: q.topic, subTopic: q.subTopic, 
          secondAttempt: q.allowSecondAttempt, tags: safeTags, difficulty: q.difficulty,
          compatibleEngines: q.compatibleEngines, promptText: q.prompt || '', srsFrontHtml: q.srsFrontHtml || '', srsBackHtml: q.srsBackHtml || '',   
          mediaUrl: q.mediaUrl || null, idealTimeSeconds: Number(q.timeLimit), points: Number(q.points), negativePoints: Number(q.negativePoints), 
          options: cleanOptions, hintText: q.hint || '', officialSolution: { text: q.solutionText || '', videoUrl: q.solutionVideoUrl || null },
          communitySolutions: [], createdAt: q.createdAt ? new Date(q.createdAt) : new Date(), updatedAt: serverTimestamp()
        }, { merge: true });
        
        lightweightIds.push(finalQId);
      });

      // 🚨 CRITICAL FIX: Save Visibility and Pricing!
      const deckRef = doc(db, `batches/${batchId}/self_practice/${categoryId}/decks`, deckId);
      batch.set(deckRef, { 
        title: deckTitle,
        subtitle: deckSubtitle,
        coverColor: deckColor,
        visibility: visibility,
        batchPrice: Number(batchPrice) || 0,
        globalPrice: Number(globalPrice) || 0,
        xpReward: Number(xpReward),
        drillPassTarget: Number(passPercentage),
        requireSrsFirst: requireSrs,
        isLocked: isLocked,
        questionIds: lightweightIds, 
        categoryId: categoryId,     
        originBatchId: batchId,     
        isOfficial: true,           
        updatedAt: serverTimestamp() 
      }, { merge: true });

      await batch.commit(); 
      navigate(`/batch/${batchId}/arsenal/${categoryId}`); 

    } catch (error) { 
      console.error(error); 
      alert("Failed to save Deck."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  // 🚨 ACCESS DENIED SCREEN
  if (accessDenied) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20">
          <ShieldAlert size={40}/>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
          You are not a collaborator or lead for this course, so you cannot edit decks for this batch.
        </p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) return <div className={`min-h-screen flex flex-col items-center justify-center font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0B1121] text-indigo-500' : 'bg-slate-50 text-indigo-600'}`}><Loader2 size={40} className="animate-spin mb-4" /> Pulling Deck...</div>;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'} pb-32 transition-colors`}>
      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1121]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2"><Sparkles size={18} className="text-indigo-500" /> Deck Forge</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Official Resource Configuration</p>
          </div>
        </div>
        <button onClick={handleSaveDeck} disabled={isSaving} className={`px-8 py-3.5 text-white font-black text-sm rounded-xl transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'}`}>
          {isSaving ? <><Loader2 size={18} className="animate-spin"/> Saving Deck...</> : <><Save size={18} /> Save & Publish</>}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-10 space-y-10">
        
        {/* 🚨 EDITABLE DECK SETTINGS */}
        <section className={`relative overflow-hidden rounded-[2.5rem] border shadow-sm p-8 md:p-10 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
           <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${deckColor} transition-colors duration-500`}></div>
           
           <div className="flex flex-col gap-8 ml-2">
             
             {/* Part 1: Identity */}
             <div>
               <div className="flex items-center gap-3 mb-6">
                 <Layers size={20} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                 <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Deck Identity</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                   <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Deck Title</label>
                   <input type="text" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} placeholder="e.g., JLPT N5 Master Vocab" className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'}`} />
                 </div>
                 <div>
                   <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subtitle / Description</label>
                   <input type="text" value={deckSubtitle} onChange={e => setDeckSubtitle(e.target.value)} placeholder="e.g., The top 100 verbs for the exam." className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20'}`} />
                 </div>
               </div>
               <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cover Gradient</label>
                  <div className="flex flex-wrap gap-3">
                    {gradientOptions.map((grad, i) => (
                      <button key={i} onClick={() => setDeckColor(grad)} className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} transition-all ${deckColor === grad ? 'scale-110 ring-4 ring-indigo-500/50 shadow-lg' : 'hover:scale-105 opacity-40 hover:opacity-100'}`} />
                    ))}
                  </div>
               </div>
             </div>

             {/* 🚨 Part 1.5: Visibility & Pricing */}
             <div className={`pt-8 mt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <Globe size={20} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                  <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Visibility & Pricing</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Visibility Toggles */}
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Market Scope</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setVisibility('batch')} className={`py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${visibility === 'batch' ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-md shadow-indigo-500/10' : 'bg-indigo-50 border-indigo-400 text-indigo-600 shadow-sm') : (isDarkMode ? 'bg-[#0B1120] border-slate-700 hover:border-slate-600 text-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-400')}`}>
                        <ShieldCheck size={16}/>
                        <span className="text-[11px] font-black uppercase tracking-widest">Batch Only</span>
                      </button>
                      <button onClick={() => setVisibility('global')} className={`py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${visibility === 'global' ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/10' : 'bg-emerald-50 border-emerald-400 text-emerald-600 shadow-sm') : (isDarkMode ? 'bg-[#0B1120] border-slate-700 hover:border-slate-600 text-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-400')}`}>
                        <Globe size={16}/>
                        <span className="text-[11px] font-black uppercase tracking-widest">Global App</span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Inputs */}
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Batch Price</label>
                        <div className="relative">
                          <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                          <input type="number" value={batchPrice} onChange={e => setBatchPrice(e.target.value)} className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                        </div>
                      </div>

                      {/* Global Price (Gracefully Disables when Batch Only is selected) */}
                      <div className={`transition-all duration-300 ${visibility === 'batch' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${visibility === 'global' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                          Global Price
                        </label>
                        <div className="relative">
                          <Coins size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                          <input 
                            type="number" 
                            value={globalPrice} 
                            onChange={e => setGlobalPrice(e.target.value)} 
                            disabled={visibility === 'batch'}
                            className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-400'}`} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             {/* Part 3: Rules */}
             <div className={`pt-8 mt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-6">
                 <Target size={20} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                 <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Play Rules</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completion XP</label>
                    <div className="relative">
                      <Zap size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                      <input type="number" value={xpReward} onChange={e => setXpReward(e.target.value)} className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-amber-500 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-amber-600 focus:border-amber-400'}`} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Passing Marks</label>
                    <div className="relative">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">%</span>
                      <input type="number" value={passPercentage} onChange={e => setPassPercentage(e.target.value)} className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'}`} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Require SRS First</label>
                    <button onClick={() => setRequireSrs(!requireSrs)} className={`w-full px-4 py-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${requireSrs ? (isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (isDarkMode ? 'bg-[#0B1120] border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                      {requireSrs ? 'Enabled' : 'Disabled'}
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${requireSrs ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${requireSrs ? 'translate-x-4' : 'left-0.5'}`}></div>
                      </div>
                    </button>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Visibility Lock</label>
                    <button onClick={() => setIsLocked(!isLocked)} className={`w-full px-4 py-3.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${isLocked ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600') : (isDarkMode ? 'bg-[#0B1120] border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
                      {isLocked ? <span className="flex items-center gap-1.5"><Lock size={14}/> Hidden</span> : <span className="flex items-center gap-1.5"><Unlock size={14}/> Live</span>}
                    </button>
                  </div>
                </div>
             </div>

           </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-[10px] font-black uppercase text-slate-500">Question Ledger ({questions.filter(q => !q.isDeleted).length})</h2>
            <button onClick={() => setQuestions(questions.map(q => ({...q, isExpanded: false})))} className="text-[10px] font-black uppercase text-indigo-500">Collapse All</button>
          </div>
          
          <AnimatePresence>
            {questions.filter(q => !q.isDeleted).map((q, qIndex) => (
              <QuestionAccordion key={q.id} q={q} qIndex={qIndex} toggleQuestionExpansion={toggleQuestionExpansion} handleRemoveQuestion={handleRemoveQuestion} updateQuestionField={updateQuestionField} handleAddOption={handleAddOption} handleRemoveOption={handleRemoveOption} updateOptionText={updateOptionText} setCorrectOption={setCorrectOption} isDarkMode={isDarkMode} />
            ))}
          </AnimatePresence>

          <div className="flex flex-col gap-6">
            <ForgeActionButtons handleAddQuestion={handleAddQuestion} importId={importId} setImportId={setImportId} handleImportQuestion={handleImportQuestion} isImporting={isImporting} isDarkMode={isDarkMode} />
            
            <div className={`p-6 rounded-[2rem] border shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Bulk Import via CSV</h3>
                    <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Supports SRS Front/Back and Drill targets.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex items-center border rounded-xl overflow-hidden ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                    <select 
                      value={templateType} 
                      onChange={(e) => setTemplateType(e.target.value)}
                      className={`appearance-none bg-transparent pl-4 pr-2 py-2.5 text-xs font-bold outline-none cursor-pointer ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      <option value="mixed">Mixed Types</option>
                      <option value="single_choice">Single Choice</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="text_input">Text Input</option>
                      <option value="kanji_draw">Kanji Draw</option>
                    </select>
                    <div className="pr-3 pointer-events-none text-slate-500">
                      <ChevronDown size={14} />
                    </div>
                    <button onClick={downloadCsvTemplate} className={`px-4 py-2.5 text-xs font-bold border-l transition-colors flex items-center gap-2 ${isDarkMode ? 'border-slate-700 hover:bg-slate-700 text-indigo-400' : 'border-slate-200 hover:bg-slate-100 text-indigo-600'}`}>
                      <Download size={14}/> Template
                    </button>
                  </div>
                  
                  <input type="file" accept=".csv" id="csvUpload" className="hidden" onChange={handleCsvUpload} />
                  
                  <label htmlFor="csvUpload" className={`cursor-pointer px-5 py-2.5 font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap ${isImporting ? 'bg-slate-700 text-slate-400' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20'}`}>
                    {isImporting ? <Loader2 size={16} className="animate-spin shrink-0" /> : <Upload size={16} className="shrink-0" />} 
                    <span className="leading-none mt-[1px]">{isImporting ? 'Checking...' : 'Upload File'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}