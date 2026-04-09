import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Bell, Info, Lock, X, ChevronRight, BookOpen, Mic2, MessageSquare, Loader2, ShieldCheck
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

export default function StudentDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Custom Hooks mapped out
  const {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    isCourseMenuOpen,
    setIsCourseMenuOpen,
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
    displayInitial
  } = useStudentSession();

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
      <StudentZenCanvas isDarkMode={isDarkMode} />

      {/* LAYER 2: SIDEBAR */}
      <div className="z-[20]">
        <StudentSidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeTab={activeTab}
          handleTabClick={handleTabClick}
          isDarkMode={isDarkMode}
          requestLogout={requestLogout}
        />
      </div>

      {/* MAIN CONTENT SHELL */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-[10]">
        <StudentTopNav 
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
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
                <div className="p-2 bg-white/20 rounded-xl text-white">
                  <Bell className="animate-bounce" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Global Bulletin</p>
                  <p className="text-white font-bold">{latestBulletin.message}</p>
                </div>
              </div>
              <button onClick={() => setLatestBulletin(null)} className="p-3 text-indigo-200 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </motion.div>
          )}

          {/* LAYER 1: DEPTH DISSOLVE CONTENT STAGE */}
          <AnimatePresence mode="wait">
            {activeTab === 'learn' && (
              <motion.div key="learn" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-12">
                 <QuickStats level={level} isDarkMode={isDarkMode} />

                 <section>
                    <div className="flex justify-between items-end mb-8">
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
                    <div className="flex justify-between items-end mb-8">
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
                                <div className={`p-4 rounded-2xl shrink-0 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Bell size={24} /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <h4 className={`text-lg font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{msg.message}</h4>
                                    {index === 0 && <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-tighter shrink-0">New</span>}
                                  </div>
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
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Course Path</h3>
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
              </motion.div>
            )}

            {activeTab === 'vault' && (
              <motion.div key="vault" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {isDataLoaded ? (
                  <ResourceVault selectedCourseTitle={level} enrolledCourseTitles={currentCourses} isDarkMode={isDarkMode} currentUser={currentUser}/>
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
                  isDarkMode={isDarkMode}
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
      </AnimatePresence>

      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} isDarkMode={isDarkMode} />
    </div>
  );
}