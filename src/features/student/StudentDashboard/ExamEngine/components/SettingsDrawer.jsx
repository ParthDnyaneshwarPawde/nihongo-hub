import React from 'react';
import { X } from 'lucide-react';

export default function SettingsDrawer({ isOpen, onClose, settings, setSettings, isDarkMode }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose}></div>
      <div className={`absolute right-0 top-0 bottom-0 w-full max-w-sm border-l z-[110] flex flex-col animate-in slide-in-from-right duration-300 ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-black text-lg">Settings</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
           {/* Add your ToggleRows here based on settings state */}
           <p className="text-slate-500 text-sm">Settings panel connected.</p>
        </div>
      </div>
    </>
  );
}