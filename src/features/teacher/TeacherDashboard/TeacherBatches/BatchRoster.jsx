import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, ShieldAlert, Search, 
  CheckCircle2, XCircle, Mail, Clock, Receipt, 
  CreditCard, ShieldCheck, UserMinus, Info 
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, doc, 
  updateDoc, deleteDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { db } from '@services/firebase';

export default function BatchRoster({ batchData, isDarkMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);

  // ==========================================
  // 📡 REAL-TIME ENROLLMENT LISTENER
  // ==========================================
  useEffect(() => {
    if (!batchData?.id) return;

    // Listen to the new 'enrollmentRequests' collection for THIS specific batch
    const q = query(
      collection(db, 'enrollmentRequests'),
      where('courseId', '==', batchData.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = [];
      const enrolled = [];

      snapshot.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() };
        
        if (data.status === 'PENDING') {
          pending.push(data);
        } else if (data.status === 'APPROVED') {
          enrolled.push(data);
        }
      });

      setPendingRequests(pending);
      setEnrolledStudents(enrolled);
    });

    return () => unsubscribe();
  }, [batchData?.id]);


  // ==========================================
  // ⚡ ACTION HANDLERS
  // ==========================================
  
  const handleApprove = async (request) => {
    try {
      // 1. Update the Enrollment Request to 'APPROVED'
      await updateDoc(doc(db, 'enrollmentRequests', request.id), {
        status: 'APPROVED',
        joinedAt: new Date().toLocaleDateString()
      });

      // 2. Unlock the course in the Student's actual profile
      if (request.studentUid) {
        await updateDoc(doc(db, 'users', request.studentUid), {
          enrolledCourses: arrayUnion(request.courseTitle) 
        });
        // Safer approach for long-term scale
await updateDoc(doc(db, 'users', request.studentUid), {
  enrolledCourseIds: arrayUnion(batchData.id) 
});
      }
    } catch (error) {
      console.error("Approval Error:", error);
      alert("Failed to approve student.");
    }
  };

  const handleReject = async (request) => {
    if(window.confirm(`Reject ${request.studentName}'s access request?`)) {
      try {
        await deleteDoc(doc(db, 'enrollmentRequests', request.id));
      } catch (error) {
        console.error("Rejection Error:", error);
      }
    }
  };

  const handleRevokeAccess = async (student) => {
    if(window.confirm(`Revoke access for ${student.studentName}? They will be locked out immediately.`)) {
      try {
        // 1. Delete the enrollment record
        await deleteDoc(doc(db, 'enrollmentRequests', student.id));

        // 2. Remove the course from the Student's profile
        if (student.studentUid) {
          await updateDoc(doc(db, 'users', student.studentUid), {
            enrolledCourses: arrayRemove(student.courseTitle) 
          });
          // Safer approach for long-term scale
await updateDoc(doc(db, 'users', request.studentUid), {
  enrolledCourseIds: arrayRemove(batchData.id) 
});
        }
      } catch (error) {
        console.error("Revoke Error:", error);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🛡️ HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Student Roster</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Manage access for {batchData?.title}</p>
        </div>
        
        {pendingRequests.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 shadow-inner animate-pulse">
            <ShieldAlert size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{pendingRequests.length} Pending Approvals</span>
          </div>
        )}
      </div>

      {/* 📊 QUICK STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Users size={18} className="text-indigo-500 mb-3" />
          <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{enrolledStudents.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Enrolled</p>
        </div>
        <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <UserCheck size={18} className="text-emerald-500 mb-3" />
          <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{pendingRequests.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Awaiting Action</p>
        </div>
      </div>

      {/* 🎛️ TABS & SEARCH */}
      <div className={`p-2 rounded-2xl border flex flex-col md:flex-row justify-between gap-4 ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'PENDING' ? 'bg-indigo-600 text-white shadow-lg' : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Pending {pendingRequests.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('ENROLLED')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ENROLLED' ? 'bg-indigo-600 text-white shadow-lg' : isDarkMode ? 'text-slate-400 hover:bg-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Active Students
          </button>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border flex-1 max-w-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <Search size={16} className="text-slate-400" />
          <input 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="Search student..." 
            className={`bg-transparent outline-none w-full font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`} 
          />
        </div>
      </div>

      {/* 📋 LIST VIEW */}
      <div className="space-y-3">
        {activeTab === 'PENDING' && (
          pendingRequests.filter(req => req.studentName?.toLowerCase().includes(searchQuery.toLowerCase())).map(req => (
            <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border gap-4 transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'}`}>
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border border-amber-500/20">
                  {req.studentName ? req.studentName.charAt(0) : '?'}
                </div>
                <div>
                  <h4 className={`font-black text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{req.studentName}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-1.5"><Mail size={12}/> {req.studentEmail}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="flex items-center gap-1.5 text-indigo-500"><Receipt size={12}/> {req.orderRef}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="text-right mr-4">
                  <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Payment Due</p>
                  <p className={`text-lg font-black italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{req.amountDue}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReject(req)} className="p-3 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                    <XCircle size={18} />
                  </button>
                  <button onClick={() => handleApprove(req)} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2">
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {activeTab === 'ENROLLED' && (
          enrolledStudents.filter(stu => stu.studentName?.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
            <div key={student.id} className={`flex items-center justify-between p-5 rounded-2xl border gap-4 transition-all ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                  {student.studentName ? student.studentName.charAt(0) : '?'}
                </div>
                <div>
                  <h4 className={`font-black text-sm mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{student.studentName}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Operator Approved: {student.joinedAt}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <button onClick={() => handleRevokeAccess(student)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all" title="Revoke Access">
                  <UserMinus size={18} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Empty States */}
        {(activeTab === 'PENDING' ? pendingRequests : enrolledStudents).length === 0 && (
          <div className="p-20 text-center border-2 border-dashed rounded-[3rem] border-slate-300 dark:border-slate-800">
            <ShieldAlert size={40} className="mx-auto text-slate-700 mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">No active records in this buffer</p>
          </div>
        )}
      </div>
    </div>
  );
}