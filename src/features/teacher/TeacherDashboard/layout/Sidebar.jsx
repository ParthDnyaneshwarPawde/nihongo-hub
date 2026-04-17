import React from 'react';
import { X, BarChart3, Tv, Users, BookOpen, Calendar, Settings, LogOut, ChevronLeft, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLogoutConfirm } from '@hooks/useLogoutConfirm';
import LogoutShield from '@components/shared/LogoutShield';
import { useTheme } from '@/context/ThemeContext';

function SidebarLink({ icon, label, active, onClick, danger, badge, isCollapsed }) {
  const { isDarkMode } = useTheme();
  const activeClass = "bg-rose-600 text-white shadow-xl shadow-rose-600/30 ring-1 ring-white/10";
  const inactiveClass = isDarkMode ? "text-slate-500 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const dangerClass = "text-slate-500 hover:bg-rose-500/10 hover:text-rose-500";

  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`relative w-full flex items-center px-4 py-4 rounded-2xl transition-all duration-300 font-black group ${
        active ? activeClass : danger ? dangerClass : inactiveClass
      } ${isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'}`}
    >
      <div className={`flex items-center gap-4 ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>{icon}</span>
        <span className={`text-[13px] tracking-tight whitespace-nowrap ${isCollapsed ? 'lg:hidden block' : 'block'}`}>{label}</span>
      </div>
      
      {badge && (
        <span className={`text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-1 rounded-full uppercase shrink-0 ${isCollapsed ? 'lg:hidden block' : 'block'}`}>
          {badge}
        </span>
      )}

      {/* Tooltip on Hover when Collapsed */}
      {isCollapsed && (
        <div className={`hidden lg:block absolute left-full ml-4 px-3 py-2 shadow-xl border text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap ${isDarkMode ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-800 border-transparent text-white'}`}>
          {label}
        </div>
      )}
    </motion.button>
  );
}

export default function Sidebar({ 
  isSidebarOpen, 
  closeSidebar, 
  activeTab, 
  onNavigate, 
  currentUser,
  isDesktopSidebarCollapsed,
  setIsDesktopSidebarCollapsed 
}) {
  const { isDarkMode } = useTheme();
  const { isConfirming, requestLogout, cancelLogout, confirmLogout } = useLogoutConfirm();

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={closeSidebar} />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`
        fixed inset-y-0 left-0 flex flex-col border-r transition-all duration-300 ease-in-out z-[70] lg:z-0 lg:relative lg:translate-x-0 lg:h-full
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        ${isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}
      `}>
        
        {/* Header */}
        <div className={`flex items-center transition-all ${isDesktopSidebarCollapsed ? 'lg:flex-col lg:justify-center lg:py-8 lg:gap-4 lg:border-b lg:border-transparent p-8 justify-between' : 'p-8 justify-between'}`}>
          <div className="flex items-center group">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            
            <div className={`flex items-center ml-3 ${isDesktopSidebarCollapsed ? 'lg:hidden' : ''}`}>
              <div>
                <h2 className={`text-xl font-black tracking-tighter leading-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>SENSEI PANEL</h2>
                <p className="text-[10px] text-rose-500 font-black tracking-[0.2em] uppercase whitespace-nowrap">Nihongo Hub</p>
              </div>
              
              <button 
                className={`hidden lg:flex p-1.5 ml-2 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`} 
                onClick={() => setIsDesktopSidebarCollapsed(true)}
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>

          {isDesktopSidebarCollapsed && (
            <button 
              className={`hidden lg:flex p-2 rounded-xl transition-all ${isDarkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`} 
              onClick={() => setIsDesktopSidebarCollapsed(false)}
            >
              <PanelLeftOpen size={20} />
            </button>
          )}
          
          <button className="lg:hidden p-1 text-slate-400 ml-auto" onClick={closeSidebar}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto custom-scrollbar ${isDesktopSidebarCollapsed ? 'lg:px-2 px-4' : 'px-4'}`}>
          <p className={`text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60 ${isDesktopSidebarCollapsed ? 'lg:hidden block' : 'block'}`}>Control</p>
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<BarChart3 size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => onNavigate('dashboard')} />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Tv size={18}/>} label="Live Classroom" active={activeTab === 'live'} onClick={() => onNavigate('live')} />
          <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Users size={18}/>} label="Student Database" active={activeTab === 'students'} onClick={() => onNavigate('students')} />
          
          <div className={`pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 ${isDesktopSidebarCollapsed ? 'lg:mx-2 mx-0' : ''}`}>
            <p className={`text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60 ${isDesktopSidebarCollapsed ? 'lg:hidden block' : 'block'}`}>Management</p>
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<BookOpen size={18}/>} label="Course Materials" active={activeTab === 'materials'} onClick={() => onNavigate('materials')} />
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Calendar size={18}/>} label="Exam Scheduler" active={activeTab === 'exams'} onClick={() => onNavigate('exams')} />
          </div>

          <div className={`pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 ${isDesktopSidebarCollapsed ? 'lg:mx-2 mx-0' : ''}`}>
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<Settings size={18}/>} label="Settings" />
            <SidebarLink isCollapsed={isDesktopSidebarCollapsed} icon={<LogOut size={18}/>} label="Logout" danger onClick={requestLogout} />
          </div>
        </nav>

        {/* Footer: User Profile */}
        <div className={`p-6 ${isDesktopSidebarCollapsed ? 'lg:px-0 lg:pb-8 flex justify-center' : ''} mt-auto shrink-0`}>
          <div className={`p-4 rounded-3xl border transition-all flex items-center ${
            isDarkMode ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-200 shadow-sm'
          } ${
            isDesktopSidebarCollapsed 
              ? 'p-2 w-12 h-12 justify-center' // Centered square when collapsed
              : 'gap-3 w-full justify-start'   // Left-aligned wide bar when expanded
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-300 shrink-0
              ${isDarkMode ? 'bg-white/10 border border-white/20 text-white shadow-none' : 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-200'}
            `}>
              {currentUser?.displayName ? currentUser.displayName.split(' ').map(n => n[0]).join('') : 'S'}
            </div>
            
            <div className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'} whitespace-nowrap overflow-hidden`}>
              <p className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentUser?.displayName || "Sensei"}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-indigo-100' : 'text-indigo-600'}`}>
                Verified Lead
              </p>
            </div>
          </div>
        </div>

      </aside>

      {/* Confirmation Shield — z-[100] sits above all navigation */}
      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} />
    </>
  );
}