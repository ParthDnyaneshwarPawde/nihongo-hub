import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { db, auth } from '@services/firebase'; 
import { collection, serverTimestamp, doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext'; 

import GlobalExamSettings from './components/GlobalExamSettings';
import QuestionAccordion from './components/QuestionAccordion';
import ForgeActionButtons from './components/ForgeActionButtons';

export default function QuestionForge() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { batchId, modId, chapId, exerciseId } = useParams();

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [importId, setImportId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [allowPause, setAllowPause] = useState(false); 
  const [passPercentage, setPassPercentage] = useState(80); 
  const [isLocked, setIsLocked] = useState(true); 

  const [questions, setQuestions] = useState([{ 
    id: Date.now(), customId: '', isExpanded: true, type: 'single_choice',
    subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: false,
    tags: '', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1,
    options: [{ id: 1, text: '', isCorrect: true, count: 0 }, { id: 2, text: '', isCorrect: false, count: 0 }],
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
              const safeOptions = qData.options && qData.options.length > 0 ? qData.options : [{ id: Date.now(), text: qData.expectedAnswer || '', isCorrect: true, count: 0 }];

              return {
                id: qData.id, customId: extractedCustomId, isExpanded: false, 
                type: qData.type || 'single_choice', subType: qData.subType || 'reading', difficulty: qData.difficulty || 'mid',
                topic: qData.topic || '', subTopic: qData.subTopic || '', allowSecondAttempt: qData.secondAttempt || false,
                tags: qData.tags ? qData.tags.join(', ') : '', prompt: qData.promptText || '', mediaUrl: qData.mediaUrl || '',
                timeLimit: qData.idealTimeSeconds || 45, points: qData.points || 4, negativePoints: qData.negativePoints || 1,
                options: safeOptions, hint: qData.hintText || '', solutionText: qData.officialSolution?.text || '', solutionVideoUrl: qData.officialSolution?.videoUrl || '', isDeleted: false
              };
            });
            setQuestions(loadedQs);
          } else if(data.questions?.length > 0) setQuestions(data.questions); 
        }
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };
    fetchExistingQuiz();
  }, [batchId, modId, chapId, exerciseId]);

  const handleImportQuestion = async () => {
    if (!importId.trim()) return alert("Please enter a Question ID.");
    setIsImporting(true);
    try {
      const qRef = doc(db, `question_bank/${batchId}/questions`, importId.trim());
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const data = qSnap.data();
        let extractedCustomId = typeof data.id === 'string' && data.id.startsWith('q_') ? data.id.replace('q_', '').replace(/^0+/, '') || '0' : ''; 
        const safeOptions = data.options && data.options.length > 0 ? data.options : [{ id: Date.now(), text: data.expectedAnswer || '', isCorrect: true, count: 0 }];

        setQuestions([...questions, {
          id: Date.now(), customId: extractedCustomId, isExpanded: true, 
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

  const handleAddQuestion = () => setQuestions([...questions, { id: Date.now(), customId: '', isExpanded: true, type: 'single_choice', subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', allowSecondAttempt: false, tags: '', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1, options: [{ id: 1, text: '', isCorrect: true, count: 0 }, { id: 2, text: '', isCorrect: false, count: 0 }], hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false }]);
  const handleRemoveQuestion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isDeleted: true, deletedAt: Date.now() } : q));
  const toggleQuestionExpansion = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q));
  const updateQuestionField = (qId, field, value) => setQuestions(questions.map(q => { if (q.id === qId) { if (field === 'type' && (value === 'kanji_draw' || value === 'text_input')) return { ...q, [field]: value, options: [{ id: Date.now(), text: q.options[0]?.text || '', isCorrect: true, count: 0 }] }; return { ...q, [field]: value }; } return q; }));
  const handleAddOption = (qId) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...q.options, { id: Date.now(), text: '', isCorrect: false, count: 0 }] } : q));
  const handleRemoveOption = (qId, optId) => setQuestions(questions.map(q => { if (q.id === qId) { const filteredOptions = q.options.filter(o => o.id !== optId); if (!filteredOptions.some(o => o.isCorrect)) filteredOptions[0].isCorrect = true; return { ...q, options: filteredOptions }; } return q; }));
  const updateOptionText = (qId, optId, newText) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, text: newText } : o) } : q));
  const setCorrectOption = (qId, correctOptId) => setQuestions(questions.map(q => { if (q.id === qId) { if (q.type === 'single_choice') return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId })) }; return { ...q, options: q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o) }; } return q; }));

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
        let finalQId = q.customId?.toString().trim() !== '' ? `q_${String(q.customId).padStart(4, '0')}` : `q_auto_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        let cleanOptions = (q.type === 'text_input' || q.type === 'kanji_draw') ? [{ id: q.options[0]?.id || Date.now(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0 }] : q.options;

        batch.set(doc(db, `question_bank/${batchId}/questions`, finalQId), {
          id: finalQId, authorId: actualTeacherId, type: q.type, subType: q.subType,
          topic: q.topic, subTopic: q.subTopic, secondAttempt: q.allowSecondAttempt,
          tags: q.tags.split(',').map(t => t.trim()).filter(t => t !== ''), difficulty: q.difficulty,
          promptText: q.prompt, mediaUrl: q.mediaUrl || null, idealTimeSeconds: Number(q.timeLimit),
          points: Number(q.points), negativePoints: Number(q.negativePoints), options: cleanOptions,
          hintText: q.hint, officialSolution: { text: q.solutionText, videoUrl: q.solutionVideoUrl || null },
          communitySolutions: [], createdAt: q.createdAt ? new Date(q.createdAt) : new Date(), updatedAt: serverTimestamp()
        }, { merge: true });
        
        totalPointsSum += Number(q.points); lightweightIds.push(finalQId);
      });

      const exerciseRef = exerciseId ? doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId) : doc(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`));
      batch.set(exerciseRef, { title: quizTitle, description: quizDescription, type: 'quiz', isLocked, createdAt: serverTimestamp(), allowPause, passPercentage: Number(passPercentage), totalPoints: totalPointsSum, duration: calculatedDuration, questionIds: lightweightIds, isCompleted: false }, { merge: true });
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
        <GlobalExamSettings quizTitle={quizTitle} setQuizTitle={setQuizTitle} quizDescription={quizDescription} setQuizDescription={setQuizDescription} passPercentage={passPercentage} setPassPercentage={setPassPercentage} allowPause={allowPause} setAllowPause={setAllowPause} isLocked={isLocked} setIsLocked={setIsLocked} isDarkMode={isDarkMode} />
        
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
          <ForgeActionButtons handleAddQuestion={handleAddQuestion} importId={importId} setImportId={setImportId} handleImportQuestion={handleImportQuestion} isImporting={isImporting} isDarkMode={isDarkMode} />
        </section>
      </main>
    </div>
  );
}