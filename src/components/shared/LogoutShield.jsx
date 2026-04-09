import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shield } from 'lucide-react';

/**
 * LogoutShield — Glassmorphic Confirmation Modal
 * 
 * Props:
 *   isOpen      {boolean}  — controls visibility
 *   onCancel    {fn}       — called when user clicks backdrop or "Stay"
 *   onConfirm   {fn}       — called when user clicks "Logout" (fires signOut)
 *   isDarkMode  {boolean}  — whether to use dark or light mode styling
 */
export default function LogoutShield({ isOpen, onCancel, onConfirm, isDarkMode = true }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── BACKDROP ─────────────────────────────────────────── */}
          <motion.div
            key="shield-backdrop"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ 
              backdropFilter: 'blur(20px)', 
              backgroundColor: isDarkMode ? 'rgba(2,6,23,0.7)' : 'rgba(248,250,252,0.6)' 
            }}
            exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={onCancel}
          >
            {/* ── SHIELD CARD ──────────────────────────────────────── */}
            <motion.div
              key="shield-card"
              className={`
                relative w-full max-w-sm rounded-[2.5rem] border overflow-hidden
                ${isDarkMode 
                  ? 'border-rose-500/30 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(225,29,72,0.2)]' 
                  : 'border-rose-100/50 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(225,29,72,0.1)]'
                }
              `}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()} 
            >
              {/* Top border glow */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent ${isDarkMode ? 'opacity-100' : 'opacity-60'}`} />

              <div className="p-8 text-center space-y-6">
                {/* Icon */}
                <div className={`
                  w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border transition-all duration-500
                  ${isDarkMode 
                    ? 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.15)]' 
                    : 'bg-rose-50 border-rose-100 shadow-[0_10px_20px_rgba(225,29,72,0.05)]'
                  }
                `}>
                  <Shield size={28} className={isDarkMode ? 'text-rose-400' : 'text-rose-500'} />
                </div>

                {/* Typography */}
                <div className="space-y-1">
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-rose-400' : 'text-rose-500'}`}>
                    ログアウト
                  </p>
                  <h2 className={`text-2xl font-black tracking-tight leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Are you sure?
                  </h2>
                  <p className={`text-sm font-medium leading-relaxed pt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Your session will be terminated and you'll need to re-authenticate to re-enter the Academy.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {/* Stay — Indigo palette */}
                  <motion.button
                    type="button"
                    onClick={onCancel}
                    whileHover={{ 
                      scale: 1.03, 
                      boxShadow: isDarkMode ? '0 0 20px rgba(99,102,241,0.4)' : '0 10px 20px rgba(99,102,241,0.15)' 
                    }}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all duration-300
                      ${isDarkMode 
                        ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' 
                        : 'border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200'
                      }
                    `}
                  >
                    Stay
                  </motion.button>

                  {/* Logout — Rose palette pulse/glow */}
                  <motion.button
                    type="button"
                    onClick={onConfirm}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: isDarkMode ? '0 0 25px rgba(225,29,72,0.5)' : '0 12px 25px rgba(225,29,72,0.25)',
                      backgroundColor: isDarkMode ? 'rgba(225,29,72,0.25)' : 'rgba(225,29,72,1)',
                      color: isDarkMode ? undefined : '#fff',
                    }}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all duration-300 flex items-center justify-center gap-2
                      ${isDarkMode 
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' 
                        : 'border-rose-200 bg-rose-50 text-rose-600'
                      }
                    `}
                  >
                    <LogOut size={14} />
                    Logout
                  </motion.button>
                </div>
              </div>

              {/* Bottom border glow */}
              <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent ${isDarkMode ? 'opacity-100' : 'opacity-40'}`} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
