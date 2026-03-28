import React, { useRef } from 'react';
import { Users, Pencil, Trash2, ChevronRight, Lock, FileText, HelpCircle, Mic2 } from 'lucide-react';
import { auth } from '@services/firebase';
import Stat from '@components/shared/Stat';
import { motion, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';

export default function BatchCard({ batch, isDark, canAccess, onDelete, onEdit, onClick, isLead }) {
  const names = batch.teacherNames || ["Unknown Sensei"];
  const ids = batch.teacherIds || [];
  const myUid = auth.currentUser?.uid;

  const leadSensei = ids[0] === myUid ? "You" : names[0];
  const collabs = names.slice(1).map((name, index) => 
    ids[index + 1] === myUid ? "You" : name
  );
  const stats = batch.stats || { pdfs: 0, audio: 0, mcqs: 0 };
  const accent = batch.isFree ? "emerald" : "indigo";

  let collabText = "";
  if (collabs.length > 0) {
    const visibleCollabs = collabs.slice(0, 2);
    const extraCount = collabs.length - 2;
    collabText = visibleCollabs.join(', ') + (extraCount > 0 ? ` & +${extraCount}` : '');
  }

  // --- ANTIGRAVITY TILT-AND-GLOW PHYSICS ---
  const ref = useRef(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useTransform(mouseY, [0, 1], [5, -5]);
  const rotateY = useTransform(mouseX, [0, 1], [-5, 5]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  // Convert 0..1 back to percentage string using motion template
  const spotX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const spotY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const radialGradient = useMotionTemplate`radial-gradient(circle at ${spotX} ${spotY}, rgba(255,255,255,0.1) 0%, transparent 40%)`;

  // Item variants for stagger entry
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } }
  };

  return (
    <motion.div 
      variants={cardVariants}
      layout
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, perspective: 1000 }}
      whileHover={canAccess ? { scale: 1.02, zIndex: 10 } : {}}
      onClick={onClick} 
      className={`group relative p-1 rounded-[3.8rem] transition-colors duration-700 cursor-pointer ${canAccess ? '' : 'opacity-60'} ${isDark ? 'bg-slate-800 shadow-2xl' : 'bg-slate-200 shadow-xl'} ${batch.isFree ? 'hover:bg-emerald-500' : 'hover:bg-indigo-500'}`}
    >
      {/* Dynamic Magnetic Spotlight Overlay */}
      <motion.div style={{ background: radialGradient }} className="pointer-events-none absolute inset-0 z-20 rounded-[3.8rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {canAccess && (
        <div className="absolute -top-3 -right-3 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
           <motion.button whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0A0F1C]"><Pencil size={18} /></motion.button>
           {isLead && (
             <motion.button whileHover={{ scale: 1.1, rotate: -10 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="w-12 h-12 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0A0F1C]"><Trash2 size={18} /></motion.button>
           )}
        </div>
      )}

      <div className={`relative h-full w-full rounded-[3.6rem] p-10 flex flex-col justify-between overflow-hidden ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        <div className="absolute -right-6 -bottom-6 text-9xl font-black opacity-[0.02] select-none group-hover:scale-110 transition-transform duration-1000">資</div>
        
        <div className="flex justify-between items-start mb-10 relative z-10">
          <motion.div 
            animate={batch.isLive ? { boxShadow: ['0px 0px 0px rgba(16, 185, 129, 0)', '0px 0px 20px rgba(16, 185, 129, 0.4)', '0px 0px 0px rgba(16, 185, 129, 0)'] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`px-5 py-2 rounded-xl border text-[9px] font-black tracking-widest uppercase ${batch.isFree ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>
            {batch.level} {batch.isLive && "(LIVE)"}
          </motion.div>
          {!batch.isFree && <div className="text-right">
             <span className="text-amber-500 font-black text-lg block">₹{batch.price}</span>
             {batch.coupons?.length > 0 && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{batch.coupons.length} CODES</span>}
          </div>}
        </div>

        <div className="mb-10 relative z-10">
          <h3 className={`text-3xl font-black leading-tight tracking-tight mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{batch.title}</h3>
          
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-900/50 text-slate-500 border border-slate-800' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
               <Users size={18} />
            </div>
            <div className="flex flex-col justify-center py-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Lead: {leadSensei}
              </span>
              {collabs.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                  Collabs: {collabText}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/50 pt-8 mt-auto relative z-10">
          <div className="flex gap-6">
             <Stat icon={<FileText size={16}/>} count={stats.pdfs} color="text-blue-500" bg="bg-blue-500/10" />
             <Stat icon={<Mic2 size={16}/>} count={stats.audio} color="text-emerald-500" bg="bg-emerald-500/10" />
             <Stat icon={<HelpCircle size={16}/>} count={stats.mcqs} color="text-rose-500" bg="bg-rose-500/10" />
          </div>
          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${canAccess ? `bg-${accent}-600 text-white shadow-xl group-hover:scale-110` : 'bg-slate-900 text-slate-700'}`}>
            {canAccess ? <ChevronRight size={24} /> : <Lock size={20}/>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
