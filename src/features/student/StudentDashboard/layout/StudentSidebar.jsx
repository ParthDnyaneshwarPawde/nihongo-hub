import React from 'react';
import { 
  Globe, Download, MessageCircle, BarChart3, FileText, Settings, LogOut, Trophy, X
} from 'lucide-react';
import { motion } from 'framer-motion';

function SidebarLink({ icon, label, active, onClick, danger, badge, isDarkMode }) {
  const activeClass = "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/10";
  const inactiveClass = isDarkMode 
    ? "text-slate-500 hover:bg-slate-800 hover:text-white" 
    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const dangerClass = "text-slate-500 hover:bg-rose-500/10 hover:text-rose-500";

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-colors duration-300 font-black group ${
        active ? activeClass : danger ? dangerClass : inactiveClass
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>
          {icon}
        </span>
        <span className="text-[13px] tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full uppercase">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export default function StudentSidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeTab, 
  handleTabClick, 
  isDarkMode, 
  requestLogout 
}) {
  return (
    <>
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 flex flex-col border-r transition-transform duration-300 ease-in-out z-[70] lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}
      `}>
        {/* Header */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            <span className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NIHONGO HUB</span>
          </div>
          <button className="lg:hidden p-1 text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">Menu</p>
          <SidebarLink icon={<Globe size={18}/>} label="Learn" active={activeTab === 'learn'} onClick={() => handleTabClick('learn')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Download size={18}/>} label="Resource Vault" active={activeTab === 'vault'} onClick={() => handleTabClick('vault')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<MessageCircle size={18}/>} label="Doubts" active={activeTab === 'doubts'} onClick={() => handleTabClick('doubts')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<BarChart3 size={18}/>} label="Analytics" active={activeTab === 'analytics'} badge="Soon" isDarkMode={isDarkMode} />
          <SidebarLink icon={<FileText size={18}/>} label="Exam Info" active={activeTab === 'exam'} onClick={() => handleTabClick('exam')} isDarkMode={isDarkMode} />
          
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">System</p>
            <SidebarLink icon={<Settings size={18}/>} label="Settings" isDarkMode={isDarkMode} />
            <SidebarLink icon={<LogOut size={18}/>} label="Logout" danger isDarkMode={isDarkMode} onClick={requestLogout} />
          </div>
        </nav>

        {/* Gamification Widget */}
        <div className="p-6">
          <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900/50 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Rank: Samurai</span>
              <Trophy size={14} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>2,450</span>
              <span className="text-xs text-slate-500 font-bold uppercase">XP</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[70%] rounded-full transition-all duration-[1500ms] ease-out"></div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
