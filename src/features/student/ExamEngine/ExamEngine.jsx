import React, { useState, useEffect } from 'react';
import { 
  X, Settings as SettingsIcon, Bookmark, Clock, Volume2, 
  ChevronRight, ChevronLeft, CheckCircle2, PlayCircle, AlertCircle,
  Moon, Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ==========================================
// 📦 DUMMY DATA (Phase 1 Testing)
// ==========================================
const DUMMY_QUESTIONS = [
  {
    id: "q_001",
    type: "Vocab & Kanji",
    prompt: "Choose the correct reading for the highlighted word.",
    highlightedWord: "電車",
    sentence: "毎日 [電車] で学校に行きます。",
    mediaType: "none",
    options: [
      { id: "opt_1", text: "でんしゃ", peerStat: 78 },
      { id: "opt_2", text: "じてんしゃ", peerStat: 12 },
      { id: "opt_3", text: "じどうしゃ", peerStat: 5 },
      { id: "opt_4", text: "くるま", peerStat: 5 }
    ],
    correctOptionId: "opt_1",
    idealTimeSeconds: 30,
    explanation: "電車 (densha) means train. じてんしゃ (jitensha) is bicycle, and じどうしゃ (jidousha) is car."
  },
  {
    id: "q_002",
    type: "Grammar",
    prompt: "Fill in the blank with the most appropriate particle.",
    sentence: "私はりんご ___ 好きです。",
    mediaType: "none",
    options: [
      { id: "opt_1", text: "を", peerStat: 35 },
      { id: "opt_2", text: "が", peerStat: 55 },
      { id: "opt_3", text: "に", peerStat: 8 },
      { id: "opt_4", text: "で", peerStat: 2 }
    ],
    correctOptionId: "opt_2",
    idealTimeSeconds: 45,
    explanation: "The adjective 好き (suki) requires the particle が (ga) to mark the thing that is liked."
  },
  {
    id: "q_003",
    type: "Listening",
    prompt: "Listen to the audio and choose the correct time.",
    mediaType: "audio",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
    options: [
      { id: "opt_1", text: "10:30", peerStat: 20 },
      { id: "opt_2", text: "10:45", peerStat: 60 },
      { id: "opt_3", text: "11:00", peerStat: 15 },
      { id: "opt_4", text: "11:15", peerStat: 5 }
    ],
    correctOptionId: "opt_2",
    idealTimeSeconds: 60,
    explanation: "The announcer clearly states the train is delayed by 15 minutes, pushing the 10:30 departure to 10:45."
  }
];

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
export default function ExamEngine() {
  const navigate = useNavigate();
  // 🚨 Restored Dynamic Theme State
  const [isDarkMode, setIsDarkMode] = useState(true); 
  
  // -- Exam State --
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  
  // -- Settings State --
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    alwaysShowNote: true,
    solutionMode: false,
    autoStartTimer: true,
    playSounds: true,
    delayCorrectDisplay: false,
    textSize: 'medium', 
    showPeerStats: true
  });
  
  // -- Question State --
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [checkStatus, setCheckStatus] = useState("idle"); 
  const [attempts, setAttempts] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQ = DUMMY_QUESTIONS[currentIndex];

  // ⏱️ STOPWATCH TIMER
  useEffect(() => {
    let timer;
    if (settings.autoStartTimer) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentIndex, settings.autoStartTimer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 🔊 HARDWARE FEEDBACK
  const playSound = (type) => {
    if (!settings.playSounds) return;
    console.log(`🔊 Playing sound: ${type === 'correct' ? 'TADAN! ✨' : 'UH-OH ❌'}`);
  };

  const triggerVibration = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]); 
    }
  };

  // 🧠 ANSWER LOGIC
  const handleCheck = () => {
    if (!selectedOpt) return;

    const isCorrect = selectedOpt === currentQ.correctOptionId;
    setAttempts(prev => prev + 1);

    if (isCorrect) {
      setCheckStatus("correct");
      playSound("correct");
      if (settings.solutionMode) setShowExplanation(true);
    } else {
      setCheckStatus("incorrect");
      playSound("incorrect");
      triggerVibration();
      if (attempts >= 1 || settings.solutionMode) {
        setShowExplanation(true);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < DUMMY_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOpt(null);
      setCheckStatus("idle");
      setAttempts(0);
      setShowExplanation(false);
      setTimeSpent(0); 
    } else {
      alert("🎉 You finished the practice set!");
      navigate('/student-dashboard');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOpt(null);
      setCheckStatus("idle");
      setAttempts(0);
      setShowExplanation(false);
      setTimeSpent(0);
    }
  };

  // 🎨 DYNAMIC TEXT SIZE LOGIC
  const getTextClasses = () => {
    switch(settings.textSize) {
      case 'small': return { prompt: 'text-base lg:text-lg', sentence: 'text-lg lg:text-xl', options: 'text-sm lg:text-base' };
      case 'large': return { prompt: 'text-2xl lg:text-3xl', sentence: 'text-3xl lg:text-4xl', options: 'text-xl lg:text-2xl' };
      case 'medium': 
      default: return { prompt: 'text-xl lg:text-2xl', sentence: 'text-2xl lg:text-3xl', options: 'text-base lg:text-lg' };
    }
  };
  const fontSizes = getTextClasses();

  return (
    <div className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-500
      ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Subtle Background Pattern */}
      <div className={`absolute inset-0 pointer-events-none opacity-[0.02] ${isDarkMode ? 'invert-0' : 'invert'}`} 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}>
      </div>

      {/* --- TOP NAVBAR (FIXED & FLEX-BALANCED) --- */}
      <header className={`shrink-0 h-16 px-4 lg:px-6 flex items-center justify-between border-b relative z-20 transition-colors duration-500
        ${isDarkMode ? 'border-slate-800/80 bg-[#0B1121]/95 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md'}`}>
        
        {/* Left: Back & Title (Width 1/3 to balance center) */}
        <div className="flex items-center gap-3 w-1/3">
          <button onClick={() => navigate('/student-dashboard')} className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <X size={20} />
          </button>
          <div className={`hidden sm:block h-6 w-px mx-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
          <h1 className={`font-bold text-sm truncate hidden sm:block ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            JLPT N4 &gt;&gt; {currentQ.type}
          </h1>
        </div>

        {/* Center: Timer (Flex centered) */}
        <div className="flex items-center justify-center w-1/3">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm text-sm font-black tracking-widest transition-colors duration-300 ${
            timeSpent > currentQ.idealTimeSeconds 
              ? isDarkMode 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' 
                : 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
              : isDarkMode
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <Clock size={14} className={timeSpent > currentQ.idealTimeSeconds ? 'text-rose-500' : isDarkMode ? 'text-indigo-400' : 'text-slate-400'} />
            {formatTime(timeSpent)}
          </div>
        </div>

        {/* Right: Tools (Width 1/3) */}
        <div className="flex items-center justify-end gap-1 w-1/3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'}`} 
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} title="Bookmark Question">
            <Bookmark size={18} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} 
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {/* --- MAIN QUESTION STAGE (SCROLLABLE) --- */}
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center p-4 lg:p-10 relative z-10">
        <div className="w-full max-w-4xl space-y-8 pb-10">
          
          {/* Header Info */}
          <div className="flex justify-between items-end">
            <div>
              <p className={`text-sm font-black mb-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Question {currentIndex + 1}</p>
              <p className={`text-xs uppercase tracking-widest font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{currentQ.type}</p>
            </div>
            <div className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
              Single Choice
            </div>
          </div>

          {/* Prompt & Sentence Container */}
          <div className={`space-y-6 rounded-3xl p-6 lg:p-10 border transition-colors duration-500 shadow-sm
            ${isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200'}`}>
            <h2 className={`${fontSizes.prompt} font-bold leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentQ.prompt}
            </h2>
            
            {currentQ.sentence && (
              <div className={`${fontSizes.sentence} font-black tracking-wide leading-relaxed py-6 border-y border-dashed ${isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-slate-900'}`}>
                {currentQ.highlightedWord ? (
                   currentQ.sentence.replace(`[${currentQ.highlightedWord}]`, '').split(' ').map((word, i) => (
                     <span key={i} className="mr-2">
                       {word === '' ? <span className="text-indigo-500 underline decoration-indigo-500/30 underline-offset-8">{currentQ.highlightedWord}</span> : word}
                     </span>
                   ))
                ) : currentQ.sentence}
              </div>
            )}

            {/* Media Player */}
            {currentQ.mediaType === 'audio' && (
               <div className={`p-4 rounded-2xl border flex items-center gap-5 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <button className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95 shrink-0">
                   <PlayCircle size={24} className="ml-1" />
                 </button>
                 <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500 w-1/3 rounded-full"></div>
                 </div>
                 <Volume2 size={20} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
               </div>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOpt === opt.id;
              const hasAnswered = checkStatus !== "idle";
              const showStats = hasAnswered && settings.showPeerStats;
              
              // 🎨 Premium Option Styling Logic
              let btnClass = isDarkMode 
                ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-300' 
                : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md text-slate-700';
              let letterBg = isDarkMode ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500';
              let statBarColor = isDarkMode ? 'bg-slate-600/20' : 'bg-slate-200/50';
              
              if (isSelected) {
                if (checkStatus === "idle") {
                  btnClass = isDarkMode 
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm';
                  letterBg = 'bg-indigo-600 text-white';
                } else if (checkStatus === "correct" && !settings.delayCorrectDisplay) {
                  btnClass = isDarkMode 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm';
                  letterBg = 'bg-emerald-500 text-white';
                  statBarColor = isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-500/10';
                } else if (checkStatus === "incorrect" && !settings.delayCorrectDisplay) {
                  btnClass = isDarkMode 
                    ? 'bg-rose-500/10 border-rose-500 text-rose-100 animate-shake'
                    : 'bg-rose-50 border-rose-500 text-rose-900 animate-shake';
                  letterBg = 'bg-rose-500 text-white';
                }
              } else if (hasAnswered && opt.id === currentQ.correctOptionId && !settings.delayCorrectDisplay) {
                // Highlight the correct answer if they missed it
                btnClass = isDarkMode ? 'border-emerald-500/50 text-emerald-300' : 'border-emerald-500/50 text-emerald-700 bg-emerald-50/50';
                statBarColor = isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-500/10';
              }

              return (
                <button
                  key={opt.id}
                  disabled={hasAnswered && checkStatus === "correct"}
                  onClick={() => {
                    if (checkStatus !== "correct") {
                      setSelectedOpt(opt.id);
                      setCheckStatus("idle");
                    }
                  }}
                  className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-200 flex items-center min-h-[80px] group ${btnClass}`}
                >
                  {/* Peer Stat Fill Background */}
                  {showStats && (
                    <div 
                      className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ease-out ${statBarColor}`} 
                      style={{ width: `${opt.peerStat}%` }} 
                    />
                  )}

                  {/* Option Letter Icon */}
                  <span className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 mr-4 transition-colors ${letterBg}`}>
                    {['A', 'B', 'C', 'D'][idx]}
                  </span>
                  
                  {/* Option Text */}
                  <span className={`relative z-10 font-bold text-left flex-1 ${fontSizes.options}`}>
                    {opt.text}
                  </span>

                  {/* Peer Stat % Label */}
                  {showStats && (
                    <span className={`relative z-10 text-xs font-black ml-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {opt.peerStat}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box */}
          {showExplanation && (
            <div className={`animate-in slide-in-from-bottom-4 fade-in duration-500 p-6 lg:p-8 border rounded-3xl ${isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-indigo-100 shadow-xl shadow-indigo-100/50'}`}>
              <h4 className="flex items-center gap-2 text-indigo-500 font-black tracking-widest uppercase text-[10px] mb-4">
                <AlertCircle size={16} /> Official Solution
              </h4>
              <p className={`leading-relaxed font-medium text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentQ.explanation}
              </p>
            </div>
          )}

        </div>
      </main>

      {/* --- BOTTOM ACTION BAR (FIXED) --- */}
      <footer className={`shrink-0 p-4 lg:p-6 border-t flex justify-between items-center relative z-20 transition-colors duration-500
        ${isDarkMode ? 'border-slate-800/80 bg-[#0B1121]/95 backdrop-blur-md' : 'border-slate-200 bg-white/95 backdrop-blur-md'}`}>
        
        <button 
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`px-6 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-colors disabled:opacity-30
            ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div className="flex items-center gap-3 lg:gap-4">
          {checkStatus === "idle" && (
            <button 
              onClick={handleCheck}
              disabled={!selectedOpt}
              className={`px-8 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-lg
                ${isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'}`}
            >
              Check Answer
            </button>
          )}

          {checkStatus === "incorrect" && (
            <button 
              onClick={() => { setSelectedOpt(null); setCheckStatus("idle"); }}
              className={`px-8 py-3.5 border rounded-xl font-black text-sm transition-all active:scale-95
                ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
            >
              Clear Response
            </button>
          )}

          <button 
            onClick={handleNext}
            className={`px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg
              ${checkStatus === "correct" || checkStatus === "incorrect" 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20' 
                : isDarkMode 
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }
            `}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </footer>

      {/* ========================================== */}
      {/* ⚙️ SETTINGS DRAWER OVERLAY */}
      {/* ========================================== */}
      {isSettingsOpen && (
        <>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setIsSettingsOpen(false)}></div>
          <div className={`absolute right-0 top-0 bottom-0 w-full max-w-sm border-l shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-300
            ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            
            <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-200 bg-white'}`}>
              <h3 className={`font-black text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Test Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Settings Group 1 */}
              <div className={`rounded-2xl border p-5 space-y-5 ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Display</p>
                <ToggleRow 
                  title="Solution Mode" 
                  desc="See the solution directly when reopening an attempted question"
                  state={settings.solutionMode} 
                  onClick={() => setSettings({...settings, solutionMode: !settings.solutionMode})} 
                  isDarkMode={isDarkMode}
                />
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex justify-between items-center mb-3 mt-2">
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Text Size</p>
                  </div>
                  <div className={`flex rounded-xl p-1 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    {['small', 'medium', 'large'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSettings({...settings, textSize: size})}
                        className={`flex-1 text-xs py-2 font-bold rounded-lg capitalize transition-all ${
                          settings.textSize === size 
                            ? isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm'
                            : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings Group 2 */}
              <div className={`rounded-2xl border p-5 space-y-5 ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Experience</p>
                <ToggleRow 
                  title="Auto-start Timer" 
                  desc="Timer begins immediately on new questions"
                  state={settings.autoStartTimer} 
                  onClick={() => setSettings({...settings, autoStartTimer: !settings.autoStartTimer})} 
                  isDarkMode={isDarkMode}
                />
                <ToggleRow 
                  title="Play Sounds" 
                  desc="Audio feedback for correct/incorrect answers"
                  state={settings.playSounds} 
                  onClick={() => setSettings({...settings, playSounds: !settings.playSounds})} 
                  isDarkMode={isDarkMode}
                />
              </div>

               {/* Settings Group 3 */}
               <div className={`rounded-2xl border p-5 space-y-5 ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Insights</p>
                <ToggleRow 
                  title="Show Peer Stats" 
                  desc="See what percentage of students chose each option"
                  state={settings.showPeerStats} 
                  onClick={() => setSettings({...settings, showPeerStats: !settings.showPeerStats})} 
                  isDarkMode={isDarkMode}
                />
              </div>

            </div>
          </div>
        </>
      )}

      {/* Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
}

// ---------------------------------------------------------
// Helper Component for the Settings Toggles
// ---------------------------------------------------------
function ToggleRow({ title, desc, state, onClick, isDarkMode }) {
  return (
    <div className="flex items-start justify-between gap-4 cursor-pointer group" onClick={onClick}>
      <div>
        <p className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{title}</p>
        <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <div className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 mt-0.5 ${state ? 'bg-indigo-500' : isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${state ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );
}