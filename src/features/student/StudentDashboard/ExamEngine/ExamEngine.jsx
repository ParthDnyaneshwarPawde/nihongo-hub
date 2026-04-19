import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '@services/firebase'; 
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext'; 
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Save, MessageSquare, StickyNote, X, Edit3 } from 'lucide-react';

import { useExamSession } from './hooks/useExamSession';
import { useExamTelemetry } from './hooks/useExamTelemetry';

import ExamIntro from './components/ExamIntro';
import ExamResults from './components/ExamResults';
import ExamHeader from './components/ExamHeader';
import ExamFooter from './components/ExamFooter';
import SettingsDrawer from './components/SettingsDrawer';
import QuestionDisplay from './components/QuestionArea/QuestionDisplay';
import ChoiceInterface from './components/QuestionArea/ChoiceInterface';
import TextInterface from './components/QuestionArea/TextInterface';
import KanjiInterface from './components/QuestionArea/KanjiInterface';
import PostAttemptFeedback from './components/QuestionArea/PostAttemptFeedback';

// --- 🚨 AUDIO FEEDBACK GENERATOR ---
const playAudioFeedback = (isCorrect) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (isCorrect) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) { console.error("Audio failed:", e); }
};

const DEFAULT_SETTINGS = {
  showHint: true,
  showMyNote: true,
  solutionMode: false,
  autoStartTimer: true,
  playSounds: true,
  delayCorrectAnswer: false,
  textSize: 'medium',
  showPeerStats: true
};

export default function ExamEngine() {
  const navigate = useNavigate();
  const { batchId, modId, chapId, exerciseId } = useParams();
  const { isDarkMode, toggleTheme } = useTheme();

  const [examState, setExamState] = useState('loading'); 
  const [examConfig, setExamConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [timeSpent, setTimeSpent] = useState(0); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [localNote, setLocalNote] = useState(""); 

  const session = useExamSession(questions);

  const [totalTimeSpent, setTotalTimeSpent] = useState(() => {
    const savedTimer = localStorage.getItem(`exam_timer_${exerciseId}`);
    return savedTimer ? JSON.parse(savedTimer).total : 0;
  });

  const timeSpentRef = useRef(
    localStorage.getItem(`exam_timer_${exerciseId}`) 
      ? JSON.parse(localStorage.getItem(`exam_timer_${exerciseId}`)).perQuestion 
      : {}
  );

  const [proctorWarning, setProctorWarning] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [fatalViolation, setFatalViolation] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false); 
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nihongo_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [isTimerRunning, setIsTimerRunning] = useState(settings.autoStartTimer);

  useEffect(() => {
    localStorage.setItem('nihongo_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (exerciseId) {
      const saved = localStorage.getItem(`exam_draft_${exerciseId}`);
      if (saved) {
        session.setQuestionStates(JSON.parse(saved));
      }
    }
  }, [exerciseId, session.setQuestionStates]);

  useEffect(() => {
    if (Object.keys(session.questionStates).length > 0) {
      localStorage.setItem(`exam_draft_${exerciseId}`, JSON.stringify(session.questionStates));
    }
  }, [session.questionStates, exerciseId]);

  const handleViolation = useCallback((type, count) => {
    setViolationCount(count);
    if (count < 10) {
      setProctorWarning({ type, count });
    }
  }, []);
  
  const telemetry = useExamTelemetry(session.currentQ?.id, handleViolation, examState === 'active');

  useEffect(() => {
    if (violationCount >= 10 && examState === 'active') {
      setProctorWarning(null);
      setFatalViolation(true); 
      finishExam(true); 
    }
  }, [violationCount, examState]);
  
  useEffect(() => {
    const loadExam = async () => {
      if (!batchId || !modId || !exerciseId) return navigate('/student-dashboard');
      try {
        const exerciseSnap = await getDoc(doc(db, 'batches', batchId, 'module', modId, 'chapters', chapId, 'exercises', exerciseId));
        if (!exerciseSnap.exists()) return navigate(-1);
        const data = exerciseSnap.data();
        setExamConfig({ title: data.title, description: data.description, passPercentage: data.passPercentage || 80, duration: data.duration, batch: batchId, attemptPoints: data.attemptPoints || 0 });

        const qIds = data.questionIds || [];
        if (qIds.length === 0) return setExamState('intro');

        const questionSnaps = await Promise.all(qIds.map(id => getDoc(doc(db, `question_bank/${batchId}/questions`, id))));
        
        const formattedQuestions = questionSnaps.filter(snap => snap.exists()).map(snap => {
          const q = snap.data();
          
          const safeType = (q.type || '').toLowerCase();

          return {
            ...q, 
            type: safeType, 
            prompt: q.promptText || '', 
            mediaType: q.mediaUrl ? (q.mediaUrl.endsWith('.mp3') ? 'audio' : 'video') : 'none',
            correctOptions: safeType.includes('choice') ? (q.options?.filter(o => o.isCorrect === true || o.isCorrect === 'true').map(o => o.id) || []) : (q.correctAnswers || q.correctOptions || []), 
            options: q.options || [], 
            explanation: q.officialSolution?.text || "No explanation provided.",
            hint: q.hintText || q.hint || q.hint_text || "" 
          };
        });
        setQuestions(formattedQuestions);
        setExamState('intro');
      } catch (error) { console.error(error); navigate(-1); }
    };
    loadExam();
  }, [batchId, modId, chapId, exerciseId, navigate]);

  useEffect(() => { 
    if (session.currentQ) {
      session.initQuestionState(session.currentQ.id); 
      setTimeSpent(timeSpentRef.current[session.currentQ.id] || 0);
      setIsTimerRunning(settings.autoStartTimer);
    }
  }, [session.currentIndex, session.currentQ, session.initQuestionState, settings.autoStartTimer]);

  useEffect(() => {
    let timer;
    const isFinished = session.currentState?.status === 'completed';
    const isWaitingForRetry = session.currentState?.status === 'attempt1_failed';
    
    if (examState === 'active' && isTimerRunning && !isFinished && !isWaitingForRetry) {
      timer = setInterval(() => { 
        setTimeSpent(p => {
          const newTime = p + 1;
          if (session.currentQ) timeSpentRef.current[session.currentQ.id] = newTime;
          return newTime;
        }); 
        
        setTotalTimeSpent(p => {
          const newTotal = p + 1;
          localStorage.setItem(`exam_timer_${exerciseId}`, JSON.stringify({
            total: newTotal,
            perQuestion: timeSpentRef.current
          }));
          return newTotal;
        }); 
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [session.currentIndex, session.currentState?.status, examState, isTimerRunning, session.currentQ, exerciseId]);

  const handleInteraction = () => {
    if (!isTimerRunning && examState === 'active') {
      setIsTimerRunning(true);
    }
  };

  const handleToggleOptionWrapper = (optionId, isMulti) => {
    handleInteraction();
    session.toggleOption(optionId, isMulti);
  };

  // 🚨 COMPLETELY UPGRADED: Telemetry + Event Shield + Text Sanitization
  const handleCheck = (manualValue = null) => {
    // Event Object Shield to prevent circular JSON crash
    if (manualValue && typeof manualValue === 'object' && 'nativeEvent' in manualValue) {
      manualValue = null;
    }

    handleInteraction(); 
    const { currentQ, currentState, setQuestionStates, setScore } = session;
    
    if (!currentState || currentState.status === 'completed' || currentState.status === 'attempt1_failed') return;

    let isCorrect = false;
    let isPartial = false; 
    let rawResponse = manualValue !== null ? [manualValue] : currentState.selectedOptions;

    // --- SMART CHECKING LOGIC ---
    if (currentQ.type.includes('choice')) {
      const correctIds = currentQ.correctOptions || [];
      const selectedIds = currentState.selectedOptions || [];

      if (currentQ.type.includes('multi') || currentQ.type.includes('multiple')) {
        isCorrect = correctIds.length === selectedIds.length && correctIds.every(id => selectedIds.includes(id));
        const hasSomeCorrect = selectedIds.some(id => correctIds.includes(id));
        const missedSome = correctIds.some(id => !selectedIds.includes(id));
        if (!isCorrect && (hasSomeCorrect || missedSome)) {
          isPartial = true; 
        }
      } else {
        isCorrect = correctIds.includes(selectedIds[0]);
      }
    } else {
      const userInput = (manualValue !== null ? manualValue : currentState.selectedOptions[0] || "").toString().trim().toLowerCase();
      const correctList = (currentQ.correctOptions || []).map(ans => ans.toString().trim().toLowerCase());
      const fallback = currentQ.options?.find(o => o.isCorrect)?.text?.toString().trim().toLowerCase();

      isCorrect = correctList.includes(userInput) || (!!fallback && userInput === fallback);
      rawResponse = [userInput]; 
    }

    // --- 🚨 THE ATTEMPT BUILDER (Rich Payload Restored from Telemetry) ---
    // --- 🚨 THE ATTEMPT BUILDER (Rich Payload Restored from Telemetry) ---
    const attemptNumber = (currentState.attempts?.length || 0) + 1;
    const isFirstAttempt = attemptNumber === 1;
    const pointsEarned = isCorrect ? (isFirstAttempt ? (currentQ.points || 1) : ((currentQ.points || 1) / 2)) : 0;
    
    // 🚨 NEW: Smart Response ID Generation (res_123 and res_123_second)
    let generatedResponseId;
    if (isFirstAttempt) {
      generatedResponseId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    } else {
      // Grab the ID from the first attempt and append _second
      const firstId = currentState.attempts[0].responseId;
      generatedResponseId = attemptNumber === 2 ? `${firstId}_second` : `${firstId}_attempt${attemptNumber}`;
    }

    const attemptTelemetry = telemetry.extractAndResetForNextAttempt ? telemetry.extractAndResetForNextAttempt() : {};
    const currentTimeSpent = timeSpentRef.current[currentQ.id] || 0;
    const timeExceeded = currentTimeSpent > (currentQ.idealTimeSeconds || 60);

    const newAttempt = {
      attemptNumber,
      userId: auth.currentUser?.uid || "anonymous",
      responseTime: new Date(), 
      isCorrect,
      attempts: {
        firstAttemptCorrect: attemptNumber === 1 ? isCorrect : currentState.attempts?.[0]?.isCorrect || false,
        secondAttemptCorrect: attemptNumber === 2 ? isCorrect : false
      },
      timeSpentInSeconds: currentTimeSpent,
      hintViewed: currentState.hintViewed || false,
      pointsEarned,
      correctOptions: currentQ.correctOptions || [],
      selectedOptions: [...rawResponse], 
      questionId: currentQ.id,
      questionType: currentQ.type || 'unknown', 
      
      // 🚨 Using the newly generated smart ID
      responseId: generatedResponseId,
      
      difficulty: currentQ.difficulty || 'mid',
      topic: currentQ.topic || 'Uncategorized',
      subTopic: currentQ.subTopic || 'Uncategorized',
      wasSkippedInitially: currentState.wasSkippedInitially || false,
      revisited: currentState.revisited || false,
      exceededExpectedTime: timeExceeded,
      exceededExpectedTimeBy: timeExceeded ? currentTimeSpent - (currentQ.idealTimeSeconds || 60) : 0,
      ...attemptTelemetry 
    };

    // --- STATE UPDATE ---
    if (isCorrect) {
      if (settings.playSounds) playAudioFeedback(true);
      setQuestionStates(prev => ({
        ...prev,
        [currentQ.id]: { 
          ...prev[currentQ.id], 
          status: 'completed', 
          isCorrect: true, 
          isPartial: false,
          attempts: [...(prev[currentQ.id].attempts || []), newAttempt] 
        }
      }));
      setScore(s => s + pointsEarned);
    } else if (currentQ.secondAttempt && !currentState.isSecondAttempt && currentState.status !== 'attempt1_failed') {
      if (settings.playSounds) playAudioFeedback(false);
      setQuestionStates(prev => ({
        ...prev,
        [currentQ.id]: { 
          ...prev[currentQ.id], 
          status: 'attempt1_failed', 
          isPartial,
          attempts: [...(prev[currentQ.id].attempts || []), newAttempt] 
        }
      }));
      
      // Reset timer visually for second attempt
      timeSpentRef.current[currentQ.id] = 0;
      setTimeSpent(0);
    } else {
      if (settings.playSounds) playAudioFeedback(false);
      setQuestionStates(prev => ({
        ...prev,
        [currentQ.id]: { 
          ...prev[currentQ.id], 
          status: 'completed', 
          isCorrect: false, 
          isPartial,
          attempts: [...(prev[currentQ.id].attempts || []), newAttempt] 
        }
      }));
    }
  };

  const handleAttemptAgain = () => {
    session.setQuestionStates(prev => ({
      ...prev,
      [session.currentQ.id]: {
        ...prev[session.currentQ.id],
        status: 'idle',
        isSecondAttempt: true, 
        selectedOptions: [] 
      }
    }));
    setIsTimerRunning(true); 
  };

  const handleShowAnswer = () => {
    if (settings.playSounds) playAudioFeedback(false);
    session.setQuestionStates(prev => ({
      ...prev,
      [session.currentQ.id]: {
        ...prev[session.currentQ.id],
        status: 'completed',
        isCorrect: false, 
        isPartial: false,
        selectedOptions: [] 
      }
    }));
  };

  const handleNext = async () => {
    if (!session.currentState) return;
    setIsNextLoading(true);

    try {
      if (session.currentState?.status === 'completed' && !session.currentState?.studentDifficulty) {
        setShowRatingPrompt(true);
        setIsNextLoading(false); 
        return;
      }

      if (session.currentState?.status === 'idle') {
        await session.skipQuestion(session.currentQ.id);
      }

      if (session.currentIndex < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
        session.setCurrentIndex(p => p + 1);
        setTimeSpent(timeSpentRef.current[questions[session.currentIndex + 1]?.id] || 0);
      } else {
        setShowFinishModal(true); 
      }
    } catch (error) {
      console.error("Navigation failed:", error);
    } finally {
      setIsNextLoading(false);
    }
  };

  const handlePrevious = () => {
    const currentId = session.currentQ?.id;
    if (!currentId) return;

    if (session.currentState?.status === 'idle') {
      session.skipQuestion(currentId);
    }

    if (session.currentIndex > 0) {
      session.setQuestionStates(prev => ({ 
        ...prev, 
        [currentId]: { ...prev[currentId], revisited: true } 
      }));

      session.setCurrentIndex(p => p - 1);
      setTimeSpent(timeSpentRef.current[questions[session.currentIndex - 1]?.id] || 0);
    }
  };

  // 🚨 THE DATABASE PUSHER (Rerouted to 'analytics/exercises/exercises/{exerciseId}')
 const finishExam = async (forceSubmit = false) => {
    if (!forceSubmit && examState === 'active' && session.currentState?.status === 'completed' && !session.currentState?.studentDifficulty) {
      setShowRatingPrompt(true);
      return;
    }

    
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      // 🚨 NEW: Fetch how many times they've taken this exercise before!
      const userExerciseRef = doc(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId);
      const userExerciseSnap = await getDoc(userExerciseRef);
      const previousAttemptsCount = userExerciseSnap.exists() ? (userExerciseSnap.data().totalAttempts || 0) : 0;
      
      // Determine this current attempt number
      const currentExerciseAttemptNumber = previousAttemptsCount + 1;
      const exerciseAttemptId = `exam_attempt_${currentExerciseAttemptNumber}_${Date.now()}`;

      const batch = writeBatch(db);
      const sessionResponses = [];
      const wasAnyHintUsed = Object.values(session.questionStates).some(q => q.hintViewed === true);
      const noHintBonusXP = wasAnyHintUsed ? 0 : 50; // You can change 50 to whatever you want

      // 🚨 PATH CHANGE 1: Build the user document structure you requested
      const userBatchRef = doc(db, 'users', userId, 'Batches', batchId);
      batch.set(userBatchRef, { batchId, lastUpdated: serverTimestamp() }, { merge: true });
      
      batch.set(userExerciseRef, { 
        totalAttempts: currentExerciseAttemptNumber, 
        lastAttemptAt: serverTimestamp() ,
        pointsEarned: examConfig.attemptPoints || 0, // This is the participation reward
        isRedeemed: previousAttemptsCount === 0 ? false : (userExerciseSnap.data()?.isRedeemed || false),
        firstAttemptScore: previousAttemptsCount === 0 ? session.score : (userExerciseSnap.data()?.firstAttemptScore || 0),
        noHintBonusXP: previousAttemptsCount === 0 ? noHintBonusXP : (userExerciseSnap.data()?.noHintBonusXP || 0),
        usedHints: wasAnyHintUsed
      }, { merge: true });

      // Keep original global progress update
      const progressRef = doc(db, 'batches', batchId, 'user_progress', userId);
      batch.set(progressRef, { 
        examResults: { 
          [exerciseId]: { score: session.score, total: questions.length, timeSpent: totalTimeSpent, completedAt: serverTimestamp() }
        }
      }, { merge: true });

      // Keep Exercise Metadata for global analytics
      const exerciseDocRef = doc(db, 'analytics', 'exercises', 'exercises', exerciseId);
      batch.set(exerciseDocRef, { 
        exerciseId, name: examConfig.title, batch: batchId, lastAttemptBy: userId, totalViolations: violationCount, recordedAt: serverTimestamp() 
      }, { merge: true });

      questions.forEach((q) => {
        const qState = session.questionStates[q.id];
        const questionDocRef = doc(db, 'analytics', 'exercises', 'exercises', exerciseId, 'questions', q.id);
        
        if (!qState || !qState.attempts || qState.attempts.length === 0) {
          batch.set(questionDocRef, { 
            questionId: q.id, status: 'skipped_or_unattempted', topic: q.topic || 'Uncategorized', userNote: qState?.userNote || "", lastUpdated: serverTimestamp() 
          }, { merge: true });
          
          sessionResponses.push({ questionId: q.id, status: 'skipped', responseIds: [] });
          return;
        }

        batch.set(questionDocRef, { questionId: q.id, userNote: qState.userNote || "", lastUpdated: serverTimestamp() }, { merge: true });

        const finalAttempt = qState.attempts[qState.attempts.length - 1];
        // Collect all response IDs for this question (e.g., ['res_123', 'res_123_second'])
        const allResponseIdsForThisQuestion = qState.attempts.map(a => a.responseId);

        // 🚨 THIS Maps Question ID to Response IDs for the User's Attempt Document
        sessionResponses.push({
          questionId: q.id,
          questionType: q.type,
          responseIds: allResponseIdsForThisQuestion, 
          finalSelectedOptions: finalAttempt.selectedOptions,
          isCorrect: finalAttempt.isCorrect,
          pointsEarned: finalAttempt.pointsEarned,
          timeSpentInSeconds: finalAttempt.timeSpentInSeconds
        });

        qState.attempts.forEach((attempt) => {
          const finalAttemptData = { 
            ...attempt, studentDifficulty: qState.studentDifficulty || 'unrated', userNote: qState.userNote || "", responseTime: serverTimestamp() 
          };
          const attemptDocRef = doc(db, 'analytics', 'exercises', 'exercises', exerciseId, 'questions', q.id, 'attempts', attempt.responseId);
          batch.set(attemptDocRef, finalAttemptData);
        });

        // 🚨 UPGRADE PEER STATS IN THE MAIN QUESTION BANK
        if (q.type.includes('choice')) {
          const firstAttempt = qState.attempts[0];
          const selectedIds = firstAttempt.selectedOptions || [];
          if (selectedIds.length > 0) {
            const safeSelectedIds = selectedIds.map(id => String(id));
            const updatedOptions = (q.options || []).map(opt => {
              if (safeSelectedIds.includes(String(opt.id))) {
                return { ...opt, count: (opt.count || 0) + 1 };
              }
              return opt;
            });
            const qBankRef = doc(db, 'question_bank', batchId, 'questions', q.id);
            batch.set(qBankRef, { options: updatedOptions }, { merge: true });
          }
        }
      });

      // 🚨 PATH CHANGE 2: Save the Attempt Document in the new User Path!
      const userAttemptRef = doc(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId, 'attempts', exerciseAttemptId);
      batch.set(userAttemptRef, {
        exerciseAttemptId: exerciseAttemptId,
        attemptNumber: currentExerciseAttemptNumber,
        score: session.score,
        totalQuestions: questions.length,
        totalTimeSpent: totalTimeSpent,
        totalViolations: violationCount,
        submittedAt: serverTimestamp(),
        responses: sessionResponses 
      });

      await batch.commit();

      setExamState('results');
      
      localStorage.removeItem(`exam_draft_${exerciseId}`); 
      localStorage.removeItem(`exam_timer_${exerciseId}`); 
      
      console.log("✅ Deep Analytics & User Attempt History Saved Successfully");

    } catch (err) {
      console.error("❌ Failed to save exam data:", err);
    }
  };

  const handleSaveUserNote = (noteText) => {
    session.setQuestionStates(prev => ({
      ...prev,
      [session.currentQ.id]: {
        ...prev[session.currentQ.id],
        userNote: noteText
      }
    }));
  };

  const closeAndSaveNote = () => {
    handleSaveUserNote(localNote);
    setIsNotesOpen(false);
  };

  if (examState === 'loading') return <div className="h-screen w-full flex items-center justify-center"><p>Loading Engine...</p></div>;
  if (examState === 'intro') return <ExamIntro examConfig={examConfig} totalQuestions={questions.length} onStart={() => setExamState('active')} isDarkMode={isDarkMode} />;
  
  if (fatalViolation && examState === 'results') {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B1121]' : 'bg-slate-50'}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl text-center border shadow-2xl ${isDarkMode ? 'bg-[#151E2E] border-rose-900/50' : 'bg-white border-rose-200'}`}>
          <AlertTriangle size={48} className="mx-auto text-rose-500 mb-6" />
          <h2 className={`text-2xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Exam Terminated</h2>
          <p className={`mb-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            You exceeded the maximum allowed proctoring violations (10/10). Your session has been locked and automatically submitted.
          </p>
          <button onClick={() => setFatalViolation(false)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl active:scale-95 transition-transform">
            View Final Results
          </button>
        </div>
      </div>
    );
  }

  const totalPossiblePoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  if (examState === 'results') return <ExamResults score={session.score} totalPossiblePoints={totalPossiblePoints} totalQuestions={questions.length} examConfig={examConfig} totalTimeSpent={totalTimeSpent} isDarkMode={isDarkMode} onDashboard={() => navigate('/student-dashboard')} />;

  const fontClasses = { small: 'text-base', medium: 'text-xl', large: 'text-3xl', xlarge: 'text-4xl' }[settings.textSize] || 'text-xl';
  const timerIsCritical = timeSpent > (session.currentQ?.idealTimeSeconds || 60);

  return (
    <div className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden transition-colors duration-500 relative ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>

      <AnimatePresence>
        {isNotesOpen && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeAndSaveNote} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg p-6 rounded-[2rem] border shadow-2xl ${
                isDarkMode ? 'bg-[#151E2E] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <StickyNote size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">Personal Notes</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Stored for this question</p>
                  </div>
                </div>
                <button onClick={closeAndSaveNote} className="p-2 hover:bg-slate-500/10 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <textarea
                autoFocus
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder="Type your mnemonics, grammar rules, or reminders here..."
                className={`w-full min-h-[200px] p-5 rounded-2xl border-2 outline-none transition-all text-sm leading-relaxed resize-none ${
                  isDarkMode 
                    ? 'bg-[#0B1121] border-slate-700 focus:border-indigo-500 text-slate-200' 
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-400 text-slate-800'
                }`}
              />

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={closeAndSaveNote}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHintModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl border transition-all ${isDarkMode ? 'bg-[#2A2416] border-amber-900/50 shadow-amber-900/20' : 'bg-[#FFFBEB] border-amber-200 shadow-amber-500/10'}`}
            >
              <div className={`flex items-center gap-3 mb-4 font-black text-lg ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>
                <Lightbulb size={24} /> Question Hint
              </div>
              <p className={`text-base font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-amber-100/80' : 'text-amber-900/80'}`}>
                {session.currentQ?.hint}
              </p>
              <button 
                onClick={() => setShowHintModal(false)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${isDarkMode ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-200 text-amber-700 hover:bg-amber-300'}`}
              >
                Close Hint
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFinishModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full p-8 rounded-3xl shadow-2xl border text-center ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-6" />
              <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Finish Assessment?</h3>
              <p className="text-sm font-medium mb-8 text-slate-500">You've reached the end. Once you submit, you can't change your answers.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowFinishModal(false)} className="flex-1 py-4 rounded-xl bg-slate-100 font-bold text-slate-600">Back</button>
                <button onClick={() => finishExam()} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl active:scale-95">Submit Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showRatingPrompt && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-sm w-full p-6 rounded-3xl shadow-2xl border text-center ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <Info size={36} className="mx-auto text-indigo-500 mb-4" />
              <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Rating Required</h3>
              <p className={`text-sm font-medium mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Please rate the difficulty of this question before moving forward.
              </p>
              <button 
                onClick={() => setShowRatingPrompt(false)}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition-transform"
              >
                Okay, I'll rate it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {proctorWarning && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`max-w-md w-full p-6 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-[#151E2E] border-rose-900/50 shadow-rose-900/20' : 'bg-white border-rose-200 shadow-rose-900/10'}`}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Proctoring Warning
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  We detected a <span className="font-bold text-rose-500">{proctorWarning.type === 'tab_switch' ? 'Tab Switch' : 'Window Focus Loss'}</span>. You are required to stay on the exam screen.
                </p>
                <div className="mt-4 px-4 py-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <span className="text-rose-500 font-bold">Strike {proctorWarning.count} of 10</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 font-medium">
                  If you reach 10 strikes, your exam will be automatically submitted.
                </p>
              </div>
              
              <button 
                onClick={() => setProctorWarning(null)}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
              >
                I Understand, Continue Exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ExamHeader 
        examConfig={examConfig} 
        currentQ={session.currentQ} 
        currentIndex={session.currentIndex} 
        totalQuestions={questions.length} 
        timeSpent={timeSpent} 
        timerIsCritical={timerIsCritical} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onExit={() => finishExam()} 
        isTimerRunning={isTimerRunning}
        onStartTimer={() => setIsTimerRunning(true)}
        onOpenNotes={() => {
          setLocalNote(session.currentState?.userNote || "");
          setIsNotesOpen(true);
        }}
        hasAttempted={settings.showMyNote}
      />
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 pb-10">
          <QuestionDisplay currentQ={session.currentQ} currentIndex={session.currentIndex} totalQuestions={questions.length} fontClasses={fontClasses} isDarkMode={isDarkMode} />
          
          {session.currentQ?.type.includes('choice') ? (
            <ChoiceInterface currentQ={session.currentQ} currentState={session.currentState} settings={settings} telemetry={telemetry} toggleOption={handleToggleOptionWrapper} isDarkMode={isDarkMode} fontClasses={fontClasses} />
          ) : session.currentQ?.type === 'kanji_draw' ? (
            <KanjiInterface currentQ={session.currentQ} toggleOption={handleToggleOptionWrapper} isDarkMode={isDarkMode} currentState={session.currentState} onCheck={handleCheck} />
          ) : (
            <TextInterface currentQ={session.currentQ} telemetry={telemetry} currentState={session.currentState} toggleOption={handleToggleOptionWrapper} isDarkMode={isDarkMode} fontClasses={fontClasses} />
          )}

          <PostAttemptFeedback currentQ={session.currentQ} currentState={session.currentState} settings={settings} markHintViewed={session.markHintViewed} setStudentDifficulty={session.setStudentDifficulty} isDarkMode={isDarkMode} />

        </div>
      </main>

      <ExamFooter 
        currentIndex={session.currentIndex} 
        onClear={() => session.clearSelection(session.currentQ.id)} 
        totalQuestions={questions.length} 
        currentState={session.currentState} 
        onPrevious={handlePrevious} 
        onCheck={handleCheck} 
        onNext={handleNext} 
        onAttemptAgain={handleAttemptAgain} 
        onShowAnswer={handleShowAnswer}
        isNextLoading={isNextLoading}
        isDarkMode={isDarkMode} 
        hasHint={settings.showHint && !!session.currentQ?.hint}
        onShowHint={() => {
          setShowHintModal(true);
          session.markHintViewed(session.currentQ.id); 
        }}
      />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} setSettings={setSettings} isDarkMode={isDarkMode} />
    </div>
  );
}