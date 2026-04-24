import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Sparkles, Upload, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { db, auth } from '@services/firebase'; 
import { collection, serverTimestamp, doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext'; 

import GlobalExamSettings from './components/GlobalExamSettings';
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

export default function QuestionForge() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { batchId, modId, chapId, exerciseId } = useParams();

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [importId, setImportId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [attemptPoints, setAttemptPoints] = useState(0); 
  
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [allowPause, setAllowPause] = useState(false); 
  const [passPercentage, setPassPercentage] = useState(80); 
  const [isLocked, setIsLocked] = useState(true); 

  const [templateType, setTemplateType] = useState('mixed');

  const [questions, setQuestions] = useState([{ 
    id: generateUniqueId(), customId: '', isExpanded: true, type: 'single_choice',
    subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: false,
    tags: '', engine: 'exam', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1,
    options: [
      { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0 }, 
      { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0 }
    ],
    hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false
  }]);

  const [batchName, setBatchName] = useState("");

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

  useEffect(() => {
    const fetchExistingQuiz = async () => {
      if (!exerciseId) return; 
      setIsLoading(true);
      try {
        const quizRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId);
        const quizSnap = await getDoc(quizRef);

        if (quizSnap.exists()) {
          const data = quizSnap.data();
          setQuizTitle(data.title || ''); setQuizDescription(data.description || '');
          setAllowPause(data.allowPause || false); setPassPercentage(data.passPercentage || 80);
          setIsLocked(data.isLocked !== undefined ? data.isLocked : true);

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
                id: generateUniqueId(), 
                customId: extractedCustomId, isExpanded: false, 
                type: qData.type || 'single_choice', subType: qData.subType || 'reading', difficulty: qData.difficulty || 'mid',
                topic: qData.topic || '', subTopic: qData.subTopic || '', allowSecondAttempt: qData.secondAttempt || false,
                tags: qData.tags ? qData.tags.join(', ') : '', prompt: qData.promptText || '', mediaUrl: qData.mediaUrl || '',
                timeLimit: qData.idealTimeSeconds || 45, points: qData.points || 4, negativePoints: qData.negativePoints || 1, engine: qData.engine || 'exam',
                options: safeOptions, hint: qData.hintText || '', solutionText: qData.officialSolution?.text || '', solutionVideoUrl: qData.officialSolution?.videoUrl || '', isDeleted: false
              };
            });
            setQuestions(loadedQs);
          } else if(data.questions?.length > 0) {
            const purifiedQuestions = data.questions.map(q => ({
              ...q, id: generateUniqueId(), engine: q.engine || 'exam', options: q.options?.map(o => ({ ...o, uid: o.uid || generateUniqueId() })) || []
            }));
            setQuestions(purifiedQuestions);
          }
          setAttemptPoints(data.attemptPoints || 0);
        }
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };
    fetchExistingQuiz();
  }, [batchId, modId, chapId, exerciseId]);

  // ==========================================
  // 🚨 EXHAUSTIVE DYNAMIC CSV IMPORT
  // ==========================================
  // ==========================================
  // 🚨 EXHAUSTIVE DYNAMIC CSV IMPORT
  // ==========================================
  const downloadCsvTemplate = () => {
    const baseHeaders = "Question ID,Format,Prompt,Points,Expected Time,Topic,Sub Topic,Difficulty,Category,Allow Second Attempt,Penalty,Hint,Official Solution,Solution Video URL,Media URL,Tags,";
    
    let headers = "";
    let samples = "";

    if (templateType === 'text_input' || templateType === 'kanji_draw') {
       headers = baseHeaders + "Expected Answer\n";
       if (templateType === 'text_input') {
           samples = '"10502","text_input","Type the romaji for 水.","4","20","Reading","Romaji","mid","General","TRUE","1","It means water.","水 is read as mizu.","","","water, romaji","mizu"\n';
       } else {
           samples = '"10503","kanji_draw","Draw the kanji for Fire.","4","60","Kanji","Writing","hard","General","FALSE","2","It looks like a campfire.","","","","fire, writing","火"\n';
       }
    } else {
       headers = baseHeaders + "Correct Options (Comma separated),Option 1,Option 2,Option 3,Option 4,Option 5,Option 6\n";
       
       if (templateType === 'multiple_choice') {
           samples = '"90002","multiple_choice","Select ALL the words that represent colors.","4","45","Vocabulary","Adjectives","mid","General","TRUE","1","Think of a rainbow.","Aka (red) and Ao (blue) are colors.","","","colors, multi","1, 4","Red (あか)","Car (くるま)","Dog (いぬ)","Blue (あお)","Apple (りんご)",""\n';
       } else if (templateType === 'single_choice') {
           samples = '"90001","single_choice","What is the correct meaning of 猫?","4","30","Vocabulary","N5 Nouns","easy","General","FALSE","1","It meows.","猫 (neko) translates to cat.","","","vocab, animal","2","Dog","Cat","Bird","Fish","",""\n';
       } else if (templateType === 'mixed') {
           // 🚨 All 4 examples are bundled perfectly into the Mixed Template
           const s1 = '"90001","single_choice","What is the correct meaning of 猫?","4","30","Vocabulary","N5 Nouns","easy","General","FALSE","1","It meows.","猫 (neko) translates to cat.","","","vocab, animal","2","Dog","Cat","Bird","Fish","",""\n';
           const s2 = '"90002","multiple_choice","Select ALL the words that represent colors.","4","45","Vocabulary","Adjectives","mid","General","TRUE","1","Think of a rainbow.","Aka (red) and Ao (blue) are colors.","","","colors, multi","1, 4","Red (あか)","Car (くるま)","Dog (いぬ)","Blue (あお)","Apple (りんご)",""\n';
           const s3 = '"90003","text_input","Type the romaji for 水.","4","20","Reading","Romaji","mid","General","TRUE","1","It means water.","水 is read as mizu.","","","water, romaji","1","mizu","","","","",""\n';
           const s4 = '"90004","kanji_draw","Draw the kanji for Fire.","4","60","Kanji","Writing","hard","General","FALSE","2","It looks like a campfire.","","","","fire, writing","1","火","","","","",""\n';
           samples = s1 + s2 + s3 + s4;
       }
    }

    const blob = new Blob([headers + samples], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `QuestionForge_Template_${templateType}.csv`);
    a.click();
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split(/\r?\n/).filter(row => row.trim());
      
      if (rows.length < 2) {
        setIsImporting(false);
        return alert("The CSV file appears to be empty or missing data rows.");
      }
      
      const headers = parseCSVRow(rows[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const parsedQuestions = [];

      for (let i = 1; i < rows.length; i++) {
        const values = parseCSVRow(rows[i]);
        if (values.length < 2 || !values[0]) continue; 

        const rowData = {};
        headers.forEach((h, idx) => { rowData[h] = values[idx] || ''; });

        const type = (rowData.format || rowData.type || 'single_choice').toLowerCase().replace(' ', '_');
        const customId = rowData.questionid || rowData.id || ''; 
        
        // 🚨 EXTRACT DYNAMIC OPTIONS (Filters out blanks and allows infinite columns)
        const qOptions = [];
        const optionKeys = Object.keys(rowData).filter(k => k.startsWith('option') && k !== 'options' && !k.includes('correct'));
        // Ensure options are processed in order (Option 1, Option 2, Option 10...)
        optionKeys.sort((a, b) => parseInt(a.replace('option', '')) - parseInt(b.replace('option', '')));

        const rawCorrect = rowData.correctoptions || rowData.correctoption || rowData.correctoptioncommaseparated || "1";
        const correctIndices = rawCorrect.toString().split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        if (correctIndices.length === 0) correctIndices.push(1);

        optionKeys.forEach((optKey, idx) => {
          if (rowData[optKey] && rowData[optKey].trim() !== '') {
            const optNumber = parseInt(optKey.replace('option', '')) || (idx + 1);
            qOptions.push({
              id: optNumber,
              uid: generateUniqueId(),
              text: rowData[optKey].trim(),
              isCorrect: correctIndices.includes(optNumber),
              count: 0
            });
          }
        });

        // Failsafe: Ensure at least one correct option exists
        if (qOptions.length > 0 && !qOptions.some(o => o.isCorrect)) qOptions[0].isCorrect = true;

        const expectedAns = rowData.expectedanswer || rowData.expectedkanji;
        if (expectedAns && qOptions.length === 0) {
            qOptions.push({ id: 1, uid: generateUniqueId(), text: expectedAns, isCorrect: true, count: 0 });
        }

        const finalOptions = (type === 'text_input' || type === 'kanji_draw') 
          ? [{ id: 1, uid: generateUniqueId(), text: expectedAns || rowData.option1 || '', isCorrect: true, count: 0 }]
          : qOptions;

        // Boolean parsing for Second Attempt
        const allowSecond = String(rowData.allowsecondattempt || rowData.secondattempt).toLowerCase();
        const isSecondAllowed = allowSecond === 'true' || allowSecond === 'yes' || allowSecond === '1';

        parsedQuestions.push({
          id: generateUniqueId(),
          customId: customId,
          isExpanded: false,
          type: type,
          subType: 'reading',
          difficulty: rowData.difficulty || 'mid',
          topic: rowData.topic || '',
          subTopic: rowData.subtopic || '',
          allowSecondAttempt: isSecondAllowed,
          tags: rowData.tags || '',
          prompt: rowData.prompt || '',
          mediaUrl: rowData.mediaurl || rowData.audiourl || rowData.imageurl || '',
          timeLimit: parseInt(rowData.expectedtime || rowData.timelimits || rowData.timelimit) || 45,
          points: parseInt(rowData.points) || 4,
          engine: rowData.engine || 'exam',
          negativePoints: parseFloat(rowData.penalty || rowData.negativepoints) || 1,
          options: finalOptions.length > 0 ? finalOptions : [{ id: 1, uid: generateUniqueId(), text: 'Option 1', isCorrect: true, count: 0 }],
          hint: rowData.hint || '',
          solutionText: rowData.officialsolution || rowData.solution || '',
          solutionVideoUrl: rowData.solutionvideourl || rowData.solutionvideo || '',
          isDeleted: false
        });
      }

      // DUPLICATE ID CHECKER
      const existingLocalIds = questions.map(q => q.customId.toString()).filter(id => id !== '');
      const idsToCheck = parsedQuestions.map(q => q.customId.toString()).filter(id => id !== '');
      let duplicateIds = [];
      
      idsToCheck.forEach(id => {
        if (existingLocalIds.includes(id)) duplicateIds.push(id);
      });

      if (idsToCheck.length > 0) {
         const checkPromises = idsToCheck.map(async (id) => {
             const formattedId = `q_${String(id).padStart(6, '0')}`;
             const qRef = doc(db, `question_bank/${batchId}/questions`, formattedId);
             const qSnap = await getDoc(qRef);
             return qSnap.exists() ? id : null;
         });
         const dbResults = await Promise.all(checkPromises);
         const dbDuplicates = dbResults.filter(res => res !== null);
         duplicateIds = [...new Set([...duplicateIds, ...dbDuplicates])]; 
      }

      if (duplicateIds.length > 0) {
         const proceed = window.confirm(`⚠️ WARNING: The following Question IDs already exist in this quiz or the database:\n\n${duplicateIds.join(', ')}\n\nIf you proceed, importing them will OVERWRITE the existing database questions when you click save. Do you want to continue?`);
         if (!proceed) {
             setIsImporting(false);
             e.target.value = null; 
             return; 
         }
      }

      if (parsedQuestions.length > 0) {
        setQuestions(prev => [...prev, ...parsedQuestions]);
        alert(`Successfully imported ${parsedQuestions.length} questions!`);
      } else {
        alert("Could not extract any valid questions. Please ensure you are using the template format.");
      }
      
      setIsImporting(false);
      e.target.value = null; 
    };
    reader.readAsText(file);
  };
  // ==========================================


  const handleImportQuestion = async () => {
    if (!importId.trim()) return alert("Please enter a Question ID.");
    setIsImporting(true);
    try {
      const qRef = doc(db, `question_bank/${batchId}/questions`, importId.trim());
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const data = qSnap.data();
        let extractedCustomId = typeof data.id === 'string' && data.id.startsWith('q_') ? data.id.replace('q_', '').replace(/^0+/, '') || '0' : ''; 
        
        const safeOptions = data.options && data.options.length > 0 
          ? data.options.map(o => ({ ...o, uid: generateUniqueId() })) 
          : [{ id: 1, uid: generateUniqueId(), text: data.expectedAnswer || '', isCorrect: true, count: 0 }];

        setQuestions([...questions, {
          id: generateUniqueId(), 
          customId: extractedCustomId, isExpanded: true, 
          engine: data.engine || 'exam',
          type: data.type || 'single_choice', subType: data.subType || 'reading', difficulty: data.difficulty || 'mid',
          topic: data.topic || '', subTopic: data.subTopic || '', allowSecondAttempt: data.secondAttempt || false,
          tags: data.tags ? data.tags.join(', ') : '', prompt: data.promptText || '', mediaUrl: data.mediaUrl || '',
          timeLimit: data.idealTimeSeconds || 45, points: data.points || 4, negativePoints: data.negativePoints || 1,
          options: safeOptions, hint: data.hintText || '', solutionText: data.officialSolution?.text || '', solutionVideoUrl: data.officialSolution?.videoUrl || '', isDeleted: false
        }]);
        setImportId(''); 
      } else alert("Question not found in the bank.");
    } catch (error) { console.error(error); alert("Failed to import question."); } finally { setIsImporting(false); }
  };

  const handleAddQuestion = () => setQuestions([...questions, { 
    id: generateUniqueId(), customId: '', engine: 'exam', isExpanded: true, type: 'single_choice', subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: false, tags: '', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1, 
    options: [
      { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0 }, 
      { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0 }
    ], 
    hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false 
  }]);
  
  const handleRemoveQuestion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isDeleted: true, deletedAt: Date.now() } : q));
  const toggleQuestionExpansion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q));
  
  const updateQuestionField = (qId, field, value) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      if (field === 'type' && (value === 'kanji_draw' || value === 'text_input')) {
        return { 
          ...q, 
          [field]: value, 
          options: [{ 
            id: 1, 
            uid: generateUniqueId(), 
            text: q.options[0]?.text || '', 
            isCorrect: true, 
            count: 0 
          }] 
        }; 
      } 
      return { ...q, [field]: value }; 
    } 
    return q; 
  }));

  const handleAddOption = (qId) => setQuestions(questions.map(q => {
    if (q.id === qId) {
      const nextId = q.options.length > 0 ? Math.max(...q.options.map(o => Number(o.id) || 0)) + 1 : 1;
      return { 
        ...q, 
        options: [...q.options, { 
          id: nextId, 
          uid: generateUniqueId(), 
          text: '', 
          isCorrect: false, 
          count: 0 
        }] 
      };
    }
    return q;
  }));

  const handleRemoveOption = (qId, optId) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      const filteredOptions = q.options.filter(o => o.id !== optId); 
      if (filteredOptions.length > 0 && !filteredOptions.some(o => o.isCorrect)) {
        filteredOptions[0] = { ...filteredOptions[0], isCorrect: true };
      }
      return { ...q, options: filteredOptions }; 
    } 
    return q; 
  }));

  const updateOptionText = (qId, optId, newText) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text: newText } : o) } : q));
  
  // 🚨 THIS ALREADY HANDLES THE SINGLE VS MULTIPLE TOGGLING PERFECTLY!
  const setCorrectOption = (qId, correctOptId) => setQuestions(questions.map(q => { 
    if (q.id === qId) { 
      if (q.type === 'single_choice') {
        return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId })) }; 
      }
      return { ...q, options: q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o) }; 
    } 
    return q; 
  }));

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) return alert("Please provide a title.");
    const activeQs = questions.filter(q => !q.isDeleted);
    if (activeQs.some(q => !q.prompt.trim())) return alert("Please fill out all question prompts.");
    const actualTeacherId = auth.currentUser?.uid || "unknown_teacher";
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'question_bank', batchId), { batchId, batchName, updatedAt: serverTimestamp() }, { merge: true });

      const totalSeconds = activeQs.reduce((acc, curr) => acc + Number(curr.timeLimit), 0);
      const calculatedDuration = totalSeconds === 0 ? "Untimed" : `${Math.ceil(totalSeconds / 60)} mins`;
      let totalPointsSum = 0; const lightweightIds = [];

      activeQs.forEach((q) => {
        let finalQId = q.customId?.toString().trim() !== '' 
          ? `q_${String(q.customId).padStart(5, '0')}` 
          : `q_${Math.floor(10000 + Math.random() * 90000)}`;

        let cleanOptions = (q.type === 'text_input' || q.type === 'kanji_draw') ? [{ id: q.options[0]?.id || Date.now(), uid: q.options[0]?.uid || generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0 }] : q.options;

        batch.set(doc(db, `question_bank/${batchId}/questions`, finalQId), {
          id: finalQId, authorId: actualTeacherId, type: q.type, subType: q.subType,
          topic: q.topic, subTopic: q.subTopic, secondAttempt: q.allowSecondAttempt,
          tags: q.tags.split(',').map(t => t.trim()).filter(t => t !== ''), difficulty: q.difficulty,
          promptText: q.prompt, mediaUrl: q.mediaUrl || null, idealTimeSeconds: Number(q.timeLimit),
          points: Number(q.points), negativePoints: Number(q.negativePoints), options: cleanOptions,
          hintText: q.hint, engine: q.engine || 'exam', officialSolution: { text: q.solutionText, videoUrl: q.solutionVideoUrl || null },
          communitySolutions: [], createdAt: q.createdAt ? new Date(q.createdAt) : new Date(), updatedAt: serverTimestamp()
        }, { merge: true });
        
        totalPointsSum += Number(q.points); lightweightIds.push(finalQId);
      });

      const exerciseRef = exerciseId ? doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId) : doc(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`));
      batch.set(exerciseRef, { title: quizTitle, description: quizDescription, type: 'quiz', isLocked, createdAt: serverTimestamp(), allowPause, passPercentage: Number(passPercentage), attemptPoints: Number(attemptPoints), totalPoints: totalPointsSum, duration: calculatedDuration, questionIds: lightweightIds, isCompleted: false }, { merge: true });
      if (!exerciseId) batch.update(doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId), { no_of_exercises: increment(1) });

      await batch.commit(); navigate(-1); 
    } catch (error) { console.error(error); alert("Failed to save."); } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className={`min-h-screen flex flex-col items-center justify-center font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0B1121] text-indigo-500' : 'bg-slate-50 text-indigo-600'}`}><Loader2 size={40} className="animate-spin mb-4" /> Pulling Records...</div>;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'} pb-32 transition-colors`}>
      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1121]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><ArrowLeft size={20} /></button>
          <div><h1 className="text-xl font-black flex items-center gap-2"><Sparkles size={18} className="text-rose-500" /> The Question Forge</h1><p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{exerciseId ? 'Editing Assessment' : 'New Assessment'}</p></div>
        </div>
        <button onClick={handleSaveQuiz} disabled={isSaving} className={`px-8 py-3.5 text-white font-black text-sm rounded-xl transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 bg-slate-700' : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 active:scale-95'}`}>
          {isSaving ? <><Loader2 size={18} className="animate-spin"/> Forging...</> : <><Save size={18} /> Forge Assessment</>}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-10 space-y-10">
        <GlobalExamSettings quizTitle={quizTitle} setQuizTitle={setQuizTitle} attemptPoints={attemptPoints} setAttemptPoints={setAttemptPoints}  quizDescription={quizDescription} setQuizDescription={setQuizDescription} passPercentage={passPercentage} setPassPercentage={setPassPercentage} allowPause={allowPause} setAllowPause={setAllowPause} isLocked={isLocked} setIsLocked={setIsLocked} isDarkMode={isDarkMode} />
        
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
        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rapidly build quizzes by uploading an Excel or CSV file.</p>
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
        <button 
          onClick={downloadCsvTemplate} 
          className={`px-4 py-2.5 text-xs font-bold border-l transition-colors flex items-center gap-2 ${isDarkMode ? 'border-slate-700 hover:bg-slate-700 text-indigo-400' : 'border-slate-200 hover:bg-slate-100 text-indigo-600'}`}
        >
          <Download size={14}/> Template
        </button>
      </div>
      
      <input type="file" accept=".csv" id="csvUpload" className="hidden" onChange={handleCsvUpload} />
      
      {/* 🚨 UPDATED LABEL FOR PERFECT ALIGNMENT */}
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