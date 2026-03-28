import React from 'react';
import { Calendar, Clock, Video, Mic, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClassCard = ({ classData }) => {
  const navigate = useNavigate();
  
  // Icon based on room type
  const getIcon = (type) => {
    if (type === 'Audio') return <Mic size={18} />;
    if (type === 'Broadcast') return <Radio size={18} />;
    return <Video size={18} />;
  };

  const handleJoin = () => {
    // Join as 'Audience' for Broadcast or 'Student' for others
    navigate(`/room/${classData.roomID}?type=${classData.type}&role=student`);
  };

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl hover:border-rose-500/50 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-white/5 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors`}>
          {getIcon(classData.type)}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full">
          {classData.level || 'All Levels'}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{classData.title}</h3>
      <p className="text-slate-400 text-sm mb-6 line-clamp-2">{classData.description}</p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <Calendar size={14} className="text-rose-500" />
          <span>March 20, 2026</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <Clock size={14} className="text-rose-500" />
          <span>06:00 PM - 07:00 PM</span>
        </div>
      </div>

      <button 
        onClick={handleJoin}
        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all transform active:scale-95"
      >
        Join Classroom
      </button>
    </div>
  );
};