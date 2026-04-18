import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '@services/firebase'; 
import { doc, getDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { useTheme } from '@/context/ThemeContext'; 

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
import PostAttemptFeedback from './components/QuestionArea/PostAttemptFeedback';

export default function ExamEngine() {
  const navigate = useNavigate();
  const { batchId, modId, chapId, exerciseId } = useParams();
  const { isDarkMode, toggleTheme } = useTheme();

  const [examState, setExamState] = useState('loading'); 
  const [examConfig, setExamConfig] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [timeSpent, setTimeSpent] = useState(0); 
  const [totalTimeSpent, setTotalTimeSpent] = useState(0); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ solutionMode: false, autoStartTimer: true, playSounds: true, textSize: 'medium', showPeerStats: true });

  const session = useExamSession(questions);
  const telemetry = useExamTelemetry(session.currentQ?.id);

  useEffect(() => {
    const loadExam = async () => {
      try {
        const exerciseSnap = await getDoc(doc(db, 'batches', batchId, 'module', modId, 'chapters', chapId, 'exercises', exerciseId));
        if (!exerciseSnap.exists()) return navigate(-1);
        const data = exerciseSnap.data();
        setExamConfig({ title: data.title, description: data.description, passPercentage: data.passPercentage || 80, duration: data.duration, batch: batchId });

        const qIds = data.questionIds || [];
        if (qIds.length === 0) return setExamState('intro');

        const questionSnaps = await Promise.all(qIds.map(id => getDoc(doc(db, `question_bank/${batchId}/questions`, id))));
        const formattedQuestions = questionSnaps.filter(snap => snap.exists()).map(snap => {
          const q = snap.data();
          return {
            ...q, type: q.type, prompt: q.promptText || '', mediaType: q.mediaUrl ? (q.mediaUrl.endsWith('.mp3') ? 'audio' : 'video') : 'none',
            correctOptions: q.options?.filter(o => o.isCorrect).map(o => o.id) || [], options: q.options || [], explanation: q.officialSolution?.text || "No explanation provided."
          };
        });
        setQuestions(formattedQuestions);
        setExamState('intro');
      } catch (error) { console.error(error); navigate(-1); }
    };
    loadExam();
  }, [batchId, modId, chapId, exerciseId, navigate]);

  useEffect(() => { if (session.currentQ) session.initQuestionState(session.currentQ.id); }, [session.currentIndex, session.currentQ, session.initQuestionState]);

  useEffect(() => {
    let timer;
    if (examState === 'active' && settings.autoStartTimer) {
      timer = setInterval(() => { setTimeSpent(p => p + 1); setTotalTimeSpent(p => p + 1); }, 1000);
    }
    return () => clearInterval(timer);
  }, [session.currentIndex, examState, settings.autoStartTimer]);

  // 🚨 THE ATTEMPT BUILDER (Constructs exact required schema per attempt)
  const handleCheck = () => {
    const q = session.currentQ;
    const state = session.currentState;
    if (!q || !state || state.selectedOptions.length === 0) return;

    const isCorrect = q.type === 'single_choice' 
      ? state.selectedOptions[0] === q.correctOptions[0] 
      : JSON.stringify([...state.selectedOptions].sort()) === JSON.stringify([...q.correctOptions].sort());

    const attemptNumber = state.attempts.length + 1;
    const isFirstAttempt = attemptNumber === 1;
    const pointsEarned = isCorrect ? (isFirstAttempt ? (q.points || 1) : ((q.points || 1) / 2)) : 0;
    
    if (isCorrect) session.setScore(prev => prev + pointsEarned);
    
    const attemptTelemetry = telemetry.extractAndResetForNextAttempt();
    const timeExceeded = timeSpent > (q.idealTimeSeconds || 60);

    const attemptPayload = {
      attemptNumber,
      userId: auth.currentUser?.uid,
      responseTime: new Date(), 
      isCorrect,
      attempts: {
        firstAttemptCorrect: attemptNumber === 1 ? isCorrect : state.attempts[0].isCorrect,
        secondAttemptCorrect: attemptNumber === 2 ? isCorrect : false
      },
      timeSpentInSeconds: timeSpent,
      hintViewed: state.hintViewed,
      pointsEarned,
      correctOptions: q.correctOptions,
      selectedOptions: [...state.selectedOptions],
      questionId: q.id,
      responseId: `res_${Date.now()}`,
      difficulty: q.difficulty || 'mid',
      topic: q.topic || 'Uncategorized',
      subTopic: q.subTopic || 'Uncategorized',
      wasSkippedInitially: state.wasSkippedInitially,
      revisited: state.revisited,
      exceededExpectedTime: timeExceeded,
      exceededExpectedTimeBy: timeExceeded ? timeSpent - (q.idealTimeSeconds || 60) : 0,
      ...attemptTelemetry // Spreads optionSelectionTimeline, hoverTime, timePerOption, focusLostCount, etc.
    };

    session.setQuestionStates(prev => ({
      ...prev,
      [q.id]: {
        ...state,
        status: isCorrect ? 'completed' : (isFirstAttempt && q.secondAttempt ? 'attempt1_failed' : 'completed'),
        attempts: [...state.attempts, attemptPayload]
      }
    }));
    
    setTimeSpent(0); // Reset timer for Attempt 2
  };

  const handleNext = () => {
    if (session.currentState.status === 'idle') session.skipQuestion(session.currentQ.id);
    if (session.currentIndex < questions.length - 1) {
      session.setCurrentIndex(p => p + 1);
      setTimeSpent(0);
    } else {
      finishExam();
    }
  };

  const handlePrevious = () => {
    if (session.currentState.status === 'idle') session.skipQuestion(session.currentQ.id);
    if (session.currentIndex > 0) {
      session.setCurrentIndex(p => p - 1);
      session.setQuestionStates(prev => ({ ...prev, [session.currentQ.id]: { ...prev[session.currentQ.id], revisited: true } }));
      setTimeSpent(0);
    }
  };

  // 🚨 THE DATABASE PUSHER (Writes to precise nested collections)
  const finishExam = async () => {
  setExamState('results');
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  try {
    const batch = writeBatch(db);
    
    // 1. Progress (Even: 4 segments)
    const progressRef = doc(db, 'batches', batchId, 'user_progress', userId);
    batch.set(progressRef, { 
      examResults: { 
        [exerciseId]: { score: session.score, total: questions.length, timeSpent: totalTimeSpent, completedAt: serverTimestamp() }
      }
    }, { merge: true });

    // 2. Exercise Metadata (Even: 4 segments)
    // Path: engine_logs (coll) / exercises (doc) / {exerciseId} (coll) / metadata (doc)
    // 🚨 BETTER PATH: engine_logs (coll) / {exerciseId} (doc)
    const exerciseDocRef = doc(db, 'engine_logs', exerciseId);
    batch.set(exerciseDocRef, { 
      exerciseId, 
      name: examConfig.title, 
      batch: batchId, 
      lastAttemptBy: userId,
      recordedAt: serverTimestamp() 
    }, { merge: true });

    // 3. Questions and Attempts
    Object.values(session.questionStates).forEach((qState) => {
      if (qState.attempts.length === 0) return;
      
      const qId = qState.attempts[0].questionId;

      // 🚨 FIXING THE PATH HERE:
      // Path: engine_logs (1) / {exerciseId} (2) / questions (3) / {qId} (4) 
      const questionDocRef = doc(db, 'engine_logs', exerciseId, 'questions', qId);
      
      batch.set(questionDocRef, { 
        questionId: qId, 
        lastUpdated: serverTimestamp() 
      }, { merge: true });

      qState.attempts.forEach((attempt) => {
        const finalAttemptData = { 
          ...attempt, 
          studentDifficulty: qState.studentDifficulty || 'unrated',
          responseTime: serverTimestamp() 
        };
        
        // 🚨 Path: engine_logs (1) / {exerciseId} (2) / questions (3) / {qId} (4) / attempts (5) / {responseId} (6)
        const attemptDocRef = doc(db, 'engine_logs', exerciseId, 'questions', qId, 'attempts', attempt.responseId);
        batch.set(attemptDocRef, finalAttemptData);
      });
    });

    await batch.commit();
    console.log("✅ Deep Logs Saved Successfully");

  } catch (err) {
    console.error("❌ Failed to save deep analytics:", err);
  }
};

  if (examState === 'loading') return <div className="h-screen w-full flex items-center justify-center"><p>Loading Engine...</p></div>;
  if (examState === 'intro') return <ExamIntro examConfig={examConfig} totalQuestions={questions.length} onStart={() => setExamState('active')} isDarkMode={isDarkMode} />;
  if (examState === 'results') return <ExamResults score={session.score} totalQuestions={questions.length} examConfig={examConfig} totalTimeSpent={totalTimeSpent} isDarkMode={isDarkMode} onDashboard={() => navigate('/student-dashboard')} />;

  const fontClasses = { small: 'text-base', medium: 'text-xl', large: 'text-3xl' }[settings.textSize];
  const timerIsCritical = timeSpent > (session.currentQ?.idealTimeSeconds || 60);

  return (
    <div className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <ExamHeader examConfig={examConfig} currentQ={session.currentQ} currentIndex={session.currentIndex} totalQuestions={questions.length} timeSpent={timeSpent} timerIsCritical={timerIsCritical} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onOpenSettings={() => setIsSettingsOpen(true)} onExit={() => navigate('/student-dashboard')} />
      
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 pb-10">
          <QuestionDisplay currentQ={session.currentQ} fontClasses={fontClasses} isDarkMode={isDarkMode} />
          
          {session.currentQ?.type.includes('choice') ? (
            <ChoiceInterface currentQ={session.currentQ} currentState={session.currentState} settings={settings} telemetry={telemetry} toggleOption={session.toggleOption} isDarkMode={isDarkMode} fontClasses={fontClasses} />
          ) : (
            <TextInterface currentQ={session.currentQ} telemetry={telemetry} currentState={session.currentState} toggleOption={session.toggleOption} isDarkMode={isDarkMode} fontClasses={fontClasses} />
          )}

          <PostAttemptFeedback currentQ={session.currentQ} currentState={session.currentState} settings={settings} markHintViewed={session.markHintViewed} setStudentDifficulty={session.setStudentDifficulty} isDarkMode={isDarkMode} />
        </div>
      </main>

      <ExamFooter currentIndex={session.currentIndex} onClear={() => session.clearSelection(session.currentQ.id)} totalQuestions={questions.length} currentState={session.currentState} onPrevious={handlePrevious} onCheck={handleCheck} onNext={handleNext} isDarkMode={isDarkMode} />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} setSettings={setSettings} isDarkMode={isDarkMode} />
    </div>
  );
}