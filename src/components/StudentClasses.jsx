import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Import your firebase config
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Calendar, Clock, Video, Mic, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentClasses() {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch classes that haven't happened yet
    const classesRef = collection(db, "classes");
    const q = query(
      classesRef, 
      where("startTime", ">=", new Date()), // Only show future classes
      orderBy("startTime", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClasses(classData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <h1 className="text-4xl font-black text-white mb-2">Upcoming <span className="text-rose-500">Classes</span></h1>
        <p className="text-slate-400">Join a live session and practice your Nihongo with Sensei.</p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length > 0 ? (
          classes.map((cls) => (
            <div key={cls.id} className="group relative bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 backdrop-blur-3xl hover:border-rose-500/30 transition-all duration-500">
              
              {/* Type Badge */}
              <div className="flex justify-between items-center mb-6">
                <div className={`p-3 rounded-2xl ${cls.type === 'Audio' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {cls.type === 'Audio' ? <Mic size={20} /> : <Video size={20} />}
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{cls.level || 'N5 - N1'}</span>
                </div>
              </div>

              {/* Info */}
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-rose-500 transition-colors">{cls.title}</h3>
              <p className="text-slate-400 text-sm mb-8 line-clamp-2">{cls.description}</p>

              {/* Time Details */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar size={16} className="text-rose-500" />
                  <span className="text-sm font-medium">March 20, 2026</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Clock size={16} className="text-rose-500" />
                  <span className="text-sm font-medium">06:30 PM (IST)</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
  onClick={() => navigate(`/room/${cls.roomID}?type=${cls.type}&role=student`)}
  className={`w-full py-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 active:scale-95
    ${cls.isLive 
      ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse border-2 border-rose-400' 
      : 'bg-white text-black hover:bg-rose-500 hover:text-white'
    }`}
>
  {cls.isLive ? (
    <>
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      SENSEI IS LIVE
    </>
  ) : (
    <>
      Enter Classroom
      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
    </>
  )}
</button>
            </div>
          ))
        ) : (
          /* Empty State */
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <p className="text-slate-500 font-medium">No live sessions scheduled yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}