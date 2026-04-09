import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Lock, X, Key, ArrowRight } from 'lucide-react';

export default function PasswordModal({ 
  isOpen, 
  onClose, 
  selectedClass, 
  enteredPassword, 
  setEnteredPassword, 
  passwordError, 
  onSubmit, 
  isDarkMode 
}) {
  return (
    <AnimatePresence>
      {isOpen && selectedClass && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050814]/80 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full max-w-md rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] border relative overflow-hidden
              ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none mix-blend-screen"></div>

            <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-[24px] flex items-center justify-center border border-indigo-500/20 shadow-inner">
                <Lock size={28} strokeWidth={2.5} />
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 dark:hover:text-white rounded-full transition-all backdrop-blur-md hover:rotate-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative z-10">
              <h3 className={`text-3xl font-black tracking-tighter mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Restricted Area.
              </h3>
              <p className="text-sm font-medium text-slate-500 mb-10 leading-relaxed">
                Sensei <span className="text-indigo-500 dark:text-indigo-400 font-bold">{selectedClass.teacherName}</span> requires a secure access key to enter this live broadcast.
              </p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400">
                    <Key size={20} />
                  </div>
                  <input 
                    autoFocus
                    type="password" 
                    placeholder="Enter Access Key"
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    className={`w-full pl-14 pr-6 py-5 rounded-2xl border outline-none font-black text-lg tracking-[0.1em] transition-all
                      ${isDarkMode ? 'bg-[#111827] border-slate-700 text-white focus:border-indigo-500 focus:bg-[#1a2333] shadow-inner shadow-black/20' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white shadow-inner'}`}
                  />
                </div>

                {passwordError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-black text-rose-500 uppercase tracking-widest text-center flex items-center justify-center gap-1.5 mt-2"
                  >
                    <ShieldAlert size={14} /> {passwordError}
                  </motion.p>
                )}

                <button 
                  type="submit" 
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black tracking-[0.2em] uppercase text-xs rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3 mt-6 hover:shadow-indigo-500/50"
                >
                  Authenticate <ArrowRight size={18} strokeWidth={3} />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
