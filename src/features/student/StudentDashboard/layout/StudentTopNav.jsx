import React from 'react';
import { Menu, BookOpen, ChevronRight, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentTopNav({
  isDarkMode,
  setIsDarkMode,
  setIsSidebarOpen,
  isCourseMenuOpen,
  setIsCourseMenuOpen,
  level,
  setLevel,
  currentCourses,
  freeBatches,
  displayName,
  displayInitial,
  setIsProfileModalOpen
}) {
  const navigate = useNavigate();

  return (
    <header className={`h-20 border-b backdrop-blur-md px-4 lg:px-10 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#0F172A]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
      <div className="flex items-center gap-3 lg:gap-8">
        <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        
        {/* CUSTOM COURSE DROPDOWN */}
        <div className="relative">
          <button 
            onClick={() => setIsCourseMenuOpen(!isCourseMenuOpen)}
            className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl border transition-all duration-300 shadow-sm
              ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400'}`}
          >
            <BookOpen size={16} className="text-indigo-500 shrink-0" />
            <span className={`font-black text-xs lg:text-sm truncate max-w-[100px] sm:max-w-[150px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{level}</span>
            <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isCourseMenuOpen ? 'rotate-90' : 'rotate-0'}`} />
          </button>

          {isCourseMenuOpen && (
            <div className="fixed inset-0 z-[90]" onClick={() => setIsCourseMenuOpen(false)}></div>
          )}

          {isCourseMenuOpen && (
            <div className={`absolute top-full mt-2 left-0 w-72 lg:w-80 rounded-2xl shadow-2xl border z-[100] animate-in fade-in slide-in-from-top-2 duration-200 
              ${isDarkMode ? 'bg-slate-900 border-slate-700 shadow-black/50' : 'bg-white border-slate-200'}`}
              style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
              
              {/* My Courses */}
              <div className="p-3 pb-0">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-3 mb-2">My Courses</p>
                <div className="space-y-1">
                  {currentCourses.length > 0 ? (
                    currentCourses.map(course => (
                      <button
                        key={course}
                        onClick={() => { setLevel(course); setIsCourseMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-between
                          ${level === course ? 'bg-indigo-500/10 text-indigo-500' : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="truncate pr-2">{course}</span>
                        {level === course && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs font-bold text-slate-500 italic">No premium courses yet.</p>
                  )}
                </div>
              </div>

              <div className={`h-px w-full my-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>

              {/* Free Batches */}
              <div className="p-3 pt-0">
                <div className="flex justify-between items-center px-3 mb-2 mt-2">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Free Batches</p>
                  {freeBatches.length > 6 && (
                    <button 
                      onClick={() => { setIsCourseMenuOpen(false); navigate('/course-catalog?filter=free'); }}
                      className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded transition-colors
                        ${isDarkMode ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      View All →
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {freeBatches.slice(0, 6).map(batch => (
                    <button
                      key={batch}
                      onClick={() => { setLevel(batch); setIsCourseMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between
                        ${level === batch ? 'bg-emerald-500/10 text-emerald-500' : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="truncate pr-2">{batch}</span>
                      {level === batch && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* EXPLORE CATALOG */}
              <div className={`p-4 border-t sticky bottom-0 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <button 
                  onClick={() => {
                    setIsCourseMenuOpen(false);
                    navigate('/course-catalog');
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  Explore Full Catalog
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 bg-rose-500/10 rounded-full border border-rose-500/20">
          <Clock size={14} className="text-rose-500" />
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest truncate">114 Days to JLPT</span>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 lg:p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          {isDarkMode ? <Zap size={16} className="text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" /> : <Clock size={16} className="text-slate-600" />}
        </button>
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
        
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 group text-left outline-none"
        >
          <div className="text-right hidden sm:block">
            <p className={`text-sm font-black transition-colors ${isDarkMode ? 'text-white group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'}`}>
              {displayName}
            </p>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Premium Member</p>
          </div>
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center font-bold text-white transition-all group-hover:scale-110 group-active:scale-95 shrink-0">
            {displayInitial}
          </div>
        </button>
      </div>
    </header>
  );
}
