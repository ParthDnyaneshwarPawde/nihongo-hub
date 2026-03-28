import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { X, ChevronRight, Video, Users, Loader2, ShieldAlert, Lock, ArrowRight, Key, Crown, ShieldCheck, Radio } from 'lucide-react';
import AnimatedKanji from '@components/shared/AnimatedKanji';

export default function LiveClassrooms({ isDarkMode }) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [myBatches, setMyBatches] = useState([]); 
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // --- PASSWORD MODAL STATES ---
  const [selectedClassForAuth, setSelectedClassForAuth] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "classes"), where("status", "==", "live"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        studentCount: doc.data().activeParticipants || 0
      }));
      setLiveSessions(sessions);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "batches"), where("teacherIds", "array-contains", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const batchTitles = snapshot.docs.map(doc => doc.data().title);
      setMyBatches(batchTitles);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const endSession = async (classId) => {
    if (window.confirm("Terminate this session for all students? This cannot be undone.")) {
      try {
        await updateDoc(doc(db, "classes", classId), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      } catch (err) { console.error(err); }
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
    } else {
      setPasswordError("Incorrect access key. Please try again.");
    }
  };

  if (isLoading) return (
    <div className={`h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#0A0F1C]' : 'bg-slate-50'}`}>
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <Video className="text-indigo-500 animate-pulse" size={24} />
      </div>
      <p className="text-indigo-500 font-black tracking-widest text-[10px] uppercase animate-pulse">Syncing Network...</p>
    </div>
  );

  return (
    <div className={`min-h-screen p-8 lg:p-12 transition-colors duration-700 relative overflow-hidden ${isDarkMode ? 'bg-[#050814]' : 'bg-[#F8FAFC]'}`}>
      
      {/* 🌟 Background Glow Effects */}
      {/* Background Kanji Watermark */}
<div className={`fixed right-[-5%] top-[-5%] text-[400px] lg:text-[700px] font-black select-none pointer-events-none z-0 transition-opacity duration-500 ${isDarkMode ? 'text-white opacity-[0.02]' : 'text-slate-900 opacity-[0.03]'}`}>
  生
</div>
{/* Animated Cinematic Background */}
{/* <AnimatedKanji isDarkMode={isDarkMode} /> */}
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-full h-full bg-rose-500 rounded-full animate-ping opacity-60"></div>
                <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_20px_#f43f5e] relative z-10"></div>
              </div>
              <h1 className={`text-5xl lg:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${isDarkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-500'}`}>
                Active Grid.
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-[0.3em] uppercase ml-8">Global Live Network</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs tracking-widest border backdrop-blur-md shadow-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 shadow-indigo-500/10' : 'bg-white text-indigo-600 border-indigo-100 shadow-indigo-500/5'}`}>
              <Radio size={16} className="animate-pulse" /> {liveSessions.length} LIVE SESSIONS
            </div>
          </div>
        </div>

        {/* Classroom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {liveSessions.length > 0 ? (
            liveSessions.map((cls, index) => {
              const isHost = currentUser?.uid === cls.hostId;
              const isBatchTeacher = myBatches.includes(cls.batchLevel);
              const requiresPassword = cls.password && !isHost && !isBatchTeacher;

              return (
                <div 
                  key={cls.id} 
                  className={`group p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden animate-in zoom-in-95 backdrop-blur-xl hover:-translate-y-3
                  ${isDarkMode 
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/50 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)]' 
                    : 'bg-white/80 border-white hover:border-indigo-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
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
                    ) : requiresPassword && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-500/20 backdrop-blur-md">
                        <Lock size={12} /> Restricted
                      </div>
                    )}
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
                      onClick={() => handleJoinClick(cls, isHost, isBatchTeacher)}
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
                        onClick={() => endSession(cls.id)}
                        className="p-4 bg-rose-500 text-white rounded-[1.25rem] hover:bg-rose-600 transition-all duration-300 shadow-xl shadow-rose-500/20 hover:shadow-2xl hover:shadow-rose-500/40 hover:-translate-y-1 active:scale-95"
                        title="End Session"
                      >
                        <X size={20} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`col-span-full py-40 text-center border-2 border-dashed rounded-[3rem] backdrop-blur-sm animate-in fade-in duration-1000 flex flex-col items-center justify-center ${isDarkMode ? 'border-slate-800/50 bg-slate-900/20' : 'border-slate-200 bg-white/40'}`}>
               <div className="relative mb-6">
                 <div className="absolute inset-0 bg-slate-500 blur-2xl opacity-20"></div>
                 <ShieldAlert className="relative text-slate-400 dark:text-slate-600" size={80} strokeWidth={1.5} />
               </div>
               <h3 className={`text-2xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Active Broadcasts</h3>
               <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">The network is currently offline.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- PREMIUM PASSWORD MODAL --- */}
      {selectedClassForAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050814]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 border relative overflow-hidden
            ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none mix-blend-screen"></div>

            <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-[24px] flex items-center justify-center border border-indigo-500/20 shadow-inner">
                <Lock size={28} strokeWidth={2.5} />
              </div>
              <button 
                onClick={() => setSelectedClassForAuth(null)}
                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:text-white rounded-full transition-all backdrop-blur-md hover:rotate-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative z-10">
              <h3 className={`text-3xl font-black tracking-tighter mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Restricted Area.
              </h3>
              <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed">
                Sensei <span className="text-indigo-500 dark:text-indigo-400 font-bold">{selectedClassForAuth.teacherName}</span> requires a secure access key to enter this live broadcast.
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400">
                    <Key size={20} />
                  </div>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Enter Access Key"
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    className={`w-full pl-14 pr-6 py-5 rounded-2xl border outline-none font-black text-lg tracking-[0.1em] transition-all
                      ${isDarkMode ? 'bg-[#111827] border-slate-700 text-white focus:border-indigo-500 focus:bg-[#1a2333] shadow-inner shadow-black/20' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-inner'}`}
                  />
                </div>

                {passwordError && (
                  <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-1.5 mt-2">
                    <ShieldAlert size={14} /> {passwordError}
                  </p>
                )}

                <button 
                  type="submit" 
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black tracking-[0.2em] uppercase text-xs rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3 mt-6 hover:shadow-indigo-500/50"
                >
                  Authenticate <ArrowRight size={18} strokeWidth={3} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}