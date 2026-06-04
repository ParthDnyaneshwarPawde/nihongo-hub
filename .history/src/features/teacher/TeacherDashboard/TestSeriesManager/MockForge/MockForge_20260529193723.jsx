import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Loader2, Sparkles, ShieldAlert, 
  Layers, Clock, FileText, Plus, Trash2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { db, auth } from '@services/firebase'; 
import { collection, serverTimestamp, doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 

import GlobalExamSettings from './components/GlobalExamSettings';
import QuestionAccordion from './components/QuestionAccordion';
import ForgeActionButtons from './components/ForgeActionButtons';

const generateUniqueId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// Helper to generate a blank question with new advanced fields
const generateBlankQuestion = () => ({ 
  id: generateUniqueId(), customId: '', isExpanded: true, type: 'single_choice',
  subType: 'reading', difficulty: 'mid', topic: '', subTopic: '', 
  allowSecondAttempt: false, gradingRubric: false, afterTimeHint: false, audioPlaybackType: 'R',
  tags: '', prompt: '', mediaUrl: '', timeLimit: 45, points: 4, negativePoints: 1,
  options: [
    { id: 1, uid: generateUniqueId(), text: '', isCorrect: true, count: 0, points: 4 }, 
    { id: 2, uid: generateUniqueId(), text: '', isCorrect: false, count: 0, points: 0 }
  ],
  hint: '', solutionText: '', solutionVideoUrl: '', isDeleted: false
});

const generateBlankSection = () => ({
  id: generateUniqueId(),
  title: 'Section 1',
  instructions: '',
  sharedPassage: '',
  passPercentage: 50,
  conditionalNavigation: false,
  isExpanded: true,
  questions: [generateBlankQuestion()]
});

const generateBlankPart = () => ({
  id: generateUniqueId(),
  title: 'Part 1: Language Knowledge',
  timeLimitMinutes: 45,
  isExpanded: true,
  sections: [generateBlankSection()]
});

export default function MockForge() {
  const navigate = useNavigate();
  const { batchId, modId, chapId, exerciseId } = useParams();
  const isDarkMode = true; // Hardcoded to your premium dark mode

  // 🚨 SECURITY STATE
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ==========================================
  // GLOBAL EXAM SETTINGS STATE
  // ==========================================
  const [examSettings, setExamSettings] = useState({
    title: '',
    description: '',
    targetLevel: 'JLPT N4',
    durationMinutes: 90,
    passPercentage: 50,
    attemptPoints: 0,
    allowPause: false,
    isLocked: true,
    proctoringMode: true
  });

  // ==========================================
  // 3-TIER ARCHITECTURE STATE: Parts > Sections > Questions
  // ==========================================
  const [parts, setParts] = useState([generateBlankPart()]);

  // Bulk Import States
  const [isImporting, setIsImporting] = useState(false); 
  const [importId, setImportId] = useState(''); 
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

  // 🚨 BULLETPROOF SECURITY & FETCH ENGINE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      try {
        if (!user || !batchId || !modId || !chapId) {
          setAccessDenied(true);
          return;
        }

        const userUid = user.uid;
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        const isBatchCollab = batchSnap.exists() && (batchSnap.data().teacherIds || []).includes(userUid);

        if (!isBatchCollab) {
          setAccessDenied(true);
          return;
        }

        setAccessDenied(false);

        // Fetch Existing Quiz Logic (Adapted for 3-Tier if it exists, otherwise falls back)
        if (exerciseId) {
          const quizRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId);
          const quizSnap = await getDoc(quizRef);

          if (quizSnap.exists()) {
            const data = quizSnap.data();
            setExamSettings({
              title: data.title || '',
              description: data.description || '',
              targetLevel: data.targetLevel || 'JLPT N4',
              durationMinutes: data.durationMinutes || 90,
              passPercentage: data.passPercentage || 50,
              attemptPoints: data.attemptPoints || 0,
              allowPause: data.allowPause || false,
              isLocked: data.isLocked !== undefined ? data.isLocked : true,
              proctoringMode: data.proctoringMode || false
            });

            // If the database has the new `parts` array, load it.
            if (data.parts && data.parts.length > 0) {
              // Note: You will need a hydrator here to fetch actual question data from IDs if you store by ID.
              // For simplicity in the forge, we assume full objects are loaded or you write a hydration loop.
              setParts(data.parts);
            }
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
  }, [batchId, modId, chapId, exerciseId]);

  // ==========================================
  // NESTED STATE MUTATION HANDLERS
  // ==========================================

  // PART Handlers
  const handleAddPart = () => setParts([...parts, generateBlankPart()]);
  const handleRemovePart = (partId) => setParts(parts.filter(p => p.id !== partId));
  const updatePartField = (partId, field, value) => {
    setParts(parts.map(p => p.id === partId ? { ...p, [field]: value } : p));
  };

  // SECTION Handlers
  const handleAddSection = (partId) => {
    setParts(parts.map(p => p.id === partId ? { ...p, sections: [...p.sections, generateBlankSection()] } : p));
  };
  const handleRemoveSection = (partId, sectionId) => {
    setParts(parts.map(p => p.id === partId ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) } : p));
  };
  const updateSectionField = (partId, sectionId, field, value) => {
    setParts(parts.map(p => {
      if (p.id !== partId) return p;
      return { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s) };
    }));
  };

  // QUESTION Handlers (Deep nested mapping)
  const handleAddQuestion = (partId, sectionId) => {
    setParts(parts.map(p => {
      if (p.id !== partId) return p;
      return {
        ...p, sections: p.sections.map(s => {
          if (s.id !== sectionId) return s;
          return { ...s, questions: [...s.questions, generateBlankQuestion()] };
        })
      };
    }));
  };

  const handleRemoveQuestion = (partId, sectionId, qId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => q.id === qId ? { ...q, isDeleted: true } : q)
      } : s)
    } : p));
  };

  const updateQuestionField = (partId, sectionId, qId, field, value) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            // Special handling for changing to text/kanji (clears options)
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

  // OPTION Handlers
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

  const updateOptionPoints = (partId, sectionId, qId, optId, newPoints) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => q.id === qId ? {
          ...q, 
          options: q.options.map(o => o.id === optId ? { ...o, points: newPoints } : o),
          points: q.gradingRubric ? Math.max(...q.options.map(o => o.id === optId ? newPoints : (o.points || 0))) : q.points
        } : q)
      } : s)
    } : p));
  };

  const setCorrectOption = (partId, sectionId, qId, correctOptId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => {
          if (q.id === qId) {
            if (q.type === 'single_choice') {
              return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId })) };
            }
            return { ...q, options: q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o) };
          }
          return q;
        })
      } : s)
    } : p));
  };

  const toggleQuestionExpansion = (partId, sectionId, qId) => {
    setParts(parts.map(p => p.id === partId ? {
      ...p, sections: p.sections.map(s => s.id === sectionId ? {
        ...s, questions: s.questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q)
      } : s)
    } : p));
  };


  // ==========================================
  // SAVE & BATCH WRITE ENGINE (Adapted for 3-Tier)
  // ==========================================
  const handleSaveQuiz = async () => {
    if (!examSettings.title.trim()) return alert("Please provide a title.");
    const actualTeacherId = auth.currentUser?.uid || "unknown_teacher";
    setIsSaving(true);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'question_bank', batchId), { batchId, batchName, updatedAt: serverTimestamp() }, { merge: true });

      let totalPointsSum = 0; 
      const structuredPartsPayload = [];

      // Loop through Parts > Sections > Questions
      parts.forEach((part, pIdx) => {
        const sectionPayloads = [];
        
        part.sections.forEach((section, sIdx) => {
          const questionIdPayloads = [];
          const activeQs = section.questions.filter(q => !q.isDeleted);
          
          activeQs.forEach((q) => {
            let finalQId = q.customId?.toString().trim() !== '' 
              ? `q_${String(q.customId).padStart(8, '0')}` 
              : `q_${Math.floor(10000000 + Math.random() * 90000000)}`;

            let cleanOptions = (q.type === 'text_input' || q.type === 'kanji_draw') 
              ? [{ id: q.options[0]?.id || Date.now(), uid: q.options[0]?.uid || generateUniqueId(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0, points: q.points }] 
              : q.options;

            batch.set(doc(db, `question_bank/${batchId}/questions`, finalQId), {
              id: finalQId, authorId: actualTeacherId, type: q.type, subType: q.subType,
              topic: q.topic, subTopic: q.subTopic, secondAttempt: q.allowSecondAttempt,
              gradingRubric: q.gradingRubric, afterTimeHint: q.afterTimeHint, audioPlaybackType: q.audioPlaybackType,
              tags: q.tags.split(',').map(t => t.trim()).filter(t => t !== ''), difficulty: q.difficulty,
              promptText: q.prompt, mediaUrl: q.mediaUrl || null, idealTimeSeconds: Number(q.timeLimit),
              points: Number(q.points), negativePoints: Number(q.negativePoints), options: cleanOptions,
              hintText: q.hint, compatibleEngines: q.compatibleEngines || ['exam'], officialSolution: { text: q.solutionText, videoUrl: q.solutionVideoUrl || null },
              communitySolutions: [], createdAt: q.createdAt ? new Date(q.createdAt) : new Date(), updatedAt: serverTimestamp()
            }, { merge: true });
            
            totalPointsSum += Number(q.points); 
            questionIdPayloads.push(finalQId);
          });

          sectionPayloads.push({
            id: section.id, title: section.title, instructions: section.instructions,
            sharedPassage: section.sharedPassage, passPercentage: Number(section.passPercentage),
            conditionalNavigation: section.conditionalNavigation,
            questionIds: questionIdPayloads
          });
        });

        structuredPartsPayload.push({
          id: part.id, title: part.title, timeLimitMinutes: Number(part.timeLimitMinutes),
          sections: sectionPayloads
        });
      });

      const exerciseRef = exerciseId ? doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId) : doc(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`));
      
      batch.set(exerciseRef, { 
        ...examSettings,
        type: 'mock_exam',
        createdAt: serverTimestamp(), 
        totalPoints: totalPointsSum, 
        parts: structuredPartsPayload, // NEW 3-Tier payload
        isCompleted: false 
      }, { merge: true });

      if (!exerciseId) batch.update(doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId), { no_of_exercises: increment(1) });

      await batch.commit(); 
      navigate(-1); 
    } catch (error) { 
      console.error(error); 
      alert("Failed to save."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  // 🚨 ACCESS DENIED SCREEN
  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0B1121] text-slate-200">
        <div className="p-5 rounded-full bg-rose-500/10 text-rose-500 mb-6 border border-rose-500/20"><ShieldAlert size={40}/></div>
        <h1 className="text-3xl font-black mb-3 tracking-tight">Access Restricted</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">You are not a collaborator or lead for this course, so you cannot edit the question forge.</p>
        <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-md">Return to Dashboard</button>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center font-black uppercase tracking-widest bg-[#0B1121] text-indigo-500"><Loader2 size={40} className="animate-spin mb-4" /> Pulling Records...</div>;

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-200 pb-32 transition-colors">
      <header className="sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl bg-[#0B1121]/80 border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-colors hover:bg-slate-800 text-slate-400"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2"><Sparkles size={18} className="text-rose-500" /> Advanced Mock Forge</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{exerciseId ? 'Editing Core Architecture' : 'New 3-Tier Assessment'}</p>
          </div>
        </div>
        <button onClick={handleSaveQuiz} disabled={isSaving} className={`px-8 py-3.5 text-white font-black text-sm rounded-[2rem] transition-all flex items-center gap-2 shadow-[0_10px_30px_rgba(244,63,94,0.2)] ${isSaving ? 'opacity-70 bg-slate-700' : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 active:scale-95'}`}>
          {isSaving ? <><Loader2 size={18} className="animate-spin"/> Compiling...</> : <><Save size={18} /> Push to Engine</>}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-10 space-y-12">
        
        {/* GLOBAL SETTINGS */}
        <GlobalExamSettings examSettings={examSettings} setExamSettings={setExamSettings} isDarkMode={true} />
        
        {/* 3-TIER ARCHITECTURE BUILDER */}
        <section className="space-y-10">
          <div className="flex items-end justify-between border-b border-slate-800 pb-4">
            <div>
               <h2 className="text-2xl font-black text-white flex items-center gap-3"><Layers className="text-indigo-500"/> Structural Hierarchy</h2>
               <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Build Time-Bound Parts, Thematic Sections, and Questions.</p>
            </div>
            <button onClick={() => setParts(parts.map(p => ({...p, isExpanded: false, sections: p.sections.map(s => ({...s, isExpanded: false, questions: s.questions.map(q => ({...q, isExpanded: false}))}))})))} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors">Collapse Architecture</button>
          </div>
          
          <AnimatePresence>
            {parts.map((part, pIdx) => (
              <motion.div key={part.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#151E2E] rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl relative">
                
                {/* PART HEADER (TIER 1) */}
                <div className="bg-slate-900/80 backdrop-blur-md p-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex-1 flex flex-col gap-4 w-full">
                     <div className="flex items-center gap-3">
                        <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">Part {pIdx + 1}</span>
                        <input type="text" value={part.title} onChange={(e) => updatePartField(part.id, 'title', e.target.value)} placeholder="e.g. Vocabulary & Grammar" className="bg-transparent border-none outline-none font-black text-2xl text-white placeholder:text-slate-600 w-full" />
                     </div>
                     <div className="flex items-center gap-3">
                        <Clock size={16} className="text-amber-500"/>
                        <input type="number" value={part.timeLimitMinutes} onChange={(e) => updatePartField(part.id, 'timeLimitMinutes', e.target.value)} className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-sm font-black text-white outline-none focus:border-amber-500"/>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Minutes (Hard Cutoff)</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                     <button onClick={() => updatePartField(part.id, 'isExpanded', !part.isExpanded)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-colors">{part.isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                     <button onClick={() => handleRemovePart(part.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-colors"><Trash2 size={20}/></button>
                  </div>
                </div>

                {/* SECTIONS LIST (TIER 2) */}
                <AnimatePresence>
                  {part.isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-8 space-y-8 bg-[#0B1121]/50 relative z-0">
                      
                      {part.sections.map((section, sIdx) => (
                        <div key={section.id} className="bg-slate-900/60 rounded-[2.5rem] border border-slate-700/50 p-6 md:p-8">
                           <div className="flex items-start justify-between gap-4 mb-6">
                              <div className="flex-1 space-y-4">
                                 <div className="flex items-center gap-3">
                                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Section {sIdx + 1}</span>
                                    <input type="text" value={section.title} onChange={(e) => updateSectionField(part.id, section.id, 'title', e.target.value)} placeholder="Section Title..." className="bg-transparent border-none outline-none font-black text-lg text-indigo-300 w-full" />
                                 </div>
                                 <input type="text" value={section.instructions} onChange={(e) => updateSectionField(part.id, section.id, 'instructions', e.target.value)} placeholder="Shared Instructions (e.g. Choose the correct kanji reading)..." className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-sm font-bold text-slate-300 outline-none focus:border-indigo-500" />
                                 <textarea rows="3" value={section.sharedPassage} onChange={(e) => updateSectionField(part.id, section.id, 'sharedPassage', e.target.value)} placeholder="Shared Reading Passage (Optional)..." className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-sm font-medium text-slate-300 outline-none focus:border-indigo-500 resize-y" />
                                 
                                 <div className="flex items-center gap-6 pt-2">
                                    <div className="flex items-center gap-3">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Section Pass %</span>
                                       <input type="number" value={section.passPercentage} onChange={(e) => updateSectionField(part.id, section.id, 'passPercentage', e.target.value)} className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-xs font-black text-emerald-400 outline-none focus:border-emerald-500"/>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                       <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${section.conditionalNavigation ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                          <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform ${section.conditionalNavigation ? 'translate-x-5' : 'left-[2px]'}`}></div>
                                       </div>
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Branching Logic</span>
                                    </label>
                                 </div>
                              </div>
                              <button onClick={() => handleRemoveSection(part.id, section.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                           </div>

                           {/* QUESTIONS LIST (TIER 3) */}
                           <div className="space-y-4 pl-4 border-l border-slate-800/80">
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
                              
                              {/* Tier 3 Add Button */}
                              <button onClick={() => handleAddQuestion(part.id, section.id)} className="w-full py-4 mt-4 rounded-2xl border-2 border-dashed border-slate-700/50 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
                                 <Plus size={16} /> Add Question to Section {sIdx + 1}
                              </button>
                           </div>
                        </div>
                      ))}

                      {/* Tier 2 Add Button */}
                      <button onClick={() => handleAddSection(part.id)} className="w-full py-6 rounded-[2.5rem] border-2 border-dashed border-slate-700 text-slate-400 hover:border-amber-500 hover:text-amber-400 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em]">
                         <Layers size={18} /> Add New Thematic Section to Part {pIdx + 1}
                      </button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Tier 1 Add Button (Global) */}
          <button onClick={handleAddPart} className="w-full py-8 mt-12 rounded-[3rem] bg-indigo-600/10 border-2 border-dashed border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex flex-col items-center justify-center gap-3 group">
             <div className="p-4 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"><Plus size={24}/></div>
             <span className="font-black text-sm uppercase tracking-[0.3em]">Add New Time-Bound Part</span>
          </button>
        </section>

      </main>
    </div>
  );
}