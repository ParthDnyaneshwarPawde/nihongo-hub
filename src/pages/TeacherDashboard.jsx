import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, limit, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
  Video, Mic2, Tv, X, Zap, Loader2, Shield, Send, Search, Bell, Settings, LogOut,
  Users, Calendar, BookOpen, ShieldCheck, Filter, Plus, MoreHorizontal, BarChart3, Menu, Clock
} from 'lucide-react';
import LiveClassrooms from './LiveClassrooms';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempClassData, setTempClassData] = useState(null);
  const [bulletinMessage, setBulletinMessage] = useState("");
const [isBroadcasting, setIsBroadcasting] = useState(false);

const [step, setStep] = useState('selection');

const [tempClassID, setTempClassID] = useState(null);
  const [activeType, setActiveType] = useState(null); 
  const [roomPassword, setRoomPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState(""); // Fixed missing state
  // const [tempClassData, setTempClassData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    setCurrentUser(user);
  });
  return () => unsubscribe();
}, []);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (step === 'password') return;
  // 1. Look for any class that is currently 'live'
  const q = query(collection(db, "classes"), where("status", "==", "live"), limit(1));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const liveDoc = snapshot.docs[0];
      const data = liveDoc.data();
      
      // 2. Re-populate the states so the Red Button appears
      setCurrentSessionId(liveDoc.id);
      setTempClassData(data);
      setActiveRoomCode(data.roomID);
      setIsLive(true);
      setStep('selection');
    } else {
      // 3. If no live class exists, reset to the "Start Session" view
      setIsLive(false);
      setCurrentSessionId(null);
    }
  });

  const broadcastBulletin = async () => {
  if (!bulletinMessage.trim()) return;
  setIsBroadcasting(true);

  try {
    await addDoc(collection(db, "bulletins"), {
      message: bulletinMessage,
      sender: currentUser?.displayName || "Sensei",
      createdAt: serverTimestamp(),
      type: "global"
    });

    setBulletinMessage(""); // Clear the box
    alert("Broadcast sent to all students!");
  } catch (error) {
    console.error("Broadcast failed:", error);
  } finally {
    setIsBroadcasting(false);
  }
};

  return () => unsubscribe();
}, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Inside StudentDashboard.jsx

  const handleSaveClass = async (classData) => {
  try {
    setTempClassData(classData);
    // 1. Save the new class to Firestore
    const docRef = await addDoc(collection(db, "classes"), {
      ...classData,
      hostId: auth.currentUser.uid,
      status: classData.status === "Starting Now" ? "pending" : "upcoming",
      createdAt: new Date(),
    });

    // 2. If it's starting now, go straight to the password setup
    // If it's upcoming, just close the modal and show a "Success" toast
    if (classData.status === "Starting Now") {
      setStep('password');
      setIsModalOpen(false);
      setTempClassID(docRef.id); // Save the ID to update later with a password
       // Move to your password input UI
      setActiveRoomCode(classData.roomID); // Add this line!
      
    } else {
      alert("Class Scheduled Successfully!");
      setIsModalOpen(false);
    }
  } catch (error) {
    console.error("Error saving class:", error);
  }
};

  const copyGuestInvite = (roleType) => {
    if (!isLive || !activeRoomCode) return;
    const guestLink = `${window.location.origin}/room/${activeRoomCode}?type=${activeType}&role=${roleType}&pass=${roomPassword}`;
    navigator.clipboard.writeText(guestLink);
    alert(`${roleType === 'guest_teacher' ? 'Sensei' : 'Student'} link copied!`);
  };

  const handleTypeSelection = (type) => {
    setError(null);
    setActiveType(type);
    setIsModalOpen(true)
  };

  const launchClass = async () => {
    if (!activeType || !tempClassID) return;
    setIsProcessing(true);
    setError(null);

    try {
      // const roomCode = tempClassData.roomID;

      const classRef = doc(db, "classes", tempClassID);
      const roomCode = tempClassData.roomID;
      
      await updateDoc(classRef, {
        code: roomCode,
        password: roomPassword, 
        type: activeType,
        teacher: currentUser?.displayName || "Sensei",
        status: 'live',
        createdAt: serverTimestamp(),
        studentsJoined: 0
      });

      setCurrentSessionId(tempClassID);
      setActiveRoomCode(roomCode); // Save code for invites
      setIsLive(true);
      setIsProcessing(false);
      

      navigate(`/room/${roomCode}?type=${activeType}&role=host&pass=${roomPassword}`);
      
    } catch (err) {
      console.error("Launch Error:", err);
      setError("Failed to create room. Please check your connection.");
      setIsProcessing(false); 
    }
  };

  const resetForm = () => {
    setActiveType(null);
    setRoomPassword("");
    setError(null);
  };

  const endSession = async () => {
    if (!currentSessionId) {
    alert("No active session found to end.");
    return;
  }

  const confirmEnd = window.confirm("Are you sure? This will disconnect all students.");
  if (!confirmEnd) return;
    
    try {
      const sessionRef = doc(db, "classes", currentSessionId);
      await updateDoc(sessionRef, {
        status: 'ended',
        endedAt: serverTimestamp() 
      });
      
      setIsLive(false);
      setCurrentSessionId(null);
      setActiveRoomCode("");
      setActiveType(null);
      setRoomPassword("");
      setStep('selection');
      alert("Session Ended Successfully.");
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session. Check your internet.");
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0A0F1C] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 flex flex-col border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}
      `}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            <div>
              <h2 className={`text-xl font-black tracking-tighter leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SENSEI PANEL</h2>
              <p className="text-[10px] text-rose-500 font-black tracking-[0.2em] uppercase">Nihongo Hub</p>
            </div>
          </div>
          <button className="lg:hidden p-1 text-slate-400" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60">Control</p>
          <SidebarLink icon={<BarChart3 size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleTabClick('dashboard')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Tv size={18}/>} label="Live Classroom" active={activeTab === 'live'} onClick={() => handleTabClick('live')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Users size={18}/>} label="Student Database" active={activeTab === 'students'} onClick={() => handleTabClick('students')} isDarkMode={isDarkMode} />
          
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800"> 
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60">Management</p>
            <SidebarLink icon={<BookOpen size={18}/>} label="Course Materials" active={activeTab === 'materials'} isDarkMode={isDarkMode} />
            <SidebarLink icon={<Calendar size={18}/>} label="Exam Scheduler" active={activeTab === 'exams'} isDarkMode={isDarkMode} />
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <SidebarLink icon={<Settings size={18}/>} label="Settings" isDarkMode={isDarkMode} />
            <SidebarLink icon={<LogOut size={18}/>} label="Logout" danger isDarkMode={isDarkMode} onClick={handleLogout} />
          </div>
        </nav>

        <div className="p-6">
  <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-300
        ${isDarkMode ? 'bg-white/10 border border-white/20 text-white shadow-none' : 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-200'}
      `}>
        {/* Get the first two initials of the user's name */}
        {currentUser?.displayName ? currentUser.displayName.split(' ').map(n => n[0]).join('') : 'S'}
      </div>
      <div>
        {/* THE REAL NAME GOES HERE */}
        <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {currentUser?.displayName || "Sensei"}
        </p>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-indigo-100' : 'text-indigo-600'}`}>
          Verified Lead
        </p>
      </div>
    </div>
  </div>
</div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className={`absolute right-[-15%] top-[5%] text-[500px] lg:text-[700px] font-black select-none pointer-events-none z-0 transition-opacity duration-500 ${isDarkMode ? 'text-white opacity-[0.02]' : 'text-slate-900 opacity-[0.04]'}`}>
          指揮
        </div>

        {activeTab === 'live' ? (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <LiveClassrooms isDarkMode={isDarkMode} />
      </div>
      ) : (
      <div>
        <header className={`h-20 border-b backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#0A0F1C]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div className={`hidden md:flex items-center gap-4 px-4 py-2 rounded-xl border transition-all duration-300
              ${isDarkMode ? 'bg-slate-800/50 border-slate-800 focus-within:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-indigo-500/5'}
            `}>
              <Search size={16} className="text-slate-400" />
              <input type="text" placeholder="Search students..." className={`bg-transparent font-black text-sm outline-none w-full placeholder:text-slate-400 placeholder:font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              {isDarkMode ? <Zap size={18} className="text-amber-400" /> : <Clock size={18} className="text-slate-600" />}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            <button className={`p-2.5 rounded-xl border relative transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto h-screen p-6 lg:p-10 custom-scrollbar">

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 z-10 custom-scrollbar space-y-12">
          
          <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="animate-in fade-in slide-in-from-left-6 duration-700">
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
                      <h3 className="text-3xl font-black text-white mb-2">
  Set Password for {tempClassData?.classTitle}
</h3>
<p className="text-slate-500 text-sm mb-8 font-medium">
  Room ID: {tempClassData?.roomID} • Level: {tempClassData?.level}
</p>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Room Password (Optional)</label>
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Ex: nihongo123"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          className={`w-full p-5 rounded-2xl border transition-all outline-none font-black text-lg
                            ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 shadow-inner'}`}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button onClick={resetForm} className="px-6 py-5 rounded-2xl border border-slate-700 font-black text-slate-500 hover:bg-slate-800 transition-all">Cancel</button>
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

        </div>
        </div>
      </div>
      )}
      </main>
      <ClassLaunchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onNext={handleSaveClass} currentTeacherName={currentUser?.displayName || "Sensei"} />
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick, danger, badge, isDarkMode }) {
  const activeClass = "bg-rose-600 text-white shadow-xl shadow-rose-600/30";
  const inactiveClass = isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const dangerClass = "text-slate-500 hover:bg-rose-500/10 hover:text-rose-500";

  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 font-black group ${active ? activeClass : danger ? dangerClass : inactiveClass}`}>
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>{icon}</span>
        <span className="text-[13px] tracking-tight">{label}</span>
      </div>
      {badge && <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-1 rounded-full uppercase">{badge}</span>}
    </button>
  );
}

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


const ClassLaunchModal = ({ isOpen, onClose, onNext, currentTeacherName }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    teacherName: currentTeacherName, // Default
    classTitle: "",
    level: "N5",
    status: "Starting Now",
    scheduledTime: "",
  });

  useEffect(() => {
    if (currentTeacherName) {
      setFormData(prev => ({ ...prev, teacherName: currentTeacherName }));
    }
  }, [currentTeacherName]);
  

  
  useEffect(() => {
  // If the modal is closed, reset the loading state for the next time it opens
  if (!isOpen) {
    setIsSaving(false);
  }
}, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("submitted");
    setIsSaving(true);
    
    // Autogenerate a 6-digit Room ID
    const autoRoomID = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Combine everything into one object
    const finalClassData = {
      ...formData,
      roomID: autoRoomID,
      createdAt: new Date(),
    };

    try {
    // 2. Wait for the parent (handleSaveClass) to finish
    await onNext(finalClassData);
  } catch (error) {
    console.error("Submission failed:", error);
    setIsSaving(false); // 3. Reset if it fails so teacher can try again
  }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-white mb-6">Class Setup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teacher Name */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Teacher Name</label>
            <input 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500"
              value={formData.teacherName}
              onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
            />
          </div>

          {/* Class Title */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Class Title</label>
            <input 
              required
              placeholder="e.g. Kanji Masterclass"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-indigo-500"
              onChange={(e) => setFormData({...formData, classTitle: e.target.value})}
            />
          </div>

          {/* Level / Batch Dropdown */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Batch / Level</label>
            <select 
              className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none appearance-none"
              onChange={(e) => setFormData({...formData, level: e.target.value})}
            >
              <option>JLPT N5</option>
              <option>JLPT N4</option>
              <option>JLPT N3</option>
              <option>JLPT N2</option>
              <option>JLPT N1</option>
              <option>JLPT N5 Pro</option>
              <option>JLPT N4 Pro</option>
              <option>JLPT N3 Pro</option>
              <option>JLPT N2 Pro</option>
              <option>JLPT N1 Pro</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Status</label>
            <select 
              className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option>Starting Now</option>
              <option>Upcoming</option>
            </select>
          </div>

          {/* Conditional Time Input */}
          {formData.status === "Upcoming" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2">Scheduled Time</label>
              <input 
                type="datetime-local"
                required
                className="w-full bg-white/5 border border-rose-500/30 rounded-2xl px-4 py-3 text-white outline-none"
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
            <button 
  type="submit" 
  disabled={isSaving} // Prevent double clicks
  className={`flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3
    ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95'}`}
>
  {isSaving ? (
    <>
      <Loader2 className="animate-spin" size={20} />
      SECURING SESSION...
    </>
  ) : (
    "Continue to Password"
  )}
</button>
          </div>
        </form>
      </div>
    </div>
  );
};