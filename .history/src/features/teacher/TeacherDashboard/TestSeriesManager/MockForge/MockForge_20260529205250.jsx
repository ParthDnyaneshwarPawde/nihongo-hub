import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Loader2, Sparkles, ShieldAlert, 
  Layers, Clock, Coffee, Plus, Trash2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { db, auth } from '@services/firebase'; 
import { collection, serverTimestamp, doc, writeBatch, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 

import GlobalExamSettings from './components/GlobalExamSettings';
import QuestionAccordion from './components/QuestionAccordion';

const generateUniqueId = () => Date.now() + Math.random().toString(36).substr(2, 9);

const generateBlankQuestion = () => ({ 
  id: generateUniqueId(), customId: '', isExpanded: true, type: 'single_choice',
  subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', 
  gradingRubric: false, afterTimeHint: false, timeWarningMessage: '', audioPlaybackType: 'R',
  tags: '', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1,
  options: [
    { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0, points: 4 }, 
    { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0, points: 0 }
  ],
  solutionText: '', solutionVideoUrl: '', isDeleted: false
});

const generateBlankSection = () => ({
  id: generateUniqueId(),
  title: 'Section 1',
  instructions: '',
  sharedPassage: '',
  passPercentage: 50,
  conditionalNavigation: false,
  branchTargetId: '', 
  isExpanded: true,
  questions: [generateBlankQuestion()]
});

const generateBlankPart = () => ({
  id: generateUniqueId(),
  title: 'Part 1: Language Knowledge',
  timeLimitMinutes: 45,
  breakAfterMinutes: 0, 
  isExpanded: true,
  sections: [generateBlankSection()]
});

export default function MockForge() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const isDarkMode = true; 

  const [accessDenied, setAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [examSettings, setExamSettings] = useState({
    title: '',
    description: '',
    targetLevel: 'JLPT N4',
    durationMinutes: 90,
    passPercentage: 50,
    isLocked: true,
    proctoringMode: true
  });

  const [parts, setParts] = useState([generateBlankPart()]);

// 🚨 BULLETPROOF SECURITY & FETCH ENGINE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      try {
        if (!user) return setAccessDenied(true);
        const userUid = user.uid;

        if (exerciseId) {
          const examRef = doc(db, 'mock_tests', exerciseId);
          const examSnap = await getDoc(examRef);
          
          if (examSnap.exists()) {
            const data = examSnap.data();
            const isCollab = data.authorId === userUid || (data.collaborators || []).includes(userUid);
            
            if (!isCollab) {
              setAccessDenied(true);
              setIsLoading(false);
              return;
            }
            
            setAccessDenied(false);
            setExamSettings({
              title: data.title || '',
              description: data.description || '',
              targetLevel: data.targetLevel || 'JLPT N4',
              durationMinutes: data.durationMinutes || 90,
              passPercentage: data.passPercentage || 50,
              isLocked: data.isLocked !== undefined ? data.isLocked : true,
              proctoringMode: data.proctoringMode || false
            });

            // 🚨 HYDRATION ENGINE: Fetch questions using the saved IDs
            if (data.parts && data.parts.length > 0) {
              const hydratedParts = await Promise.all(data.parts.map(async (part) => {
                const hydratedSections = await Promise.all((part.sections || []).map(async (section) => {
                  const qIds = section.questionIds || [];
                  
                  // Fetch all questions for this section from the global bank
                  const fetchedQuestions = await Promise.all(qIds.map(async (qId) => {
                    const qSnap = await getDoc(doc(db, 'question_bank/global_mocks/questions', qId));
                    if (qSnap.exists()) {
                      const qData = qSnap.data();
                      return {
                        id: qData.id,
                        customId: qData.id.replace('q_', '').replace(/^0+/, ''),
                        isExpanded: false,
                        type: qData.type || 'single_choice',
                        subType: qData.subType || 'reading',
                        difficulty: qData.difficulty || 'mid',
                        topic: qData.topic || '',
                        subTopic: qData.subTopic || '',
                        gradingRubric: qData.gradingRubric || false,
                        afterTimeHint: qData.afterTimeHint || false,
                        timeWarningMessage: qData.timeWarningMessage || '',
                        audioPlaybackType: qData.audioPlaybackType || 'R',
                        tags: Array.isArray(qData.tags) ? qData.tags.join(', ') : '',
                        prompt: qData.promptText || '',
                        mediaUrl: qData.mediaUrl || '',
                        timeLimit: qData.idealTimeSeconds || 45,
                        points: qData.points || 4,
                        negativePoints: qData.negativePoints || 1,
                        options: qData.options && qData.options.length > 0 ? qData.options : [
                          { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0, points: 4 }, 
                          { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0, points: 0 }
                        ],
                        solutionText: qData.officialSolution?.text || '',
                        solutionVideoUrl: qData.officialSolution?.videoUrl || '',
                        isDeleted: false
                      };
                    }
                    return null;
                  }));

                  // Filter out any broken references and attach to section
                  const validQuestions = fetchedQuestions.filter(q => q !== null);
                  return {
                    ...section,
                    isExpanded: false,
                    questions: validQuestions.length > 0 ? validQuestions : [generateBlankQuestion()]
                  };
                }));

                return {
                  ...part,
                  isExpanded: false,
                  sections: hydratedSections
                };
              }));

              setParts(hydratedParts);
            }
          } else {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(false);
        }
      } catch (error) { 
        console.error("Hydration Error:", error); 
        setAccessDenied(true); 
      } finally { 
        setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [exerciseId]);

  const handleAddPart = () => setParts([...parts, generateBlankPart()]);
  const handleRemovePart = (partId) => setParts(parts.filter(p => p.id !== partId));
  const updatePartField = (partId, field, value) => setParts(parts.map(p => p.id === partId ? { ...p, [field]: value } : p));
  const handleAddSection = (partId) => setParts(parts.map(p => p.id === partId ? { ...p, sections: [...p.sections, generateBlankSection()] } : p));
  const handleRemoveSection = (partId, sectionId) => setParts(parts.map(p => p.id === partId ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) } : p));
  const updateSectionField = (partId, sectionId, field, value) => setParts(parts.map(p => p.id !== partId ? p : { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s) }));
  const handleAddQuestion = (partId, sectionId) => setParts(parts.map(p => p.id !== partId ? p : { ...p, sections: p.sections.map(s => s.id !== sectionId ? s : { ...s, questions: [...s.questions, generateBlankQuestion()] }) }));
  const handleRemoveQuestion = (partId, sectionId, qId) => setParts(parts.map(p => p.id === partId ? { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === qId ? { ...q, isDeleted: true } : q) } : s) } : p));
  
  const updateQuestionField = (partId, sectionId, qId, field, value) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            if (field === 'type' && (value === 'kanji_draw' || value === 'text_input')) {
              return { ...q, [field]: value, options: [{ id: 1, uid: generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: 0, points: 4 }] };
            }
            return { ...q, [field]: value };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const handleAddOption = (partId, sectionId, qId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            const nextId = q.options.length > 0 ? Math.max(...q.options.map(o => Number(o.id) || 0)) + 1 : 1;
            return { ...q, options: [...q.options, { id: nextId, uid: generateUniqueId(), text: '', isCorrect: false, count: 0, points: 0 }] };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const handleRemoveOption = (partId, sectionId, qId, optId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            const filteredOptions = q.options.filter(o => o.id !== optId);
            if (filteredOptions.length > 0 && !filteredOptions.some(o => o.isCorrect)) filteredOptions[0].isCorrect = true;
            return { ...q, options: filteredOptions };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const updateOptionText = (partId, sectionId, qId, optId, newText) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => q.id === qId ? {
          ...q, options: q.options.map(o => o.id === optId ? { ...o, text: newText } : o)
        } : q)
      } : s)
    } : p));
  };

  const calculateRubricPoints = (type, options) => {
     if (type === 'single_choice') return Math.max(0, ...options.map(o => Number(o.points) || 0));
     return options.filter(o => o.isCorrect).reduce((sum, o) => sum + (Number(o.points) || 0), 0);
  };

  const updateOptionPoints = (partId, sectionId, qId, optId, newPoints) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
             const updatedOptions = q.options.map(o => o.id === optId ? { ...o, points: newPoints } : o);
             return { ...q, options: updatedOptions, points: q.gradingRubric ? calculateRubricPoints(q.type, updatedOptions) : q.points };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const setCorrectOption = (partId, sectionId, qId, correctOptId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            const updatedOptions = q.type === 'single_choice' 
               ? q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId }))
               : q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o);
            return { ...q, options: updatedOptions, points: q.gradingRubric ? calculateRubricPoints(q.type, updatedOptions) : q.points };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const toggleQuestionExpansion = (partId, sectionId, qId) => setParts(parts.map(p => p.id === partId ? { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, questions: s.questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q) } : s) } : p));

  const handleSaveQuiz = async () => {
    if (!examSettings.title.trim()) return alert("Please provide a title.");
    
    const sumOfParts = parts.reduce((acc, part) => acc + Number(part.timeLimitMinutes || 0), 0);
    const sumOfBreaks = parts.reduce((acc, part) => acc + Number(part.breakAfterMinutes || 0), 0);
    
    if (sumOfParts !== Number(examSettings.durationMinutes)) {
      alert(`⚠️ Working Duration Mismatch!\n\nYour Global Exam Duration is set to ${examSettings.durationMinutes} mins.\nHowever, your Individual Parts add up to ${sumOfParts} mins.\n\n(Note: Your ${sumOfBreaks} minutes of break time are tracked separately by the engine and should NOT be included in the global working duration.)\n\nPlease adjust your working minutes to match before saving.`);
      return;
    }

    const actualTeacherId = auth.currentUser?.uid || "unknown_teacher";
    setIsSaving(true);

    try {
      const batch = writeBatch(db);
      let totalPointsSum = 0; 
      const structuredPartsPayload = [];

      parts.forEach((part) => {
        const sectionPayloads = [];
        part.sections.forEach((section) => {
          const questionIdPayloads = [];
          const activeQs = section.questions.filter(q => !q.isDeleted);
          
          activeQs.forEach((q) => {
            let finalQId = q.customId?.toString().trim() !== '' 
              ? `mq_${String(q.customId).padStart(8, '0')}` 
              : `mq_${Math.floor(10000000 + Math.random() * 90000000)}`;

            let cleanOptions = (q.type === 'text_input' || q.type === 'kanji_draw') 
              ? [{ id: q.options[0]?.id || Date.now(), uid: q.options[0]?.uid || generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0, points: q.points }] 
              : q.options;

            batch.set(doc(db, `question_bank/global_mocks/questions`, finalQId), {
              id: finalQId, authorId: actualTeacherId, type: q.type, subType: q.subType,
              topic: q.topic || '', subTopic: q.subTopic || '', gradingRubric: q.gradingRubric || false, 
              afterTimeHint: q.afterTimeHint || false, timeWarningMessage: q.timeWarningMessage || '', audioPlaybackType: q.audioPlaybackType || 'R',
              tags: (q.tags || '').split(',').map(t => t.trim()).filter(t => t !== ''), difficulty: q.difficulty || 'mid',
              promptText: q.prompt || '', mediaUrl: q.mediaUrl || null, idealTimeSeconds: Number(q.timeLimit || 0),
              points: Number(q.points || 0), negativePoints: Number(q.negativePoints || 0), options: cleanOptions,
              compatibleEngines: q.compatibleEngines || ['exam'], officialSolution: { text: q.solutionText || '', videoUrl: q.solutionVideoUrl || null },
              communitySolutions: [], createdAt: q.createdAt ? new Date(q.createdAt) : new Date(), updatedAt: serverTimestamp()
            }, { merge: true });
            
            totalPointsSum += Number(q.points || 0); 
            questionIdPayloads.push(finalQId);
          });

          sectionPayloads.push({
            id: section.id, 
            title: section.title || '', 
            instructions: section.instructions || '',
            sharedPassage: section.sharedPassage || '', 
            passPercentage: Number(section.passPercentage || 50),
            conditionalNavigation: section.conditionalNavigation || false, 
            branchTargetId: section.branchTargetId || '',
            questionIds: questionIdPayloads
          });
        });

        structuredPartsPayload.push({
          id: part.id, 
          title: part.title || '', 
          timeLimitMinutes: Number(part.timeLimitMinutes || 0), 
          breakAfterMinutes: Number(part.breakAfterMinutes || 0), 
          sections: sectionPayloads
        });
      });

      const examRef = exerciseId ? doc(db, 'mock_tests', exerciseId) : doc(collection(db, 'mock_tests'));
      
      // 🚨 FIX FOR FIREBASE UNDEFINED ERROR
      const examPayload = { 
        ...examSettings, 
        id: examRef.id, 
        type: 'blueprint', 
        authorId: actualTeacherId,
        createdAt: serverTimestamp(), 
        totalPoints: totalPointsSum, 
        totalBreakMinutes: sumOfBreaks,
        parts: structuredPartsPayload, 
        isCompleted: false 
      };

      // Only add collaborators array if it's a brand new exam
      if (!exerciseId) {
        examPayload.collaborators = [actualTeacherId];
      }

      batch.set(examRef, examPayload, { merge: true });

      await batch.commit(); 
      navigate(-1); 
    } catch (error) { 
      console.error(error); 
      alert("Failed to save architecture. Check console."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0B1121] text-slate-200">
        <div className="p-6 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)]"><ShieldAlert size={48} strokeWidth={1.5}/></div>
        <h1 className="text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">You are not a registered collaborator for this Blueprint.</p>
        <button onClick={() => navigate(-1)} className="mt-10 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-500 active:scale-95 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)]">Return to Dashboard</button>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center font-black uppercase tracking-widest bg-[#0B1121] text-indigo-500"><Loader2 size={40} className="animate-spin mb-4" /> Initializing...</div>;

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-200 pb-32 transition-colors selection:bg-indigo-500/30">
      <header className="sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-2xl bg-[#0B1121]/80 border-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl transition-all hover:bg-slate-800 text-slate-400 active:scale-95"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2 tracking-tight"><Sparkles size={18} className="text-rose-500" /> Advanced Blueprint Forge</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-0.5">{exerciseId ? 'Editing Global Architecture' : 'New 3-Tier Assessment'}</p>
          </div>
        </div>
        <button onClick={handleSaveQuiz} disabled={isSaving} className={`px-8 py-3.5 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 shadow-[0_10px_30px_rgba(244,63,94,0.2)] ${isSaving ? 'opacity-70 bg-slate-700 shadow-none' : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 active:scale-95'}`}>
          {isSaving ? <><Loader2 size={16} className="animate-spin"/> Compiling</> : <><Save size={16} /> Push to Engine</>}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-12 space-y-12">
        <GlobalExamSettings examSettings={examSettings} setExamSettings={setExamSettings} isDarkMode={true} />
        
        <section className="space-y-10">
          <div className="flex items-end justify-between border-b border-slate-800 pb-4">
            <div>
               <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><Layers className="text-indigo-500"/> Structural Hierarchy</h2>
               <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-[0.1em]">Build Time-Bound Parts, Thematic Sections, and Questions.</p>
            </div>
            <button onClick={() => setParts(parts.map(p => ({...p, isExpanded: false, sections: p.sections.map(s => ({...s, isExpanded: false, questions: s.questions.map(q => ({...q, isExpanded: false}))}))})))} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-400 transition-colors hidden sm:block">Collapse Architecture</button>
          </div>
          
          <AnimatePresence>
            {parts.map((part, pIdx) => (
              <motion.div key={part.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#151E2E] rounded-[2rem] md:rounded-[3rem] border border-slate-800/80 overflow-hidden shadow-2xl relative">
                
                <div className="bg-slate-900/90 backdrop-blur-md p-6 md:p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex-1 flex flex-col gap-5 w-full">
                     <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-inner w-fit">Part {pIdx + 1}</span>
                        {/* 🚨 FIX FOR CONTROLLED INPUT: value={part.title || ''} */}
                        <input type="text" value={part.title || ''} onChange={(e) => updatePartField(part.id, 'title', e.target.value)} placeholder="e.g. Vocabulary & Grammar" className="bg-transparent border-none outline-none font-black text-xl md:text-2xl text-white placeholder:text-slate-600 w-full" />
                     </div>
                     <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 bg-[#0B1121] w-fit p-1.5 pr-4 rounded-xl border border-slate-800">
                           <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Clock size={16}/></div>
                           {/* 🚨 FIX FOR CONTROLLED INPUT */}
                           <input type="number" value={part.timeLimitMinutes || ''} onChange={(e) => updatePartField(part.id, 'timeLimitMinutes', e.target.value)} className="w-14 bg-transparent text-center text-sm font-black text-amber-400 outline-none"/>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Working Mins</span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#0B1121] w-fit p-1.5 pr-4 rounded-xl border border-slate-800">
                           <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Coffee size={16}/></div>
                           {/* 🚨 FIX FOR CONTROLLED INPUT */}
                           <input type="number" value={part.breakAfterMinutes || ''} onChange={(e) => updatePartField(part.id, 'breakAfterMinutes', e.target.value)} className="w-14 bg-transparent text-center text-sm font-black text-emerald-400 outline-none"/>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Min Break After</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                     <button onClick={() => updatePartField(part.id, 'isExpanded', !part.isExpanded)} className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all active:scale-95">{part.isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                     <button onClick={() => handleRemovePart(part.id)} className="p-3 bg-rose-500/5 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"><Trash2 size={20}/></button>
                  </div>
                </div>

                <AnimatePresence>
                  {part.isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4 md:p-8 space-y-8 bg-[#0B1121]/30 relative z-0">
                      
                      {part.sections.map((section, sIdx) => (
                        <div key={section.id} className="bg-slate-900/60 rounded-[2rem] border border-slate-700/50 p-5 md:p-8 shadow-inner">
                           <div className="flex items-start justify-between gap-4 mb-8">
                              <div className="flex-1 space-y-5">
                                 <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Section {sIdx + 1}</span>
                                    {/* 🚨 FIX FOR CONTROLLED INPUT */}
                                    <input type="text" value={section.title || ''} onChange={(e) => updateSectionField(part.id, section.id, 'title', e.target.value)} placeholder="Section Title..." className="bg-transparent border-none outline-none font-black text-lg text-indigo-300 w-full" />
                                 </div>
                                 {/* 🚨 FIX FOR CONTROLLED INPUT */}
                                 <input type="text" value={section.instructions || ''} onChange={(e) => updateSectionField(part.id, section.id, 'instructions', e.target.value)} placeholder="Shared Instructions (e.g. Choose the correct kanji reading)..." className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-sm font-bold text-slate-300 outline-none focus:border-indigo-500 transition-colors" />
                                 {/* 🚨 FIX FOR CONTROLLED INPUT */}
                                 <textarea rows="3" value={section.sharedPassage || ''} onChange={(e) => updateSectionField(part.id, section.id, 'sharedPassage', e.target.value)} placeholder="Shared Reading Passage (Optional)..." className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-2xl text-sm font-medium text-slate-300 outline-none focus:border-indigo-500 transition-colors resize-y" />
                                 
                                 <div className="flex flex-col md:flex-row md:items-center gap-6 pt-2">
                                    <div className="flex items-center gap-3 bg-emerald-500/5 p-2 pr-4 rounded-xl border border-emerald-500/10 w-fit">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 px-2">Section Pass %</span>
                                       {/* 🚨 FIX FOR CONTROLLED INPUT */}
                                       <input type="number" value={section.passPercentage || ''} onChange={(e) => updateSectionField(part.id, section.id, 'passPercentage', e.target.value)} className="w-12 bg-transparent text-center text-xs font-black text-emerald-400 outline-none"/>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                       <label className="flex items-center gap-3 cursor-pointer group">
                                          <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${section.conditionalNavigation ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                             <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform ${section.conditionalNavigation ? 'translate-x-5' : 'left-[2px]'}`}></div>
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-300 transition-colors">Branching Logic</span>
                                       </label>
                                       {section.conditionalNavigation && (
                                          <div className="flex items-center gap-3 bg-amber-500/5 p-2 rounded-xl border border-amber-500/20 w-fit animate-in fade-in">
                                             <span className="text-[9px] font-black uppercase tracking-[0.1em] text-amber-500 px-2">If Fail, Skip To:</span>
                                             {/* 🚨 FIX FOR CONTROLLED INPUT */}
                                             <select value={section.branchTargetId || ''} onChange={(e) => updateSectionField(part.id, section.id, 'branchTargetId', e.target.value)} className="bg-transparent text-xs font-black text-amber-400 outline-none cursor-pointer pr-2">
                                                <option value="">End Exam</option>
                                                {parts.map((p, i) => <option key={p.id} value={p.id}>Part {i+1}: {p.title || `Untitled Part`}</option>)}
                                             </select>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <button onClick={() => handleRemoveSection(part.id, section.id)} className="p-2.5 bg-slate-800/50 rounded-xl text-slate-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95"><Trash2 size={16}/></button>
                           </div>

                           <div className="space-y-4 pl-2 md:pl-4 border-l-2 border-slate-800/80">
                              {section.questions.filter(q => !q.isDeleted).map((q, qIndex) => (
                                 <QuestionAccordion 
                                    key={q.id} q={q} qIndex={qIndex} 
                                    toggleQuestionExpansion={() => toggleQuestionExpansion(part.id, section.id, q.id)} 
                                    handleRemoveQuestion={() => handleRemoveQuestion(part.id, section.id, q.id)} 
                                    updateQuestionField={(qId, field, val) => updateQuestionField(part.id, section.id, qId, field, val)} 
                                    handleAddOption={() => handleAddOption(part.id, section.id, q.id)} 
                                    handleRemoveOption={(qId, optId) => handleRemoveOption(part.id, section.id, qId, optId)} 
                                    updateOptionText={(qId, optId, val) => updateOptionText(part.id, section.id, qId, optId, val)} 
                                    setCorrectOption={(qId, optId) => setCorrectOption(part.id, section.id, qId, optId)} 
                                    updateOptionPoints={(qId, optId, val) => updateOptionPoints(part.id, section.id, qId, optId, val)}
                                    isDarkMode={true} 
                                 />
                              ))}
                              
                              <button onClick={() => handleAddQuestion(part.id, section.id)} className="w-full py-4 mt-6 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] active:scale-[0.98]">
                                 <Plus size={16} /> Add Question to Section {sIdx + 1}
                              </button>
                           </div>
                        </div>
                      ))}

                      <button onClick={() => handleAddSection(part.id)} className="w-full py-6 rounded-[2rem] border-2 border-dashed border-slate-700 text-slate-400 hover:border-amber-500 hover:text-amber-400 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-3 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] active:scale-[0.99]">
                         <Layers size={18} /> Add New Thematic Section to Part {pIdx + 1}
                      </button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          <button onClick={handleAddPart} className="w-full py-10 mt-12 rounded-[3rem] bg-indigo-600/5 border-2 border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex flex-col items-center justify-center gap-4 group active:scale-[0.99]">
             <div className="p-4 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors shadow-lg"><Plus size={28}/></div>
             <span className="font-black text-xs md:text-sm uppercase tracking-[0.3em]">Add New Time-Bound Part</span>
          </button>
        </section>

      </main>
    </div>
  );
}