import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MonitorPlay, Video, Mic, MessageSquare, AlertTriangle, 
  MoreVertical, XOctagon, Clock, ShieldAlert, Search, Filter, 
  CheckCircle2, Activity, WifiOff, Terminal, Users, Target, Cpu, 
  Zap, Crosshair, Globe, Radio, UserX, Eye, Info
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// --- HIGH LEVEL MOCK DATA (Simulating Realtime Database Feed) ---
const MOCK_CANDIDATES = [
  { id: 'C-9901', name: 'Alex Mercer', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'attempting', flags: 0, progress: 45, ping: 12 },
  { id: 'C-9902', name: 'Sarah Chen', batch: 'SEC-BETA', exam: 'Advanced Calculus', series: 'Finals', status: 'redflagged', flags: 3, progress: 12, ping: 145 },
  { id: 'C-9903', name: 'Marcus Cole', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'ready', flags: 0, progress: 0, ping: 45 },
  { id: 'C-9904', name: 'Elena Rostova', batch: 'SEC-GAMMA', exam: 'Organic Chem', series: 'Finals', status: 'attempted', flags: 1, progress: 100, ping: 0 },
  { id: 'C-9905', name: 'David Kim', batch: 'SEC-BETA', exam: 'Advanced Calculus', series: 'Finals', status: 'attempting', flags: 0, progress: 78, ping: 23 },
  { id: 'C-9906', name: 'Aisha Patel', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'attempting', flags: 1, progress: 24, ping: 89 },
];

const MOCK_ALERTS = [
  { id: 1, type: 'anomaly', target: 'Sarah Chen', message: 'Multiple faces detected in frame', time: '10:42:15', priority: 'high' },
  { id: 2, type: 'disconnect', target: 'Elena Rostova', message: 'Websocket connection lost', time: '10:40:02', priority: 'medium' },
  { id: 3, type: 'request', target: 'David Kim', message: 'Proctor Assistance Requested', time: '10:35:44', priority: 'low' },
  { id: 4, type: 'anomaly', target: 'Aisha Patel', message: 'Audio anomaly: Background voice', time: '10:31:12', priority: 'medium' },
];

export default function ProctoringEngineTab() {
  const { isDarkMode } = useTheme();
  
  // State for filtering
  const [activeFilter, setActiveFilter] = useState('all'); // all, ready, attempting, redflagged
  
  // State for Context Menu (Right Click)
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleRightClick = (e, candidate) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      candidate: candidate
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ready': return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
      case 'attempting': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'redflagged': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'attempted': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const filteredCandidates = MOCK_CANDIDATES.filter(c => activeFilter === 'all' || c.status === activeFilter);

  return (
    <div className={`h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      
      {/* ----------------------------------------------------------- */}
      {/* LEFT COLUMN: Mission Control (Col Span 3)                     */}
      {/* ----------------------------------------------------------- */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
        
        {/* Exam Targeting Module */}
        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Target size={18} className="text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">Target Vectors</h2>
          </div>
          <div className="space-y-3">
            <div className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer ${isDarkMode ? 'bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
              <div>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Midterms</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">2 LIVE EXAMS</p>
              </div>
              <Activity size={14} className="text-emerald-500 animate-pulse" />
            </div>
            <div className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer ${isDarkMode ? 'bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
              <div>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Finals</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">2 LIVE EXAMS</p>
              </div>
              <Activity size={14} className="text-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Global Mass Actions */}
        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe size={18} className="text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">Mass Override</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-rose-500 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400' : 'bg-slate-50 border-slate-200 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500'}`}>
              <XOctagon size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center">Force Terminate</span>
            </button>
            <button className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-amber-500 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400' : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-500'}`}>
              <Clock size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center">Freeze Timers</span>
            </button>
            <button className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400' : 'bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500'}`}>
              <Zap size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center">Inject +5 Min</span>
            </button>
            <button className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-sky-500 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400' : 'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-500'}`}>
              <Radio size={16} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-center">Broadcast Msg</span>
            </button>
          </div>
        </div>

        {/* Global Comms Hub Mini */}
        <div className={`flex-1 rounded-2xl border p-5 flex flex-col ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Terminal size={18} className="text-cyan-500" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500">Comms Link</h2>
          </div>
          <div className={`flex-1 rounded-xl border p-3 flex flex-col justify-end font-mono text-[10px] overflow-hidden ${isDarkMode ? 'bg-[#050810] border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <div className="space-y-2 opacity-70 mb-3">
              <p><span className="text-cyan-500">[SYS]</span> Link established.</p>
              <p><span className="text-emerald-500">[PRC]</span> Good luck everyone.</p>
              <p><span className="text-amber-500">[D.KIM]</span> My camera is lagging?</p>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Transmit globally..." className={`w-full bg-transparent border-b outline-none pb-1 ${isDarkMode ? 'border-slate-700 focus:border-cyan-500 text-cyan-400' : 'border-slate-300 focus:border-cyan-600 text-cyan-700'}`} />
            </div>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------- */}
      {/* CENTER COLUMN: The Arena / Candidate Grid (Col Span 6)        */}
      {/* ----------------------------------------------------------- */}
      <div className={`col-span-1 lg:col-span-6 flex flex-col rounded-2xl border ${isDarkMode ? 'bg-[#0B1120]/90 border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)]' : 'bg-white border-slate-200 shadow-2xl'}`}>
        
        {/* Arena Header & Filters */}
        <div className={`shrink-0 p-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live Roster</h2>
            <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              {filteredCandidates.length} Active
            </div>
          </div>
          
          <div className="flex gap-1 bg-slate-500/10 p-1 rounded-lg">
            {['all', 'ready', 'attempting', 'redflagged'].map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Candidate List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="space-y-1">
            {filteredCandidates.map((candidate) => (
              <div 
                key={candidate.id}
                onContextMenu={(e) => handleRightClick(e, candidate)}
                className={`group flex items-center gap-3 p-2 rounded-lg border transition-all cursor-context-menu ${isDarkMode ? 'bg-[#0F172A] border-slate-800 hover:border-slate-600 hover:bg-[#1E293B]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}
              >
                {/* Status Indicator */}
                <div className={`shrink-0 w-2 h-10 rounded-full ${getStatusColor(candidate.status).split(' ')[1]}`}></div>
                
                {/* Core Info */}
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                  
                  {/* Name & ID (Col 4) */}
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="relative group/info">
                      <Info size={14} className="text-slate-400 hover:text-indigo-400 cursor-help" />
                      {/* CSS-based Hover Tooltip */}
                      <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-48 p-3 rounded-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <p className="text-[10px] font-mono text-indigo-400 mb-1">{candidate.id}</p>
                        <p className="text-xs font-bold mb-2">{candidate.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div><span className="text-slate-500">Flags:</span> {candidate.flags}</div>
                          <div><span className="text-slate-500">Ping:</span> {candidate.ping}ms</div>
                        </div>
                      </div>
                    </div>
                    <div className="truncate">
                      <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{candidate.name}</p>
                      <p className="text-[9px] font-mono text-slate-500 truncate">{candidate.id} • {candidate.batch}</p>
                    </div>
                  </div>

                  {/* Exam Target (Col 4) */}
                  <div className="col-span-4 hidden sm:block truncate">
                     <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{candidate.exam}</p>
                     <p className="text-[9px] font-mono uppercase text-slate-500 truncate">{candidate.series}</p>
                  </div>

                  {/* Progress & Telemetry (Col 4) */}
                  <div className="col-span-4 flex items-center justify-end gap-4">
                    {/* Ping */}
                    <div className="hidden md:flex items-center gap-1">
                      <Activity size={10} className={candidate.ping > 100 ? 'text-rose-500' : 'text-emerald-500'} />
                      <span className="text-[9px] font-mono w-6 text-right">{candidate.ping > 0 ? candidate.ping : '--'}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-16 h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${getStatusColor(candidate.status).split(' ')[0].replace('text-', 'bg-')}`} 
                        style={{ width: `${candidate.progress}%` }}
                      ></div>
                    </div>
                  </div>

                </div>

                {/* Direct Action Buttons (Hover Reveal) */}
                <div className="shrink-0 flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                  <button className={`p-1.5 rounded-md hover:bg-sky-500/20 text-slate-400 hover:text-sky-500 transition-colors`} title="View Camera">
                    <Video size={14} />
                  </button>
                  <button className={`p-1.5 rounded-md hover:bg-amber-500/20 text-slate-400 hover:text-amber-500 transition-colors`} title="Private Message">
                    <MessageSquare size={14} />
                  </button>
                  <button className={`p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors`} title="Issue Strike">
                    <ShieldAlert size={14} />
                  </button>
                  <button className={`p-1.5 rounded-md hover:bg-slate-500/20 text-slate-400 hover:text-slate-300 transition-colors`} title="More Actions">
                    <MoreVertical size={14} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* RIGHT COLUMN: Telemetry & Alerts (Col Span 3)                 */}
      {/* ----------------------------------------------------------- */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
        
        {/* Live Alerts Feed */}
        <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#0B1120]/80 border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-xl'}`}>
          <div className="shrink-0 p-4 border-b flex items-center gap-3 bg-rose-500/5">
            <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">Telemetry Alerts</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            <AnimatePresence>
              {MOCK_ALERTS.map((alert) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border text-xs ${
                    alert.priority === 'high' 
                      ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900') 
                      : (isDarkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold">{alert.target}</span>
                    <span className="text-[9px] font-mono opacity-60">{alert.time}</span>
                  </div>
                  <p className="opacity-90">{alert.message}</p>
                  
                  {/* Actionable Request Buttons */}
                  {alert.type === 'request' && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-1 rounded bg-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition-colors">Approve</button>
                      <button className="flex-1 py-1 rounded bg-rose-500/20 text-rose-500 text-[10px] font-bold uppercase hover:bg-rose-500/30 transition-colors">Deny</button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------- */}
      {/* CONTEXT MENU OVERLAY (Right Click)                            */}
      {/* ----------------------------------------------------------- */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
            className={`fixed z-[100] w-56 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border overflow-hidden backdrop-blur-2xl ${isDarkMode ? 'bg-[#0B1120]/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}
          >
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{contextMenu.candidate.name}</p>
              <p className="text-[9px] font-mono uppercase text-slate-500">{contextMenu.candidate.status}</p>
            </div>
            
            <div className="p-1 space-y-0.5">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                <Video size={14} /> Open Camera Feed
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                <MonitorPlay size={14} /> View Screenshare
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${isDarkMode ? 'hover:bg-sky-500/20 hover:text-sky-400 text-slate-300' : 'hover:bg-sky-50 hover:text-sky-600 text-slate-700'}`}>
                <MessageSquare size={14} /> Private Proctor Alert
              </button>
              <div className={`my-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}></div>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${isDarkMode ? 'hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300' : 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-700'}`}>
                <Zap size={14} /> Inject +5 Minutes
              </button>
              <div className={`my-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}></div>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${isDarkMode ? 'hover:bg-rose-500/20 hover:text-rose-400 text-rose-500' : 'hover:bg-rose-50 hover:text-rose-600 text-rose-600'}`}>
                <ShieldAlert size={14} /> Issue Strike (Anomaly)
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isDarkMode ? 'hover:bg-red-500 hover:text-white text-red-400' : 'hover:bg-red-500 hover:text-white text-red-600'}`}>
                <XOctagon size={14} /> Force Submit Exam
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
