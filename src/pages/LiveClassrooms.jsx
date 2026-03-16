import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { X, ChevronRight, Video, Users, Loader2, ShieldAlert } from 'lucide-react';

export default function LiveClassrooms({ isDarkMode }) {
  const [liveSessions, setLiveSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listener for all live classes
    const q = query(collection(db, "classes"), where("status", "==", "live"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        studentCount: doc.data().activeParticipants || 0 // We'll update this field in Room.jsx
      }));
      setLiveSessions(sessions);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const endSession = async (classId) => {
    if (window.confirm("Terminate this session for all students?")) {
      try {
        await updateDoc(doc(db, "classes", classId), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      } catch (err) { console.error(err); }
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className={`min-h-screen p-8 lg:p-12 transition-colors ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className={`text-5xl font-black tracking-tighter mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live Academy</h1>
            <p className="text-slate-500 font-medium text-lg">Real-time Japanese sessions happening now.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20">
              {liveSessions.length} ROOMS OPEN
            </div>
          </div>
        </div>

        {/* Classroom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {liveSessions.length > 0 ? (
            liveSessions.map((cls) => {
              const isHost = currentUser?.uid === cls.hostId;
              
              return (
                <div key={cls.id} className={`group p-8 rounded-[48px] border transition-all duration-500 hover:-translate-y-2 ${isDarkMode ? 'bg-[#0B1120] border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-2xl'}`}>
                  
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Video size={28}/>
                    </div>
                    {/* STUDENT COUNTER TAG */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                      <Users size={14} className="text-indigo-500" />
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {cls.studentCount} Online
                      </span>
                    </div>
                  </div>

                  <div className="mb-10">
                    <h3 className={`text-2xl font-black mb-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cls.classTitle}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">{cls.teacherName || "Sensei"}</p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => navigate(`/room/${cls.roomID}?type=${cls.type}&role=student`)}
                      className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-[24px] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95"
                    >
                      Join Now <ChevronRight size={20} />
                    </button>

                    {isHost && (
                      <button 
                        onClick={() => endSession(cls.id)}
                        className="p-5 bg-rose-500/10 text-rose-500 rounded-[24px] hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 active:scale-95"
                      >
                        <X size={24} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[60px]">
               <ShieldAlert className="mx-auto text-slate-300 dark:text-slate-700 mb-6" size={64} />
               <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">The Academy is quiet... for now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}