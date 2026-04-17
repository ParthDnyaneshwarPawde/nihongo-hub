import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@services/firebase';
import { 
  Video, Mic2, Tv, Zap, Loader2, ShieldCheck, Send, ChevronRight, Filter, Plus, MoreHorizontal, Calendar, X 
} from 'lucide-react';
import { motion } from 'framer-motion';


// Helper Components
function StatMini({ label, value, color }) {
  const { isDarkMode } = useTheme();
  const colors = { emerald: 'text-emerald-500', indigo: 'text-indigo-500', rose: 'text-rose-500', amber: 'text-amber-500' };
  return (
    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-200'}`}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-black ${colors[color]}`}>{value}</p>
    </div>
  );
}

function ActionBtn({ icon, title, sub, theme, onClick }) {
  const { isDarkMode } = useTheme();
  const accents = {
    indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:border-indigo-500',
    emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500',
    rose: 'text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500'
  };

  return (
    <button onClick={onClick} className={`w-full h-full justify-center flex flex-col items-center text-center p-8 rounded-[32px] border transition-all duration-300 group shadow-sm hover:shadow-xl ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'} ${accents[theme]}`}>
      <div className="mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
        {icon}
      </div>
      <h4 className={`font-black text-lg mb-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] opacity-70">{sub}</p>
    </button>
  );
}

function StudentItem({ name, level, activity }) {
  const { isDarkMode } = useTheme();
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

function TaskItem({ title, date, level, status }) {
  const { isDarkMode } = useTheme();
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
  const { isDarkMode } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [dynamicBatches, setDynamicBatches] = useState([]); // 🚨 NEW: Stores your real batches
  
  const [formData, setFormData] = useState({
    teacherName: currentTeacherName || "",
    classTitle: "",
    level: "", // We will auto-fill this once your batches load
    status: "Starting Now",
    scheduledTime: "",
  });

  // 🚨 THE MAGIC: Fetch this teacher's custom batches from Firestore!
  useEffect(() => {
    if (!isOpen) return; // Only fetch when the modal is open

    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'batches'),
      where('teacherIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedBatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDynamicBatches(fetchedBatches);
        
        // Auto-select the first batch in the dropdown so it's not empty
        setFormData(prev => ({ ...prev, level: fetchedBatches[0].title }));
      } else {
        setDynamicBatches([]);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (currentTeacherName) {
      setFormData(prev => ({ ...prev, teacherName: currentTeacherName }));
    }
  }, [currentTeacherName]);

  useEffect(() => {
    if (!isOpen) setIsSaving(false);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.level) {
      alert("Please create a Course Batch in the Resource Vault first!");
      return;
    }

    setIsSaving(true);
    const autoRoomID = Math.floor(100000 + Math.random() * 900000).toString();
    
    const finalClassData = {
      ...formData,
      roomID: autoRoomID,
      createdAt: new Date(),
    };

    try {
      await onNext(finalClassData);
    } catch (error) {
      console.error("Submission failed:", error);
      setIsSaving(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 border
        ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}>
        <h2 className={`text-2xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Class Setup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Teacher Name</label>
            <input 
              required
              className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold text-sm transition-all
                ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
              value={formData.teacherName}
              onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Class Title</label>
            <input 
              required
              placeholder="e.g. Chapter 1 Vocab Review"
              className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold text-sm transition-all
                ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
              onChange={(e) => setFormData({...formData, classTitle: e.target.value})}
            />
          </div>

          {/* 🚨 THE DYNAMIC DROPDOWN */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">
              Target Batch (From Vault)
            </label>
            <div className="relative mt-1">
              <select 
                required
                className={`w-full px-4 py-3 rounded-2xl border appearance-none cursor-pointer font-black text-sm outline-none transition-all
                  ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                {dynamicBatches.length > 0 ? (
                  dynamicBatches.map((batch) => (
                    <option key={batch.id} value={batch.title} className="text-slate-900">
                      {batch.title} ({batch.level})
                    </option>
                  ))
                ) : (
                  <option value="" disabled className="text-rose-500">
                    No Batches Found. Go to Resource Vault first!
                  </option>
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Status</label>
            <select 
              className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold text-sm transition-all
                ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option>Starting Now</option>
              <option>Upcoming</option>
            </select>
          </div>

          {formData.status === "Upcoming" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-2">Scheduled Time</label>
              <input 
                type="datetime-local"
                required
                className={`w-full px-4 py-3 rounded-2xl border outline-none font-bold text-sm transition-all
                  ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'}`}
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={isSaving || dynamicBatches.length === 0} 
              className={`flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3
                ${(isSaving || dynamicBatches.length === 0) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95'}`}
            >
              {isSaving ? <><Loader2 className="animate-spin" size={20} /> SECURING...</> : "Continue to Password"}
              
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DashboardHome({ 
  currentUser, isLive, isModalOpen, setIsModalOpen,
  tempClassData, bulletinMessage, setBulletinMessage, bulletinTitle, setBulletinTitle, isBroadcasting, 
  step, activeType, roomPassword, setRoomPassword, isProcessing, error, 
  myUpcomingClasses, activateScheduledClass, handleTypeSelection, 
  handleSaveClass, launchClass, resetForm, endSession, 
  deleteScheduledClass, broadcastBulletin, dynamicBatches, setBulletinTarget, bulletinTarget
}) {
  const { isDarkMode } = useTheme();

  return (
    <>
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
            <StatMini label="Active" value="42" color="emerald" />
            <StatMini label="Pass Rate" value="92%" color="indigo" />
            <StatMini label="New Leads" value="+12" color="rose" />
            <StatMini label="Revenue" value="1.2k" color="amber" />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`lg:col-span-2 p-8 lg:p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden relative group`}>
            <div className="relative z-10 flex flex-col h-full">
              
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

              <div className="flex-1 flex flex-col justify-center">
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
                  <div className="flex flex-wrap justify-center gap-6 animate-in fade-in duration-500">
                    
                    <div className="flex-1 min-w-[240px] max-w-[400px]">
                      <ActionBtn icon={<Video size={24}/>} title="Video Class" sub="High Bandwidth" theme="indigo" onClick={() => handleTypeSelection('Video')} />
                    </div>
                    
                    <div className="flex-1 min-w-[240px] max-w-[400px]">
                      <ActionBtn icon={<Mic2 size={24}/>} title="Audio Lounge" sub="Community" theme="emerald" onClick={() => handleTypeSelection('Audio')} />
                    </div>
                    
                    <div className="flex-1 min-w-[240px] max-w-[400px]">
                      <ActionBtn icon={<Tv size={24}/>} title="Broadcast" sub="One-Way" theme="rose" onClick={() => handleTypeSelection('Broadcast')} />
                    </div>
                    
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GLOBAL BULLETIN SECTION */}
          {/* BULLETIN SECTION */}
          <div className={`p-8 lg:p-10 rounded-[32px] border flex flex-col h-full ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            
            {/* 👇 THE NEW DYNAMIC HEADER 👇 */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3 mb-4">
              <h3 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Broadcast
              </h3>
              
              <div className="relative w-full xl:w-auto">
                <select 
                  value={bulletinTarget}
                  onChange={(e) => setBulletinTarget(e.target.value)}
                  className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all ${
                    bulletinTarget === 'global' 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' // Red for Global (Warning/Important)
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' // Indigo for specific batches
                  }`}
                >
                  <option value="global" className="text-slate-900 font-bold">Global (All Students)</option>
                  
                  {/* Safely map over batches if they exist */}
                  {dynamicBatches && dynamicBatches.map(batch => (
                    <option key={batch.id} value={batch.title} className="text-slate-900 font-bold">
                      {batch.title}
                    </option>
                  ))}
                </select>
                <ChevronRight size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none ${bulletinTarget === 'global' ? 'text-rose-500' : 'text-indigo-500'}`} />
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">
              Push an announcement to {bulletinTarget === 'global' ? "every student's dashboard" : `students in ${bulletinTarget}`} instantly.
            </p>
            {/* 👆 END OF DYNAMIC HEADER 👆 */}

            <div className="mt-auto flex flex-col gap-4">

            {/* Your Title Input */}
            <input 
              type="text"
              value={bulletinTitle}
              onChange={(e) => setBulletinTitle(e.target.value)}
              placeholder="Announcement Title (e.g. Server Maintenance)"
              className={`w-full bg-transparent border-2 rounded-2xl p-4 text-sm font-black outline-none focus:border-indigo-500 transition-all mb-3 ${isDarkMode ? 'border-slate-800 text-white placeholder:text-slate-600' : 'border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
            />

            {/* Your Message Textarea */}
            <textarea 
              value={bulletinMessage}
              onChange={(e) => setBulletinMessage(e.target.value)}
              placeholder="Type your detailed message here..."
              className={`flex-1 min-h-[120px] bg-transparent border-2 rounded-2xl p-4 text-sm font-medium outline-none focus:border-indigo-500 transition-all resize-none mb-4 ${isDarkMode ? 'border-slate-800 text-slate-300 placeholder:text-slate-600' : 'border-slate-200 text-slate-700 placeholder:text-slate-400'}`}
            />
            
            <button 
              onClick={broadcastBulletin}
              disabled={isBroadcasting || !bulletinTitle || !bulletinMessage}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBroadcasting ? "Sending..." : "Broadcast Now"} <Send size={16}/>
            </button>
            </div>
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
              <StudentItem name="Arjun Sharma" level="N4" activity="Grammar Unit 4" />
              <StudentItem name="Priya Singh" level="N5" activity="Taking Mock Test" />
              <StudentItem name="Kevin Kovacs" level="N2" activity="Vocab Drill" />
              <StudentItem name="Sarah Miller" level="N3" activity="Idle" />
            </div>
            <button className="w-full py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">View All Students</button>
          </div>

          <div className={`p-8 lg:p-10 rounded-[32px] border ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Tasks</h3>
              <button className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Plus size={20}/></button>
            </div>
            <div className="space-y-4">
              <TaskItem title="N4 Weekly Kanji Quiz" date="Mar 18" level="N4" status="Scheduled" />
              <TaskItem title="Genki II Ch. 4 Vocab" date="Mar 20" level="N5" status="Draft" />
              <TaskItem title="N3 Full Mock Exam" date="Mar 25" level="N3" status="Live" />
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

      {/* Put the Modal down here so it renders on top of the page when open! */}
      <ClassLaunchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onNext={handleSaveClass} 
        currentTeacherName={currentUser?.displayName || "Sensei"} 
      />
    </>
  );
}