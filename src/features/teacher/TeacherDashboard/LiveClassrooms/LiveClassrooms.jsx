import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import { Video } from 'lucide-react';
import AnimatedKanji from '@components/shared/AnimatedKanji';

import { useClassroomSession } from './hooks/useClassroomSession';
import { endClassroomSession } from './services/classroomService';

import ClassroomHeader from './components/ClassroomHeader';
import ClassroomGrid from './components/ClassroomGrid';
import PasswordModal from './components/PasswordModal';

export default function LiveClassrooms({ isDarkMode }) {
  const navigate = useNavigate();
  const { liveSessions, myBatches, currentUser, isLoading } = useClassroomSession();

  // --- PASSWORD MODAL STATES ---
  const [selectedClassForAuth, setSelectedClassForAuth] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleEndSession = async (classId) => {
    if (window.confirm("Terminate this session for all students? This cannot be undone.")) {
      try {
        await endClassroomSession(classId);
      } catch (err) {
        console.error("Failed to end session", err);
      }
    }
  };

  const handleJoinClick = (cls, isHost, isBatchTeacher) => {
    if (isHost) {
      navigate(`/room/${cls.roomID}?type=${cls.type}&role=teacher`);
    } else if (isBatchTeacher) {
      navigate(`/room/${cls.roomID}?type=${cls.type}&role=co-host`);
    } else if (cls.password && cls.password.trim() !== "") {
      setSelectedClassForAuth(cls);
      setEnteredPassword("");
      setPasswordError("");
    } else {
      navigate(`/room/${cls.roomID}?type=${cls.type}&role=guest`);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (enteredPassword === selectedClassForAuth.password) {
      navigate(`/room/${selectedClassForAuth.roomID}?type=${selectedClassForAuth.type}&role=guest`);
      setSelectedClassForAuth(null);
    } else {
      setPasswordError("Incorrect access key. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#0A0F1C]' : 'bg-slate-50'}`}>
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <Video className="text-indigo-500 animate-pulse" size={24} />
        </div>
        <p className="text-indigo-500 font-black tracking-widest text-[10px] uppercase animate-pulse">Syncing Network...</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className={`min-h-screen p-8 lg:p-12 transition-colors duration-700 relative overflow-hidden ${isDarkMode ? 'bg-[#050814]' : 'bg-[#F8FAFC]'}`}
      >
        {/* 🌟 Background Glow Effects */}
        {/* Background Kanji Watermark with Lightning Zap Effect */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, filter: 'brightness(1)' }}
          animate={{ 
            opacity: [0, 0.8, 0, 0.5, 0, isDarkMode ? 0.02 : 0.03],
            scale: [0.9, 1.05, 1, 1.02, 1, 1],
            filter: [
              'brightness(1) drop-shadow(0 0 0px rgba(99,102,241,0))',
              'brightness(2) drop-shadow(0 0 50px rgba(99,102,241,0.8))',
              'brightness(1) drop-shadow(0 0 0px rgba(99,102,241,0))',
              'brightness(1.5) drop-shadow(0 0 30px rgba(99,102,241,0.5))',
              'brightness(1) drop-shadow(0 0 0px rgba(99,102,241,0))',
              isDarkMode ? 'brightness(1) drop-shadow(0 0 10px rgba(255,255,255,0.05))' : 'brightness(1) drop-shadow(0 0 10px rgba(99,102,241,0.05))'
            ]
          }}
          transition={{ 
            delay: 0.8, 
            duration: 0.7, 
            times: [0, 0.1, 0.2, 0.25, 0.35, 1],
            ease: "easeInOut" 
          }}
          className={`fixed right-[-5%] top-[-5%] text-[400px] lg:text-[700px] font-black select-none pointer-events-none z-0 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
        >
          生
        </motion.div>
        {/* <AnimatedKanji isDarkMode={isDarkMode} /> */}
        
        <div className="max-w-7xl mx-auto relative z-10">
          <LayoutGroup>
            <ClassroomHeader 
              liveSessionsCount={liveSessions.length} 
              isDarkMode={isDarkMode} 
            />
            
            <ClassroomGrid 
              liveSessions={liveSessions}
              myBatches={myBatches}
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              onJoinClick={handleJoinClick}
              onEndSession={handleEndSession}
            />
          </LayoutGroup>
        </div>

        {/* --- PREMIUM PASSWORD MODAL --- */}
        <PasswordModal 
          isOpen={!!selectedClassForAuth}
          onClose={() => setSelectedClassForAuth(null)}
          selectedClass={selectedClassForAuth}
          enteredPassword={enteredPassword}
          setEnteredPassword={setEnteredPassword}
          passwordError={passwordError}
          onSubmit={handlePasswordSubmit}
          isDarkMode={isDarkMode}
        />
      </motion.div>
    </AnimatePresence>
  );
}