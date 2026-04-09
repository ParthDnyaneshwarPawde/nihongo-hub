import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@services/firebase';
import { 
  Video, Mic2, Tv, Zap, Loader2, ShieldCheck, Send, Filter, Plus, MoreHorizontal, Calendar, X 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSenseiProfile } from '../hooks/useSenseiProfile';

// Helper Components
function StatMini({ label, value, color, isDarkMode }) {
  const colors = { emerald: 'text-emerald-500', indigo: 'text-indigo-500', rose: 'text-rose-500', amber: 'text-amber-500' };
  return (
    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-200'}`}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black ${colors[color]}`}>{value}</p>
    </div>
  );
}

function ActionBtn({ icon, title, sub, theme, onClick, isDarkMode }) {
  const accents = {
    indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:border-indigo-500',
    emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500',
    rose: 'text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500'
  };

  return (
    <button onClick={onClick} className={`flex flex-col items-center text-center p-8 rounded-[32px] border transition-all duration-300 group shadow-sm hover:shadow-xl ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'} ${accents[theme]}`}>
      <div className="mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
        {icon}
      </div>
      <h4 className={`font-black text-lg mb-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] opacity-70">{sub}</p>
    </button>
  );
}

function StudentItem({ name, level, activity, isDarkMode }) {
  return (
    <div className={`flex items-center justify-between p-6 transition-colors ${isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-[#0A0F1C] border-transparent text-white shadow-lg shadow-slate-200'}`}>
          {name[0]}
        </div>
        <div>
          <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{name}</p>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{level} Candidate</p>
        </div>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-[#0A0F1C] border-transparent text-white shadow-md'}`}>
        {activity}
      </span>
    </div>
  );
}

function TaskItem({ title, date, level, status, isDarkMode }) {
  const statusColors = { Live: 'text-emerald-500', Draft: 'text-slate-500', Scheduled: 'text-amber-500' };
  return (
    <div className={`p-5 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[40px]">
          <p className="text-[8px] font-black text-slate-500 uppercase">{date.split(' ')[0]}</p>
          <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{date.split(' ')[1]}</p>
        </div>
        <div>
          <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</p>
          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{level} Exam</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[9px] font-black uppercase tracking-tighter ${statusColors[status]}`}>{status}</span>
        <MoreHorizontal size={16} className="text-slate-500 cursor-pointer" />
      </div>
    </div>
  );
}

export default function DashboardHome({ isDarkMode }) {
  const { currentUser } = useSenseiProfile();
  const navigate = useNavigate();

  const [isLive, setIsLive] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [step, setStep] = useState('selection');
  const [tempClassData, setTempClassData] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState("");
  const [tempClassID, setTempClassID] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [roomPassword, setRoomPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [bulletinMessage, setBulletinMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myUpcomingClasses, setMyUpcomingClasses] = useState([]);

  useEffect(() => {
    // Fetch Scheduled Upcoming Classes
    const q = query(collection(db, "classes"), where("status", "==", "upcoming"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyUpcomingClasses(fetched);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Determine if Lead Teacher has an active live session running
    if (!currentUser) return;
    if (step === 'password') return;

    const q = query(
      collection(db, "classes"), 
      where("status", "==", "live"), 
      where("hostId", "==", currentUser.uid),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const liveDoc = snapshot.docs[0];
        const data = liveDoc.data();
        setCurrentSessionId(liveDoc.id);
        setTempClassData(data);
        setActiveRoomCode(data.roomID);
        setIsLive(true);
        setStep('selection');
      } else {
        setIsLive(false);
        setCurrentSessionId(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser, step]);

  const broadcastBulletin = async () => {
    if (!bulletinMessage.trim()) {
      alert("Please enter a message first!");
      return;
    }
    
    setIsBroadcasting(true);
    try {
      await addDoc(collection(db, "bulletins"), {
        message: bulletinMessage,
        sender: currentUser?.displayName || "Sensei",
        createdAt: serverTimestamp(),
        type: "global",
        targetLevel: "global"
      });
      setBulletinMessage("");
      alert("Broadcast sent successfully!");
    } catch (err) {
      console.error("Broadcast error:", err);
      alert("Failed to send broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleTypeSelection = (type) => {
    setError(null);
    setActiveType(type);
    alert(`Launch ${type} Logic Hook triggered. Class setup modal to be shown.`);
    // Originally toggled a Modal in the root dashboard. Assuming setup from Upcoming.
  };

  const activateScheduledClass = (cls) => {
    setTempClassData(cls);
    setTempClassID(cls.id);
    setActiveType(cls.type || "Video");
    setActiveRoomCode(cls.roomID);
    setStep('password'); 
  };

  const resetForm = () => {
    setActiveType(null);
    setRoomPassword("");
    setError(null);
    setStep('selection');
  };

  const endSession = async () => {
    if (!currentSessionId) return;
    if (!window.confirm("Are you sure? This will disconnect all students.")) return;
    
    try {
      const sessionRef = doc(db, "classes", currentSessionId);
      await updateDoc(sessionRef, { status: 'ended', endedAt: serverTimestamp() });
      setIsLive(false);
      setCurrentSessionId(null);
      setActiveRoomCode("");
      setActiveType(null);
      setRoomPassword("");
      setStep('selection');
      alert("Session Ended Successfully.");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const deleteScheduledClass = async (classId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled session?")) return;
    try {
      await deleteDoc(doc(db, "classes", classId));
      alert("Session cancelled and removed.");
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const launchClass = async () => {
    if (!activeType || !tempClassID) return;
    setIsProcessing(true);
    setError(null);

    try {
      const classRef = doc(db, "classes", tempClassID);
      const roomCode = tempClassData.roomID;
      const batchLevel = tempClassData.level;
      const now = new Date();
      const istTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      
      await updateDoc(classRef, {
        code: roomCode,
        password: roomPassword || "", 
        type: activeType,
        teacher: currentUser?.displayName || "Sensei",
        status: 'live',
        batchLevel: batchLevel,
        createdAt: serverTimestamp(),
        scheduledTime: istTime,
        studentsJoined: 0
      });

      await addDoc(collection(db, "bulletins"), {
        message: `🏮 ${tempClassData.classTitle} is starting! Access Key: ${roomPassword || 'None'}`,
        sender: currentUser?.displayName || "Sensei",
        createdAt: serverTimestamp(),
        type: "batch-specific", 
        targetLevel: batchLevel 
      });

      navigate(`/room/${roomCode}?type=${activeType}&role=host&pass=${roomPassword}`);
    } catch (err) {
      console.error("Launch Error:", err);
      setError("Failed to create room.");
      setIsProcessing(false); 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="p-6 lg:p-10 space-y-12"
    >
      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div>
          <h1 className={`text-4xl lg:text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Academy Command.</h1>
          <p className={`text-lg font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Managing <span className="text-indigo-500 font-bold">1,284 students</span> across 5 JLPT levels.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
          <StatMini label="Active" value="42" color="emerald" isDarkMode={isDarkMode} />
          <StatMini label="Pass Rate" value="92%" color="indigo" isDarkMode={isDarkMode} />
          <StatMini label="New Leads" value="+12" color="rose" isDarkMode={isDarkMode} />
          <StatMini label="Revenue" value="1.2k" color="amber" isDarkMode={isDarkMode} />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`xl:col-span-2 p-8 lg:p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden relative group`}>
          <div className="relative z-10 min-h-[340px] flex flex-col justify-center">
            
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isLive ? "Session in Progress" : activeType ? `Secure ${activeType} Room` : "Session Manager"}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {isLive ? "Your class is currently live on servers." : "Initiate live rooms and generate access codes."}
                </p>
              </div>
              {isLive && (
                <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 animate-pulse">
                  LIVE NOW
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              {isLive ? (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <button 
                    onClick={endSession}
                    className="w-full bg-rose-600 text-white p-12 rounded-[40px] font-black text-2xl shadow-2xl shadow-rose-600/20 hover:bg-rose-500 transition-all flex flex-col items-center gap-2"
                  >
                    <div className="w-4 h-4 bg-white rounded-full animate-ping mb-2"></div>
                    END ACTIVE SESSION
                    <span className="text-sm font-bold opacity-70 tracking-widest uppercase">Students will be disconnected</span>
                  </button>
                </div>
              ) : step === 'password' ? (
                <div className="animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-md mx-auto w-full space-y-6">
                  <h3 className="text-3xl font-black text-white mb-2">Set Password for {tempClassData?.classTitle}</h3>
                  <p className="text-slate-500 text-sm mb-8 font-medium">Room ID: {tempClassData?.roomID} • Level: {tempClassData?.level}</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Room Password (Optional)</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Ex: nihongo123"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      className={`w-full p-5 rounded-2xl border transition-all outline-none font-black text-lg ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 shadow-inner'}`}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button type="button" onClick={resetForm} className="px-6 py-5 rounded-2xl border border-slate-700 font-black text-slate-500 hover:bg-slate-800 transition-all">Cancel</button>
                    <button 
                      onClick={launchClass}
                      disabled={isProcessing}
                      className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} 
                      {isProcessing ? "LAUNCHING..." : `LAUNCH ${activeType?.toUpperCase()}`}
                    </button>
                  </div>
                  {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  <ActionBtn icon={<Video size={24}/>} title="Video Class" sub="High Bandwidth" theme="indigo" isDarkMode={isDarkMode} onClick={() => handleTypeSelection('Video')} />
                  <ActionBtn icon={<Mic2 size={24}/>} title="Audio Lounge" sub="Community" theme="emerald" isDarkMode={isDarkMode} onClick={() => handleTypeSelection('Audio')} />
                  <ActionBtn icon={<Tv size={24}/>} title="Broadcast" sub="One-Way" theme="rose" isDarkMode={isDarkMode} onClick={() => handleTypeSelection('Broadcast')} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`p-8 rounded-[32px] border flex flex-col ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <h3 className={`font-black mb-2 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Global Bulletin</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">Push an announcement to every student's dashboard instantly.</p>
          <textarea 
            value={bulletinMessage}
            onChange={(e) => setBulletinMessage(e.target.value)}
            placeholder="Ex: 'N4 Mock Test starts in 15 mins...'"
            className={`flex-1 bg-transparent border-2 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500 transition-all resize-none mb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}
          />
          <button 
            onClick={broadcastBulletin}
            disabled={isBroadcasting}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            {isBroadcasting ? "Sending..." : "Broadcast Now"} <Send size={16}/>
          </button>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-2">Class Schedule</h3>
            <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Sessions</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myUpcomingClasses.length > 0 ? (
            myUpcomingClasses.map((cls) => (
              <div key={cls.id} className={`p-6 rounded-[32px] border flex items-center justify-between transition-all ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><Calendar size={20} /></div>
                  <div>
                    <h4 className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cls.classTitle}</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cls.level}</p>
                      {cls.password && (
                        <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-md font-mono">
                          Key: {cls.password}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => deleteScheduledClass(cls.id)}
                    className={`p-3 rounded-xl border transition-all ${isDarkMode ? 'border-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500' : 'border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600'}`}
                    title="Cancel Session"
                  ><X size={16} /></button>
                  <button 
                    onClick={() => activateScheduledClass(cls)}
                    className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                  >GO LIVE</button>
                </div>
              </div>
            ))
          ) : (
            <div className={`col-span-full p-10 text-center rounded-[32px] border-2 border-dashed ${isDarkMode ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
              <p className="text-sm font-bold uppercase tracking-widest">No sessions scheduled.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className={`rounded-[32px] border overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="p-8 border-b border-slate-800/50 flex justify-between items-center">
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Active Roster</h3>
            <Filter size={18} className="text-slate-500 cursor-pointer" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <StudentItem name="Arjun Sharma" level="N4" activity="Grammar Unit 4" isDarkMode={isDarkMode} />
            <StudentItem name="Priya Singh" level="N5" activity="Taking Mock Test" isDarkMode={isDarkMode} />
            <StudentItem name="Kevin Kovacs" level="N2" activity="Vocab Drill" isDarkMode={isDarkMode} />
            <StudentItem name="Sarah Miller" level="N3" activity="Idle" isDarkMode={isDarkMode} />
          </div>
          <button className="w-full py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">View All Students</button>
        </div>

        <div className={`p-8 lg:p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-8">
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Tasks</h3>
            <button className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Plus size={20}/></button>
          </div>
          <div className="space-y-4">
            <TaskItem title="N4 Weekly Kanji Quiz" date="Mar 18" level="N4" status="Scheduled" isDarkMode={isDarkMode} />
            <TaskItem title="Genki II Ch. 4 Vocab" date="Mar 20" level="N5" status="Draft" isDarkMode={isDarkMode} />
            <TaskItem title="N3 Full Mock Exam" date="Mar 25" level="N3" status="Live" isDarkMode={isDarkMode} />
          </div>
        </div>
      </section>

      <section className={`p-10 lg:p-16 rounded-[48px] border text-center relative overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'}`}>
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <ShieldCheck size={48} className="text-indigo-500 mx-auto mb-4" />
          <h2 className={`text-4xl lg:text-5xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Insights & Analytics.</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
            Track student progress across the globe. Our AI identifies which students are struggling with specific particles so you can address them in the next live session.
          </p>
          <button className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30">
            Launch Analytics Suite
          </button>
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }}></div>
      </section>

    </motion.div>
  );
}
