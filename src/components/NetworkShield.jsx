import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { useNetwork } from '@/hooks/useNetwork';
import { useTheme } from '@/context/ThemeContext';

export default function NetworkShield() {
  const { isOnline, isUnstable } = useNetwork();
  const { isDarkMode } = useTheme();
  
  // We allow users to dismiss the "Unstable" warning so they can keep reading
  const [dismissedUnstable, setDismissedUnstable] = useState(false);

  // If the connection fully drops, reset the unstable dismissal so it warns them again later
  useEffect(() => {
    if (!isOnline) {
      setDismissedUnstable(false);
    }
  }, [isOnline]);

  // Determine what to show
  const showOffline = !isOnline;
  const showUnstable = isOnline && isUnstable && !dismissedUnstable;

  return (
    <AnimatePresence>
      {(showOffline || showUnstable) && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Dark Glass Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className={`absolute inset-0 backdrop-blur-md ${showOffline ? 'bg-slate-950/80' : 'bg-slate-950/40 pointer-events-none'}`}
          />

          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col items-center text-center ${
              isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'
            }`}
            style={{
              boxShadow: showOffline 
                ? (isDarkMode ? '0 0 100px -20px rgba(225, 29, 72, 0.3)' : '0 20px 40px -10px rgba(225, 29, 72, 0.2)') 
                : (isDarkMode ? '0 0 100px -20px rgba(245, 158, 11, 0.2)' : '0 20px 40px -10px rgba(245, 158, 11, 0.1)')
            }}
          >
            
            {/* Background Ambient Glow */}
            <div 
              className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/2 ${
                showOffline ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            ></div>

            {/* Icon Node */}
            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border shadow-lg ${
              showOffline 
                ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-rose-50 border-rose-200 text-rose-600') 
                : (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600')
            }`}>
              {showOffline ? (
                <>
                  <div className="absolute inset-0 rounded-3xl border-2 border-rose-500/30 animate-ping opacity-20"></div>
                  <WifiOff size={32} />
                </>
              ) : (
                <Activity size={32} className="animate-pulse" />
              )}
            </div>

            {/* Text Content */}
            <h2 className={`text-2xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {showOffline ? "Connection Lost" : "Unstable Network"}
            </h2>
            
            <p className={`text-sm font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {showOffline 
                ? "We can't reach the servers. Please check your internet connection. Your progress is cached locally and will sync when you return."
                : "Your connection is unusually slow. Videos may buffer, and quiz submissions might take longer to process."}
            </p>

            {/* Actions */}
            {showOffline ? (
              <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 border font-black uppercase tracking-widest text-[10px] ${
                isDarkMode ? 'bg-[#151E2E] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Loader2 size={16} className="animate-spin text-rose-500" />
                Trying to Reconnect...
              </div>
            ) : (
              <button 
                onClick={() => setDismissedUnstable(true)}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} />
                I Understand
              </button>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}