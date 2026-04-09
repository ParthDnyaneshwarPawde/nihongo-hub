import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, ShieldCheck, Lock, Video, Users, ChevronRight, Key, X } from 'lucide-react';

const ClassroomCard = memo(({ 
  cls, 
  index, 
  isDarkMode, 
  isHost, 
  isBatchTeacher, 
  requiresPassword,
  onJoinClick,
  onEndSession 
}) => {
  return (
    <motion.div 
      className={`group p-8 rounded-[2.5rem] border relative overflow-hidden backdrop-blur-xl
        ${isDarkMode 
          ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/50 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)]' 
          : 'bg-white/80 border-white hover:border-indigo-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10'}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      whileHover={{ y: -12 }}
    >
      {/* Subtle Top Gradient Line inside the card */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* DYNAMIC TOP-RIGHT BADGE */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
        {isHost ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20 backdrop-blur-md">
            <Crown size={12} /> Your Class
          </div>
        ) : isBatchTeacher ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 backdrop-blur-md">
            <ShieldCheck size={12} /> Co-Host Access
          </div>
        ) : requiresPassword ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-500/20 backdrop-blur-md">
            <Lock size={12} /> Restricted
          </div>
        ) : null}
      </div>

      {/* Header & Avatar */}
      <div className="flex justify-between items-start mb-8 mt-2">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className={`p-4 rounded-2xl relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
            <Video size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className="mb-10 relative z-10">
        <h3 className={`text-2xl font-black mb-3 tracking-tight line-clamp-2 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={cls.classTitle}>
          {cls.classTitle}
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-black shadow-lg">
            {cls.teacherName ? cls.teacherName[0] : "S"}
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{cls.teacherName || "Sensei"}</p>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${isDarkMode ? 'bg-slate-800/50 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            <Users size={12} className="text-indigo-500" /> {cls.studentCount}
          </p>
        </div>
      </div>

      {/* DYNAMIC ACTION BUTTONS */}
      <div className="flex gap-3 relative z-10">
        <button 
          onClick={() => onJoinClick(cls, isHost, isBatchTeacher)}
          className={`flex-1 py-4 font-black tracking-wide rounded-[1.25rem] transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 active:translate-y-0 active:shadow-md
            ${isHost 
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-600/20' 
              : isBatchTeacher 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
              : requiresPassword
              ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-black/30 border border-slate-700'
              : 'bg-white text-slate-900 border border-slate-200 hover:border-indigo-300 dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:border-indigo-500/50 dark:hover:bg-white/10'
            }`}
        >
          {isHost ? "Resume Class" : isBatchTeacher ? "Join Co-Host" : requiresPassword ? "Unlock Room" : "Join Guest"} 
          {requiresPassword ? <Key size={16} /> : <ChevronRight size={18} />}
        </button>

        {isHost && (
          <button 
            onClick={() => onEndSession(cls.id)}
            className="p-4 bg-rose-500 text-white rounded-[1.25rem] hover:bg-rose-600 transition-all duration-300 shadow-xl shadow-rose-500/20 hover:shadow-2xl hover:shadow-rose-500/40 hover:-translate-y-1 active:scale-95"
            title="End Session"
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default ClassroomCard;
