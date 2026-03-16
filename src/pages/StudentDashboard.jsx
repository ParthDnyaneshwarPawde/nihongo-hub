import React, { useState, useEffect } from 'react';
import { 
  BookOpen, FileText, BarChart3, MessageSquare, Settings, LogOut, 
  Search, Bell, Globe, Download, Lock, ChevronRight, Clock, 
  Video, Mic2, Tv, Trophy, Calendar, Zap, Info, Filter, MessageCircle, Menu, X, ShieldCheck
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase'; // Adjust path if your firebase file is elsewhere
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('learn');
  const [level, setLevel] = useState('N4');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // To store the live class info
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [latestBulletin, setLatestBulletin] = useState(null);

useEffect(() => {
  const q = query(
    collection(db, "bulletins"), 
    orderBy("createdAt", "desc"), 
    limit(1)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      setLatestBulletin(snapshot.docs[0].data());
    }
  });

  return () => unsubscribe();
}, []);

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    setCurrentUser(user);
  });
  return () => unsubscribe();
}, []);

  

//   useEffect(() => {
    


//     // 2. Set up the real-time bouncer (listener)
//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       if (!snapshot.empty) {
//         setActiveSession(snapshot.docs[0].data());
//       } else {
//         setActiveSession(null); // No one is live
//       }
//     });

//     return () => unsubscribe(); // Clean up on unmount
//   }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    // Check if the password matches the one stored in Firestore for this specific class
    if (!selectedClass.password || enteredPassword === selectedClass.password) {
      setIsPasswordModalOpen(false);
      setEnteredPassword("");
      
      // Navigate to the room with the correct role and pass the password
      navigate(`/room/${selectedClass.roomID}?type=${selectedClass.type}&role=student&pass=${enteredPassword}`);
    } else {
      // Show error if it's wrong
      setPasswordError("Incorrect Access Key. Please check the Bulletin Board.");
    }
  };

  useEffect(() => {
  const q = query(
  collection(db, "classes"), 
  where("status", "in", ["upcoming", "live"]) // Fetches both types
);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    setUpcomingClasses(snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })));
  });
  
  return () => unsubscribe();
}, []);

  // Close sidebar on mobile when switching tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };
  const handleLogout = async () => {
  try {
    await signOut(auth);
    navigate('/'); // This sends them back to the login gatekeeper
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      
      {/* ================= 1. MOBILE SIDEBAR OVERLAY ================= */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ================= 2. SIDE NAVIGATION ================= */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 flex flex-col border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}
      `}>
        {/* Sidebar Header */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            <span className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NIHONGO HUB</span>
          </div>
          <button className="lg:hidden p-1 text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">Menu</p>
          <SidebarLink icon={<Globe size={18}/>} label="Learn" active={activeTab === 'learn'} onClick={() => handleTabClick('learn')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Download size={18}/>} label="Free Resources" active={activeTab === 'resources'} onClick={() => handleTabClick('resources')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<MessageCircle size={18}/>} label="Doubts" active={activeTab === 'doubts'} onClick={() => handleTabClick('doubts')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<BarChart3 size={18}/>} label="Analytics" active={activeTab === 'analytics'} badge="Soon" isDarkMode={isDarkMode} />
          <SidebarLink icon={<FileText size={18}/>} label="Exam Info" active={activeTab === 'exam'} onClick={() => handleTabClick('exam')} isDarkMode={isDarkMode} />
          
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">System</p>
            <SidebarLink icon={<Settings size={18}/>} label="Settings" isDarkMode={isDarkMode} />
            <SidebarLink icon={<LogOut size={18}/>} label="Logout" danger isDarkMode={isDarkMode} onClick={handleLogout} />
          </div>
        </nav>

        {/* Gamification Widget */}
        <div className="p-6">
          <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900/50 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Rank: Samurai</span>
              <Trophy size={14} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>2,450</span>
              <span className="text-xs text-slate-500 font-bold uppercase">XP</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[70%] rounded-full"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= 3. MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {latestBulletin && (
  <div className="animate-in slide-in-from-top duration-500 mb-8 p-4 bg-indigo-600 rounded-3xl flex items-center justify-between shadow-xl shadow-indigo-600/20">
    <div className="flex items-center gap-4 px-4">
      <div className="p-2 bg-white/20 rounded-xl text-white">
        <Bell className="animate-bounce" size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Global Bulletin</p>
        <p className="text-white font-bold">{latestBulletin.message}</p>
      </div>
    </div>
    <button 
      onClick={() => setLatestBulletin(null)} 
      className="p-3 text-indigo-200 hover:text-white transition-colors"
    >
      <X size={20} />
    </button>
  </div>
)}
        
        {/* Background Kanji Watermark (Hidden on small screens) */}
        <div className={`hidden xl:block absolute right-[-10%] top-[15%] text-[500px] font-black select-none pointer-events-none z-0 opacity-[0.03] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          勉強
        </div>

        {/* ================= BACKGROUND KANJI WATERMARK ================= */}
{/* <div className={`
  absolute right-[-49%] top-[10%] 
  text-[400px] lg:text-[600px] font-black 
  select-none pointer-events-none z-0 
  transition-opacity duration-500
  ${isDarkMode ? 'text-white opacity-[0.03]' : 'text-slate-900 opacity-[0.04]'}
`}>
  勉強
</div> */}

        {/* --- TOP HEADER --- */}
        <header className={`h-20 border-b backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#0F172A]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-4 lg:gap-8">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter size={16} className="text-slate-400" />
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className={`bg-transparent font-bold text-sm outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-white'}`}
              >
                <option className="text-slate-900">JLPT N5</option>
                <option className="text-slate-900">JLPT N4</option>
                <option className="text-slate-900">JLPT N3</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-rose-500/10 rounded-full border border-rose-500/20">
              <Clock size={14} className="text-rose-500" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest truncate">114 Days to JLPT</span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              {isDarkMode ? <Zap size={18} className="text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" /> : <Clock size={18} className="text-slate-600" />}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Parth S.</p>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Premium Member</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center font-bold text-white transition-transform hover:scale-105 cursor-pointer">PS</div>
            </div>
          </div>
        </header>

        {/* --- MAIN FEED (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 z-10 custom-scrollbar space-y-12">
          
          {/* 1. HERO & PROGRESS */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-left-6 duration-700">
              <h1 className={`text-4xl lg:text-6xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mastering {level}.</h1>
              <p className={`text-lg lg:text-xl font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>You've solved 42 questions today. You're 12% ahead of your weekly target. Keep the momentum, Samurai.</p>
            </div>
            <div className="p-8 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Zap size={24} /></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full">Daily Goal</span>
                </div>
                <h3 className="text-3xl font-black mb-2 tracking-tight">65% Complete</h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Complete 3 more grammar units to hit your streak.</p>
                <button className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">Continue Lesson</button>
              </div>
              {/* Decorative Kanji inside Hero */}
              <div className="absolute right-[-10%] bottom-[-10%] text-9xl font-black text-white/10 select-none">進捗</div>
            </div>
          </section>

          {/* 2. UPCOMING EVENTS */}
<section>
  <div className="flex justify-between items-end mb-8">
    <div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Live Academy</h3>
      <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Sessions</h2>
    </div>
    <button className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
      View Calendar <ChevronRight size={18}/>
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {upcomingClasses.length > 0 ? (
      upcomingClasses.map((cls) => (
       <EventCard 
  key={cls.id}
  type={cls.type} 
  title={cls.title} 
  sensei={cls.teacher || cls.teacherName || "Sensei Tanaka"} 
  time={cls.status === 'live' ? "LIVE NOW" : cls.scheduledTime} 
  isDark={isDarkMode}
  // --- ADD THE PULSE CLASS IF LIVE ---
  isLive={cls.status === 'live'} 
  onClick={() => {
    setSelectedClass(cls);
    setIsPasswordModalOpen(true);
    setEnteredPassword("");
    setPasswordError("");
  }}
/>
      ))
    ) : (
      <div className={`col-span-full p-12 text-center rounded-[32px] border-2 border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        No classes scheduled for today. Check back later!
      </div>
    )}
  </div>
</section>

          {/* 3. CURRICULUM MAIN BODY */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            
            <div className="xl:col-span-2 space-y-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Course Path</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModuleCard icon={<BookOpen size={24}/>} title="Vocabulary" sub="Tango" progress={82} items="3,200 Words" isDark={isDarkMode} color="bg-indigo-600" />
                <ModuleCard icon={<Zap size={24}/>} title="Grammar" sub="Bunpou" progress={45} items="140 Patterns" isDark={isDarkMode} color="bg-blue-600" />
                <ModuleCard icon={<FileText size={24}/>} title="Reading" sub="Dokkai" progress={20} items="Weekly Stories" isDark={isDarkMode} color="bg-rose-600" />
                <ModuleCard icon={<Mic2 size={24}/>} title="Listening" sub="Choukai" progress={12} items="Audio Drills" isDark={isDarkMode} color="bg-emerald-600" />
              </div>

              {/* BULLETIN BOARD */}
              <div className={`p-8 lg:p-10 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-xl font-black mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                   <Bell size={24} className="text-rose-500" /> Bulletin Board
                </h3>
                <div className="space-y-8">
                  <NewsItem title="July JLPT Forms are now Live!" date="16 March 2026" urgent isDark={isDarkMode} />
                  <NewsItem title="New Genki I & II Answer Keys uploaded to Library" date="12 March 2026" isDark={isDarkMode} />
                  <NewsItem title="Maintenance: App will be down for 2 hours on Sunday" date="10 March 2026" isDark={isDarkMode} />
                </div>
              </div>
            </div>

            {/* 4. RIGHT SIDEBAR WIDGETS */}
            <div className="space-y-8">
              {/* Exam Info Widget */}
              <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Globe size={20} /></div>
                  <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>India Exam Seats</h3>
                </div>
                <div className="space-y-4">
                  <SeatStat city="New Delhi" status="Available" color="emerald" isDark={isDarkMode} />
                  <SeatStat city="Mumbai" status="Filling Fast" color="amber" isDark={isDarkMode} />
                  <SeatStat city="Pune" status="Sold Out" color="rose" isDark={isDarkMode} />
                </div>
                <p className="mt-8 text-[10px] text-slate-500 font-black uppercase text-center leading-loose opacity-60">
                  Premium members get priority form submission assistance.
                </p>
              </div>

              {/* AI Support Card */}
              <div className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                 <div className="relative z-10">
                   <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/30">
                     <MessageSquare size={24} />
                   </div>
                   <h3 className="text-2xl font-black mb-3 tracking-tight">Stuck on a rule?</h3>
                   <p className="text-slate-400 text-sm mb-8 leading-relaxed">Ask Sensei or use our AI Doubt Solver for instant high-context explanations.</p>
                   <button className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl">Ask AI Sensei</button>
                 </div>
                 <div className="absolute right-[-10%] bottom-[-10%] text-[180px] font-black text-white/[0.03] rotate-12 pointer-events-none">?</div>
              </div>

              {/* Resource Preview */}
              <div className={`p-6 rounded-2xl border flex items-center justify-between transition-all hover:border-indigo-500/50 cursor-pointer ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <Download size={20} className={isDarkMode ? 'text-white' : 'text-white'}/>
                  </div>
                  <div>
                    <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Minna no Nihongo</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">PDF Ready</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            </div>

          </section>

          {/* 5. MOCK TEST PREMIUM UPSELL */}
          <section className="bg-[#0B1120] border border-slate-800 rounded-[48px] p-8 lg:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-1000">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <Lock size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Premium Curriculum</span>
              </div>
              <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter leading-tight">Unlimited Mock Tests.</h2>
              <p className="text-slate-400 text-lg lg:text-xl font-medium leading-relaxed opacity-80">
                Access full-length timed JLPT mock papers (N5-N1), instant scoring, and AI-powered performance analysis to crush the actual exam.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95">Upgrade Now</button>
                <button className="px-12 py-5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 active:scale-95">View Sample Test</button>
              </div>
            </div>
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }}></div>
          </section>

        </div>
      </main>
      {/* ================= PASSWORD GATE MODAL ================= */}
{isPasswordModalOpen && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className={`w-full max-w-md rounded-[2.5rem] p-8 border shadow-2xl animate-in zoom-in duration-300 transition-colors ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Security Check</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Classroom Authorization</p>
        </div>
        <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Class Preview Card inside Modal */}
      <div className={`p-5 rounded-2xl mb-8 flex items-center gap-4 ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
         <div className="w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Lock size={20} />
         </div>
         <div>
            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedClass?.title}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedClass?.level} • {selectedClass?.teacher}</p>
         </div>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Access Password</label>
          <input 
            autoFocus
            type="password"
            placeholder="••••••"
            value={enteredPassword}
            onChange={(e) => {
              setEnteredPassword(e.target.value);
              setPasswordError("");
            }}
            className={`w-full p-5 rounded-2xl border transition-all outline-none font-black text-center text-xl tracking-[0.5em]
              ${isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' 
                : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-inner'}`}
          />
          {passwordError && (
            <div className="flex items-center justify-center gap-2 text-rose-500 animate-pulse">
              <Info size={12} />
              <p className="text-[10px] font-black uppercase tracking-tighter">{passwordError}</p>
            </div>
          )}
        </div>

        <button 
          type="submit"
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <ShieldCheck size={20} />
          UNLOCK CLASSROOM
        </button>
      </form>
    </div>
  </div>
)}
    </div>
  );
}

/* ================= COMPONENT ABSTRACTIONS ================= */

function SidebarLink({ icon, label, active, onClick, danger, badge, isDarkMode }) {
  const activeClass = "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/10";
  const inactiveClass = isDarkMode 
    ? "text-slate-500 hover:bg-slate-800 hover:text-white" 
    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const dangerClass = "text-slate-500 hover:bg-rose-500/10 hover:text-rose-500";

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 font-black group ${
        active ? activeClass : danger ? dangerClass : inactiveClass
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>{icon}</span>
        <span className="text-[13px] tracking-tight">{label}</span>
      </div>
      {badge && <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full uppercase">{badge}</span>}
    </button>
  );
}

function EventCard({ type, title, sensei, time, isDark, isLive, onClick }) { 
  // Map the icons to match the 'type' string from your DB
  const icons = { 
    Video: <Video size={20}/>, 
    Audio: <Mic2 size={20}/>, 
    Broadcast: <Tv size={20}/> 
  };
  
  return (
    <div 
      onClick={onClick} 
      className={`p-8 rounded-[32px] border transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer group relative overflow-hidden 
        ${isLive ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg' : ''} 
        ${isDark ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
    >
      {/* 1. Show the "Live" badge if status is live */}
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="text-[8px] font-black text-rose-500 uppercase">Live Now</span>
        </div>
      )}

      {/* 2. Dynamic Icon based on Class Type */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border bg-indigo-500/10 border-indigo-500/20 group-hover:scale-110 transition-transform`}>
        {icons[type] || <Video size={20} />}
      </div>

      {/* 3. The Title from Firestore */}
      <h4 className={`font-black mb-1 text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {title || "Untitled Lesson"}
      </h4>

      {/* 4. Teacher Name and Time */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        {sensei} • {time}
      </p>

      {/* Hover Action Link */}
      <div className="mt-4 flex items-center gap-2 text-indigo-500 text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
        Enter Room <ChevronRight size={14} />
      </div>
    </div>
  );
}
function ModuleCard({ icon, title, sub, progress, items, isDark, color }) {
  return (
    <div className={`border rounded-[32px] p-8 transition-all duration-300 group ${isDark ? 'bg-[#0B1120] border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'}`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 ${color} text-white rounded-2xl shadow-lg shadow-indigo-600/10 group-hover:rotate-6 transition-transform`}>{icon}</div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{sub}</span>
      </div>
      <h4 className={`text-xl font-black mb-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className="text-xs font-bold text-slate-500 mb-8">{items}</p>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className={`${color} h-full transition-all duration-[1500ms] ease-out`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

function NewsItem({ title, date, urgent, isDark }) {
  return (
    <div className="flex items-start gap-5 group cursor-pointer">
      <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${urgent ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
      <div>
        <h4 className={`text-base font-black transition-colors ${urgent ? 'text-rose-500' : isDark ? 'text-white hover:text-indigo-400' : 'text-slate-900 hover:text-indigo-600'}`}>{title}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">{date}</p>
      </div>
    </div>
  );
}

function SeatStat({ city, status, color, isDark }) {
  const colors = { 
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', 
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20', 
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
  };
  return (
    <div className={`flex items-center justify-between p-4 border rounded-2xl transition-all hover:scale-[1.02] ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{city}</span>
      <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border ${colors[color]}`}>{status}</span>
    </div>
  );
}