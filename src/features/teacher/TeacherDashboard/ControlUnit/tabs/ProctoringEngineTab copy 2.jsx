import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MonitorPlay, Video, Mic, MessageSquare, AlertTriangle, 
  MoreVertical, XOctagon, Clock, ShieldAlert, Target, 
  Zap, Radio, Activity, Info, Globe, Terminal
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// --- HIGH LEVEL MOCK DATA ---
const MOCK_CANDIDATES = [
  { id: 'C-9901', name: 'Alex Mercer', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'attempting', flags: 0, progress: 45, ping: 12 },
  { id: 'C-9902', name: 'Sarah Chen', batch: 'SEC-BETA', exam: 'Advanced Calculus', series: 'Finals', status: 'redflagged', flags: 3, progress: 12, ping: 145 },
  { id: 'C-9903', name: 'Marcus Cole', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'ready', flags: 0, progress: 0, ping: 45 },
  { id: 'C-9904', name: 'Elena Rostova', batch: 'SEC-GAMMA', exam: 'Organic Chem', series: 'Finals', status: 'attempted', flags: 1, progress: 100, ping: 0 },
  { id: 'C-9905', name: 'David Kim', batch: 'SEC-BETA', exam: 'Advanced Calculus', series: 'Finals', status: 'attempting', flags: 0, progress: 78, ping: 23 },
  { id: 'C-9906', name: 'Aisha Patel', batch: 'SEC-ALPHA', exam: 'Quantum Physics', series: 'Midterms', status: 'attempting', flags: 1, progress: 24, ping: 89 },
];

const MOCK_ALERTS = [
  { id: 1, type: 'anomaly', target: 'Sarah Chen', message: 'Multiple faces detected', time: '10:42:15', priority: 'high' },
  { id: 2, type: 'disconnect', target: 'Elena Rostova', message: 'Websocket lost', time: '10:40:02', priority: 'medium' },
  { id: 3, type: 'request', target: 'David Kim', message: 'Proctor Help Needed', time: '10:35:44', priority: 'low' },
  { id: 4, type: 'anomaly', target: 'Aisha Patel', message: 'Audio anomaly: Background voice', time: '10:31:12', priority: 'medium' },
];

export default function ProctoringEngineTab() {
  const { isDarkMode } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleRightClick = (e, candidate) => {
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, candidate });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ready': return 'text-sky-400 bg-sky-500/20 border-sky-500/30';
      case 'attempting': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'redflagged': return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
      case 'attempted': return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const filteredCandidates = MOCK_CANDIDATES.filter(c => activeFilter === 'all' || c.status === activeFilter);

  return (
    <div className={`h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      
      {/* ----------------------------------------------------------- */}
      {/* LEFT COLUMN: Mission Control (Col Span 3)                     */}
      {/* ----------------------------------------------------------- */}
      <div className="col-span-1 lg:col-span-3 flex flex-col gap-6 h-full">
        
        {/* Module 1: System Targets */}
        <div className={`shrink-0 rounded-3xl p-5 border backdrop-blur-2xl transition-all ${isDarkMode ? 'bg-[#0B1120]/70 border-white/5 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <Target size={16} className="text-indigo-500" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-500">Live Targets</h2>
          </div>
          <div className="space-y-2">
            {['Midterms', 'Finals'].map((target, i) => (
              <div key={i} className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${isDarkMode ? 'bg-slate-900/50 border-white/5 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{target}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono opacity-50">2 EXAMS</span>
                  <Activity size={12} className="text-emerald-500 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 2: Mass Directives */}
        <div className={`shrink-0 rounded-3xl p-5 border backdrop-blur-2xl transition-all ${isDarkMode ? 'bg-[#0B1120]/70 border-white/5 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Globe size={16} className="text-amber-500" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Global Override</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: XOctagon, label: 'Terminate', color: 'rose' },
              { icon: Clock, label: 'Freeze Time', color: 'amber' },
              { icon: Zap, label: '+5 Minutes', color: 'emerald' },
              { icon: Radio, label: 'Broadcast', color: 'sky' }
            ].map((btn, i) => (
              <button key={i} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                isDarkMode 
                  ? `bg-slate-900/40 border-white/5 hover:border-${btn.color}-500 hover:bg-${btn.color}-500/10 text-slate-400 hover:text-${btn.color}-400` 
                  : `bg-slate-50 border-slate-200 hover:border-${btn.color}-400 hover:bg-${btn.color}-50 hover:text-${btn.color}-600`
              }`}>
                <btn.icon size={16} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-center">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Module 3: Comms Link */}
        <div className={`flex-1 flex flex-col rounded-3xl p-5 border backdrop-blur-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#0B1120]/70 border-white/5 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
              <Terminal size={16} className="text-cyan-500" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-500">Comms Link</h2>
          </div>
          <div className={`flex-1 rounded-2xl border p-4 flex flex-col justify-end font-mono text-[10px] overflow-hidden shadow-inner ${isDarkMode ? 'bg-[#050810] border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <div className="space-y-2.5 opacity-70 mb-4 overflow-y-auto custom-scrollbar">
              <p><span className="text-cyan-500">[SYS]</span> Link established.</p>
              <p><span className="text-emerald-500">[PRC]</span> Good luck everyone.</p>
              <p><span className="text-amber-500">[D.KIM]</span> My camera is lagging?</p>
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Transmit globally..." className={`w-full bg-transparent border-b outline-none pb-1 transition-colors ${isDarkMode ? 'border-slate-700 focus:border-cyan-500 text-cyan-400' : 'border-slate-300 focus:border-cyan-600 text-cyan-700'}`} />
            </div>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------- */}
      {/* CENTER COLUMN: The Arena (Col Span 6)                       */}
      {/* ----------------------------------------------------------- */}
      <div className={`col-span-1 lg:col-span-6 flex flex-col rounded-3xl border backdrop-blur-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#0B1120]/60 border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-slate-200 shadow-2xl'}`}>
        
        {/* Arena Header */}
        <div className={`shrink-0 p-6 flex flex-wrap items-center justify-between gap-4 border-b ${isDarkMode ? 'border-white/5 bg-[#0B1120]/50' : 'border-slate-200 bg-white/50'}`}>
          <div>
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live Roster</h2>
            <p className="text-[10px] font-mono text-indigo-400 mt-1">{filteredCandidates.length} CANDIDATES ACTIVE</p>
          </div>
          
          <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
            {['all', 'ready', 'attempting', 'redflagged'].map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`relative px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500 hover:text-slate-400'}`}
              >
                {activeFilter === filter && (
                  <motion.div layoutId="activeFilterBubble" className={`absolute inset-0 rounded-lg shadow-sm ${isDarkMode ? 'bg-slate-800 border border-white/10' : 'bg-white border border-slate-200'}`} />
                )}
                <span className="relative z-10">{filter}</span>
              </button>
            ))}
          </div>
        </div>

        {/* High-Efficiency Spacer List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence>
              {filteredCandidates.map((c) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={c.id}
                  onContextMenu={(e) => handleRightClick(e, c)}
                  className={`group relative flex items-center p-4 pl-5 rounded-2xl border transition-all cursor-context-menu overflow-hidden ${
                    isDarkMode 
                      ? 'bg-[#0F172A]/80 border-white/5 hover:border-white/10 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:bg-[#1E293B]/80' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl hover:bg-slate-50'
                  }`}
                >
                  {/* Status Indicator Bar on Left Edge */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${getStatusColor(c.status).split(' ')[1]}`}></div>

                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center pl-2">
                    
                    {/* Name & ID (Col 4) */}
                    <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                      <div className="relative group/info shrink-0">
                        <Info size={16} className="text-slate-400 hover:text-indigo-400 cursor-help" />
                        <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 w-56 p-4 rounded-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all shadow-2xl border backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700'}`}>
                          <p className="text-[10px] font-mono text-indigo-400 mb-1">{c.id}</p>
                          <p className="text-sm font-bold mb-3">{c.name}</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-500/10 p-2 rounded-lg"><span className="text-slate-500 block text-[9px] uppercase mb-0.5">Flags</span> <span className="font-mono">{c.flags}</span></div>
                            <div className="bg-slate-500/10 p-2 rounded-lg"><span className="text-slate-500 block text-[9px] uppercase mb-0.5">Ping</span> <span className="font-mono">{c.ping}ms</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="truncate">
                        <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{c.name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{c.id} • {c.batch}</p>
                      </div>
                    </div>

                    {/* Target Details (Col 3) */}
                    <div className="hidden md:block col-span-3 truncate border-l border-slate-500/20 pl-4">
                      <p className={`text-[11px] font-medium truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{c.exam}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase mt-1 truncate">{c.series}</p>
                    </div>

                    {/* Telemetry & Progress (Col 4) */}
                    <div className="hidden md:flex col-span-4 items-center justify-end gap-5 pl-4">
                      <div className="flex items-center gap-1.5" title="Latency">
                        <Activity size={12} className={c.ping > 100 ? 'text-rose-500' : 'text-emerald-500'} />
                        <span className="text-[10px] font-mono w-6 text-right opacity-70">{c.ping}</span>
                      </div>
                      
                      <div className="flex-1 max-w-[100px]">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className={`text-[8px] font-mono uppercase ${getStatusColor(c.status).split(' ')[0]}`}>{c.status}</span>
                          <span className="text-[9px] font-mono font-bold opacity-80">{c.progress}%</span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${getStatusColor(c.status).split(' ')[1]}`} 
                            style={{ width: `${c.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Hover Quick Actions */}
                  <div className={`absolute right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 backdrop-blur-xl p-1.5 rounded-xl border ${isDarkMode ? 'bg-[#0B1120]/95 border-white/10' : 'bg-white/95 border-slate-200 shadow-lg'}`}>
                    <button className="p-2 rounded-lg hover:bg-sky-500/20 text-slate-400 hover:text-sky-500 transition-colors" title="View Camera"><Video size={14} /></button>
                    <button className="p-2 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-amber-500 transition-colors" title="Message"><MessageSquare size={14} /></button>
                    <button className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-colors" title="Strike"><ShieldAlert size={14} /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white transition-colors" title="More Options"><MoreVertical size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* RIGHT COLUMN: Telemetry Alerts (Col Span 3)                   */}
      {/* ----------------------------------------------------------- */}
      <div className="col-span-1 lg:col-span-3 flex flex-col h-full">
        <div className={`flex-1 rounded-3xl border flex flex-col overflow-hidden backdrop-blur-2xl transition-all ${isDarkMode ? 'bg-[#0B1120]/70 border-white/5 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className={`shrink-0 p-5 border-b flex items-center gap-3 ${isDarkMode ? 'bg-rose-500/10 border-white/5' : 'bg-rose-50 border-slate-200'}`}>
            <AlertTriangle size={16} className="text-rose-500 animate-pulse" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-rose-500">Alerts Feed</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <AnimatePresence>
              {MOCK_ALERTS.map((alert) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-2xl border text-xs relative overflow-hidden ${
                    alert.priority === 'high' 
                      ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm') 
                      : (isDarkMode ? 'bg-slate-800/40 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                  }`}
                >
                  {alert.priority === 'high' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>}
                  <div className="flex justify-between items-start mb-2 pl-1">
                    <span className="font-bold">{alert.target}</span>
                    <span className="text-[9px] font-mono opacity-60">{alert.time}</span>
                  </div>
                  <p className="opacity-90 pl-1 leading-relaxed">{alert.message}</p>
                  
                  {/* Actionable Request Buttons */}
                  {alert.type === 'request' && (
                    <div className="flex gap-2 mt-4 pl-1">
                      <button className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition-colors">Approve</button>
                      <button className="flex-1 py-1.5 rounded-lg bg-rose-500/20 text-rose-500 text-[10px] font-bold uppercase hover:bg-rose-500/30 transition-colors">Deny</button>
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
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
            className={`fixed z-[100] w-56 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border overflow-hidden backdrop-blur-3xl ${isDarkMode ? 'bg-[#0F172A]/90 border-slate-700/50' : 'bg-white/95 border-slate-200'}`}
          >
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-slate-800 bg-[#0B1120]/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{contextMenu.candidate.name}</p>
              <p className="text-[9px] font-mono uppercase text-slate-500">{contextMenu.candidate.status}</p>
            </div>
            
            <div className="p-1.5 space-y-0.5">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                <Video size={14} /> View Camera Feed
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
                <MonitorPlay size={14} /> View Screenshare
              </button>
              <div className={`my-1 border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}></div>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${isDarkMode ? 'hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300' : 'hover:bg-emerald-50 hover:text-emerald-600 text-slate-700'}`}>
                <Zap size={14} /> Inject +5 Minutes
              </button>
              <div className={`my-1 border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}></div>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${isDarkMode ? 'hover:bg-rose-500/10 hover:text-rose-400 text-rose-500' : 'hover:bg-rose-50 hover:text-rose-600 text-rose-600'}`}>
                <ShieldAlert size={14} /> Issue Strike
              </button>
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isDarkMode ? 'bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400' : 'bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600'}`}>
                <XOctagon size={14} /> Force Submit Exam
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
