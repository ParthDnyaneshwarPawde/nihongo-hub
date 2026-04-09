import React from 'react';
import { Video, Mic2, Tv, Clock, ChevronRight } from 'lucide-react';

export function EventCard({ type, title, subtitle, sensei, rawTime, isDark, isLive, onClick }) {
  const icons = {
    Video: <Video size={22} className={isLive ? "text-white" : "text-indigo-500"} />,
    Audio: <Mic2 size={22} className={isLive ? "text-white" : "text-rose-500"} />,
    Broadcast: <Tv size={22} className={isLive ? "text-white" : "text-emerald-500"} />
  };

  const formatDateTime = (rawDate) => {
    if (!rawDate) return { day: '00', month: '---', time: '--:--' };
    let dateObj;
    if (typeof rawDate.toDate === 'function') {
      dateObj = rawDate.toDate();
    } else {
      dateObj = new Date(rawDate);
    }
    if (isNaN(dateObj.getTime())) {
      return { day: '??', month: 'TBD', time: 'Scheduled' };
    }
    return {
      day: dateObj.toLocaleDateString('en-US', { day: '2-digit' }),
      month: dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const { day, month, time } = formatDateTime(rawTime);

  return (
    <div 
      onClick={onClick}
      className={`group relative p-1 rounded-[32px] transition-all duration-500 hover:-translate-y-2 cursor-pointer
        ${isLive 
          ? 'bg-gradient-to-br from-rose-500 via-purple-500 to-indigo-500 shadow-[0_20px_50px_rgba(244,63,94,0.3)]' 
          : isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
    >
      <div className={`relative h-full w-full rounded-[30px] p-6 flex flex-col justify-between overflow-hidden
        ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        
        <div className="flex justify-between items-start mb-6">
          <div className={`flex flex-col items-center justify-center border w-14 h-16 rounded-2xl transition-colors
            ${isLive 
              ? 'bg-rose-500/10 border-rose-500/30' 
              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
            <span className={`text-[10px] font-black leading-none ${isLive ? 'text-rose-500' : 'text-indigo-500'}`}>
              {isLive ? 'LIVE' : month}
            </span>
            <span className={`font-black mt-0.5 ${
              isLive 
                ? 'text-sm text-rose-600 dark:text-rose-400' 
                : `text-xl ${isDark ? 'text-white' : 'text-slate-900'}`
            }`}>
              {isLive ? 'NOW' : day}
            </span>
          </div>

          <div className={`p-3 rounded-2xl shadow-inner group-hover:rotate-12 transition-transform
            ${isLive ? 'bg-rose-500 border-rose-400' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {icons[type] || icons.Video}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            {isLive && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">
                Join Class
              </span>
            )}
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sensei}</span>
          </div>
          
          <h4 className={`text-xl font-black leading-tight tracking-tight group-hover:text-indigo-500 transition-colors ${subtitle ? 'mb-1' : 'mb-4'} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title || "Untitled Session"}
          </h4>
          
          <div className="flex items-center justify-between mt-auto">
            <div className={`flex items-center gap-2 ${isLive ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
              <Clock size={14} className={isLive ? "text-rose-500" : "text-indigo-500"} />
              <span className="text-xs font-bold">
                {isLive ? "HAPPENING NOW" : time}
              </span>
            </div>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1
              ${isLive ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleCard({ icon, title, sub, progress, items, isDark, color }) {
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

export function NewsItem({ title, date, urgent, isDark }) {
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

export function SeatStat({ city, status, color, isDark }) {
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
