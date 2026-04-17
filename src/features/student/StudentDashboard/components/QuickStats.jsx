import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  Zap, PlayCircle, ChevronRight, Sparkles, Rocket, 
  Trophy, Target, Flame, Loader2 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// 🚨 FIREBASE IMPORTS
import { db, auth } from '@services/firebase'; 
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // 🚨 NEW IMPORT

export default function QuickStats({ batchId: propBatchId }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Accept batchId from URL params OR as a direct prop
  const { batchId: paramBatchId } = useParams();
  const batchId = propBatchId || paramBatchId; 

  const [progress, setProgress] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [nextLesson, setNextLesson] = useState(null); // 🚨 NEW: Stores the actual next lesson object

  const isFirstTime = progress === 0;

  const greetings = [
    { title: "Your Odyssey Begins.", sub: "The path to mastery is open. Strike while the iron is hot." },
    { title: "The Dojo Awaits.", sub: "Your blade is forged, your mind is set. Step into the arena." },
    { title: "Mastery Starts Today.", sub: "Discipline is the bridge between goals and accomplishment." },
    { title: "Forge Your Future.", sub: "Every lesson mastered is a step closer to fluency. Keep the flame alive." }
  ];

  const [greeting, setGreeting] = useState(greetings[0]);

  // ----------------------------------------------------
  // 📥 FIREBASE DATA SYNC
  // ----------------------------------------------------
  useEffect(() => {
    // 🚨 Listen for Auth State changes to prevent infinite loading!
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !batchId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const userId = user.uid;
        
        // 1. Fetch User Progress
        const progressDoc = await getDoc(doc(db, `batches/${batchId}/user_progress`, userId));
        const completedIds = progressDoc.exists() ? progressDoc.data().completedItems || [] : [];

        // 2. Fetch Total Course Items
        let totalItems = 0;
        let firstUncompletedItem = null;

        const modulesRef = collection(db, `batches/${batchId}/module`);
        const modSnap = await getDocs(modulesRef);
        
        for (const modDoc of modSnap.docs) {
          const chaptersRef = collection(db, `batches/${batchId}/module/${modDoc.id}/chapters`);
          const chapSnap = await getDocs(chaptersRef);

          for (const chapDoc of chapSnap.docs) {
            const [lecSnap, artSnap, exSnap] = await Promise.all([
              getDocs(collection(db, `batches/${batchId}/module/${modDoc.id}/chapters/${chapDoc.id}/lectures`)),
              getDocs(collection(db, `batches/${batchId}/module/${modDoc.id}/chapters/${chapDoc.id}/articles`)),
              getDocs(collection(db, `batches/${batchId}/module/${modDoc.id}/chapters/${chapDoc.id}/exercises`))
            ]);

            const allItems = [...lecSnap.docs, ...artSnap.docs, ...exSnap.docs];
            
            // Sort items by creation time to ensure they are in the correct order
            allItems.sort((a, b) => (a.data().createdAt?.seconds || 0) - (b.data().createdAt?.seconds || 0));
            
            totalItems += allItems.length;

            // 🚨 Find the actual NEXT lesson object
            if (!firstUncompletedItem) {
              const uncompleted = allItems.find(item => !completedIds.includes(item.id));
              if (uncompleted) {
                firstUncompletedItem = { id: uncompleted.id, ...uncompleted.data() };
              }
            }
          }
        }

        // Calculate final percentage
        if (totalItems > 0) {
          setProgress(Math.round((completedIds.length / totalItems) * 100));
        }

        // Save the next lesson to state
        setNextLesson(firstUncompletedItem);

      } catch (error) {
        console.error("Failed to fetch quick stats:", error);
      } finally {
        setIsLoading(false); // Stop the spinner!
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [batchId]);

  // Greeting Randomizer
  useEffect(() => {
    const lastIndex = parseInt(localStorage.getItem('heroIndex') || '0');
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * greetings.length);
    } while (nextIndex === lastIndex && greetings.length > 1);
    setGreeting(greetings[nextIndex]);
    localStorage.setItem('heroIndex', nextIndex.toString());
  }, []);

  const handleResumeJourney = () => {
    navigate(`/lecture-viewer/${batchId}`);
  };

  // 🚨 DYNAMIC THEME CONFIG: Now uses nextLesson.title
  const themeConfig = isFirstTime ? {
    badge: "New Enrollment",
    lessonTitle: nextLesson ? nextLesson.title : "Curriculum Ready",
    cta: "Begin First Lesson",
    icon: <Rocket className="text-rose-200" size={20} />,
    gradient: "from-rose-500 via-pink-600 to-indigo-700",
    kanji: "始",
    shadow: "shadow-rose-500/10"
  } : {
    badge: "Daily Momentum",
    // If there is no next lesson, they finished the course!
    lessonTitle: nextLesson ? nextLesson.title : "Course Mastered! 🏆",
    cta: nextLesson ? "Resume Journey" : "Review Material",
    icon: <Zap className="text-yellow-200" size={20} fill="currentColor" />,
    gradient: "from-indigo-600 via-violet-600 to-blue-700",
    kanji: "進捗",
    shadow: "shadow-indigo-500/20"
  };

  return (
    <section className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={greeting.title}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
            >
              <div className="flex items-center gap-3 mb-6">
                 <div className={`h-[1.5px] w-8 ${isDarkMode ? 'bg-indigo-500/50' : 'bg-indigo-600/20'}`}></div>
                 <span className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-500">Student Overview</span>
              </div>
              
              <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1] mb-5 ${isDarkMode ? 'text-white' : 'text-[#1A202C]'}`}>
                {greeting.title}
              </h1>
              
              <p className={`text-base md:text-lg font-medium max-w-lg leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {greeting.sub}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 md:gap-8"
          >
            <StatItem icon={<Flame size={16}/>} label="Streak" value="12 Days" color="text-orange-500" />
            <div className={`hidden sm:block h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <StatItem icon={<Trophy size={16}/>} label="Rank" value="Samurai" color="text-indigo-500" />
            <div className={`hidden sm:block h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            <StatItem icon={<Target size={16}/>} label="Goal" value="80%" color="text-emerald-500" />
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -5 }}
          className={`relative w-full lg:w-[380px] h-[440px] rounded-[44px] p-8 overflow-hidden cursor-pointer group flex flex-col justify-between transition-all duration-300 shrink-0 ${themeConfig.shadow}`}
          onClick={handleResumeJourney}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${themeConfig.gradient} transition-colors duration-1000`}>
             <motion.div 
               animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute -top-16 -right-16 w-64 h-64 bg-white/20 blur-[80px] rounded-full"
             />
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="p-3 bg-white/20 backdrop-blur-3xl rounded-[20px] border border-white/30 shadow-xl">
              {themeConfig.icon}
            </div>
            <div className="px-3 py-1.5 bg-black/20 backdrop-blur-xl rounded-full border border-white/10">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                {themeConfig.badge}
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-auto mb-6">
            <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              {isLoading ? "Syncing Database..." : isFirstTime ? "Ready to Deploy" : "Continue Journey"}
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-6">
              {isLoading ? "Loading..." : themeConfig.lessonTitle}
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-white/80 uppercase">
                  {isLoading ? "Calculating..." : isFirstTime ? "Curriculum Synced" : `${progress}% Mastered`}
                </span>
              </div>
              <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isLoading ? "0%" : isFirstTime ? "20%" : `${progress}%` }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className={`h-full ${isFirstTime ? 'bg-rose-300' : 'bg-white'} rounded-full`}
                />
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full py-4.5 bg-white rounded-[22px] shadow-xl flex items-center justify-center gap-2 transition-all group/btn overflow-hidden relative"
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              ) : (
                <>
                  <PlayCircle className={isFirstTime ? 'text-rose-600' : 'text-indigo-600'} size={20} fill="currentColor" fillOpacity={0.1}/>
                  <span className={`text-base font-black tracking-tight ${isFirstTime ? 'text-rose-600' : 'text-indigo-600'}`}>
                    {themeConfig.cta}
                  </span>
                  <ChevronRight className="transition-transform group-hover/btn:translate-x-1 text-slate-400" size={16} strokeWidth={3} />
                </>
              )}
            </motion.button>
          </div>

          <div className="absolute -right-6 -bottom-12 text-[200px] font-black text-white/[0.05] select-none pointer-events-none transition-transform duration-1000 group-hover:scale-105 group-hover:-rotate-3 italic">
            {themeConfig.kanji}
          </div>
        </motion.div>

      </div>
    </section>
  );
}

function StatItem({ icon, label, value, color }) {
  const { isDarkMode } = useTheme();
  return (
    <div className="flex items-center gap-3 py-1.5 group/stat">
      <div className={`p-2.5 rounded-xl transition-all group-hover/stat:scale-105 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-white shadow-sm border border-slate-100 text-slate-500'} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}