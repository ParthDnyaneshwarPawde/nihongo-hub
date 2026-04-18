import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Plus, Trash2, CheckCircle2, Circle, 
  AlignLeft, Type, Loader2, Sparkles, Clock, Award, ShieldAlert, Percent,
  TrendingDown, Headphones, Tag, Lightbulb, Video, BarChart, Layers, X, PenTool, Mic,
  ChevronDown, ChevronUp, Download, Hash, Eye, EyeOff
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// 🚨 FIREBASE IMPORTS
import { db } from '@services/firebase'; 
import { collection, serverTimestamp, doc, increment, writeBatch, getDoc } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext'; 

export default function QuestionForge() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { batchId, modId, chapId, exerciseId } = useParams();

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [importId, setImportId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  
  // -- Global Quiz Meta State --
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [allowPause, setAllowPause] = useState(false); 
  const [passPercentage, setPassPercentage] = useState(80); 
  const [isLocked, setIsLocked] = useState(true); // Default to locked/hidden

  // -- ULTIMATE QUESTION SCHEMA STATE --
  const [questions, setQuestions] = useState([
    { 
      id: Date.now(), 
      customId: '', 
      isExpanded: true, 
      type: 'single_choice',
      subType: 'reading', 
      difficulty: 'mid', 
      tags: '', 
      prompt: '', 
      mediaUrl: '',
      timeLimit: 45, 
      points: 4,     
      negativePoints: 1,
      options: [
        { id: 1, text: '', isCorrect: true, count: 0 }, 
        { id: 2, text: '', isCorrect: false, count: 0 }
      ],
      solutionText: '',
      solutionVideoUrl: '',
      isDeleted: false
    }
  ]);

  const [batchName, setBatchName] = useState("");

  // Fetch the name when the Forge opens
  useEffect(() => {
    const fetchBatchName = async () => {
      if (!batchId) return;
      try {
        const batchSnap = await getDoc(doc(db, 'batches', batchId));
        if (batchSnap.exists()) {
          setBatchName(batchSnap.data().title || batchSnap.data().name); 
        }
      } catch (error) {
        console.error("Error fetching batch name:", error);
      }
    };
    fetchBatchName();
  }, [batchId]);

  // ----------------------------------------------------
  // 📥 FETCH EXISTING QUIZ & BRIDGE TO QUESTION BANK
  // ----------------------------------------------------
  useEffect(() => {
    const fetchExistingQuiz = async () => {
      if (!exerciseId) return; 
      setIsLoading(true);

      try {
        const quizRef = doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId);
        const quizSnap = await getDoc(quizRef);

        if (quizSnap.exists()) {
          const data = quizSnap.data();
          
          setQuizTitle(data.title || '');
          setQuizDescription(data.description || '');
          setAllowPause(data.allowPause || false);
          setPassPercentage(data.passPercentage || 80);
          setIsLocked(data.isLocked !== undefined ? data.isLocked : true);

          // 🚨 FETCH FROM THE BANK USING THE LIGHTWEIGHT IDs
          const qIds = data.questionIds || [];
          
          if (qIds.length > 0) {
            const questionPromises = qIds.map(id => getDoc(doc(db, `question_bank/${batchId}/questions`, id)));
            const questionSnaps = await Promise.all(questionPromises);

            const loadedQuestions = questionSnaps
              .filter(snap => snap.exists())
              .map(snap => {
                const qData = snap.data();
                
                let extractedCustomId = '';
                if (typeof qData.id === 'string' && qData.id.startsWith('q_')) {
                  extractedCustomId = qData.id.replace('q_', '').replace(/^0+/, '') || '0'; 
                }

                // Make sure we always have at least one option for text/kanji
                const safeOptions = qData.options && qData.options.length > 0 
                  ? qData.options 
                  : [{ id: Date.now(), text: qData.expectedAnswer || '', isCorrect: true, count: 0 }];

                return {
                  id: qData.id,
                  customId: extractedCustomId, 
                  isExpanded: false, 
                  type: qData.type || 'single_choice',
                  subType: qData.subType || 'reading',
                  difficulty: qData.difficulty || 'mid',
                  tags: qData.tags ? qData.tags.join(', ') : '',
                  prompt: qData.promptText || '',
                  mediaUrl: qData.mediaUrl || '',
                  timeLimit: qData.idealTimeSeconds || 45,
                  points: qData.points || 4,
                  negativePoints: qData.negativePoints || 1,
                  options: safeOptions,
                  solutionText: qData.officialSolution?.text || '',
                  solutionVideoUrl: qData.officialSolution?.videoUrl || '',
                  isDeleted: false
                };
              });
            
            setQuestions(loadedQuestions);
          } else {
             // Fallback for older versions of your database before the migration
             if(data.questions && data.questions.length > 0) {
                setQuestions(data.questions); 
             }
          }
        }
      } catch (error) {
        console.error("Failed to load existing quiz:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingQuiz();
  }, [batchId, modId, chapId, exerciseId]);

  // ----------------------------------------------------
  // 📥 IMPORT FROM QUESTION BANK
  // ----------------------------------------------------
  const handleImportQuestion = async () => {
    if (!importId.trim()) return alert("Please enter a Question ID.");
    setIsImporting(true);

    try {
      const qRef = doc(db, `question_bank/${batchId}/questions`, importId.trim());
      const qSnap = await getDoc(qRef);

      if (qSnap.exists()) {
        const data = qSnap.data();
        
        let extractedCustomId = '';
        if (typeof data.id === 'string' && data.id.startsWith('q_')) {
          extractedCustomId = data.id.replace('q_', '').replace(/^0+/, '') || '0'; 
        }

        const safeOptions = data.options && data.options.length > 0 
          ? data.options 
          : [{ id: Date.now(), text: data.expectedAnswer || '', isCorrect: true, count: 0 }];

        setQuestions([
          ...questions,
          {
            id: Date.now(), // Generate new UI ID so it renders safely
            customId: extractedCustomId,
            isExpanded: true,
            type: data.type || 'single_choice',
            subType: data.subType || 'reading',
            difficulty: data.difficulty || 'mid',
            tags: data.tags ? data.tags.join(', ') : '',
            prompt: data.promptText || '',
            mediaUrl: data.mediaUrl || '',
            timeLimit: data.idealTimeSeconds || 45,
            points: data.points || 4,
            negativePoints: data.negativePoints || 1,
            options: safeOptions,
            solutionText: data.officialSolution?.text || '',
            solutionVideoUrl: data.officialSolution?.videoUrl || '',
            isDeleted: false
          }
        ]);
        
        setImportId(''); 
      } else {
        alert("Question not found in the bank. Check the ID.");
      }
    } catch (error) {
      console.error("Import Error:", error);
      alert("Failed to import question.");
    } finally {
      setIsImporting(false);
    }
  };

  // ----------------------------------------------------
  // LOGIC: QUESTION MANAGEMENT
  // ----------------------------------------------------
  const handleAddQuestion = () => {
    setQuestions([
      ...questions, 
      { 
        id: Date.now(), 
        customId: '', 
        isExpanded: true,
        type: 'single_choice',
        subType: 'reading',
        difficulty: 'mid',
        tags: '',
        prompt: '', 
        mediaUrl: '',
        timeLimit: 45, 
        points: 4,
        negativePoints: 1,
        options: [{ id: 1, text: '', isCorrect: true, count: 0 }, { id: 2, text: '', isCorrect: false, count: 0 }],
        solutionText: '',
        solutionVideoUrl: '',
        isDeleted: false
      }
    ]);
  };

  const handleRemoveQuestion = (qId) => {
    const activeQuestions = questions.filter(q => !q.isDeleted);
    if (activeQuestions.length === 1) return alert("An assessment must have at least one active question.");
    setQuestions(questions.map(q => q.id === qId ? { ...q, isDeleted: true, deletedAt: Date.now() } : q));
  };

  const toggleQuestionExpansion = (qId) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, isExpanded: !q.isExpanded } : q));
  };

  const updateQuestionField = (qId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        // 🚨 Safety Check: If switching to Kanji/Text, reset options to just 1 correct answer
        if (field === 'type' && (value === 'kanji_draw' || value === 'text_input')) {
          return { 
            ...q, 
            [field]: value, 
            options: [{ id: Date.now(), text: q.options[0]?.text || '', isCorrect: true, count: 0 }] 
          };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleAddOption = (qId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) return { ...q, options: [...q.options, { id: Date.now(), text: '', isCorrect: false, count: 0 }] };
      return q;
    }));
  };

  const handleRemoveOption = (qId, optId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        if (q.options.length <= 1 && q.type === 'text_input') {
          alert("You must have at least one accepted answer.");
          return q;
        }
        if (q.options.length <= 2 && (q.type === 'single_choice' || q.type === 'multiple_choice')) {
          alert("A choice question must have at least 2 options.");
          return q;
        }
        const filteredOptions = q.options.filter(o => o.id !== optId);
        if (!filteredOptions.some(o => o.isCorrect)) filteredOptions[0].isCorrect = true;
        return { ...q, options: filteredOptions };
      }
      return q;
    }));
  };

  const updateOptionText = (qId, optId, newText) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) return { ...q, options: q.options.map(o => o.id === optId ? { ...o, text: newText } : o) };
      return q;
    }));
  };

  const setCorrectOption = (qId, correctOptId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        if (q.type === 'single_choice') {
          return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === correctOptId })) };
        } else {
          return { ...q, options: q.options.map(o => o.id === correctOptId ? { ...o, isCorrect: !o.isCorrect } : o) };
        }
      }
      return q;
    }));
  };

  // ----------------------------------------------------
  // 🚨 LOGIC: FIREBASE SAVE (Immutable Question Bank)
  // ----------------------------------------------------
  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) return alert("Please provide a title for this assessment.");
    
    const activeQs = questions.filter(q => !q.isDeleted);
    
    const hasEmptyPrompts = activeQs.some(q => !q.prompt.trim());
    if (hasEmptyPrompts) return alert("Please fill out all question prompts before saving.");

    setIsSaving(true);

    try {
      const batch = writeBatch(db);

      const qBankBatchRef = doc(db, 'question_bank', batchId);
      batch.set(qBankBatchRef, {
        batchId: batchId,
        batchName: batchName,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const totalSeconds = activeQs.reduce((acc, curr) => acc + Number(curr.timeLimit), 0);
      const calculatedDuration = totalSeconds === 0 ? "Untimed" : `${Math.ceil(totalSeconds / 60)} mins`;
      const timestampNow = new Date();
      
      const lightweightQuestionIds = [];
      let totalPointsSum = 0;

      activeQs.forEach((q) => {
        let finalQId = q.id;

        if (q.customId && q.customId.toString().trim() !== '') {
           finalQId = `q_${String(q.customId).padStart(4, '0')}`;
        } else if (typeof q.id === 'number') {
           finalQId = `q_auto_${Date.now()}`;
        }

        const qRef = doc(db, `question_bank/${batchId}/questions`, finalQId);
        
        let cleanOptions = q.options;
        if (q.type === 'text_input') cleanOptions = q.options.map(o => ({ ...o, isCorrect: true, count: o.count || 0 }));
        else if (q.type === 'kanji_draw' || q.type === 'pronunciation') {
            cleanOptions = [{ id: q.options[0]?.id || Date.now(), text: q.options[0]?.text || '', isCorrect: true, count: q.options[0]?.count || 0 }];
        } 

        const qData = {
          id: finalQId,
          authorId: "teacher_current", 
          type: q.type,
          subType: q.subType,
          tags: q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
          difficulty: q.difficulty,
          promptText: q.prompt,
          mediaUrl: q.mediaUrl || null,
          idealTimeSeconds: Number(q.timeLimit),
          points: Number(q.points),
          negativePoints: Number(q.negativePoints),
          options: cleanOptions,
          officialSolution: {
            text: q.solutionText,
            videoUrl: q.solutionVideoUrl || null
          },
          communitySolutions: [],
          createdAt: q.createdAt ? new Date(q.createdAt) : timestampNow,
          updatedAt: timestampNow,
        };

        batch.set(qRef, qData, { merge: true });
        
        totalPointsSum += Number(q.points);
        lightweightQuestionIds.push(finalQId);
      });

      const exerciseRef = exerciseId 
        ? doc(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`, exerciseId)
        : doc(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`));
      
      const exercisePayload = {
        title: quizTitle,
        description: quizDescription,
        type: 'quiz',
        isLocked: isLocked, 
        createdAt: serverTimestamp(), 
        allowPause: allowPause,
        passPercentage: Number(passPercentage),
        totalPoints: totalPointsSum,
        duration: calculatedDuration,
        questionIds: lightweightQuestionIds, // 🚨 The Ultra-Lightweight link!
        isCompleted: false
      };

      batch.set(exerciseRef, exercisePayload, { merge: true });

      if (!exerciseId) {
        const chapterRef = doc(db, `batches/${batchId}/module/${modId}/chapters`, chapId);
        batch.update(chapterRef, { no_of_exercises: increment(1) });
      }

      await batch.commit();
      navigate(-1); 
    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save the assessment to the Question Bank.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-[#0B1121] text-indigo-500' : 'bg-slate-50 text-indigo-600'}`}>
        <Loader2 size={40} className="animate-spin mb-4" />
        Pulling Master Records...
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-900'} pb-32 transition-colors duration-500`}>
      
      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between backdrop-blur-xl ${isDarkMode ? 'bg-[#0B1121]/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Sparkles size={18} className="text-rose-500" /> The Question Forge
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{exerciseId ? 'Editing Assessment' : 'New Assessment'}</p>
          </div>
        </div>

        <button 
          onClick={handleSaveQuiz} disabled={isSaving}
          className={`px-8 py-3.5 text-white font-black text-sm rounded-xl transition-all shadow-xl flex items-center gap-2
            ${isSaving ? 'opacity-70 cursor-not-allowed bg-slate-700' : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 shadow-rose-600/20 active:scale-95'}`}
        >
          {isSaving ? <><Loader2 size={18} className="animate-spin"/> Forging...</> : <><Save size={18} /> Forge Assessment</>}
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-10 space-y-10">
        
        {/* GLOBAL EXAM CONFIG */}
        <section className={`p-8 rounded-[32px] border shadow-sm space-y-8 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Global Exam Parameters</h2>
          
          <div className="space-y-6">
            <div>
              <label className={`text-xs font-bold block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assessment Title</label>
              <input type="text" placeholder="e.g., Chapter 1 Master Quiz" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} className={`w-full p-4 rounded-2xl border text-2xl font-black outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-400'}`} />
            </div>
            
            <div>
              <label className={`text-xs font-bold block mb-2 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><AlignLeft size={14}/> Instructions</label>
              <textarea rows="2" placeholder="Brief instructions for the students..." value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-400'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl"><Percent size={18}/></div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Passing Score</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Minimum % required</p>
                </div>
              </div>
              <input type="number" min="0" max="100" value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} className={`w-20 p-2 text-center font-black rounded-lg outline-none ${isDarkMode ? 'bg-[#151E2E] text-emerald-400' : 'bg-white border text-emerald-600'}`} />
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${allowPause ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'}`}>
                  <ShieldAlert size={18}/>
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Timer Controls</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{allowPause ? 'Student can pause' : 'Strict / Unstoppable'}</p>
                </div>
              </div>
              <button onClick={() => setAllowPause(!allowPause)} className={`relative w-12 h-6 rounded-full transition-colors ${allowPause ? 'bg-amber-500' : 'bg-rose-500'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${allowPause ? 'translate-x-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* 🚨 Content Visibility Toggle */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isLocked ? 'bg-slate-500/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {isLocked ? <EyeOff size={18}/> : <Eye size={18}/>}
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Visibility</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isLocked ? 'Hidden / Locked' : 'Published'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsLocked(!isLocked)} className={`relative w-12 h-6 rounded-full transition-colors ${isLocked ? 'bg-slate-600' : 'bg-emerald-500'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isLocked ? 'left-1' : 'translate-x-7'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* QUESTIONS LIST */}
        <section className="space-y-6">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Question Ledger ({questions.filter(q => !q.isDeleted).length})</h2>
            <button onClick={() => setQuestions(questions.map(q => ({...q, isExpanded: false})))} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-400">Collapse All</button>
          </div>

          <AnimatePresence>
            {questions.filter(q => !q.isDeleted).map((q, qIndex) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-6 md:p-8 rounded-[32px] border relative group ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
              >
                
                {/* 🚨 ACCORDION HEADER */}
                <div 
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => toggleQuestionExpansion(q.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-sm ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {qIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {q.type.replace('_', ' ').toUpperCase()}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${q.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-500' : q.difficulty === 'mid' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{q.difficulty}</span>
                        {q.customId && <span className="text-[10px] font-bold text-slate-500 uppercase">#{q.customId}</span>}
                      </h3>
                      {/* PREVIEW WHEN COLLAPSED */}
                      {!q.isExpanded && (
                        <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {q.prompt || 'Empty Prompt...'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }} 
                      className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-rose-50 text-rose-600'}`}
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {q.isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* 🚨 ACCORDION BODY */}
                <AnimatePresence>
                  {q.isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-8">
                        {/* 1. CORE & META SETTINGS */}
                        <div className={`grid grid-cols-2 md:grid-cols-6 gap-4 p-4 rounded-2xl mb-6 ${isDarkMode ? 'bg-[#0B1121] border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                          
                          {/* Custom Serial No */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Hash size={12}/> Question No.</label>
                            <input type="number" placeholder="e.g. 1" value={q.customId} onChange={(e) => updateQuestionField(q.id, 'customId', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}/>
                          </div>

                          {/* Type */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Type size={12}/> Format</label>
                            <select value={q.type} onChange={(e) => updateQuestionField(q.id, 'type', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                <option value="single_choice">Single Choice</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="text_input">Text Answer</option>
                                <option value="kanji_draw">Kanji Drawing</option>
                                <option value="pronunciation" disabled>Pronunciation (Soon)</option>
                            </select>
                          </div>
                          {/* Difficulty */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><BarChart size={12}/> Difficulty</label>
                            <select value={q.difficulty} onChange={(e) => updateQuestionField(q.id, 'difficulty', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                <option value="easy">Easy</option>
                                <option value="mid">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                          </div>
                          {/* SubType */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Layers size={12}/> Category</label>
                            <select value={q.subType} onChange={(e) => updateQuestionField(q.id, 'subType', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                <option value="reading">Reading</option>
                                <option value="listening">Listening</option>
                                <option value="vocab">Vocabulary</option>
                                <option value="grammar">Grammar</option>
                            </select>
                          </div>
                          {/* Positive Points */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Award size={12}/> Points</label>
                            <input type="number" value={q.points} onChange={(e) => updateQuestionField(q.id, 'points', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}/>
                          </div>
                          {/* Negative Points */}
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><TrendingDown size={12}/> Penalty</label>
                            <input type="number" value={q.negativePoints} onChange={(e) => updateQuestionField(q.id, 'negativePoints', e.target.value)} className={`w-full bg-transparent font-bold text-sm outline-none ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}/>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {/* 2. PROMPT & MEDIA */}
                          <div className="space-y-4">
                            <div className="relative">
                              <Type size={18} className="absolute left-4 top-4 text-slate-400" />
                              <input type="text" value={q.prompt} onChange={(e) => updateQuestionField(q.id, 'prompt', e.target.value)} placeholder="Enter your question prompt here..." className={`w-full p-4 pl-12 rounded-2xl border text-lg font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'}`} />
                            </div>
                            
                            <div className="flex gap-4">
                              <div className="relative flex-1">
                                <Headphones size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={q.mediaUrl} onChange={(e) => updateQuestionField(q.id, 'mediaUrl', e.target.value)} placeholder="Audio/Image URL (gs://... or https://...)" className={`w-full p-3 pl-10 rounded-xl border text-sm font-medium outline-none transition-all ${isDarkMode ? 'bg-[#0B1121] border-slate-700 text-slate-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`} />
                              </div>
                              <div className={`flex items-center gap-2 px-3 rounded-xl border ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <Clock size={16} className="text-indigo-500" />
                                <input type="number" value={q.timeLimit} onChange={(e) => updateQuestionField(q.id, 'timeLimit', e.target.value)} className={`w-12 bg-transparent outline-none font-bold text-sm text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                                <span className="text-[10px] font-black uppercase text-slate-500">Sec</span>
                              </div>
                            </div>
                          </div>

                          {/* 3. DYNAMIC OPTIONS UI */}
                          {(q.type === 'single_choice' || q.type === 'multiple_choice') ? (
                            <div>
                              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><CheckCircle2 size={14}/> Answer Options ({q.type === 'single_choice' ? 'Pick One' : 'Pick Multiple'})</label>
                              <div className="space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                <AnimatePresence>
                                  {q.options.map((opt, optIndex) => (
                                    <motion.div key={opt.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`flex items-center p-3 rounded-2xl border-2 transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : isDarkMode ? 'border-slate-700 bg-[#0B1121]' : 'border-slate-200 bg-white'}`}>
                                      <button onClick={() => setCorrectOption(q.id, opt.id)} className={`p-2 shrink-0 transition-colors ${opt.isCorrect ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-400'}`}>
                                        {q.type === 'multiple_choice' ? (opt.isCorrect ? <CheckCircle2 size={24}/> : <Circle size={24}/>) : (opt.isCorrect ? <CheckCircle2 size={24}/> : <Circle size={24}/>)}
                                      </button>
                                      <div className="w-px h-6 bg-slate-700 mx-2 opacity-50"></div>
                                      <input type="text" value={opt.text} onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)} placeholder={`Option ${optIndex + 1}`} className={`flex-1 bg-transparent border-none outline-none font-bold text-base px-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} ${opt.isCorrect ? 'text-emerald-400' : ''}`} />
                                      <button onClick={() => handleRemoveOption(q.id, opt.id)} className={`p-2 text-slate-500 hover:text-rose-500 transition-colors`}><X size={16} /></button>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                <button onClick={() => handleAddOption(q.id)} className={`w-full py-3 rounded-xl border border-dashed font-bold text-sm mt-2 transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>+ Add Choice</button>
                              </div>
                            </div>
                          ) : (
                            // 🚨 TEXT INPUT OR KANJI DRAWING (Properly renders the input box)
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                              {/* Dedicated Kanji Instructions */}
                              {q.type === 'kanji_draw' && (
                                <div className={`p-6 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                                  <PenTool size={24} className="text-indigo-500 shrink-0 mt-1" />
                                  <div>
                                    <h4 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Kanji AI Evaluation Task</h4>
                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                      Students will draw the Kanji on a canvas. The AI Engine automatically grades their stroke order against your expected character.
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-500/30">
                                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  <CheckCircle2 size={14}/> {q.type === 'kanji_draw' ? 'Expected Kanji Character' : 'Exact Expected Answer'}
                                </label>
                                
                                <div className={`flex items-center p-3 rounded-2xl border-2 transition-all ${isDarkMode ? 'border-indigo-500/50 bg-[#0B1121]' : 'border-indigo-200 bg-white'}`}>
                                  <input 
                                    type="text" 
                                    placeholder={q.type === 'kanji_draw' ? "e.g., 水" : "Exact string to match..."}
                                    value={q.options && q.options.length > 0 ? q.options[0].text : ''} 
                                    onChange={(e) => {
                                      // Safely update the options array for this specific question
                                      setQuestions(questions.map(question => {
                                        if (question.id === q.id) {
                                          const newOptions = question.options && question.options.length > 0
                                            ? [{ ...question.options[0], text: e.target.value }]
                                            : [{ id: Date.now(), text: e.target.value, isCorrect: true, count: 0 }];
                                          return { ...question, options: newOptions };
                                        }
                                        return question;
                                      }));
                                    }} 
                                    className={`flex-1 bg-transparent border-none outline-none font-black text-2xl px-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {q.type === 'pronunciation' && (
                            <div className={`p-6 rounded-2xl border flex items-start gap-4 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                              <Mic size={24} className="text-amber-500 shrink-0 mt-1" />
                              <div>
                                <h4 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Audio Response (Coming Soon)</h4>
                                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  The voice evaluation engine is currently offline. Students will not be able to record audio answers until this module is activated.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 4. SOLUTIONS & TAGS */}
                          <div className={`p-5 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#0B1121] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                            <div>
                              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}><Lightbulb size={14}/> Official Solution</label>
                              <textarea rows="2" value={q.solutionText} onChange={(e) => updateQuestionField(q.id, 'solutionText', e.target.value)} placeholder="Explain why the answer is correct..." className={`w-full p-3 rounded-xl border text-sm outline-none transition-all ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300 focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-400'}`} />
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="flex-1 relative">
                                <Video size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={q.solutionVideoUrl} onChange={(e) => updateQuestionField(q.id, 'solutionVideoUrl', e.target.value)} placeholder="Solution Video URL" className={`w-full p-2.5 pl-9 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300' : 'bg-white border-slate-200'}`} />
                              </div>
                              <div className="flex-1 relative">
                                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={q.tags} onChange={(e) => updateQuestionField(q.id, 'tags', e.target.value)} placeholder="Tags (comma separated)" className={`w-full p-2.5 pl-9 rounded-xl border text-sm outline-none ${isDarkMode ? 'bg-[#151E2E] border-slate-700 text-slate-300' : 'bg-white border-slate-200'}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            ))}
          </AnimatePresence>

          {/* 🚨 CREATION & IMPORT AREA */}
          <div className="flex flex-col md:flex-row gap-4">
            
            <button 
              onClick={handleAddQuestion} 
              className={`flex-1 p-6 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all group hover:bg-rose-500/5 ${isDarkMode ? 'border-slate-800 hover:border-rose-500/50' : 'border-slate-300 hover:border-rose-400'}`}
            >
              <div className={`p-4 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 group-hover:bg-rose-500 text-slate-400 group-hover:text-white' : 'bg-slate-100 group-hover:bg-rose-500 text-slate-500 group-hover:text-white'}`}><Plus size={24} /></div>
              <span className={`font-black text-lg ${isDarkMode ? 'text-slate-400 group-hover:text-rose-400' : 'text-slate-500 group-hover:text-rose-600'}`}>Create Blank Question</span>
            </button>

            <div className={`flex-1 p-6 rounded-[32px] border flex flex-col justify-center gap-4 ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div>
                <h3 className={`font-black flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}><Download size={18} className="text-indigo-500"/> Import from Bank</h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Paste an ID (e.g., q_0001) from your question bank.</p>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded-2xl border focus-within:border-indigo-500 transition-colors ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <input 
                  type="text" 
                  value={importId} 
                  onChange={(e) => setImportId(e.target.value)} 
                  placeholder="Paste Question ID..." 
                  className={`flex-1 bg-transparent px-3 outline-none text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} 
                />
                <button 
                  onClick={handleImportQuestion}
                  disabled={isImporting || !importId.trim()}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all ${isImporting || !importId.trim() ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {isImporting ? <Loader2 size={16} className="animate-spin"/> : 'Import'}
                </button>
              </div>
            </div>

          </div>

        </section>
      </main>
    </div>
  );
}