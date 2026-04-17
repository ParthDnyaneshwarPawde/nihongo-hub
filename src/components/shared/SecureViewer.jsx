import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Loader2, ShieldAlert, Lock, LogOut, MousePointer2, Fingerprint, X 
} from 'lucide-react';

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SecureViewer({ fileUrl, userEmail = "Authorized Student", onClose }) {
  const { isDarkMode } = useTheme();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(window.innerWidth);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });
  const containerRef = useRef(null);
const [scale, setScale] = useState(1.0); // 👈 Add this back!
  // 📱 GESTURE STATE (Triple Tap)
  const [lastTap, setLastTap] = useState(0);
  const [tapCount, setTapCount] = useState(0);

  // 1. 📱 AUTO-FIT WIDTH (Responsive)
  // 📱 SMART SCALING (Desktop + Mobile Friendly)
useEffect(() => {
  const updateWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      
      // If Desktop (wide screen), use a fixed base width
      if (containerWidth > 850) {
        setPageWidth(800); 
      } else {
        // If Mobile, fill the screen
        setPageWidth(containerWidth - 40);
        setScale(1.0); // Reset scale on mobile to ensure "Fit to Screen"
      }
    }
  };

  updateWidth();
  window.addEventListener('resize', updateWidth);
  return () => window.removeEventListener('resize', updateWidth);
}, []);
useEffect(() => {
  const updateWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      
      // If the screen is wider than 800px (Desktop), cap the PDF width
      // If it's smaller (Mobile), let it fill the screen with a tiny margin
      if (containerWidth > 850) {
        setPageWidth(800); // Standard readable desktop width
      } else {
        setPageWidth(containerWidth - 40); // Responsive mobile width
      }
    }
  };

  updateWidth();
  window.addEventListener('resize', updateWidth);
  return () => window.removeEventListener('resize', updateWidth);
}, []);
  // 2. 🖱️ TRIPLE-TAP & RIGHT-CLICK LOGIC
  const handleGesture = (x, y) => {
    setContextMenu({
      show: true,
      x: Math.min(x, window.innerWidth - 220),
      y: Math.min(y, window.innerHeight - 80)
    });
  };

  const handleTouchStart = (e) => {
    const now = Date.now();
    if (now - lastTap < 400) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount === 2) { // 3rd tap
        handleGesture(e.touches[0].clientX, e.touches[0].clientY);
        setTapCount(0);
      }
    } else { setTapCount(0); }
    setLastTap(now);
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => { e.preventDefault(); handleGesture(e.clientX, e.clientY); }}
      onTouchStart={handleTouchStart}
      className={`flex flex-col h-full overflow-hidden select-none relative transition-colors duration-500 ${isDarkMode ? 'bg-[#0F172A]' : 'bg-slate-100'}`}
    >
      
      {/* 🛠️ TOP TOOLBAR */}
      <div className={`h-16 border-b flex items-center justify-between px-6 z-30 ${isDarkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
           <Lock size={14} className="text-indigo-500" />
           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Secure Reader</p>
        </div>

        <div className={`flex items-center rounded-xl p-1 border ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
          <button disabled={pageNumber <= 1} onClick={() => setPageNumber(prev => prev - 1)} className="p-2 text-slate-500 hover:text-indigo-500 disabled:opacity-10"><ChevronLeft size={18}/></button>
          <span className={`px-3 text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pageNumber} / {numPages || '--'}</span>
          <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(prev => prev + 1)} className="p-2 text-slate-500 hover:text-indigo-500 disabled:opacity-10"><ChevronRight size={18}/></button>
        </div>
        
        <div className="w-10 sm:w-20" /> 
      </div>

      {/* 📖 VIEWPORT */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center custom-scrollbar relative">
        <div className="relative shadow-2xl h-fit mb-32">
          {/* Security Shield Overlay */}
          <div className="absolute inset-0 z-20 pointer-events-auto" />

          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="py-20 animate-spin text-indigo-500"><Loader2 size={30}/></div>}
          >
            {/* DENSE DARK WATERMARK */}
            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden opacity-[0.06] dark:opacity-[0.08] grid grid-cols-3 gap-20 p-10 rotate-[-30deg]">
               {Array.from({ length: 24 }).map((_, i) => (
                 <span key={i} className={`text-[10px] font-black uppercase whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}>{userEmail}</span>
               ))}
            </div>

            <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} scale={scale} />
          </Document>
        </div>

        {/* 🚨 THE COMPACT RED BUTTON (FLOATING BOTTOM RIGHT) 🚨 */}
        <button 
          onClick={onClose}
          className="fixed bottom-8 right-6 z-[60] w-12 h-12 bg-rose-600 text-white rounded-full shadow-[0_10px_30px_rgba(225,29,72,0.4)] flex items-center justify-center hover:bg-rose-500 hover:scale-110 active:scale-90 transition-all group"
          title="Exit Viewer"
        >
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* 🚨 GESTURE MENU */}
      {contextMenu.show && (
        <div 
          className={`fixed z-[100] w-48 rounded-2xl shadow-2xl border p-2 animate-in fade-in zoom-in-95 ${isDarkMode ? 'bg-[#1E293B] border-white/10' : 'bg-white border-slate-200'}`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu({ ...contextMenu, show: false })}
        >
          <button onClick={onClose} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all">
            <span>Exit Archive</span>
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* FOOTER */}
      <div className={`h-10 flex items-center justify-between px-6 border-t z-30 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{userEmail}</p>
        <div className="flex gap-4 opacity-30 items-center">
            <div className="flex items-center gap-1"><MousePointer2 size={10}/> <span className="text-[6px] uppercase font-black">Right-Click</span></div>
            <div className="flex items-center gap-1"><Fingerprint size={10}/> <span className="text-[6px] uppercase font-black">Triple-Tap</span></div>
        </div>
      </div>
    </div>
  );
}