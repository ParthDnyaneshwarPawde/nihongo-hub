import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Area, AreaChart
} from 'recharts';
import { 
  ArrowLeft, Clock, Target, Zap, BrainCircuit, AlertTriangle, CheckCircle2, 
  Info, History, ListChecks, Users, XCircle, ChevronDown, ChevronUp, Award, Loader2, MousePointer2, LayoutTemplate
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';

// ==========================================
// 🧠 THE ADVANCED AI BEHAVIORAL ENGINE
// ==========================================
const analyzeQuestionBehavior = (state, finalAttempt, expectedTime = 30) => {
  const timeSpent = finalAttempt?.timeSpentInSeconds || 0;
  const isCorrect = state?.isCorrect || false;
  const changes = finalAttempt?.changeCount || 0; 
  const attempts = state?.attempts?.length || 1;
  const hovers = finalAttempt?.hoverTime || {}; 
  const correctOptions = finalAttempt?.correctOptions || [];

  const tabSwitches = finalAttempt?.tabSwitchedCount || 0;
  const focusLost = finalAttempt?.focusLostCount || 0;
  const hintUsed = finalAttempt?.hintViewed || false;
  const skippedInitially = finalAttempt?.wasSkippedInitially || false;
  const firstResponse = finalAttempt?.firstResponseTime || null;
  const lastResponse = finalAttempt?.lastResponseTime || null;

  let insights = [];
  let badge = null;

  const isFast = timeSpent < (expectedTime * 0.5); 
  const isSlow = timeSpent > (expectedTime * 1.5); 

  if (tabSwitches > 0 || focusLost > 0) {
    insights.push({ icon: '👀', title: 'Distracted', text: `You switched tabs or lost focus ${tabSwitches + focusLost} times. Stay in the zone!`, color: 'text-rose-500' });
  }

  if (skippedInitially && isCorrect) {
    insights.push({ icon: '⏱️', title: 'Strategic Return', text: 'You skipped this initially and came back to nail it. Excellent time management.', color: 'text-emerald-400' });
  } else if (skippedInitially && !isCorrect) {
    insights.push({ icon: '⚠️', title: 'Difficult Concept', text: 'You skipped this and still struggled upon return. Deep review needed.', color: 'text-amber-400' });
  }

  if (hintUsed && isCorrect) {
    insights.push({ icon: '💡', title: 'Hint Assisted', text: 'You used a hint to get this correct. Try to solve it raw next time.', color: 'text-blue-400' });
  } else if (hintUsed && !isCorrect) {
    insights.push({ icon: '🚨', title: 'Ineffective Hint', text: 'Even with the hint, you missed this. This is a critical weak point.', color: 'text-rose-500' });
  }

  if (firstResponse && lastResponse && (lastResponse - firstResponse > expectedTime * 0.5)) {
    insights.push({ icon: '⏳', title: 'High Hesitation', text: `You spent ${(lastResponse - firstResponse).toFixed(1)}s doubting yourself before your final choice.`, color: 'text-amber-400' });
  }

  if (isFast && isCorrect) {
    insights.push({ icon: '🧠', title: 'Mastery', text: "Lightning fast and perfectly accurate.", color: 'text-emerald-400' });
    badge = { name: "Sharpshooter", icon: "🎯", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  } else if (isFast && !isCorrect) {
    insights.push({ icon: '⚡', title: 'Impulsive', text: "You rushed this question. Slow down and read carefully.", color: 'text-amber-400' });
    badge = { name: "Speedster", icon: "⚡", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  } else if (isSlow && isCorrect) {
    insights.push({ icon: '🎯', title: 'Careful Thinking', text: "Highly accurate, but took significant time.", color: 'text-blue-400' });
    badge = { name: "Thinker", icon: "🧠", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  } else if (isSlow && !isCorrect) {
    insights.push({ icon: '🤯', title: 'Confusion', text: "You spent a lot of time but remained unsure.", color: 'text-rose-400' });
    badge = { name: "Overthinker", icon: "🤯", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  }

  if (changes === 0 && isCorrect) {
    if (!insights.find(i => i.title === 'Mastery')) {
      insights.push({ icon: '💪', title: 'Confident', text: "You trusted your first instinct—keep it up!", color: 'text-emerald-400' });
    }
  } else if (changes === 0 && !isCorrect && isFast) {
    insights.push({ icon: '🎲', title: 'Blind Guess', text: "You answered instantly but incorrectly. Avoid guessing.", color: 'text-slate-400' });
    if (!badge) badge = { name: "Guesser", icon: "🎲", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20" };
  } else if (changes > 0 && finalAttempt.changedAnswer && isCorrect) {
    insights.push({ icon: '🔄', title: 'Learning', text: "Nice recovery! You realized your mistake and fixed it.", color: 'text-indigo-400' });
  } else if (changes > 0 && finalAttempt.changedAnswer && !isCorrect) {
    insights.push({ icon: '😵', title: 'Second Guessing', text: "You overthought it and changed to a wrong answer.", color: 'text-rose-400' });
  }

  let hoveredCorrect = false;
  Object.entries(hovers).forEach(([key, time]) => {
    if ((correctOptions.includes(Number(key)) || correctOptions.includes(key)) && time > 0.5) {
      hoveredCorrect = true;
    }
  });
  if (hoveredCorrect && !isCorrect) {
    insights.push({ icon: '🤔', title: 'Self-Doubt', text: "You hovered over the correct answer but didn't pick it.", color: 'text-amber-400' });
  }

  if (!badge) badge = { name: "Tactician", icon: "⚖️", color: "text-slate-300", bg: "bg-slate-800", border: "border-slate-700" };

  return { insights, badge };
};

// 🚨 FALLBACK GENERATOR: Computes insights dynamically if DB fails to provide them
const generateFallbackInsights = (data) => {
  let fastWrong = 0, slowCorrect = 0, slowWrong = 0, fastCorrect = 0;
  data.forEach(q => {
    const isFast = q.timeSpent < 15;
    const isSlow = q.timeSpent > 45;
    if (isFast && !q.isCorrect) fastWrong++;
    if (isFast && q.isCorrect) fastCorrect++;
    if (isSlow && q.isCorrect) slowCorrect++;
    if (isSlow && !q.isCorrect) slowWrong++;
  });

  const insights = [];
  if (fastWrong > 0) insights.push({ type: 'warning', text: "You rushed a few answers. Slow down and read carefully to improve accuracy." });
  if (slowCorrect > 0) insights.push({ type: 'info', text: "You are highly accurate, but taking longer than average. Try to improve pacing." });
  if (slowWrong > 0) insights.push({ type: 'danger', text: "You spent significant time on questions you missed. Review these core topics." });
  if (fastCorrect > 0) insights.push({ type: 'success', text: "Excellent mastery! You answer quickly and accurately." });
  
  if (insights.length === 0) insights.push({ type: 'success', text: "Solid performance overall. Check the individual question breakdown below." });
  return insights.slice(0, 3);
};

export default function ExerciseAnalytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  
  const [activeTab, setActiveTab] = useState('overview'); 
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [viewingOriginalUI, setViewingOriginalUI] = useState(null); 

  const [progressData, setProgressData] = useState([]);
  const [peerData, setPeerData] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const { analytics = {}, rawQuestions = [], questionStates = {}, batchId } = location.state || {};

  // --- 1. DATA PREP WITH AI BEHAVIORAL ANALYSIS ---
  const reviewData = useMemo(() => {
    if (!rawQuestions.length) return [];
    
    return rawQuestions.map(q => {
      const state = questionStates[q.id] || {};
      const finalAttempt = state.attempts?.[state.attempts.length - 1] || {};
      
      let expectedTime = 10;
      if (q.type === 'kanji_draw') expectedTime = 15;
      if (q.type === 'text_input') expectedTime = 12;

      const behaviorAnalysis = analyzeQuestionBehavior(state, finalAttempt, expectedTime);

      return {
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        options: q.options || q.choices || [],
        explanation: q.explanation || "No official solution provided.",
        isCorrect: state.isCorrect || false,
        isPartial: state.isPartial || false,
        userAnswer: finalAttempt.selectedOptions || finalAttempt.finalSelectedOptions || [],
        correctAnswer: q.correctOptions || finalAttempt.correctOptions || [],
        timeSpent: finalAttempt.timeSpentInSeconds || 0,
        pointsEarned: finalAttempt.pointsEarned || 0,
        totalPoints: q.points || 4, 
        behavior: behaviorAnalysis,
        rawAttemptData: finalAttempt 
      };
    });
  }, [rawQuestions, questionStates]);

  const totalPointsEarned = useMemo(() => reviewData.reduce((sum, q) => sum + q.pointsEarned, 0), [reviewData]);
  const maxPossiblePoints = useMemo(() => reviewData.reduce((sum, q) => sum + q.totalPoints, 0), [reviewData]);

  // 🚨 BULLETPROOF FALLBACKS
  const computedAvgTime = useMemo(() => reviewData.length ? Math.round(reviewData.reduce((sum, q) => sum + q.timeSpent, 0) / reviewData.length) : 0, [reviewData]);
  const displayPacing = analytics.overview?.avgTimePerQuestion || computedAvgTime;
  
  const displayAccuracy = analytics.overview?.accuracyPercentage || (reviewData.length ? Math.round((reviewData.filter(q => q.isCorrect).length / reviewData.length) * 100) : 0);
  
  const displayInsights = (analytics.smartInsights && analytics.smartInsights.length > 0) ? analytics.smartInsights : generateFallbackInsights(reviewData);
  
  const displayBadge = analytics.badge || { name: "Tactician", icon: "⚖️", desc: "A perfectly balanced mix of speed and accuracy." };

  // --- 2. FIREBASE ANALYTICS FETCH ---
  useEffect(() => {
    const fetchRealData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !batchId || !exerciseId) {
        setIsFetchingData(false);
        return;
      }

      try {
        const attemptsRef = collection(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId, 'attempts');
        const q = query(attemptsRef, orderBy('attemptNumber', 'asc'));
        const attemptDocs = await getDocs(q);
        
        const historyArray = [];
        attemptDocs.forEach(docSnap => {
          const data = docSnap.data();
          historyArray.push({
            attempt: `Attempt ${data.attemptNumber}`,
            accuracy: data.accuracyPercentage || Math.round((data.score / maxPossiblePoints) * 100) || 0,
            score: data.score || 0,
            time: data.totalTimeSpent || 0
          });
        });

        if (historyArray.length === 0) {
          historyArray.push({
            attempt: 'Attempt 1',
            accuracy: displayAccuracy,
            score: totalPointsEarned,
            time: computedAvgTime * (reviewData.length || 1)
          });
        }
        setProgressData(historyArray);

        const exerciseStatsRef = doc(db, 'analytics', 'exercises', 'exercises', exerciseId);
        const statsSnap = await getDoc(exerciseStatsRef);
        
        let classAvg = 50; 
        let topTen = 90; 
        
        if (statsSnap.exists() && statsSnap.data().globalAverage) {
            const globalData = statsSnap.data();
            classAvg = globalData.globalAverage;
            topTen = globalData.topTenPercentile || 90;
        }

        setPeerData([
          { name: 'Your Score', score: displayAccuracy, fill: '#6366f1' },
          { name: 'Class Average', score: classAvg, fill: '#334155' },
          { name: 'Top 10%', score: topTen, fill: '#10b981' }
        ]);

      } catch (error) {
        console.error("Critical Analytics Error:", error);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchRealData();
  }, [batchId, exerciseId, analytics, maxPossiblePoints, totalPointsEarned, displayAccuracy, computedAvgTime, reviewData.length]);

  if (!rawQuestions || rawQuestions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1121] text-white p-6">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">No Active Data</h2>
        <p className="text-slate-400 mb-6 text-center max-w-xs">Return to the dashboard and complete an exercise to see this dashboard.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold active:scale-95 transition-all">
          Back to Dojo
        </button>
      </div>
    );
  }

  const radarData = useMemo(() => {
    const breakdown = analytics.topicBreakdown || {};
    return Object.keys(breakdown).map(topic => ({
      subject: topic.replace(/_/g, ' ').toUpperCase(),
      accuracy: Math.round((breakdown[topic].correct / breakdown[topic].total) * 100) || 0,
    }));
  }, [analytics.topicBreakdown]);

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-200 selection:bg-indigo-500/30 pb-20">
      
      {/* 🟢 NAVIGATION HEADER */}
      <div className="sticky top-0 z-50 bg-[#0B1121]/80 backdrop-blur-xl border-b border-slate-800/60 pt-6 pb-4 px-4 md:px-8 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all hover:-translate-x-1">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Diagnostic Engine</h1>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Deep Behavioral Analysis</p>
            </div>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-inner">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Target size={16}/>} label="Overview" />
            <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<History size={16}/>} label="History" />
            <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<ListChecks size={16}/>} label="Question Analysis" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {isFetchingData ? (
          <div className="flex flex-col items-center justify-center py-32 text-indigo-500">
             <Loader2 size={48} className="animate-spin mb-4" />
             <p className="font-black uppercase tracking-widest text-xs">Synchronizing Performance Data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ========================================== */}
            {/* 📊 TAB 1: OVERVIEW & PEER COMPARISON */}
            {/* ========================================== */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard icon={<Award className="text-amber-400"/>} label="Score" value={`${totalPointsEarned}/${maxPossiblePoints}`} subtext="Points Earned" />
                  <MetricCard icon={<CheckCircle2 className="text-emerald-400"/>} label="Result" value={`${reviewData.filter(q => q.isCorrect).length}/${reviewData.length}`} subtext="Questions Correct" />
                  {/* 🚨 BULLETPROOF ACCURACY */}
                  <MetricCard icon={<Target className="text-indigo-400"/>} label="Accuracy" value={`${displayAccuracy}%`} subtext="Success Rate" />
                  {/* 🚨 BULLETPROOF PACING */}
                  <MetricCard icon={<Clock className="text-blue-400"/>} label="Pacing" value={`${displayPacing}s`} subtext="Time per question" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Persona */}
                  <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl flex flex-col items-center justify-center">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full" />
                    <div className="text-7xl mb-6 drop-shadow-2xl">{displayBadge.icon}</div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Exam Persona</p>
                    <h3 className="text-3xl font-black text-white mb-3">{displayBadge.name}</h3>
                    <p className="text-sm text-indigo-200/60 font-medium leading-relaxed">{displayBadge.desc}</p>
                  </div>

                  {/* Peer Comparison Chart */}
                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl lg:col-span-2 flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-slate-800 rounded-2xl"><Users className="text-indigo-400" size={24} /></div>
                      <div>
                        <h2 className="text-xl font-black text-white">Global Peer Benchmarking</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">How you stack against all students</p>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[250px] relative w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peerData} layout="vertical" margin={{ left: 90, right: 30, top: 0, bottom: 0 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} width={90} />
                          <Tooltip cursor={{ fill: '#1e293b', radius: 12 }} contentStyle={{ backgroundColor: '#0B1121', borderRadius: '16px', border: '1px solid #1e293b', color: '#fff', fontWeight: 'bold' }} formatter={(value) => [`${value}% Accuracy`, '']} />
                          <Bar dataKey="score" radius={[0, 12, 12, 0]} barSize={32} label={{ position: 'right', fill: '#94a3b8', fontWeight: 800, formatter: (val) => `${val}%` }}>
                            {peerData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar */}
                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                    <h2 className="text-xl font-black text-white mb-6">Subject Proficiency Map</h2>
                    <div className="h-[350px] w-full">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                            <Radar name="You" dataKey="accuracy" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} strokeWidth={3} />
                            <Tooltip contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 font-bold uppercase tracking-widest text-xs">No Topic Data Available</div>
                      )}
                    </div>
                  </div>

                  {/* 🚨 BULLETPROOF AI INSIGHTS */}
                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                    <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                        <BrainCircuit className="text-indigo-400" /> High-Level Insights
                    </h2>
                    <div className="space-y-4">
                      {displayInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-5 rounded-3xl bg-[#0B1121] border border-slate-800/40 hover:border-indigo-500/30 transition-all">
                          <div className="mt-1">
                             {insight.type === 'danger' ? <AlertTriangle className="text-rose-500" size={20} /> :
                              insight.type === 'warning' ? <Zap className="text-amber-500" size={20} /> :
                              <CheckCircle2 className="text-emerald-500" size={20} />}
                          </div>
                          <p className="text-sm font-bold leading-relaxed text-slate-300">{insight.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* 📈 TAB 2: PROGRESS HISTORY (YOUR PAST) */}
            {/* ========================================== */}
            {activeTab === 'progress' && (
              <motion.div key="progress" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="bg-[#151E2E] border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                  <div className="mb-10 flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Your Evolutionary Curve</h2>
                      <p className="text-slate-400 font-medium">Tracking improvement across multiple attempts for this exact exercise.</p>
                    </div>
                  </div>
                  
                  <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={progressData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="attempt" stroke="#475569" tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }} dy={15} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" domain={[0, 100]} stroke="#475569" tick={{ fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#6366f1" tick={{ fill: '#6366f1', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #1e293b', borderRadius: '20px', padding: '15px', color: '#fff' }} />
                        <Legend verticalAlign="top" align="right" height={50} iconType="circle" wrapperStyle={{ fontWeight: 'bold' }} />
                        <Area yAxisId="left" type="monotone" name="Accuracy %" dataKey="accuracy" stroke="#10b981" fillOpacity={1} fill="url(#colorAccuracy)" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0 }} connectNulls />
                        <Area yAxisId="right" type="monotone" name="Total Points" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0 }} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* ✅ TAB 3: AI DIAGNOSTIC REVIEW (BEHAVIORAL) */}
            {/* ========================================== */}
            {activeTab === 'review' && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="mb-6 bg-[#151E2E] border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white mb-2">Behavioral Question Analysis</h2>
                    <p className="text-slate-400 font-medium">We analyzed your tab switches, hovers, and timeline to find exactly why you missed or nailed questions.</p>
                  </div>
                  <BrainCircuit size={48} className="text-indigo-500/20 hidden md:block" />
                </div>

                <div className="space-y-4">
                  {reviewData.map((q, idx) => (
                    <div key={q.id} className={`rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${expandedQuestion === q.id ? 'bg-[#151E2E] border-slate-700 shadow-2xl scale-[1.01]' : 'bg-[#0B1121] border-slate-800/80 hover:border-slate-700'}`}>
                      
                      {/* HEADER - Always Visible */}
                      <div onClick={() => {
                        setExpandedQuestion(expandedQuestion === q.id ? null : q.id);
                        if (expandedQuestion === q.id) setViewingOriginalUI(null); 
                      }} className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                        
                        <div className="flex items-center gap-5 flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/5 ${q.isCorrect ? 'bg-emerald-500/10 text-emerald-400' : q.isPartial ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {q.isCorrect ? <CheckCircle2 size={28}/> : q.isPartial ? <Zap size={28}/> : <XCircle size={28}/>}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Question {idx + 1}</p>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${q.behavior.badge.bg} ${q.behavior.badge.color} ${q.behavior.badge.border}`}>
                                {q.behavior.badge.icon} {q.behavior.badge.name}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-lg truncate pr-4">{q.prompt}</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 self-end md:self-center shrink-0">
                          <div className="flex items-center gap-6 mr-4">
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5 flex items-center justify-end gap-1"><Clock size={10}/> Time</p>
                              <p className="font-bold text-slate-300">{q.timeSpent}s</p>
                            </div>
                            <div className="w-px h-8 bg-slate-800"></div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Points</p>
                                <p className={`font-black text-lg leading-none ${q.isCorrect ? 'text-emerald-400' : 'text-slate-400'}`}>+{q.pointsEarned}</p>
                            </div>
                          </div>
                          <div className={`p-2 rounded-xl transition-colors ${expandedQuestion === q.id ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800 group-hover:text-indigo-400'}`}>
                            {expandedQuestion === q.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT */}
                      <AnimatePresence>
                        {expandedQuestion === q.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-800/80 bg-[#0F172A]">
                            <div className="p-6 md:p-10 space-y-8">
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 h-full">
                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2"><MousePointer2 size={14}/> Behavioral Scan</h5>
                                  <div className="space-y-5">
                                    {q.behavior.insights.map((insight, i) => (
                                      <div key={i} className="flex gap-3 items-start">
                                        <div className="text-lg leading-none mt-0.5">{insight.icon}</div>
                                        <div>
                                          <p className={`text-sm font-bold mb-1 ${insight.color}`}>{insight.title}</p>
                                          <p className="text-xs text-slate-400 font-medium leading-relaxed">{insight.text}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 gap-4">
                                  <div className="p-6 rounded-3xl bg-[#0B1121] border border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Your Selection</p>
                                    <p className={`text-lg font-bold ${q.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>{Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : q.userAnswer || "No input provided"}</p>
                                  </div>
                                  <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">Correct Answer</p>
                                    <p className="text-lg font-bold text-indigo-100">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-8 bg-indigo-900/10 rounded-[2rem] border border-indigo-500/20">
                                <h5 className="flex items-center gap-2 text-indigo-400 font-black uppercase text-xs tracking-widest mb-4"><BrainCircuit size={16}/> Official Solution</h5>
                                <p className="text-indigo-100/90 leading-relaxed font-medium text-sm">{q.explanation}</p>
                              </div>

                              <div className="flex justify-end pt-4 border-t border-slate-800">
                                <button 
                                  onClick={() => setViewingOriginalUI(viewingOriginalUI === q.id ? null : q.id)}
                                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold text-sm transition-all"
                                >
                                  <LayoutTemplate size={16} />
                                  {viewingOriginalUI === q.id ? "Hide Original UI" : "View Original Question UI"}
                                </button>
                              </div>

                              <AnimatePresence>
                                {viewingOriginalUI === q.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-8 bg-[#050810] rounded-3xl border border-slate-800 relative mt-4 overflow-hidden"
                                  >
                                    <div className="absolute top-4 right-4 bg-slate-800 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest z-10 shadow-lg">
                                      Read Only View
                                    </div>
                                    
                                    <div className="opacity-95 mt-4">
                                      <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
                                        <LayoutTemplate size={16}/> Question Type: <span className="text-white font-bold uppercase tracking-wider">{q.type.replace('_', ' ')}</span>
                                      </p>
                                      
                                      <div className="p-8 border border-slate-700/80 rounded-[2rem] bg-[#0B1121] shadow-xl">
                                        <p className="text-xl font-bold text-white mb-8 leading-relaxed">{q.prompt}</p>
                                        
                                        <div className="space-y-3">
                                          {q.options && q.options.length > 0 ? (
                                            q.options.map((opt, optIdx) => {
                                              const optId = typeof opt === 'object' ? (opt.id !== undefined ? opt.id : opt.optionId !== undefined ? opt.optionId : optIdx) : optIdx;
                                              const optText = typeof opt === 'object' ? (opt.option || opt.text || opt.label || JSON.stringify(opt)) : opt;
                                              
                                              const isSelected = Array.isArray(q.userAnswer) ? q.userAnswer.includes(optId) : q.userAnswer === optId;
                                              const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(optId) : q.correctAnswer === optId;

                                              let styleClass = "border-slate-700 bg-slate-800/30 text-slate-300";
                                              let icon = null;

                                              if (isSelected && isCorrect) {
                                                styleClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold";
                                                icon = <CheckCircle2 className="text-emerald-500" size={20} />;
                                              } else if (isSelected && !isCorrect) {
                                                styleClass = "border-rose-500/50 bg-rose-500/10 text-rose-400 font-bold";
                                                icon = <XCircle className="text-rose-500" size={20} />;
                                              } else if (!isSelected && isCorrect) {
                                                styleClass = "border-indigo-500/50 bg-indigo-500/10 text-indigo-300 border-dashed font-bold";
                                                icon = <CheckCircle2 className="text-indigo-400" size={20} />;
                                              }

                                              return (
                                                <div key={optIdx} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${styleClass}`}>
                                                  <span>{optText}</span>
                                                  {icon}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div className="p-8 rounded-3xl border-2 border-slate-700 border-dashed bg-slate-800/30 text-center">
                                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Student Input Recorded</p>
                                              <p className="text-3xl text-white font-bold">
                                                {Array.isArray(q.userAnswer) ? q.userAnswer.join(', ') : q.userAnswer || "No input provided"}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
      {icon} {label}
    </button>
  );
}

function MetricCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-[#151E2E] rounded-[2rem] p-6 border border-slate-800 shadow-2xl flex flex-col justify-between hover:border-slate-700 transition-colors">
      <div className="p-3 bg-[#0B1121] w-fit rounded-[1rem] border border-slate-800 mb-6">{icon}</div>
      <div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-3xl font-black text-white mb-1 tracking-tighter">{value}</p>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{subtext}</p>
      </div>
    </div>
  );
}