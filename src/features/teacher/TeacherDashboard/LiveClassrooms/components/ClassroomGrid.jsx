import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import ClassroomCard from './ClassroomCard';

export default function ClassroomGrid({ 
  liveSessions, 
  myBatches, 
  currentUser, 
  isDarkMode,
  onJoinClick,
  onEndSession
}) {
  if (liveSessions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className={`col-span-full py-40 text-center border-2 border-dashed rounded-[3rem] backdrop-blur-sm flex flex-col items-center justify-center ${isDarkMode ? 'border-slate-800/50 bg-slate-900/20' : 'border-slate-200 bg-white/40'}`}
      >
         <div className="relative mb-6">
           <div className="absolute inset-0 bg-slate-500 blur-2xl opacity-20"></div>
           <ShieldAlert className="relative text-slate-400 dark:text-slate-600" size={80} strokeWidth={1.5} />
         </div>
         <h3 className={`text-2xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Active Broadcasts</h3>
         <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">The network is currently offline.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {liveSessions.map((cls, index) => {
        const isHost = currentUser?.uid === cls.hostId;
        const isBatchTeacher = myBatches.includes(cls.batchLevel);
        const requiresPassword = cls.password && !isHost && !isBatchTeacher;

        return (
          <ClassroomCard 
            key={cls.id}
            cls={cls}
            index={index}
            isDarkMode={isDarkMode}
            isHost={isHost}
            isBatchTeacher={isBatchTeacher}
            requiresPassword={requiresPassword}
            onJoinClick={onJoinClick}
            onEndSession={onEndSession}
          />
        );
      })}
    </div>
  );
}
