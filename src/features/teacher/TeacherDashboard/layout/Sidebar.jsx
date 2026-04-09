import React from 'react';
import { X, BarChart3, Tv, Users, BookOpen, Calendar, Settings, LogOut } from 'lucide-react';
import { useLogoutConfirm } from '@hooks/useLogoutConfirm';
import LogoutShield from '@components/shared/LogoutShield';

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

export default function Sidebar({ isSidebarOpen, closeSidebar, activeTab, onNavigate, isDarkMode, currentUser }) {
  const { isConfirming, requestLogout, cancelLogout, confirmLogout } = useLogoutConfirm();

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={closeSidebar} />
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
          <button className="lg:hidden p-1 text-slate-400" onClick={closeSidebar}><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60">Control</p>
          <SidebarLink icon={<BarChart3 size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => onNavigate('dashboard')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Tv size={18}/>} label="Live Classroom" active={activeTab === 'live'} onClick={() => onNavigate('live')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Users size={18}/>} label="Student Database" active={activeTab === 'students'} onClick={() => onNavigate('students')} isDarkMode={isDarkMode} />
          
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4 opacity-60">Management</p>
            <SidebarLink icon={<BookOpen size={18}/>} label="Course Materials" active={activeTab === 'materials'} isDarkMode={isDarkMode} onClick={() => onNavigate('materials')} />
            <SidebarLink icon={<Calendar size={18}/>} label="Exam Scheduler" active={activeTab === 'exams'} onClick={() => onNavigate('exams')} isDarkMode={isDarkMode} />
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <SidebarLink icon={<Settings size={18}/>} label="Settings" isDarkMode={isDarkMode} />
            <SidebarLink icon={<LogOut size={18}/>} label="Logout" danger isDarkMode={isDarkMode} onClick={requestLogout} />
          </div>
        </nav>

        <div className="p-6">
          <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-300
                ${isDarkMode ? 'bg-white/10 border border-white/20 text-white shadow-none' : 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-200'}
              `}>
                {currentUser?.displayName ? currentUser.displayName.split(' ').map(n => n[0]).join('') : 'S'}
              </div>
              <div>
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

      {/* Confirmation Shield — z-[100] sits above all navigation */}
      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} isDarkMode={isDarkMode} />
    </>
  );
}
