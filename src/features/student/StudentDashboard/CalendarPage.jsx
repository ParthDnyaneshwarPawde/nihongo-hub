import React, { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext'; // 🚨 1. IMPORT THE THEME HOOK
import { 
  ArrowLeft, ChevronRight, ChevronLeft, Clock, Video, Mic2, Tv, 
  Sparkles, History, Calendar as CalendarIcon, LayoutGrid, List, Timer 
} from 'lucide-react';

export default function CalendarPage({ 
  level, 
  classes, 
  onBack, // 🚨 2. REMOVED isDarkMode FROM PROPS
  onLiveClick 
}) {
  const { isDarkMode } = useTheme(); // 🚨 3. GRAB THEME DIRECTLY FROM CONTEXT
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  // 1. Basic Filters
  const liveClasses = classes.filter(c => c.status === 'live');
  const upcomingClasses = classes.filter(c => c.status === 'upcoming');
  const endedClasses = classes.filter(c => c.status === 'ended');

  // 2. Generate 7 dates for the currently viewed week (Starting Monday)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(start.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // 3. SYNCED FILTER: Only show ended classes belonging to the viewed week
  const endedClassesInView = useMemo(() => {
    const startOfWeek = new Date(weekDays[0]).setHours(0, 0, 0, 0);
    const endOfWeek = new Date(weekDays[6]).setHours(23, 59, 59, 999);
    
    return endedClasses.filter(cls => {
      const clsDate = new Date(cls.scheduledTime).getTime();
      return clsDate >= startOfWeek && clsDate <= endOfWeek;
    }).sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  }, [endedClasses, weekDays]);

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const jumpToToday = () => setCurrentDate(new Date());

  const getDuration = (start, end) => {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = typeof end.toDate === 'function' ? end.toDate().getTime() : new Date(end).getTime();
    const diffInMs = endTime - startTime;
    const mins = Math.floor(diffInMs / 60000);
    return mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
  };

  return (
    <div className="relative space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24">
      
      {/* Background Kanji Watermark */}
      <div className={`absolute top-0 right-[-5%] text-[300px] lg:text-[400px] font-black select-none pointer-events-none z-0 opacity-[0.02] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        暦
      </div>

      {/* 🚀 Header */}
      <header className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-4">
        <div>
          <button onClick={onBack} className={`group flex items-center gap-2 px-4 py-2 rounded-full mb-6 transition-all text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Dojo
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className={`p-3 rounded-2xl shadow-inner ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <CalendarIcon size={24} />
            </div>
            <h2 className={`text-4xl lg:text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Academy Calendar
            </h2>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-16">Official Schedule • {level}</p>
        </div>

        {/* 🚨 NAVIGATION CONTROLS */}
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-1 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button onClick={() => navigateWeek(-1)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}><ChevronLeft size={18} /></button>
            <button onClick={jumpToToday} className="px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all border border-transparent hover:border-indigo-500/20">Today</button>
            <span className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => navigateWeek(1)} className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}><ChevronRight size={18} /></button>
          </div>

          <div className={`flex p-1 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}><List size={20} /></button>
            <button onClick={() => setViewMode('detailed')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'detailed' ? 'bg-indigo-600 text-white shadow-lg' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}><LayoutGrid size={20} /></button>
          </div>
        </div>
      </header>

      {viewMode === 'list' ? (
        <div className="space-y-12 relative z-10">
          {/* 🔴 LIVE NOW (Always visible regardless of week viewed) */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] flex items-center gap-3 ml-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div> Currently Live
            </h3>
            <div className={`p-8 lg:p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-gradient-to-br from-[#0B1120] to-rose-950/20 border-rose-500/10' : 'bg-gradient-to-br from-white to-rose-50 border-rose-100'}`}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveClasses.length > 0 ? liveClasses.map(cls => (
                  <EventCard key={cls.id} type={cls.type} title={cls.classTitle || cls.topic} sensei={cls.teacherName || cls.teacher} rawTime={cls.scheduledTime} isDark={isDarkMode} isLive={true} onClick={() => onLiveClick(cls)} />
                )) : <EmptyPlaceholder text="No active broadcasts." />}
               </div>
            </div>
          </section>

          {/* 📅 UPCOMING (Filtered by current week viewed) */}
          <section className="space-y-6">
            <h3 className={`text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] border-b pb-4 ml-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>Upcoming This Week</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingClasses.length > 0 ? upcomingClasses.map(cls => (
                <EventCard key={cls.id} type={cls.type} title={cls.classTitle || cls.topic} sensei={cls.teacherName || cls.teacher} rawTime={cls.scheduledTime} isDark={isDarkMode} isLive={false} onClick={() => alert("Class hasn't started yet.")} />
              )) : <p className={`text-[10px] font-bold text-slate-500 uppercase p-12 text-center col-span-full border-2 border-dashed rounded-[2rem] ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>No scheduled classes this week.</p>}
            </div>
          </section>

          {/* ✅ SYNCED VAULT ARCHIVES (Filters when you navigate weeks) */}
          <section className="space-y-6">
            <h3 className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] border-b pb-4 ml-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>Vault Archives (Week History)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {endedClassesInView.length > 0 ? endedClassesInView.map(cls => (
                <EventCard 
                  key={cls.id} 
                  type={cls.type} 
                  title={cls.classTitle || cls.topic} 
                  sensei={cls.teacherName || cls.teacher} 
                  rawTime={cls.scheduledTime} 
                  isDark={isDarkMode} 
                  isLive={false} 
                  isEnded={true}
                  duration={getDuration(cls.scheduledTime, cls.endedAt)}
                  onClick={() => alert("Recording feature coming soon!")} 
                />
              )) : <p className={`text-[10px] font-bold text-slate-500 uppercase p-12 text-center col-span-full border-2 border-dashed rounded-[2rem] ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>No session records found for this week.</p>}
            </div>
          </section>
        </div>
      ) : (
        /* 🚨 ZEN GRID VIEW (GOOGLE CALENDAR STYLE) */
        <div className={`grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-px rounded-[2.5rem] overflow-hidden border shadow-2xl relative z-10 animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-slate-800 border-slate-800' : 'bg-slate-200 border-slate-200'}`}>
          {weekDays.map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const dayClasses = endedClasses.filter(cls => new Date(cls.scheduledTime).toDateString() === date.toDateString());

            return (
              <div 
                key={idx} 
                className={`min-h-[450px] flex flex-col border-r last:border-r-0 transition-colors 
                  ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}
                  ${isToday ? (isDarkMode ? 'bg-indigo-500/[0.04]' : 'bg-indigo-500/[0.08]') : (isDarkMode ? 'bg-[#0B1120]' : 'bg-white')}`}
              >
                {/* Day Header */}
                <div className={`p-5 text-center border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'} ${isToday ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-600') : 'text-slate-400'}`}>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className={`text-2xl font-black ${isToday ? 'scale-110' : ''}`}>{date.getDate()}</p>
                  {isToday && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto mt-1 shadow-[0_0_10px_#6366f1]"></div>}
                </div>

                {/* Class Tiles */}
                <div className="p-3 space-y-3 flex-1">
                  {dayClasses.length > 0 ? dayClasses.map(cls => (
                    <div key={cls.id} className={`p-4 rounded-[20px] border transition-all hover:scale-[1.03] group relative overflow-hidden flex flex-col justify-between min-h-[140px]
                      ${isDarkMode ? 'bg-slate-900 border-white/5 hover:border-indigo-500/40 shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'}`}>
                      
                      <div className="relative z-10">
                        <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">
                          {new Date(cls.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                        <h4 className={`font-black text-[12px] leading-tight line-clamp-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {cls.classTitle || "Session"}
                        </h4>
                      </div>

                      <div className="mt-auto space-y-2 relative z-10">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Timer size={10} />
                          <span className="text-[9px] font-black uppercase">{getDuration(cls.scheduledTime, cls.endedAt) || '0m'}</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase truncate">Sensei {cls.teacherName?.split(' ')[0]}</p>
                      </div>

                      <div className={`absolute -right-2 -bottom-2 text-5xl font-black italic opacity-[0.03] select-none group-hover:opacity-[0.07] transition-opacity ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                         {new Date(cls.scheduledTime).getHours()}:00
                      </div>
                    </div>
                  )) : (
                    <div className="flex-1 flex items-center justify-center opacity-10">
                       <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-slate-500' : 'bg-slate-300'}`}></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------
// Helpers & Subcomponents
// --------------------------------------------------------
function EmptyPlaceholder({ text }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-60">
      <Video size={40} className="text-slate-400 mb-4" />
      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{text}</p>
    </div>
  );
}

function EventCard({ type, title, sensei, rawTime, isDark, isLive, isEnded, duration, onClick }) {
  const icons = { Video: <Video size={20}/>, Audio: <Mic2 size={20}/>, Broadcast: <Tv size={20}/> };
  const dateObj = (typeof rawTime?.toDate === 'function') ? rawTime.toDate() : new Date(rawTime);
  
  return (
    <div onClick={onClick} className={`group relative p-1 rounded-[2.5rem] transition-all duration-500 cursor-pointer ${isLive ? 'bg-gradient-to-br from-rose-500 to-indigo-600 shadow-xl hover:-translate-y-2' : isDark ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
      <div className={`relative h-full w-full rounded-[2.3rem] p-6 flex flex-col justify-between overflow-hidden ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className={`flex flex-col items-center justify-center border w-14 h-14 rounded-2xl ${isLive ? 'bg-rose-500/10 border-rose-500/20' : isDark ? 'bg-white/5 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[9px] font-black leading-none uppercase ${isLive ? 'text-rose-500' : 'text-indigo-500'}`}>{isLive ? 'LIVE' : dateObj.toLocaleDateString('en-US', {month: 'short'}).toUpperCase()}</span>
            <span className={`font-black mt-1 ${isLive ? 'text-sm text-rose-500' : `text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}`}>{isLive ? 'NOW' : dateObj.getDate()}</span>
          </div>
          <div className={`p-3 rounded-2xl shadow-sm ${isLive ? 'bg-rose-500 text-white' : isDark ? 'bg-slate-900 text-indigo-400' : 'bg-slate-100 text-indigo-500'}`}>
            {icons[type] || icons.Video}
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            {isEnded && <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Ended</span>}
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{sensei}</span>
          </div>
          <h4 className={`text-xl font-black leading-tight tracking-tight mb-4 ${isLive ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
          <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}>
            <div className={`flex items-center gap-2 ${isLive ? 'text-rose-500' : 'text-slate-500'}`}>
              <Clock size={14} /><span className="text-[10px] font-black uppercase">{isLive ? "HAPPENING NOW" : dateObj.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            {duration && <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1"><Timer size={12}/>{duration}</span>}
            <ChevronRight size={16} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
          </div>
        </div>
      </div>
    </div>
  );
}