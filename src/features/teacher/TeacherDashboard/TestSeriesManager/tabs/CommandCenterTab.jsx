import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, MonitorSmartphone, CheckCircle, AlertTriangle, Radio, Play, Square, Lock } from 'lucide-react';

export default function CommandCenterTab() {
  const [isRoomLocked, setIsRoomLocked] = useState(false);

  // 🚨 MOCK DATA: Notice how Emma is tracked as a Late Attempt
  const [mockStudents, setMockStudents] = useState([
    { id: 's1', name: 'Tanaka Hiro', status: 'testing', isLateAttempt: false, score: null },
    { id: 's2', name: 'Sarah Connor', status: 'ready', isLateAttempt: false, score: null }, 
    { id: 's3', name: 'John Doe', status: 'offline', isLateAttempt: false, score: null },
    { id: 's4', name: 'Akira Sato', status: 'submitted', isLateAttempt: false, score: 145 },
    { id: 's5', name: 'Emma Watson', status: 'testing', isLateAttempt: true, score: null }, // 🚨 Live Post-Deadline Tester
  ]);

  const handleProctorAction = (action) => {
    if (action === 'activate') alert("📡 Bulletin sent to batches. Room is Pre-Flight Active.");
    if (action === 'start') alert("🚀 Exam forced start for all users in the waiting room.");
    if (action === 'end') alert("🛑 Exam Ended. Auto-submitting responses.");
    if (action === 'lock') {
      setIsRoomLocked(!isRoomLocked);
      alert(isRoomLocked ? "🔓 Room Unlocked. Late entry permitted." : "🔒 Room Locked. Preventing new joins.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full max-w-[1400px] w-full mx-auto">
      
      <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 mb-2">
            <Activity size={28} className="text-rose-500" /> Live Command Center
          </h1>
          <p className="text-sm font-bold text-slate-500">Monitor active sessions, late attempts, and proctor exams in real-time.</p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 items-center bg-[#0B1120] p-2 rounded-2xl border border-slate-800">
          <button onClick={() => handleProctorAction('activate')} className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            <Radio size={14} /> Active
          </button>
          <button onClick={() => handleProctorAction('start')} className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            <Play size={14} /> Start
          </button>
          <button onClick={() => handleProctorAction('lock')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isRoomLocked ? 'bg-rose-500 text-white' : 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400'}`}>
            <Lock size={14} /> {isRoomLocked ? 'Unlock' : 'Lock Room'}
          </button>
          <button onClick={() => handleProctorAction('end')} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            <Square size={14} /> End
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-3xl bg-[#0D1527] border border-slate-800 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Assigned</span>
          <span className="text-4xl font-black text-white">{mockStudents.length}</span>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-1.5"><ShieldCheck size={14}/> Pre-Flight Ready</span>
          <span className="text-4xl font-black text-emerald-400">{mockStudents.filter(s => s.status === 'ready').length}</span>
        </div>
        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1.5"><MonitorSmartphone size={14}/> Live (Standard)</span>
          <span className="text-4xl font-black text-indigo-400">{mockStudents.filter(s => s.status === 'testing' && !s.isLateAttempt).length}</span>
        </div>
        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-1.5"><Activity size={14}/> Live (Late Attempt)</span>
          <span className="text-4xl font-black text-amber-400">{mockStudents.filter(s => s.status === 'testing' && s.isLateAttempt).length}</span>
        </div>
      </div>

      {/* Live Student Grid */}
      <div className="p-8 rounded-[2.5rem] bg-[#0B1120]/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">Real-Time Participation Grid</h3>
          {isRoomLocked && <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Lock size={12}/> Room Locked</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockStudents.map(student => {
            let statusColors = '';
            let statusIcon = null;
            let statusLabel = '';

            if (student.status === 'offline') {
              statusColors = 'border-slate-800 bg-[#0D1527] text-slate-500';
              statusLabel = 'Offline';
              statusIcon = <AlertTriangle size={14} />;
            } else if (student.status === 'ready') {
              statusColors = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
              statusLabel = 'Ready';
              statusIcon = <ShieldCheck size={14} />;
            } else if (student.status === 'testing' && !student.isLateAttempt) {
              statusColors = 'border-indigo-500 bg-indigo-500/10 text-indigo-400';
              statusLabel = 'Active Session';
              statusIcon = <Activity size={14} className="animate-pulse" />;
            } else if (student.status === 'testing' && student.isLateAttempt) {
              // 🚨 LATE ATTEMPT VISUALIZATION
              statusColors = 'border-amber-500 bg-amber-500/10 text-amber-400';
              statusLabel = 'Late Attempt';
              statusIcon = <Activity size={14} className="animate-pulse" />;
            } else if (student.status === 'submitted') {
              statusColors = 'border-slate-700 bg-[#131C31] text-white';
              statusLabel = `Score: ${student.score}`;
              statusIcon = <CheckCircle size={14} />;
            }

            return (
              <div key={student.id} className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${statusColors}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${student.status === 'offline' ? 'bg-slate-800 text-slate-600' : 'bg-white/10 text-current'}`}>
                    {student.name.charAt(0)}
                  </div>
                  <span className="font-bold text-sm text-white">{student.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  {statusIcon} {statusLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}