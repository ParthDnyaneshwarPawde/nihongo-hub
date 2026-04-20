import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell
} from 'recharts';
import { 
  ArrowLeft, Clock, Target, Zap, BrainCircuit, AlertTriangle, CheckCircle2, 
  Info, History, ListChecks, Users, XCircle, ChevronDown, ChevronUp, Award, Loader2
} from 'lucide-react';
import { db, auth } from '@services/firebase';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';

export default function ExerciseAnalytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  
  // State for our Tabbed Interface
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'progress', 'review'
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  // States for Real Firebase Data
  const [progressData, setProgressData] = useState([]);
  const [peerData, setPeerData] = useState([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // Retrieve payload passed from ExamResults
  const { analytics, rawQuestions = [], questionStates = {}, batchId } = location.state || {};

  // --- 1. QUESTION REVIEW & POINTS CALCULATOR ---
  // Maps the raw questions with the user's state and calculates exact points
  const reviewData = useMemo(() => {
    if (!rawQuestions.length) return [];
    return rawQuestions.map(q => {
      const state = questionStates[q.id] || {};
      const finalAttempt = state.attempts?.[state.attempts.length - 1] || {};
      
      return {
        id: q.id,
        prompt: q.prompt,
        type: q.type,
        explanation: q.explanation || "No official solution provided.",
        isCorrect: state.isCorrect || false,
        isPartial: state.isPartial || false,
        userAnswer: finalAttempt.selectedOptions || [],
        correctAnswer: q.correctOptions || [],
        timeSpent: finalAttempt.timeSpentInSeconds || 0,
        pointsEarned: finalAttempt.pointsEarned || 0,
        totalPoints: q.points || 1 // Defaults to 1 if not specified in DB
      };
    });
  }, [rawQuestions, questionStates]);

  // Dynamically calculate the actual points based on question weights
  const totalPointsEarned = useMemo(() => reviewData.reduce((sum, q) => sum + q.pointsEarned, 0), [reviewData]);
  const maxPossiblePoints = useMemo(() => reviewData.reduce((sum, q) => sum + q.totalPoints, 0), [reviewData]);

  // --- 2. THE REAL DATABASE FETCHER ---
  useEffect(() => {
    const fetchRealData = async () => {
      const userId = auth.currentUser?.uid;
      // If we don't have the necessary IDs, fall back to safe defaults
      if (!userId || !batchId || !exerciseId) {
        setIsFetchingData(false);
        return;
      }

      try {
        // --- A. FETCH HISTORICAL PROGRESS (The Line Chart) ---
        const attemptsRef = collection(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId, 'attempts');
        const q = query(attemptsRef, orderBy('attemptNumber', 'asc'));
        const attemptDocs = await getDocs(q);
        
        const historyArray = [];
        attemptDocs.forEach(docSnap => {
          const data = docSnap.data();
          // Assuming data.score is points earned and data.totalQuestions is available
          // (Adjust accuracy math if your DB saves it differently)
          const pastAccuracy = data.totalQuestions > 0 ? Math.round((data.score / maxPossiblePoints) * 100) : 0;
          
          historyArray.push({
            attempt: `Attempt ${data.attemptNumber}`,
            accuracy: pastAccuracy || data.accuracy || 0,
            score: data.score // Actual points earned in that attempt
          });
        });

        // If history is somehow empty, fallback to the current session's data
        if (historyArray.length === 0 && analytics) {
          historyArray.push({
            attempt: 'Attempt 1',
            accuracy: analytics.overview.accuracyPercentage,
            score: totalPointsEarned
          });
        }
        setProgressData(historyArray);

        // --- B. FETCH PEER COMPARISON (The Bar Chart) ---
        const exerciseStatsRef = doc(db, 'analytics', 'exercises', 'exercises', exerciseId);
        const statsSnap = await getDoc(exerciseStatsRef);
        
        let classAvg = 50; // Fallback
        let topTen = 90; // Fallback
        
        if (statsSnap.exists() && statsSnap.data().globalAverage) {
            classAvg = statsSnap.data().globalAverage;
            topTen = statsSnap.data().topTenPercentile || 90;
        }

        setPeerData([
          { name: 'Your Score', score: analytics?.overview?.accuracyPercentage || 0, fill: '#6366f1' },
          { name: 'Class Average', score: classAvg, fill: '#334155' },
          { name: 'Top 10%', score: topTen, fill: '#10b981' }
        ]);

      } catch (error) {
        console.error("Failed to fetch deep analytics data:", error);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchRealData();
  }, [batchId, exerciseId, analytics, maxPossiblePoints, totalPointsEarned]);

  // Safeguard if accessed directly via URL without data
  if (!analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1121] text-white p-6">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">Data Unavailable</h2>
        <p className="text-slate-400 mb-6">Please complete the exercise to view your deep analytics.</p>
        <button onClick={() => navigate(-2)} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold transition-all active:scale-95">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { overview, badge, smartInsights, topicBreakdown } = analytics;

  // Format data for Radar Chart
  const radarData = useMemo(() => {
    return Object.keys(topicBreakdown || {}).map(topic => {
      const stats = topicBreakdown[topic];
      return {
        subject: topic.replace(/_/g, ' ').toUpperCase(),
        accuracy: Math.round((stats.correct / stats.total) * 100) || 0,
        fullMark: 100,
      };
    });
  }, [topicBreakdown]);

  // --- RENDER HELPERS ---
  const getInsightIcon = (type) => {
    switch(type) {
      case 'danger': return <AlertTriangle className="text-rose-500" size={20} />;
      case 'warning': return <Zap className="text-amber-500" size={20} />;
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'action': return <Target className="text-indigo-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-50 bg-[#0B1121]/80 backdrop-blur-xl border-b border-slate-800/60 pt-6 pb-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-2)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Deep Analytics</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance Dashboard</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex bg-slate-800/50 p-1 rounded-2xl">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Target size={16}/>} label="Overview" />
            <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<History size={16}/>} label="Progress" />
            <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<ListChecks size={16}/>} label="Review" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4">
        {isFetchingData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
             <p className="font-bold tracking-widest uppercase text-sm">Crunching Historical Data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ========================================== */}
            {/* TAB 1: OVERVIEW & PEER COMPARISON          */}
            {/* ========================================== */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                
                {/* TOP ROW: KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 🚨 REAL POINTS DISPLAYED HERE */}
                  <MetricCard icon={<Award className="text-amber-400"/>} label="Total Score" value={`${totalPointsEarned} / ${maxPossiblePoints}`} subtext="Points Earned" />
                  <MetricCard icon={<CheckCircle2 className="text-emerald-400"/>} label="Correct" value={`${overview.score} / ${overview.total}`} subtext="Questions" />
                  <MetricCard icon={<Target className="text-indigo-400"/>} label="Accuracy" value={`${overview.accuracyPercentage}%`} subtext="Precision" />
                  <MetricCard icon={<Clock className="text-blue-400"/>} label="Pacing" value={`${overview.avgTimePerQuestion}s`} subtext="Avg Per Question" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Persona Badge */}
                  <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-[2rem] p-8 text-center relative overflow-hidden shadow-2xl flex flex-col items-center justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full" />
                    <div className="text-6xl mb-4">{badge.icon}</div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Your Exam Persona</p>
                    <h3 className="text-2xl font-black text-white mb-2">{badge.name}</h3>
                    <p className="text-sm text-indigo-200/70 font-medium">{badge.desc}</p>
                  </div>

                  {/* Peer Comparison Chart */}
                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2rem] p-6 shadow-2xl lg:col-span-2 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="text-slate-400" size={24} />
                      <div>
                        <h2 className="text-lg font-black text-white">Peer Comparison</h2>
                        <p className="text-xs text-slate-500 font-medium">How you stack up against the global average.</p>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peerData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #1e293b', borderRadius: '12px' }} />
                          <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={24}>
                            {peerData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW: Insights & Radar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2rem] p-6 shadow-2xl flex flex-col">
                    <h2 className="text-lg font-black text-white mb-2">Topic Mastery</h2>
                    <div className="flex-1 min-h-[300px] w-full relative">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Accuracy" dataKey="accuracy" stroke="#818cf8" strokeWidth={2} fill="#6366f1" fillOpacity={0.4} />
                            <Tooltip contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #1e293b', borderRadius: '12px' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold">No topic data available.</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#151E2E] border border-slate-800 rounded-[2rem] p-6 shadow-2xl flex flex-col">
                    <h2 className="text-lg font-black text-white mb-6">AI Behavioral Insights</h2>
                    <div className="flex flex-col gap-4 flex-1">
                      {smartInsights.length > 0 ? smartInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-[#0B1121] border border-slate-800/60">
                          <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                          <p className="text-sm font-medium leading-relaxed text-slate-300">{insight.text}</p>
                        </div>
                      )) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                          <CheckCircle2 size={32} className="mb-3 text-slate-600" />
                          <p className="font-bold text-slate-400">Perfectly balanced performance!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* TAB 2: HISTORICAL PROGRESS                 */}
            {/* ========================================== */}
            {activeTab === 'progress' && (
              <motion.div key="progress" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="bg-[#151E2E] border border-slate-800 rounded-[2rem] p-8 shadow-2xl">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-white">Your Growth Journey</h2>
                    <p className="text-slate-400 font-medium">Tracking your accuracy and points across multiple attempts of this exercise.</p>
                  </div>
                  
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="attempt" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0B1121', border: '1px solid #1e293b', borderRadius: '12px' }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        
                        <Line yAxisId="left" type="monotone" name="Accuracy (%)" dataKey="accuracy" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#0B1121' }} activeDot={{ r: 8 }} />
                        {/* 🚨 REAL POINTS GRAPHED HERE */}
                        <Line yAxisId="left" type="monotone" name="Total Points" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#0B1121' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* TAB 3: DETAILED QUESTION REVIEW            */}
            {/* ========================================== */}
            {activeTab === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white">Answer Breakdown</h2>
                    <p className="text-slate-400 font-medium">Review every question, check the official solutions, and see where you lost points.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewData.length > 0 ? reviewData.map((q, index) => (
                    <div key={q.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${expandedQuestion === q.id ? 'bg-[#151E2E] border-slate-700 shadow-xl' : 'bg-[#0B1121] border-slate-800/60 hover:border-slate-700'}`}>
                      
                      {/* Collapsed View (Clickable Header) */}
                      <div 
                        onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                        className="p-5 cursor-pointer flex items-center gap-4 select-none"
                      >
                        <div className="flex-shrink-0">
                          {q.isCorrect ? <CheckCircle2 className="text-emerald-500" size={24}/> : 
                           q.isPartial ? <Zap className="text-amber-500" size={24}/> : 
                           <XCircle className="text-rose-500" size={24}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Question {index + 1} • {q.timeSpent}s</p>
                          <p className="text-slate-200 font-medium truncate">{q.prompt || "Media/Component based question"}</p>
                        </div>
                        <div className="text-right flex-shrink-0 mr-4 hidden md:block">
                          <p className="text-xs text-slate-500 font-bold uppercase">Points</p>
                          {/* 🚨 EXACT POINTS DISPLAYED HERE */}
                          <p className={`font-black ${q.isCorrect ? 'text-emerald-400' : 'text-slate-400'}`}>+{q.pointsEarned} / {q.totalPoints}</p>
                        </div>
                        {expandedQuestion === q.id ? <ChevronUp className="text-slate-500"/> : <ChevronDown className="text-slate-500"/>}
                      </div>

                      {/* Expanded View (Solutions) */}
                      <AnimatePresence>
                        {expandedQuestion === q.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-800/60 bg-[#0F172A]">
                            <div className="p-6 space-y-6">
                              
                              {/* The Question */}
                              <div>
                                <p className="text-xs font-black uppercase text-slate-500 mb-2">The Prompt</p>
                                <div className="p-4 bg-slate-900/50 rounded-xl text-lg text-slate-300 font-medium border border-slate-800">
                                  {q.prompt}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Your Answer */}
                                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                                  <p className="text-xs font-black uppercase text-slate-500 mb-2">Your Answer</p>
                                  <p className={`font-bold text-lg ${q.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {q.userAnswer.length > 0 ? q.userAnswer.join(', ') : <span className="text-slate-500 italic">Skipped / Blank</span>}
                                  </p>
                                </div>

                                {/* Correct Answer */}
                                <div className="p-4 rounded-xl bg-indigo-900/10 border border-indigo-500/20">
                                  <p className="text-xs font-black uppercase text-indigo-400/70 mb-2">Correct Answer</p>
                                  <p className="font-bold text-lg text-indigo-300">
                                    {q.correctAnswer.length > 0 ? q.correctAnswer.join(', ') : "Check solution text"}
                                  </p>
                                </div>
                              </div>

                              {/* Official Explanation */}
                              <div>
                                <p className="text-xs font-black uppercase text-slate-500 mb-2 flex items-center gap-2">
                                  <BrainCircuit size={14}/> Official Solution
                                </p>
                                <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-indigo-100/80 leading-relaxed text-sm">
                                  {q.explanation}
                                </div>
                              </div>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  )) : (
                    <div className="text-center p-10 bg-[#151E2E] rounded-[2rem] border border-slate-800">
                      <p className="text-slate-400 font-medium">No question detail available for this test type.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Helper Components
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function MetricCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-[#151E2E] rounded-[1.5rem] p-5 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-[#0B1121] rounded-xl border border-slate-800">{icon}</div>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white mb-1">{value}</p>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{subtext}</p>
      </div>
    </div>
  );
}