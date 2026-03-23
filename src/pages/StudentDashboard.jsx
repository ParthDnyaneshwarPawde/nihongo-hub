import React, { useState, useEffect } from 'react';
import { 
  BookOpen, FileText, BarChart3, MessageSquare, Settings, LogOut, 
  Search, Bell, Globe, Download, Lock, ChevronRight, Clock, 
  Video, Mic2, Tv, Trophy, Calendar, Zap, Info, Filter, MessageCircle, Menu, X, ShieldCheck, Loader2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase'; // Adjust path if your firebase file is elsewhere
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import ResourceVault from './ResourceVault';
import CalendarPage from './CalendarPage';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('learn');
  // REPLACE your old level state with this:
  const [level, setLevel] = useState('JLPT N5'); // Safe default
  // 1. Toggle state for the custom menu
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);

  // 2. Your current default courses
  // const currentCourses = ["JLPT N5", "JLPT N4", "JLPT N3"];

  // 3. The 5 Free Batches
// 1. These are fetched from Firestore (The ones they paid for)
const [currentCourses, setCurrentCourses] = useState([]); 

const [dbUserData, setDbUserData] = useState(null);

// 2. These are always available to everyone
const [freeBatches, setFreeBatches] = useState([
]);

  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // To store the live class info
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [latestBulletin, setLatestBulletin] = useState(null);
  const [bulletins, setBulletins] = useState([]); // <--- Add this
  const [viewingBulletin, setViewingBulletin] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 1. New state to hold the real batches from Firestore
const [dynamicBatches, setDynamicBatches] = useState([]);


const [enrolledCourseTitles, setEnrolledCourseTitles] = useState([]);
const [isDataLoaded, setIsDataLoaded] = useState(false);

// Add this new state variable at the top with your other states
  const [allLevelClasses, setAllLevelClasses] = useState([]);

  useEffect(() => {
    if (!level) return; 

    // NO FILTER FOR STATUS - we want everything!
    const q = query(
      collection(db, "classes"), 
      where("level", "==", level) 
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLevelClasses(fetched); // All classes for the calendar
      setUpcomingClasses(fetched.filter(c => c.status === 'upcoming' || c.status === 'live')); // Just upcoming for dashboard
    });
    
    return () => unsubscribe();
  }, [level]);

useEffect(() => {
  const fetchStudentAccess = async () => {
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          // This array looks like: ["JLPT N4 | The Bridge", "JLPT N5 Mastery"]
          setEnrolledCourseTitles(data.enrolledCourses || []);
        }
      } catch (err) {
        console.error("Dashboard Access Error:", err);
      } finally {
        setIsDataLoaded(true);
      }
    }
  };
  fetchStudentAccess();
}, []);


useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, "users", currentUser.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // 🚨 NEW: Save the entire Firestore document to state
        setDbUserData(userData);
        
        // 1. Sync their courses
        if (userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
          setCurrentCourses(userData.enrolledCourses);
        } else {
          setCurrentCourses([]);
        }

        // 2. Sync their last selected level
        if (userData.lastSelectedLevel) {
          setLevel(userData.lastSelectedLevel);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 🚨 SMART NAME FORMATTER
  const getDisplayName = () => {
    if (dbUserData?.firstName || dbUserData?.lastName) {
      return `${dbUserData.firstName || ''} ${dbUserData.lastName || ''}`.trim();
    }
    if (dbUserData?.displayName) return dbUserData.displayName.trim();
    if (currentUser?.displayName) return currentUser.displayName;
    return "Samurai Learner";
  };

  const displayName = getDisplayName();
  const displayInitial = displayName.charAt(0).toUpperCase();

// 2. Fetch the batches dynamically
useEffect(() => {
  // Fetch all available batches from the database
  const q = query(collection(db, 'batches')); 
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const fetchedBatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDynamicBatches(fetchedBatches);
      
      // 🚨 1. Smart Filter: Grab ONLY the titles of courses that are natively Free (ignores paid courses with coupons)
      const strictlyFreeTitles = fetchedBatches
        .filter(course => course.isFree === true || course.isFree === "true" || Number(course.price || 0) === 0)
        .map(course => course.title);
        
      // 🚨 2. Update the Free Dropdown dynamically!
      setFreeBatches(strictlyFreeTitles);
      
      // 🚨 3. Auto-Select / Bouncer Logic
      // If the current level (e.g. JLPT N5) is NOT in their purchased courses AND is NOT in the free list...
      const hasPaidAccess = currentCourses.includes(level);
      const isStillFree = strictlyFreeTitles.includes(level);
      
      if (level && !hasPaidAccess && !isStillFree && strictlyFreeTitles.length > 0) {
        setLevel(strictlyFreeTitles[0]); // Kick them to the first actually free course safely
      }
    } else {
      setDynamicBatches([]);
      setFreeBatches([]);
    }
  });

  return () => unsubscribe();
}, [level, currentCourses]); // Added dependencies so it reacts when they buy a course


  // Auto-save the selected level to the browser's memory whenever it changes
useEffect(() => {
  const syncLevelToCloud = async () => {
    // Only save if there is a logged-in user and a level selected
    if (currentUser?.uid && level) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          lastSelectedLevel: level // This bookmarks the course in the cloud
        });
      } catch (err) {
        console.error("Cloud Sync Error:", err);
      }
    }
  };

  syncLevelToCloud();
}, [level, currentUser]);
useEffect(() => {
    const checkAuthorization = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role?.toLowerCase();

        // 🚨 THE REDIRECT: If they are a teacher/admin, get them out of here!
        if (role === 'teacher' || role === 'admin') {
          console.log("Teacher detected on Student Dash. Redirecting...");
          navigate('/teacher-dashboard', { replace: true });
        }
      }
    };

    checkAuthorization();
  }, [navigate]);
//   useEffect(() => {
//   const q = query(
//     collection(db, "bulletins"), 
//     orderBy("createdAt", "desc") 
//     // limit(3) REMOVED so we get everything
//   );

//   const unsubscribe = onSnapshot(q, (snapshot) => {
//     setBulletins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
//   });

//   return () => unsubscribe();
// }, []);

// 

const formatSessionDateTime = (isoString) => {
  if (!isoString) return { date: 'TBD', time: 'TBD' };

  const dateObj = new Date(isoString);

  // Format Date: e.g., "Oct 24, 2026"
  const date = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Format Time: e.g., "10:00 PM"
  const time = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return { date, time };
};


useEffect(() => {
  if (!level) return;

  console.log("====================================");
  console.log("🔍 1. STUDENT DROPDOWN SAYS =>", `"${level}"`);

  // --- DIAGNOSTIC: Check what is actually inside Firebase right now ---
  const checkDB = query(collection(db, "bulletins"), limit(5));
  onSnapshot(checkDB, (snap) => {
    console.log("🔍 2. WHAT IS ACTUALLY IN FIREBASE (Last 5 messages):");
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   📝 Message: "${data.message.substring(0, 20)}..." | Target Saved As: "${data.targetLevel}"`);
    });
    console.log("====================================");
  });
  // -----------------------------------------------------------------

  // --- THE REAL FILTER ---
  const q = query(
    collection(db, "bulletins"),
    where("targetLevel", "in", [level, "global"]),
    orderBy("createdAt", "desc") // <-- Keep this commented out or deleted for the test!
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log(`✅ 3. MATCHES FOUND: Firebase gave us ${snapshot.size} messages that matched "${level}" or "global"`);
    setBulletins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (err) => {
    console.error("❌ FIREBASE ERROR:", err.message);
  });

  return () => unsubscribe();
}, [level]);

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    setCurrentUser(user);
  });
  return () => unsubscribe();
}, []);

useEffect(() => {
  if (!currentUser?.uid) return;

  const userRef = doc(db, "users", currentUser.uid);
  
  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      
      // 1. Sync their courses
      if (userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
        setCurrentCourses(userData.enrolledCourses);
      } else {
        setCurrentCourses([]);
      }

      // 2. 🚨 THE FIX: Sync their last selected level from THEIR cloud record
      if (userData.lastSelectedLevel) {
        setLevel(userData.lastSelectedLevel);
      }
    }
  });

  return () => unsubscribe();
}, [currentUser]);

  

//   useEffect(() => {
    


//     // 2. Set up the real-time bouncer (listener)
//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       if (!snapshot.empty) {
//         setActiveSession(snapshot.docs[0].data());
//       } else {
//         setActiveSession(null); // No one is live
//       }
//     });

//     return () => unsubscribe(); // Clean up on unmount
//   }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    // 1. Safety check: is the class still live?
  if (selectedClass.status !== 'live') {
    setPasswordError("This session has ended or is not yet active.");
    return;
  }

  const correctPassword = selectedClass.password || "";
    
    // Check if the password matches the one stored in Firestore for this specific class
    if (!selectedClass.password || enteredPassword === selectedClass.password) {
      setIsPasswordModalOpen(false);
      setEnteredPassword("");
      
      // Navigate to the room with the correct role and pass the password
      navigate(`/room/${selectedClass.roomID}?type=${selectedClass.type}&role=student&pass=${enteredPassword}`);
    } else {
      // Show error if it's wrong
      setPasswordError("Incorrect Access Key. Please check the Bulletin Board.");
    }
  };

  useEffect(() => {
  // 1. Exit early if level is null/undefined so we don't crash
  if (!level) return; 

  const q = query(
    collection(db, "classes"), 
    where("status", "in", ["upcoming", "live"]), 
    where("level", "==", level) 
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    setUpcomingClasses(snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })));
  }, (err) => {
    console.error("Filter Error:", err.message);
  });
  
  return () => unsubscribe();

  // 2. THIS ARRAY MUST ALWAYS HAVE 'level' IN IT
}, [level]);
  // Close sidebar on mobile when switching tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };
  const handleLogout = async () => {
  try {
    setCurrentCourses([]);
    setLevel('JLPT N5')
    await signOut(auth);
    navigate('/'); // This sends them back to the login gatekeeper
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-[#F8FAFC] text-slate-900'} font-sans transition-colors duration-500 overflow-hidden relative`}>
      
      {/* ================= 1. MOBILE SIDEBAR OVERLAY ================= */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ================= 2. SIDE NAVIGATION ================= */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 flex flex-col border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}
      `}>
        {/* Sidebar Header */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">桜</span>
            </div>
            <span className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NIHONGO HUB</span>
          </div>
          <button className="lg:hidden p-1 text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">Menu</p>
          <SidebarLink icon={<Globe size={18}/>} label="Learn" active={activeTab === 'learn'} onClick={() => handleTabClick('learn')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<Download size={18}/>} label="Resource Vault" active={activeTab === 'vault'} onClick={() => handleTabClick('vault')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<MessageCircle size={18}/>} label="Doubts" active={activeTab === 'doubts'} onClick={() => handleTabClick('doubts')} isDarkMode={isDarkMode} />
          <SidebarLink icon={<BarChart3 size={18}/>} label="Analytics" active={activeTab === 'analytics'} badge="Soon" isDarkMode={isDarkMode} />
          <SidebarLink icon={<FileText size={18}/>} label="Exam Info" active={activeTab === 'exam'} onClick={() => handleTabClick('exam')} isDarkMode={isDarkMode} />
          
          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">System</p>
            <SidebarLink icon={<Settings size={18}/>} label="Settings" isDarkMode={isDarkMode} />
            <SidebarLink icon={<LogOut size={18}/>} label="Logout" danger isDarkMode={isDarkMode} onClick={handleLogout} />
          </div>
        </nav>

        {/* Gamification Widget */}
        <div className="p-6">
          <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900/50 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Rank: Samurai</span>
              <Trophy size={14} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>2,450</span>
              <span className="text-xs text-slate-500 font-bold uppercase">XP</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[70%] rounded-full"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= 3. MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {latestBulletin && (
  <div className="animate-in slide-in-from-top duration-500 mb-8 p-4 bg-indigo-600 rounded-3xl flex items-center justify-between shadow-xl shadow-indigo-600/20">
    <div className="flex items-center gap-4 px-4">
      <div className="p-2 bg-white/20 rounded-xl text-white">
        <Bell className="animate-bounce" size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Global Bulletin</p>
        <p className="text-white font-bold">{latestBulletin.message}</p>
      </div>
    </div>
    <button 
      onClick={() => setLatestBulletin(null)} 
      className="p-3 text-indigo-200 hover:text-white transition-colors"
    >
      <X size={20} />
    </button>
  </div>
)}
        
        {/* Background Kanji Watermark (Hidden on small screens) */}
        <div className={`hidden xl:block absolute right-[-10%] top-[15%] text-[500px] font-black select-none pointer-events-none z-0 opacity-[0.03] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          勉強
        </div>

        {/* ================= BACKGROUND KANJI WATERMARK ================= */}
{/* <div className={`
  absolute right-[-49%] top-[10%] 
  text-[400px] lg:text-[600px] font-black 
  select-none pointer-events-none z-0 
  transition-opacity duration-500
  ${isDarkMode ? 'text-white opacity-[0.03]' : 'text-slate-900 opacity-[0.04]'}
`}>
  勉強
</div> */}

        {/* --- TOP HEADER --- */}
        {/* --- TOP HEADER --- */}
        <header className={`h-20 border-b backdrop-blur-md px-4 lg:px-10 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-[#0F172A]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center gap-3 lg:gap-8">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            
            {/* --- CUSTOM COURSE DROPDOWN --- */}
            {/* 🚨 FIX: Removed 'hidden sm:block' so it shows on mobile */}
            <div className="relative">
              {/* The Trigger Button */}
              <button 
                onClick={() => setIsCourseMenuOpen(!isCourseMenuOpen)}
                className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl border transition-all duration-300 shadow-sm
                  ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400'}`}
              >
                <BookOpen size={16} className="text-indigo-500 shrink-0" />
                <span className={`font-black text-xs lg:text-sm truncate max-w-[100px] sm:max-w-[150px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{level}</span>
                <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isCourseMenuOpen ? 'rotate-90' : 'rotate-0'}`} />
              </button>

              {/* Invisible Overlay to close when clicking outside */}
              {isCourseMenuOpen && (
                <div className="fixed inset-0 z-[90]" onClick={() => setIsCourseMenuOpen(false)}></div>
              )}

              {/* The Dropdown Menu */}
              {isCourseMenuOpen && (
                <div className={`absolute top-full mt-2 left-0 w-72 lg:w-80 rounded-2xl shadow-2xl border z-[100] animate-in fade-in slide-in-from-top-2 duration-200 
                  ${isDarkMode ? 'bg-slate-900 border-slate-700 shadow-black/50' : 'bg-white border-slate-200'}`}
                  style={{ maxHeight: '85vh', overflowY: 'auto' }}
                >
                  
                  {/* SECTION 1: My Courses */}
                  <div className="p-3 pb-0">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-3 mb-2">My Courses</p>
                    <div className="space-y-1">
                      {currentCourses.length > 0 ? (
                        currentCourses.map(course => (
                          <button
                            key={course}
                            onClick={() => { setLevel(course); setIsCourseMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-between
                              ${level === course ? 'bg-indigo-500/10 text-indigo-500' : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            <span className="truncate pr-2">{course}</span>
                            {level === course && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs font-bold text-slate-500 italic">No premium courses yet.</p>
                      )}
                    </div>
                  </div>

                  <div className={`h-px w-full my-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}></div>

                  {/* SECTION 2: Free Batches */}
                  <div className="p-3 pt-0">
                    <div className="flex justify-between items-center px-3 mb-2 mt-2">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Free Batches</p>
                      {freeBatches.length > 6 && (
                        <button 
                          onClick={() => { setIsCourseMenuOpen(false); navigate('/course-catalog?filter=free'); }}
                          className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded transition-colors
                            ${isDarkMode ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          View All →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {freeBatches.slice(0, 6).map(batch => (
                        <button
                          key={batch}
                          onClick={() => { setLevel(batch); setIsCourseMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between
                            ${level === batch ? 'bg-emerald-500/10 text-emerald-500' : isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <span className="truncate pr-2">{batch}</span>
                          {level === batch && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SECTION 3: EXPLORE CATALOG */}
                  <div className={`p-4 border-t sticky bottom-0 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <button 
                      onClick={() => {
                        setIsCourseMenuOpen(false);
                        navigate('/course-catalog');
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      Explore Full Catalog
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 🚨 FIX: Added 'hidden md:flex' so this hides on mobile and saves space */}
            <div className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 bg-rose-500/10 rounded-full border border-rose-500/20">
              <Clock size={14} className="text-rose-500" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest truncate">114 Days to JLPT</span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 lg:p-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              {isDarkMode ? <Zap size={16} className="text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" /> : <Clock size={16} className="text-slate-600" />}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 group text-left outline-none"
            >
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black transition-colors ${isDarkMode ? 'text-white group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                  {displayName}
                </p>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Premium Member</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center font-bold text-white transition-all group-hover:scale-110 group-active:scale-95 shrink-0">
                {displayInitial}
              </div>
            </button>
          </div>
        </header>

        {/* --- MAIN FEED (SCROLLABLE) --- */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 z-10 custom-scrollbar space-y-12">
          {/* 🚨 TAB LOGIC START 🚨 */}
          
          {/* TAB 1: LEARN (The Study Dojo) */}
          {activeTab === 'learn' && (
            <div className="space-y-12 animate-in fade-in duration-500">
          {/* 1. HERO & PROGRESS */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-left-6 duration-700">
              <h1 className={`text-4xl lg:text-6xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mastering {level}.</h1>
              <p className={`text-lg lg:text-xl font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>You've solved 42 questions today. You're 12% ahead of your weekly target. Keep the momentum, Samurai.</p>
            </div>
            <div className="p-8 rounded-[32px] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Zap size={24} /></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1.5 rounded-full">Daily Goal</span>
                </div>
                <h3 className="text-3xl font-black mb-2 tracking-tight">65% Complete</h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Complete 3 more grammar units to hit your streak.</p>
                <button className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">Continue Lesson</button>
              </div>
              {/* Decorative Kanji inside Hero */}
              <div className="absolute right-[-10%] bottom-[-10%] text-9xl font-black text-white/10 select-none">進捗</div>
            </div>
          </section>

          {/* 2. UPCOMING EVENTS */}
<section>
  <div className="flex justify-between items-end mb-8">
    <div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Live Academy</h3>
      <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Sessions</h2>
    </div>
    <button className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all" onClick={() => setActiveTab("calendar")}>
      View Calendar <ChevronRight size={18}/>
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {upcomingClasses.length > 0 ? (
      upcomingClasses.map((cls) => (
       <EventCard 
  key={cls.id}
  type={cls.type} 
  title={cls.title || cls.topic || cls.classTitle || "🚨 TITLE MISSING"} 
  sensei={cls.teacher || cls.teacherName || "Sensei Tanaka"} 
  rawTime={cls.status === 'live' ? "LIVE NOW" : cls.scheduledTime} 
  isDark={isDarkMode}
  // --- ADD THE PULSE CLASS IF LIVE ---
  isLive={cls.status === 'live'} 
  onClick={() => {
    if (cls.status !== 'live') {
      alert("This class hasn't started yet. Please check back at the scheduled time!");
      return;
    }
    setSelectedClass(cls);
    setIsPasswordModalOpen(true);
    setEnteredPassword("");
    setPasswordError("");
  }}
/>
      ))
    ) : (
      <div className={`col-span-full p-12 text-center rounded-[32px] border-2 border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        No classes scheduled for today. Check back later!
      </div>
    )}
  </div>
</section>

{/* ================= GLOBAL BULLETIN CENTER ================= */}
<section className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
  <div className="flex justify-between items-end mb-8">
  <div>
    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">Campus News</h3>
    <h2 className={`text-2xl lg:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Official Bulletins</h2>
  </div>
  
  {/* THIS IS YOUR VIEW ALL BUTTON */}
  <button 
      onClick={() => setIsHistoryModalOpen(true)} // Opens the big list
      className="text-sm font-black text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all"
    >
      View History <ChevronRight size={18}/>
    </button>
</div>

  <div className={`p-2 rounded-[40px] border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
    {bulletins.length > 0 ? (
  <div className={`divide-y divide-slate-100 dark:divide-slate-800 border rounded-[40px] overflow-hidden ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
    {/* .slice(0, 3) ensures the dashboard stays clean */}
    {bulletins.slice(0, 3).map((msg, index) => (
      <div 
        key={msg.id} 
        onClick={() => setViewingBulletin(msg)}
        className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-start gap-6">
          <div className={`p-4 rounded-2xl shrink-0 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Bell size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className={`text-lg font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {msg.message}
              </h4>
              {index === 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-tighter shrink-0">New</span>
              )}
            </div>
            <p className="text-sm text-slate-500 line-clamp-1 font-medium mb-2">
              {msg.message}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {msg.sender || "Sensei"} • {msg.createdAt?.toDate().toLocaleDateString()}
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300 hidden md:block" />
      </div>
    ))}
  </div>
) : (
  <div className="p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px]">
    <Info className="mx-auto text-slate-300 mb-4" size={48} />
    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No active announcements</p>
  </div>
)}
  </div>
</section>

          {/* 3. CURRICULUM MAIN BODY */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            
            <div className="xl:col-span-2 space-y-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Course Path</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModuleCard icon={<BookOpen size={24}/>} title="Vocabulary" sub="Tango" progress={82} items="3,200 Words" isDark={isDarkMode} color="bg-indigo-600" />
                <ModuleCard icon={<Zap size={24}/>} title="Grammar" sub="Bunpou" progress={45} items="140 Patterns" isDark={isDarkMode} color="bg-blue-600" />
                <ModuleCard icon={<FileText size={24}/>} title="Reading" sub="Dokkai" progress={20} items="Weekly Stories" isDark={isDarkMode} color="bg-rose-600" />
                <ModuleCard icon={<Mic2 size={24}/>} title="Listening" sub="Choukai" progress={12} items="Audio Drills" isDark={isDarkMode} color="bg-emerald-600" />
              </div>

              {/* BULLETIN BOARD */}
              <div className={`p-8 lg:p-10 rounded-[32px] border shadow-sm ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-xl font-black mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                   <Bell size={24} className="text-rose-500" /> Bulletin Board
                </h3>
                <div className="space-y-8">
                  <NewsItem title="July JLPT Forms are now Live!" date="16 March 2026" urgent isDark={isDarkMode} />
                  <NewsItem title="New Genki I & II Answer Keys uploaded to Library" date="12 March 2026" isDark={isDarkMode} />
                  <NewsItem title="Maintenance: App will be down for 2 hours on Sunday" date="10 March 2026" isDark={isDarkMode} />
                </div>
              </div>
            </div>

            {/* 4. RIGHT SIDEBAR WIDGETS */}
            <div className="space-y-8">
              {/* Exam Info Widget */}
              <div className={`p-8 rounded-[32px] border ${isDarkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><Globe size={20} /></div>
                  <h3 className={`font-black text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>India Exam Seats</h3>
                </div>
                <div className="space-y-4">
                  <SeatStat city="New Delhi" status="Available" color="emerald" isDark={isDarkMode} />
                  <SeatStat city="Mumbai" status="Filling Fast" color="amber" isDark={isDarkMode} />
                  <SeatStat city="Pune" status="Sold Out" color="rose" isDark={isDarkMode} />
                </div>
                <p className="mt-8 text-[10px] text-slate-500 font-black uppercase text-center leading-loose opacity-60">
                  Premium members get priority form submission assistance.
                </p>
              </div>

              {/* AI Support Card */}
              <div className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                 <div className="relative z-10">
                   <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/30">
                     <MessageSquare size={24} />
                   </div>
                   <h3 className="text-2xl font-black mb-3 tracking-tight">Stuck on a rule?</h3>
                   <p className="text-slate-400 text-sm mb-8 leading-relaxed">Ask Sensei or use our AI Doubt Solver for instant high-context explanations.</p>
                   <button className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl">Ask AI Sensei</button>
                 </div>
                 <div className="absolute right-[-10%] bottom-[-10%] text-[180px] font-black text-white/[0.03] rotate-12 pointer-events-none">?</div>
              </div>

              {/* Resource Preview */}
              <div className={`p-6 rounded-2xl border flex items-center justify-between transition-all hover:border-indigo-500/50 cursor-pointer ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <Download size={20} className={isDarkMode ? 'text-white' : 'text-white'}/>
                  </div>
                  <div>
                    <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Minna no Nihongo</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">PDF Ready</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            </div>

          </section>

          {/* 5. MOCK TEST PREMIUM UPSELL */}
          <section className="bg-[#0B1120] border border-slate-800 rounded-[48px] p-8 lg:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-1000">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <Lock size={16} className="text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Premium Curriculum</span>
              </div>
              <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter leading-tight">Unlimited Mock Tests.</h2>
              <p className="text-slate-400 text-lg lg:text-xl font-medium leading-relaxed opacity-80">
                Access full-length timed JLPT mock papers (N5-N1), instant scoring, and AI-powered performance analysis to crush the actual exam.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95">Upgrade Now</button>
                <button className="px-12 py-5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 active:scale-95">View Sample Test</button>
              </div>
            </div>
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 0.8px, transparent 0.8px)', backgroundSize: '32px 32px' }}></div>
          </section>

          </div>
          )}

          {/* TAB 2: RESOURCE VAULT (Your New File) */}
        {activeTab === 'vault' && (
  isDataLoaded ? (
    <ResourceVault 
      selectedCourseTitle={level}             
      enrolledCourseTitles={currentCourses}    
      isDarkMode={isDarkMode} 
      currentUser={currentUser}
    />
  ) : (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
        Authorizing Access...
      </p>
    </div>
  )
)}

          {/* TAB 3: DOUBTS (Placeholder) */}
          {activeTab === 'doubts' && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-full flex items-center justify-center mb-6">
                <MessageSquare size={40} className="text-indigo-500" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">AI Doubt Solver</h2>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Dojo Intelligence Offline</p>
              <p className="text-slate-500 font-bold uppercase text-[8px] tracking-[0.4em] mt-2">Coming Soon...</p>
            </div>
          )}

          {/* TAB 4: CALENDAR PAGE */}
{/* TAB 4: CALENDAR PAGE */}
{activeTab === 'calendar' && (
  <CalendarPage 
    level={level}
    classes={allLevelClasses}
    isDarkMode={isDarkMode}
    onBack={() => handleTabClick('learn')} // 🚨 This makes the Back to Dojo button work!
    onLiveClick={(cls) => {
      setSelectedClass(cls);
      setIsPasswordModalOpen(true);
      setEnteredPassword("");
      setPasswordError("");
    }}
  />
)}
          
          {/* 🚨 TAB LOGIC END 🚨 */}

        </div>
      </main>
      {/* ================= PASSWORD GATE MODAL ================= */}
{isPasswordModalOpen && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className={`w-full max-w-md rounded-[2.5rem] p-8 border shadow-2xl animate-in zoom-in duration-300 transition-colors ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Security Check</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Classroom Authorization</p>
        </div>
        <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Class Preview Card inside Modal */}
      <div className={`p-5 rounded-2xl mb-8 flex items-center gap-4 ${isDarkMode ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
         <div className="w-12 h-12 bg-indigo-600/10 text-indigo-500 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Lock size={20} />
         </div>
         <div>
            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedClass?.title}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedClass?.level} • {selectedClass?.teacher}</p>
         </div>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-6">
  <div className="space-y-3">
    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Access Password</label>
    <input 
            autoFocus
            type="password"
            placeholder="••••••"
            value={enteredPassword}
            onChange={(e) => {
              setEnteredPassword(e.target.value);
              setPasswordError("");
            }}
            className={`w-full p-5 rounded-2xl border transition-all outline-none font-black text-center text-xl tracking-[0.5em]
              ${isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10' 
                : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-inner'}`}
          />
    
    {/* FORGOT PASSWORD HINT */}
    <div className="flex justify-between items-center px-2">
      <button 
        type="button"
        onClick={() => {
          setIsPasswordModalOpen(false);
          setIsHistoryModalOpen(true); // Direct them to bulletins
        }}
        className="text-[10px] font-black text-slate-500 hover:text-indigo-500 transition-colors uppercase tracking-tighter"
      >
        Forgot Key? Check Bulletins
      </button>
      
      {passwordError && (
        <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter animate-pulse">
          Incorrect Key
        </p>
      )}
    </div>
  </div>

  <button 
          type="submit"
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <ShieldCheck size={20} />
          UNLOCK CLASSROOM
        </button>
</form>
    </div>
  </div>
)}

{/* ================= BULLETIN DETAIL MODAL ================= */}
{viewingBulletin && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
    <div className={`w-full max-w-2xl rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 transition-colors flex flex-col max-h-[80vh] ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
      
      {/* Modal Header */}
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <Bell size={20} />
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Bulletin Details</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Official Announcement</p>
          </div>
        </div>
        <button onClick={() => setViewingBulletin(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* SCROLLABLE MESSAGE AREA */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className={`text-lg leading-relaxed font-medium whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {viewingBulletin.message}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Broadcasted by</span>
          <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{viewingBulletin.sender}</span>
        </div>
        <button 
          onClick={() => setViewingBulletin(null)}
          className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 transition-all shadow-lg"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
)}

{/* ================= FULL HISTORY MODAL ================= */}
{isHistoryModalOpen && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
    <div className={`w-full max-w-3xl rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 transition-colors flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
      
      {/* Modal Header */}
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Announcement History</h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">All messages from Sensei</p>
        </div>
        <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={28} />
        </button>
      </div>

      {/* SCROLLABLE LIST AREA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-2">
          {bulletins.map((msg) => (
            <div 
              key={msg.id}
              onClick={() => {
                setViewingBulletin(msg); // Open the specific message
                // Optional: keep history open in background or close it
              }}
              className={`p-6 rounded-3xl border flex items-center justify-between group cursor-pointer transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}
            >
              <div className="flex items-center gap-5">
                <div className="p-3 bg-indigo-600/10 text-indigo-500 rounded-xl"><Bell size={18} /></div>
                <div>
                  <h4 className={`font-black text-base line-clamp-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{msg.message}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{msg.sender} • {msg.createdAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-6 text-center border-t border-slate-100 dark:border-slate-800">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End of history</p>
      </div>
    </div>
  </div>
)}

{/* ================= PROFILE SETTINGS & LOGOUT MODAL ================= */}
{isProfileModalOpen && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
    {/* Click outside to close */}
    <div className="absolute inset-0" onClick={() => setIsProfileModalOpen(false)} />
    
    <div className={`relative w-full max-w-sm rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 overflow-hidden ${isDarkMode ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
      
      {/* Modal Header/Profile Bio */}
      <div className={`p-8 text-center border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
        <div className="w-20 h-20 rounded-3xl bg-indigo-600 mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-600/20">
          {displayInitial}
        </div>
        <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {displayName}
        </h3>
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Verified Member</p>
      </div>

      {/* Action Links */}
      <div className="p-4 space-y-2">
        <button 
          onClick={() => { navigate('/profile-settings'); setIsProfileModalOpen(false); }}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black text-sm ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-slate-400" />
            <span>Profile Settings</span>
          </div>
          <ChevronRight size={16} className="text-slate-600" />
        </button>

        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-black text-sm ${isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? <Zap size={18} className="text-amber-400" /> : <Clock size={18} className="text-slate-600" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </button>

        <div className={`h-px w-full my-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all font-black text-sm"
        >
          <LogOut size={18} />
          <span>Logout Session</span>
        </button>
      </div>

      {/* Close Button */}
      <button 
        onClick={() => setIsProfileModalOpen(false)}
        className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${isDarkMode ? 'bg-white/5 text-slate-500 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}
      >
        Close Menu
      </button>
    </div>
  </div>
)}
    </div>
  );
}

/* ================= COMPONENT ABSTRACTIONS ================= */

function EventCard({ type, title, subtitle, sensei, rawTime, isDark, isLive, onClick }) {
  const icons = {
    Video: <Video size={22} className={isLive ? "text-white" : "text-indigo-500"} />,
    Audio: <Mic2 size={22} className={isLive ? "text-white" : "text-rose-500"} />,
    Broadcast: <Tv size={22} className={isLive ? "text-white" : "text-emerald-500"} />
  };

  const formatDateTime = (rawDate) => {
    if (!rawDate) return { day: '00', month: '---', time: '--:--' };
    let dateObj;
    if (typeof rawDate.toDate === 'function') {
      dateObj = rawDate.toDate();
    } else {
      dateObj = new Date(rawDate);
    }
    if (isNaN(dateObj.getTime())) {
      return { day: '??', month: 'TBD', time: 'Scheduled' };
    }
    return {
      day: dateObj.toLocaleDateString('en-US', { day: '2-digit' }),
      month: dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  };

  const { day, month, time } = formatDateTime(rawTime);

  return (
    <div 
      onClick={onClick}
      className={`group relative p-1 rounded-[32px] transition-all duration-500 hover:-translate-y-2 cursor-pointer
        ${isLive 
          ? 'bg-gradient-to-br from-rose-500 via-purple-500 to-indigo-500 shadow-[0_20px_50px_rgba(244,63,94,0.3)]' 
          : isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
    >
      <div className={`relative h-full w-full rounded-[30px] p-6 flex flex-col justify-between overflow-hidden
        ${isDark ? 'bg-[#0B1120]' : 'bg-white'}`}>
        
        {/* Background Kanji Watermark */}
        <div className="absolute -right-4 -bottom-4 text-7xl font-black opacity-[0.03] select-none group-hover:scale-110 transition-transform duration-700">
          授業
        </div>

        <div className="flex justify-between items-start mb-6">
          {/* 🚨 THE FIX: DYNAMIC DATE BADGE */}
          {/* 🚨 THE FIX: DYNAMIC DATE BADGE */}
<div className={`flex flex-col items-center justify-center border w-14 h-16 rounded-2xl transition-colors
  ${isLive 
    ? 'bg-rose-500/10 border-rose-500/30' 
    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
  
  <span className={`text-[10px] font-black leading-none ${isLive ? 'text-rose-500' : 'text-indigo-500'}`}>
    {isLive ? 'LIVE' : month}
  </span>
  
  {/* 👇 Here is the magic size shift: text-sm for NOW, text-xl for the day */}
  <span className={`font-black mt-0.5 ${
    isLive 
      ? 'text-sm text-rose-600 dark:text-rose-400' 
      : `text-xl ${isDark ? 'text-white' : 'text-slate-900'}`
  }`}>
    {isLive ? 'NOW' : day}
  </span>
</div>

          {/* Type Icon */}
          <div className={`p-3 rounded-2xl shadow-inner group-hover:rotate-12 transition-transform
            ${isLive ? 'bg-rose-500 border-rose-400' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {icons[type] || icons.Video}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            {isLive && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">
                Join Class
              </span>
            )}
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sensei}</span>
          </div>
          
          <h4 className={`text-xl font-black leading-tight tracking-tight group-hover:text-indigo-500 transition-colors ${subtitle ? 'mb-1' : 'mb-4'} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title || "Untitled Session"}
          </h4>
          
          {subtitle && (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-4 line-clamp-1">
              {subtitle}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto">
            {/* 🚨 THE FIX: DYNAMIC TIME TEXT AT BOTTOM */}
            <div className={`flex items-center gap-2 ${isLive ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
              <Clock size={14} className={isLive ? "text-rose-500" : "text-indigo-500"} />
              <span className="text-xs font-bold">
                {isLive ? "HAPPENING NOW" : time}
              </span>
            </div>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1
              ${isLive ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ModuleCard({ icon, title, sub, progress, items, isDark, color }) {
  return (
    <div className={`border rounded-[32px] p-8 transition-all duration-300 group ${isDark ? 'bg-[#0B1120] border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'}`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 ${color} text-white rounded-2xl shadow-lg shadow-indigo-600/10 group-hover:rotate-6 transition-transform`}>{icon}</div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>{sub}</span>
      </div>
      <h4 className={`text-xl font-black mb-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      <p className="text-xs font-bold text-slate-500 mb-8">{items}</p>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className={`${color} h-full transition-all duration-[1500ms] ease-out`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}

function NewsItem({ title, date, urgent, isDark }) {
  return (
    <div className="flex items-start gap-5 group cursor-pointer">
      <div className={`mt-2 w-2 h-2 rounded-full shrink-0 ${urgent ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
      <div>
        <h4 className={`text-base font-black transition-colors ${urgent ? 'text-rose-500' : isDark ? 'text-white hover:text-indigo-400' : 'text-slate-900 hover:text-indigo-600'}`}>{title}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">{date}</p>
      </div>
    </div>
  );
}

function SeatStat({ city, status, color, isDark }) {
  const colors = { 
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', 
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20', 
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
  };
  return (
    <div className={`flex items-center justify-between p-4 border rounded-2xl transition-all hover:scale-[1.02] ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{city}</span>
      <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border ${colors[color]}`}>{status}</span>
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function SidebarLink({ icon, label, active, onClick, danger, badge, isDarkMode }) {
  const activeClass = "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/10";
  const inactiveClass = isDarkMode 
    ? "text-slate-500 hover:bg-slate-800 hover:text-white" 
    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900";
  const dangerClass = "text-slate-500 hover:bg-rose-500/10 hover:text-rose-500";

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 font-black group ${
        active ? activeClass : danger ? dangerClass : inactiveClass
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-inherit'} transition-transform group-hover:scale-110`}>
          {icon}
        </span>
        <span className="text-[13px] tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full uppercase">
          {badge}
        </span>
      )}
    </button>
  );
}