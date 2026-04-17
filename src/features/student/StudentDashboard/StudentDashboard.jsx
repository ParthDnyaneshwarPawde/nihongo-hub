import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Bell, Info, Lock, X, PlayCircle, ChevronRight, Download, BookOpen, Mic2, MessageSquare, Loader2, ShieldCheck, Zap, FileText, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useStudentSession } from './hooks/useStudentSession';
import { useStudentNavigation } from './hooks/useStudentNavigation';
import { useLogoutConfirm } from '@hooks/useLogoutConfirm';

import StudentSidebar from './layout/StudentSidebar';
import StudentTopNav from './layout/StudentTopNav';
import StudentZenCanvas from './background/StudentZenCanvas';

import QuickStats from './components/QuickStats';
import { EventCard, ModuleCard, NewsItem, SeatStat } from './components/DashboardWidgets';

import ResourceVault from '@features/student/StudentDashboard/ResourceVault/ResourceVault';
import CalendarPage from '@features/student/StudentDashboard/CalendarPage';
import LogoutShield from '@components/shared/LogoutShield';
import ExamHub from '@features/student/ExamEngine/ExamHub';

export default function StudentDashboard() {
  const { isDarkMode } = useTheme();
  
  // Custom Hooks mapped out
  const {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isCourseMenuOpen,
    setIsCourseMenuOpen,
    isDesktopSidebarCollapsed,
    setIsDesktopSidebarCollapsed,
    handleTabClick
  } = useStudentNavigation();

  const {
    currentUser,
    level,
    setLevel,
    currentCourses,
    freeBatches,
    isDataLoaded,
    allLevelClasses,
    upcomingClasses,
    bulletins,
    latestBulletin,
    setLatestBulletin,
    displayName,
    displayInitial,
    dynamicBatches,
  } = useStudentSession();

  const activeBatch = dynamicBatches.find(b => b.title === level || b.level === level);
  const activeBatchId = activeBatch ? activeBatch.id : null;

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [viewingBulletin, setViewingBulletin] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const navigate = useNavigate();
  const onBeforeLogout = () => { setLevel('JLPT N5'); };
  const { isConfirming, requestLogout, cancelLogout, confirmLogout } = useLogoutConfirm({ onBeforeLogout });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (selectedClass.status !== 'live') {
      setPasswordError("This session has ended or is not yet active.");
      return;
    }
    if (!selectedClass.password || enteredPassword === selectedClass.password) {
      setIsPasswordModalOpen(false);
      setEnteredPassword("");
      navigate(`/room/${selectedClass.roomID}?type=${selectedClass.type}&role=student&pass=${enteredPassword}`);
    } else {
      setPasswordError("Incorrect Access Key. Please check the Bulletin Board.");
    }
  };

  // Depth Dissolve variants
  const pageVariants = {
    initial: { opacity: 0, scale: 0.95, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 1.02, filter: "blur(4px)", transition: { duration: 0.3, ease: "easeIn" } }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      
      {/* LAYER 0: ZEN CANVAS BACKGROUND */}
      <StudentZenCanvas />

      {/* LAYER 2: SIDEBAR */}
      <div className="z-[20] h-full shrink-0">
        <StudentSidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          setIsDesktopSidebarCollapsed={setIsDesktopSidebarCollapsed}
          activeTab={activeTab}
          handleTabClick={handleTabClick}
          requestLogout={requestLogout}
        />
      </div>

      {/* MAIN CONTENT SHELL */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-[10]">
        <StudentTopNav 
          setIsSidebarOpen={setIsSidebarOpen}
          isCourseMenuOpen={isCourseMenuOpen}
          setIsCourseMenuOpen={setIsCourseMenuOpen}
          level={level}
          setLevel={setLevel}
          currentCourses={currentCourses}
          freeBatches={freeBatches}
          displayName={displayName}
          displayInitial={displayInitial}
          setIsProfileModalOpen={setIsProfileModalOpen}
        />

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative">
          
          {latestBulletin && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 p-4 bg-indigo-600 rounded-3xl flex items-center justify-between shadow-xl shadow-indigo-600/20">
            <div className="flex items-center gap-4 px-4">
              <div className="p-2 bg-white/20 rounded-xl text-white shrink-0">
                <Bell className="animate-bounce" size={20} />
              </div>
              <div className="min-w-0">
                {/* 👇 Title goes here */}
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest truncate">
                  {latestBulletin.title || "Global Bulletin"}
                </p>
                {/* 👇 Message goes here */}
                <p className="text-white font-bold truncate max-w-md lg:max-w-2xl">
                  {latestBulletin.message}
                </p>
              </div>
            </div>
            <button onClick={() => setLatestBulletin(null)} className="p-3 text-indigo-200 hover:text-white transition-colors shrink-0">
              <X size={20} />
            </button>
          </motion.div>
        )}

          {/* LAYER 1: DEPTH DISSOLVE CONTENT STAGE */}
          <AnimatePresence mode="wait">
            {activeTab === 'learn' && (
              <motion.div key="learn" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-12">

                {/* 🔥 CHRONOLOGICAL PATH: RESUME JOURNEY HERO */}
{/* <section className="mb-12">
  <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-0 mb-6">
    <div>
      <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">My Enrolled Batch</h3>
      <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{level} Masterclass</h2>
    </div>
  </div>

  <div className={`relative overflow-hidden rounded-[32px] border p-8 lg:p-12 transition-all shadow-xl group
    ${isDarkMode ? 'bg-gradient-to-br from-[#151E2E] to-[#0B1121] border-slate-800' : 'bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent text-white'}`}>
    
    <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/20 text-indigo-100'}`}>Up Next</span>
          <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-indigo-200'}`}>Module 1 • Chapter 1</span>
        </div>
        
        <h3 className="text-3xl lg:text-4xl font-black mb-3 leading-tight text-white">Mastering the 'Water' Radical</h3>
        <p className={`text-base font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-indigo-100'}`}>Pick up right where you left off. In this video, Sensei covers the top 5 kanji utilizing the water radical.</p>

        <div className="mt-8 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-indigo-200'}`}>Batch Progress</span>
            <span className="text-xs font-bold text-white">34%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-black/20'}`}>
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '34%' }}></div>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <button onClick={() => navigate('/lecture')} className={`w-full lg:w-auto px-10 py-5 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-white text-indigo-600 hover:bg-slate-50 shadow-black/10 hover:shadow-xl'}`}>
          <PlayCircle size={24} /> Resume Journey
        </button>
      </div>
    </div>
  </div>
</section> */}
                 <QuickStats level={level} batchId={activeBatchId} />

                 <section>
                    <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-0 mb-8">
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Live Academy</h3>
                        <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Sessions</h2>
                      </div>
                      <button className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all" onClick={() => handleTabClick("calendar")}>
                        View Calendar <ChevronRight size={18}/>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingClasses.length > 0 ? (
                        upcomingClasses.map((cls) => (
                          <EventCard 
                            key={cls.id}
                            type={cls.type} 
                            title={cls.title || cls.topic || cls.classTitle || "🚨 TITLE MISSING"} 
                            sensei={cls.teacher || cls.teacherName || "Sensei Tanaka"} 
                            rawTime={cls.status === 'live' ? "LIVE NOW" : cls.scheduledTime} 
                            isDark={isDarkMode}
                            isLive={cls.status === 'live'} 
                            onClick={() => {
                              if (cls.status !== 'live') {
                                alert("This class hasn't started yet. Please check back at the scheduled time!");
                                return;
                              }
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

                  <section>
                    <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 md:gap-0 mb-8">
                      <div>
                        <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">Campus News</h3>
                        <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Official Bulletins</h2>
                      </div>
                      <button onClick={() => setIsHistoryModalOpen(true)} className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                        View History <ChevronRight size={18}/>
                      </button>
                    </div>

                    <div className={`p-2 rounded-[40px] border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                      {bulletins.length > 0 ? (
                        <div className={`divide-y divide-slate-100 dark:divide-slate-800 border rounded-[40px] overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                          {bulletins.slice(0, 3).map((msg, index) => (
  <div key={msg.id} onClick={() => setViewingBulletin(msg)} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50">
    <div className="flex items-start gap-6">
      <div className={`p-4 rounded-2xl shrink-0 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
        <Bell size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          {/* 👇 The Title goes here in the bold h4 tag */}
          <h4 className={`text-lg font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {msg.title || "Official Announcement"}
          </h4>
          {index === 0 && <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-tighter shrink-0">New</span>}
        </div>
        {/* 👇 The Message stays here as the descriptive subtitle */}
        <p className="text-sm text-slate-500 line-clamp-1 font-medium mb-2">{msg.message}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{msg.sender || "Sensei"} • {msg.createdAt?.toDate().toLocaleDateString()}</p>
      </div>
    </div>
    <ChevronRight size={20} className="text-slate-300 hidden md:block" />
  </div>
))}
                        </div>
                      ) : (
                        <div className="p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px]">
                          <Info className="mx-auto text-slate-300 mb-4" size={48} />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No active announcements</p>
                        </div>
                      )}
                    </div>
                  </section>
                  
                  {/* Curriculum & Side Widgets */}
                  <section className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-2 space-y-10">
                      {/* <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Course Path</h3> */}
                      <div>
  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Practice Dojo</h3>
  <h2 className={`text-2xl lg:text-3xl font-black tracking-tight mb-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Skill-Based Practice</h2>
</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ModuleCard icon={<BookOpen size={24}/>} title="Vocabulary" sub="Tango" progress={82} items="3,200 Words" isDark={isDarkMode} color="bg-indigo-600" />
                        <ModuleCard icon={<Zap size={24}/>} title="Grammar" sub="Bunpou" progress={45} items="140 Patterns" isDark={isDarkMode} color="bg-blue-600" />
                        <ModuleCard icon={<FileText size={24}/>} title="Reading" sub="Dokkai" progress={20} items="Weekly Stories" isDark={isDarkMode} color="bg-rose-600" />
                        <ModuleCard icon={<Mic2 size={24}/>} title="Listening" sub="Choukai" progress={12} items="Audio Drills" isDark={isDarkMode} color="bg-emerald-600" />
                      </div>
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

                    <div className="space-y-8">
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
                        <p className="mt-8 text-[10px] text-slate-500 font-black uppercase text-center leading-loose opacity-60">Premium members get priority form submission assistance.</p>
                      </div>

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
                    </div>
                  </section>
                  {/* Resource Preview */}

                  <section>
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
              </motion.div>
            )}

            {activeTab === 'vault' && (
              <motion.div key="vault" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {isDataLoaded ? (
                  <ResourceVault selectedCourseTitle={level} enrolledCourseTitles={currentCourses} currentUser={currentUser}/>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Authorizing Access...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'tests' && (
              <motion.div key="tests" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {isDataLoaded ? (
                  <ExamHub setIsDesktopSidebarCollapsed={setIsDesktopSidebarCollapsed} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Authorizing Access...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div key="calendar" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <CalendarPage 
                  level={level}
                  classes={allLevelClasses}
                  onBack={() => handleTabClick('learn')} 
                  onLiveClick={(cls) => {
                    setSelectedClass(cls);
                    setIsPasswordModalOpen(true);
                    setEnteredPassword("");
                    setPasswordError("");
                  }}
                />
              </motion.div>
            )}
            
            {activeTab === 'doubts' && (
              <motion.div key="doubts" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare size={40} className="text-indigo-500" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">AI Doubt Solver</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Dojo Intelligence Offline</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className={`w-full max-w-md rounded-[2.5rem] p-8 border shadow-2xl transition-colors ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Security Check</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Classroom Authorization</p>
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className={`p-5 rounded-2xl mb-8 flex items-center gap-4 ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
                <div className="w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-xl flex items-center justify-center border border-indigo-500/20"><Lock size={20} /></div>
                <div>
                  <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedClass?.title}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedClass?.level} • {selectedClass?.teacher}</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Access Password</label>
                  <input autoFocus type="password" placeholder="••••••" value={enteredPassword}
                    onChange={(e) => { setEnteredPassword(e.target.value); setPasswordError(""); }}
                    className={`w-full p-5 rounded-2xl border transition-all outline-none font-black text-center text-xl tracking-[0.5em] ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                  />
                  <div className="flex justify-between items-center px-2">
                    <button type="button" onClick={() => { setIsPasswordModalOpen(false); setIsHistoryModalOpen(true); }} className="text-[10px] font-black text-slate-500 hover:text-indigo-500 transition-colors uppercase tracking-tighter">Forgot Key? Check Bulletins</button>
                    {passwordError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter animate-pulse">Incorrect Key</p>}
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3">
                  <ShieldCheck size={20} /> UNLOCK CLASSROOM
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}


        {/* 👇 ADD THESE TWO NEW MODALS 👇 */}

        {/* 2. View Individual Bulletin Modal */}
        {/* 2. View Individual Bulletin Modal */}
        {/* 2. View Individual Bulletin Modal */}
        {viewingBulletin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl transition-colors relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-slate-700/50 shadow-black/50' : 'bg-white border-slate-200 shadow-indigo-900/5'}`}>
              
              {/* Premium Background Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

              {/* Header Banner */}
              <div className={`relative px-8 pt-8 pb-6 border-b ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 rounded-full animate-pulse"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Bell size={24} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Official Broadcast</p>
                      <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{viewingBulletin.sender || "Sensei Panel"}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingBulletin(null)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-900'}`}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewingBulletin.createdAt?.toDate().toLocaleDateString() || "Just now"}</span>
                </div>
                
                {/* 👇 Title injected here */}
                <h3 className={`text-2xl lg:text-3xl font-black mb-4 leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {viewingBulletin.title || "Official Announcement"}
                </h3>
                
                {/* 👇 Message moved down to paragraph text */}
                <p className={`text-base lg:text-lg leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {viewingBulletin.message}
                </p>
              </div>

              {/* Action Footer */}
              <div className={`px-8 py-6 border-t flex justify-end ${isDarkMode ? 'border-slate-800 bg-[#0B1120]' : 'border-slate-100 bg-slate-50'}`}>
                <button onClick={() => setViewingBulletin(null)} className="px-8 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 3. View All History Modal (Timeline Redesign) */}
        {isHistoryModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className={`w-full max-w-2xl h-[85vh] flex flex-col rounded-[2.5rem] border shadow-2xl transition-colors relative overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-slate-700/50 shadow-black/50' : 'bg-white border-slate-200 shadow-indigo-900/5'}`}>
              
              {/* Header */}
              <div className={`p-8 border-b shrink-0 flex justify-between items-center z-10 ${isDarkMode ? 'border-slate-800 bg-[#0F172A]' : 'border-slate-100 bg-white'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Bulletin Archive</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{bulletins.length} Total Messages</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-rose-400' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-rose-500'}`}>
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Timeline */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10">
                {bulletins.length > 0 ? (
                  <div className={`relative pl-6 border-l-2 ml-4 space-y-10 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    {bulletins.map((msg, idx) => (
                      <div key={msg.id} className="relative group">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 transition-colors ${idx === 0 ? 'bg-indigo-500 border-indigo-100 dark:border-indigo-900/50' : isDarkMode ? 'bg-slate-700 border-[#0F172A]' : 'bg-slate-300 border-white'}`}></div>
                        
                        {/* Interactive Card */}
                        <div onClick={() => { setIsHistoryModalOpen(false); setViewingBulletin(msg); }} className={`p-6 rounded-3xl border transition-all cursor-pointer ${isDarkMode ? 'bg-[#0B1120] border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{msg.sender || "Sensei"}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{msg.createdAt?.toDate().toLocaleDateString() || "Recently"}</span>
                          </div>
                          
                          {/* 👇 Title injected here */}
                          <h4 className={`font-black text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {msg.title || "Announcement"}
                          </h4>
                          
                          {/* 👇 Message line-clamped beneath */}
                          <p className={`font-medium text-sm leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{msg.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Premium Empty State
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="relative w-32 h-32 mb-8">
                      <div className="absolute inset-0 bg-indigo-500/5 rounded-full animate-ping"></div>
                      <div className={`absolute inset-4 rounded-3xl border border-dashed flex items-center justify-center rotate-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                        <Bell size={32} className="text-slate-400 -rotate-3" />
                      </div>
                      <div className={`absolute -right-2 -bottom-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'}`}>
                        <X size={20} />
                      </div>
                    </div>
                    <h3 className={`text-xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Inbox is Clear</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">There are currently no archived bulletins or announcements for your learning level.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}


      </AnimatePresence>

      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} />
    </div>
  );
}