import React from 'react';
import { FileText, Download, FileArchive, PlayCircle, Eye, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

export default function ResourceCard({ asset, setViewingPdf }) {
  const { isDarkMode } = useTheme();
  const isPDF = asset.type === 'PDF';

  const typeConfig = {
    AUDIO: { icon: PlayCircle, colors: 'bg-emerald-500/10 text-emerald-500' },
    PDF: { icon: FileText, colors: 'bg-indigo-500/10 text-indigo-500' },
    DEFAULT: { icon: FileArchive, colors: 'bg-amber-500/10 text-amber-500' }
  };

  const config = typeConfig[asset.type] || typeConfig.DEFAULT;
  const AssetIcon = config.icon;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`group relative flex flex-col p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden backdrop-blur-xl ${isDarkMode ? 'bg-white/5 border-indigo-500/10' : 'bg-white/80 border-indigo-200'}`}
    >
      <div className="flex justify-between items-center mb-10 relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all group-hover:scale-110 ${config.colors}`}>
          <AssetIcon size={28}/>
        </div>
        
        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isPDF ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : isDarkMode ? 'bg-[#0F172A] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
           {isPDF ? <span className="flex items-center gap-1.5"><Lock size={12}/> Protected</span> : asset.size}
        </div>
      </div>

      <div className="relative z-10 flex-1 mb-10">
         <h3 className={`text-2xl font-black leading-tight tracking-tighter transition-colors group-hover:text-indigo-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
           {asset.title}
         </h3>
         <p className="text-xs font-bold text-slate-500 mt-3 italic line-clamp-2">"{asset.desc}"</p>
      </div>

      <div className="grid grid-cols-5 gap-2 relative z-10">
        {isPDF ? (
          <button 
            onClick={() => setViewingPdf(asset)} 
            className="col-span-5 py-5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Eye size={18} /> Open Secure Reader
          </button>
        ) : (
          <>
            <button 
              onClick={() => window.open(asset.fileUrl, '_blank')}
              className={`col-span-1 py-4 rounded-2xl flex items-center justify-center border transition-all ${isDarkMode ? 'bg-[#0F172A] border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-900'}`}
            >
              <Eye size={18} />
            </button>
            <a 
              href={asset.fileUrl} download
              className="col-span-4 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:opacity-90 shadow-xl transition-all"
            >
              <Download size={16} /> Hard Copy
            </a>
          </>
        )}
      </div>
      
      <div className={`absolute -bottom-6 -right-4 text-9xl font-black opacity-[0.03] select-none pointer-events-none ${isDarkMode ? 'text-white' : 'text-black'}`}>
        {asset.type.charAt(0)}
      </div>
    </motion.div>
  );
}
