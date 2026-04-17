import React from 'react';
import { 
  Globe, Download, MessageCircle, BarChart3, FileText, Settings, LogOut, Trophy, X, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

function SidebarLink({ icon, label, active, onClick, danger, badge, isCollapsed }) {
  const { isDarkMode } = useTheme();
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
      className={`relative w-full flex items-center px-4 py-4 rounded-2xl transition-all duration-300 font-black group ${
        active ? activeClass : danger ? dangerClass : inactiveClass
      } ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}
    >
      <div className={`flex items-center gap-4 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>
          {icon}
        </span>
        <span className={`text-[13px] tracking-tight whitespace-nowrap ${isCollapsed ? 'md:hidden block' : 'block'}`}>{label}</span>
      </div>
      {badge && (
        <span className={`text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full uppercase shrink-0 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
          {badge}
        </span>
      )}
      {isCollapsed && (
        <div className={`hidden md:block absolute left-full ml-4 px-3 py-2 shadow-xl border text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap ${isDarkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-800 border-transparent text-white'}`}>
          {label}
        </div>
      )}
    </motion.button>
  );
}

export default function StudentSidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  isDesktopSidebarCollapsed,
  setIsDesktopSidebarCollapsed,
  activeTab, 
  handleTabClick, 
  requestLogout 
}) {
  const { isDarkMode } = useTheme();
  return (
    <>
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 flex flex-col border-r transition-all duration-300 ease-in-out z-[70] md:relative md:translate-x-0 md:h-full
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
        ${isDesktopSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
        ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}
      `}>

        {/* Header */}
        <div className={`flex items-center transition-all ${isDesktopSidebarCollapsed ? 'md:flex-col md:justify-center md:py-8 md:gap-4 md:border-b md:border-transparent p-8 justify-between' : 'p-8 justify-between'}`}>
          <div className="flex items-center group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            
            <div className={`flex items-center ml-3 ${isDesktopSidebarCollapsed ? 'md:hidden' : ''}`}>
              <span className={`text-xl font-black tracking-tighter shrink-0 mr-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NIHONGO HUB</span>
              
              <button 
                className={`hidden md:flex p-1.5 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`} 
                onClick={() => setIsDesktopSidebarCollapsed(true)}
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>

          {isDesktopSidebarCollapsed && (
            <button 
              className={`hidden md:flex p-2 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`} 
              onClick={() => setIsDesktopSidebarCollapsed(false)}
            >
              <PanelLeftOpen size={20} />
            </button>
          )}
          
          <button className="md:hidden p-1 text-slate-400 ml-auto" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto custom-scrollbar ${isDesktopSidebarCollapsed ? 'md:px-2 px-4' : 'px-4'}`}>
          <p className={`text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 ${isDesktopSidebarCollapsed ? 'md:hidden block' : 'block'}`}>Menu</p>
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Globe size={18}/>} label="Learn" active={activeTab === 'learn'} onClick={() => handleTabClick('learn')} />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Target size={18}/>} label="Tests" active={activeTab === 'tests'} onClick={() => handleTabClick('tests')}
  // onClick={() => navigate('/exam-hub')} // This sends them to the new Hub!
  // isDarkMode={isDarkMode} 
/>
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Download size={18}/>} label="Resource Vault" active={activeTab === 'vault'} onClick={() => handleTabClick('vault')} />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<MessageCircle size={18}/>} label="Doubts" active={activeTab === 'doubts'} onClick={() => handleTabClick('doubts')} />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<BarChart3 size={18}/>} label="Analytics" active={activeTab === 'analytics'} badge="Soon" />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<FileText size={18}/>} label="Exam Info" active={activeTab === 'exam'} onClick={() => handleTabClick('exam')} />
          
          <div className={`pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 ${isDesktopSidebarCollapsed ? 'md:mx-2 mx-0' : ''}`}>
            <p className={`text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 ${isDesktopSidebarCollapsed ? 'md:hidden block' : 'block'}`}>System</p>
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Settings size={18}/>} label="Settings" />
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<LogOut size={18}/>} label="Logout" danger onClick={requestLogout} />
          </div>
        </nav>

        {/* Gamification Widget */}
        <div className={`p-6 ${isDesktopSidebarCollapsed ? 'md:px-4 md:pb-8' : ''} mt-auto shrink-0`}>
          {isDesktopSidebarCollapsed && (
            <div className={`hidden md:flex p-3 rounded-2xl flex-col items-center justify-center gap-2 border shadow-lg ${isDarkMode ? 'bg-slate-900/80 border-indigo-500/20 shadow-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`} title="Rank: Samurai | 2,450 XP">
               <Trophy size={20} className="text-amber-500 drop-shadow-md" />
               <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>2.4K</span>
            </div>
          )}
          
          <div className={`${isDesktopSidebarCollapsed ? 'md:hidden block' : 'block'} p-5 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-slate-900/50 border-indigo-500/20 shadow-indigo-500/10' : 'bg-indigo-50 border-indigo-100 shadow-indigo-100'}`}>
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
