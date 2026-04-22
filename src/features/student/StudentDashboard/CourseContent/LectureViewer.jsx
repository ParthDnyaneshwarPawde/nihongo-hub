import React, { useState, useEffect, useMemo } from 'react';
import { useStickyState } from '@hooks/useStickyState';
import { 
  ArrowLeft, MessageSquare, PlayCircle, FileText, HelpCircle, 
  ChevronDown, Download, Send, PlaySquare, CheckCircle2, Clock, 
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, 
  Check, Loader2, Lock, Sun, Moon, Sparkles, Flame, Snowflake
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { processUserActivity } from '@/utils/streakManager'; // Adjust the path if needed

import { db, auth } from '@services/firebase'; 
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, where, onSnapshot, writeBatch, increment } from 'firebase/firestore';

export default function LectureViewer() {
  const navigate = useNavigate();
  const { batchId } = useParams(); 
  const { isDarkMode, toggleTheme } = useTheme();

  const [claimedXPIds, setClaimedXPIds] = useState([]);
  const [showXpDialog, setShowXpDialog] = useState(false);
  const XP_REWARD = 20;

  // 🚨 STREAK & FREEZE STATE
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakFreezes, setStreakFreezes] = useState(0);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);

  const [isNavOpen, setIsNavOpen] = useState(window.innerWidth >= 1024);
  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth >= 1280);
  const [activeTab, setActiveTab] = useStickyState('overview', `lectureviewer-tab-${batchId}`); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [courseTitle, setCourseTitle] = useState("Loading Course...");
  const [modules, setModules] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  
  const [expandedModules, setExpandedModules] = useState(() => JSON.parse(localStorage.getItem(`expanded_modules_${batchId}`) || '[]'));
  const [expandedChapters, setExpandedChapters] = useState(() => JSON.parse(localStorage.getItem(`expanded_chapters_${batchId}`) || '[]'));
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [completedItemIds, setCompletedItemIds] = useState([]); 

  useEffect(() => {
    const fetchFullCourse = async () => {
      if (!batchId) {
        setIsLoading(false);
        setCourseTitle("Error: No Course ID provided in URL");
        return; 
      }
      setIsLoading(true);

      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/'); 
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // 🚨 LOAD INITIAL STREAK & FREEZES
        setCurrentStreak(userData.streak || 0);
        setStreakFreezes(userData.streakFreezes || 0);

        const batchDoc = await getDoc(doc(db, 'batches', batchId));
        if (!batchDoc.exists()) {
           navigate('/student-dashboard');
           return;
        }

        const batchData = batchDoc.data();
        const isFree = batchData.isFree === true || batchData.isFree === "true";
        const isEnrolled = userData.enrolledCourses?.includes(batchData.title) || userData.enrolledCourses?.includes(batchData.level) || userData.enrolledCourses?.includes(batchId);

        if (!isFree && !isEnrolled) {
           navigate('/student-dashboard'); 
           return; 
        }

        setCourseTitle(batchData.title || "Course Curriculum");

        const progressDoc = await getDoc(doc(db, `batches/${batchId}/user_progress`, user.uid));
        if (progressDoc.exists()) {
          setCompletedItemIds(progressDoc.data().completedItems || []);
          setClaimedXPIds(progressDoc.data().claimedXPIds || []);
        }

        const modSnap = await getDocs(collection(db, `batches/${batchId}/module`));
        let loadedModules = [];

        for (const modDoc of modSnap.docs) {
          const modData = modDoc.data();
          const modId = modDoc.id;

          const chapSnap = await getDocs(collection(db, `batches/${batchId}/module/${modId}/chapters`));
          let loadedChapters = [];

          for (const chapDoc of chapSnap.docs) {
            const chapData = chapDoc.data();
            const chapId = chapDoc.id;
            let items = [];

            const lecSnap = await getDocs(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/lectures`));
            lecSnap.forEach(d => items.push({ id: d.id, type: 'video', ...d.data(), modId, chapId }));

            const artSnap = await getDocs(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/articles`));
            artSnap.forEach(d => items.push({ id: d.id, type: 'article', ...d.data(), modId, chapId }));

            const exSnap = await getDocs(collection(db, `batches/${batchId}/module/${modId}/chapters/${chapId}/exercises`));
            exSnap.forEach(d => items.push({ id: d.id, type: 'quiz', ...d.data(), modId, chapId }));

            items.sort((a, b) => (a.order ?? a.createdAt?.seconds ?? 0) - (b.order ?? b.createdAt?.seconds ?? 0));

            loadedChapters.push({
              id: chapId,
              title: chapData.chapterName || chapData.title || 'Chapter',
              isLocked: chapData.isLocked ?? false, 
              order: chapData.order || 0,
              items: items
            });
          }

          loadedChapters.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          loadedModules.push({
            id: modId,
            title: modData.name || 'Module',
            isLocked: modData.isLocked ?? false,
            order: modData.order || 0,
            chapters: loadedChapters
          });
        }

        loadedModules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setModules(loadedModules);

        const savedActiveId = localStorage.getItem(`active_item_${batchId}`);
        let foundSavedItem = null;

        if (savedActiveId) {
          for (const m of loadedModules) {
            for (const c of m.chapters) {
              const match = c.items.find(i => i.id === savedActiveId);
              if (match) { foundSavedItem = match; break; }
            }
            if (foundSavedItem) break;
          }
        }

        if (foundSavedItem) {
          setActiveItem(foundSavedItem);
          if (!localStorage.getItem(`expanded_modules_${batchId}`)) {
             setExpandedModules([foundSavedItem.modId]);
             localStorage.setItem(`expanded_modules_${batchId}`, JSON.stringify([foundSavedItem.modId]));
          }
          if (!localStorage.getItem(`expanded_chapters_${batchId}`)) {
             setExpandedChapters([foundSavedItem.chapId]);
             localStorage.setItem(`expanded_chapters_${batchId}`, JSON.stringify([foundSavedItem.chapId]));
          }
        } else if (loadedModules.length > 0) {
          const firstMod = loadedModules[0];
          const firstChap = firstMod.chapters[0];
          
          if (!localStorage.getItem(`expanded_modules_${batchId}`)) {
            setExpandedModules([firstMod.id]);
            localStorage.setItem(`expanded_modules_${batchId}`, JSON.stringify([firstMod.id]));
          }
          if (firstChap && !localStorage.getItem(`expanded_chapters_${batchId}`)) {
            setExpandedChapters([firstChap.id]);
            localStorage.setItem(`expanded_chapters_${batchId}`, JSON.stringify([firstChap.id]));
          }
          if (firstChap?.items.length > 0) setActiveItem(firstChap.items[0]);
        }
      } catch (error) {
        console.error("Failed to load curriculum:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullCourse();
  }, [batchId, navigate]);

  useEffect(() => {
    if (!batchId || !activeItem?.id) return;

    setComments([]); 
    const qnaRef = collection(db, `batches/${batchId}/qna`);
    const q = query(qnaRef, where('itemId', '==', activeItem.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedComments = [];
      
      snapshot.forEach(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' }); 
        
        if (data.itemId === activeItem.id) {
          let timeString = "Just now";
          let timestampVal = 0;

          if (data.createdAt) {
            const date = data.createdAt.toDate();
            timeString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            timestampVal = date.getTime();
          }

          fetchedComments.push({ id: doc.id, ...data, time: timeString, _sortTime: timestampVal });
        }
      });

      fetchedComments.sort((a, b) => b._sortTime - a._sortTime);
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [batchId, activeItem?.id]);


  const handleSendMessage = async () => {
    if (!newComment.trim() || !activeItem) return;
    const userId = auth.currentUser?.uid || "guest";
    const userName = auth.currentUser?.displayName || "Student";
    
    try {
      await addDoc(collection(db, `batches/${batchId}/qna`), {
        itemId: activeItem.id,
        text: newComment.trim(),
        user: userName,
        avatar: userName.charAt(0).toUpperCase(),
        userId: userId,
        isTeacher: false, 
        likes: 0,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  // 🚨 UPGRADED STREAK COMPLETION FUNCTION (NOW WITH FREEZES)
  const toggleCompletion = async () => {
    if (!activeItem || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    const isCurrentlyCompleted = completedItemIds.includes(activeItem.id);
    const hasAlreadyClaimedXP = (claimedXPIds || []).includes(activeItem.id);

    let updatedCompletedIds;
    if (isCurrentlyCompleted) {
      updatedCompletedIds = completedItemIds.filter(id => id !== activeItem.id);
    } else {
      updatedCompletedIds = Array.from(new Set([...completedItemIds, activeItem.id]));
    }
    
    const shouldGrantXP = !isCurrentlyCompleted && !hasAlreadyClaimedXP;
    
    let updatedClaimedXPIds = (claimedXPIds || []);
    if (shouldGrantXP) {
      updatedClaimedXPIds = Array.from(new Set([...updatedClaimedXPIds, activeItem.id]));
    }

    // Update local UI immediately for a snappy experience
    setCompletedItemIds(updatedCompletedIds);
    if (shouldGrantXP) setClaimedXPIds(updatedClaimedXPIds);

    try {
      const batch = writeBatch(db);
      const progressRef = doc(db, `batches/${batchId}/user_progress`, userId);

      // 🚨 1. LET THE STREAK MANAGER HANDLE THE HEAVY LIFTING
      if (shouldGrantXP) {
        // This single line replaces all the Calendar math, freeze checking, and XP updating!
        const result = await processUserActivity(XP_REWARD);
        
        if (result.success) {
          // Update the badges in the header
          setCurrentStreak(result.newStreak);
          setStreakFreezes(result.newFreezes);
          
          if (result.streakUpdated) {
            setShowStreakAnimation(true);
            setTimeout(() => setShowStreakAnimation(false), 3000);
          }
        }
      }

      // 🚨 2. SAVE THE COURSE PROGRESS
      batch.set(progressRef, { 
        completedItems: updatedCompletedIds,
        claimedXPIds: updatedClaimedXPIds,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      await batch.commit();
      
      // Trigger the success modal
      if (shouldGrantXP) {
        setShowXpDialog(true);
      }

    } catch (err) {
      console.error("Failed to save progress:", err);
      // Revert the UI if Firebase fails
      setCompletedItemIds(completedItemIds);
      if (shouldGrantXP) setClaimedXPIds(claimedXPIds || []);
    }
  };

  const courseProgress = useMemo(() => {
    let totalItems = 0;
    const allCourseItemIds = new Set(); 

    modules.forEach(mod => {
      mod.chapters.forEach(chap => {
        if (chap.items) {
          totalItems += chap.items.length;
          chap.items.forEach(item => allCourseItemIds.add(item.id));
        }
      });
    });

    if (totalItems === 0) return 0;

    const validCompletions = completedItemIds.filter(id => allCourseItemIds.has(id));
    const uniqueCompletedCount = new Set(validCompletions).size;

    const progress = Math.round((uniqueCompletedCount / totalItems) * 100);
    return Math.min(progress, 100); 
  }, [modules, completedItemIds]);

  const videoData = useMemo(() => {
    if (activeItem?.type !== 'video') return null;
    const rawLink = (activeItem.vimeoLink || activeItem.mediaUrl || '').trim();
    if (!rawLink) return { type: 'none', url: null };

    const ytMatch = rawLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    if (ytMatch && ytMatch[1]) return { type: 'youtube', id: ytMatch[1] };
    
    const vimeoMatch = rawLink.match(/(?:vimeo\.com\/|video\/)(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) return { type: 'vimeo', id: vimeoMatch[1] };
    
    if (rawLink.endsWith('.mp4') || rawLink.endsWith('.webm')) return { type: 'raw', url: rawLink };

    return { type: 'unknown', url: rawLink };
  }, [activeItem]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { setIsNavOpen(false); setIsChatOpen(false); }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleModule = (id) => {
    setExpandedModules(prev => {
      const next = prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id];
      localStorage.setItem(`expanded_modules_${batchId}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleChapter = (id) => {
    setExpandedChapters(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      localStorage.setItem(`expanded_chapters_${batchId}`, JSON.stringify(next));
      return next;
    });
  };

  const handleItemClick = (item) => {
    setActiveItem(item);
    localStorage.setItem(`active_item_${batchId}`, item.id);
    if (window.innerWidth < 1024) setIsNavOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`h-screen w-full flex flex-col items-center justify-center font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#0B1121] text-indigo-500' : 'bg-slate-50 text-indigo-600'}`}>
        <Loader2 size={40} className="animate-spin mb-4" />
        Decrypting Curriculum...
      </div>
    );
  }

  const renderNavigation = () => (
    <>
      {isNavOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsNavOpen(false)} />}
      
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 flex shrink-0 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${isNavOpen ? 'translate-x-0 lg:w-[320px]' : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
        
        <div className={`w-[300px] lg:w-[320px] h-full flex flex-col border-r shrink-0 ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-sm z-10'}`}>
          <div className={`p-6 border-b shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100/80 bg-gradient-to-b from-slate-50/50 to-transparent'}`}>
            <h2 className={`font-black text-lg mb-2 truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{courseTitle}</h2>
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200/80 shadow-inner'}`}>
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${courseProgress}%` }}></div>
              </div>
              <span className={`text-xs font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{courseProgress}%</span>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDarkMode ? '' : 'bg-slate-50/20'}`}>
            {modules.map((mod, modIdx) => {
              const isModLocked = mod.isLocked;

              return (
              <div key={mod.id} className={`border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                
                <button 
                  onClick={() => !isModLocked && toggleModule(mod.id)} 
                  className={`w-full p-4 flex items-center justify-between transition-colors 
                    ${isModLocked ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-indigo-50/30 bg-transparent'}`}
                >
                  <div className="text-left flex items-center gap-3">
                    {isModLocked && <Lock size={16} className="text-rose-500" />}
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-indigo-500' : 'text-indigo-600'}`}>Section {modIdx + 1}</span>
                      <h3 className={`font-bold text-sm mt-0.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{mod.title}</h3>
                    </div>
                  </div>
                  {!isModLocked && <ChevronDown size={18} className={`transition-transform duration-300 ${expandedModules.includes(mod.id) ? 'rotate-180 text-indigo-500' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} />}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedModules.includes(mod.id) ? 'max-h-[1500px]' : 'max-h-0'}`}>
                  <div className={`pb-2 ${isDarkMode ? 'bg-black/20' : 'bg-slate-50/50 shadow-inner'}`}>
                    
                    {mod.chapters.map((chap, chapIdx) => {
                      const isChapLocked = isModLocked || chap.isLocked;

                      return (
                        <div key={chap.id} className="w-full">
                          
                          <button 
                            onClick={() => !isChapLocked && toggleChapter(chap.id)} 
                            className={`w-full py-3 px-4 pl-6 flex items-center justify-between transition-colors border-l-2 border-transparent
                              ${isChapLocked ? 'opacity-50 cursor-not-allowed' : isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/20'}`}
                          >
                            <div className="text-left flex items-center gap-2">
                              {isChapLocked && <Lock size={14} className="text-rose-500" />}
                              <div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Chapter {chapIdx + 1}</span>
                                <h4 className={`font-bold text-xs mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{chap.title}</h4>
                              </div>
                            </div>
                            {!isChapLocked && <ChevronDown size={16} className={`transition-transform duration-300 ${expandedChapters.includes(chap.id) ? 'rotate-180 text-indigo-400' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')}`} />}
                          </button>

                          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedChapters.includes(chap.id) ? 'max-h-[800px]' : 'max-h-0'}`}>
                            <div className={`pb-2 pt-1 ${isDarkMode ? 'bg-black/40' : 'bg-slate-100/30 border-y border-slate-100/50'}`}>
                              {chap.items.map(item => {
                                const isActive = activeItem?.id === item.id;
                                const isComplete = completedItemIds.includes(item.id);
                                const isItemLocked = isChapLocked || item.isLocked;

                                return (
                                  <button 
                                    key={item.id} 
                                    onClick={() => { if (!isItemLocked) handleItemClick(item); }}
                                    disabled={isItemLocked}
                                    className={`w-full p-2.5 pl-8 flex items-start gap-3 transition-all text-left
                                      ${isItemLocked ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                                      ${isActive ? (isDarkMode ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'bg-gradient-to-r from-indigo-50 to-white border-l-4 border-indigo-600 shadow-sm') : 'border-l-4 border-transparent hover:bg-slate-800/20 dark:hover:bg-slate-800/30 hover:border-slate-200 dark:hover:border-transparent'}`}
                                  >
                                    <div className="mt-0.5 shrink-0 transition-colors">
                                      {isItemLocked ? <Lock size={14} className="text-rose-500" />
                                        : isComplete ? <CheckCircle2 size={14} className="text-emerald-500" />
                                        : item.type === 'video' ? <PlaySquare size={14} className={isActive ? 'text-indigo-600' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                                        : item.type === 'article' ? <FileText size={14} className={isActive ? 'text-indigo-600' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                                        : <HelpCircle size={14} className={isActive ? 'text-indigo-600' : (isDarkMode ? 'text-slate-600' : 'text-slate-400')} />
                                      }
                                    </div>
                                    <div>
                                      <p className={`text-xs font-bold leading-tight transition-colors ${isActive ? (isDarkMode ? 'text-indigo-300' : 'text-indigo-900') : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}`}>{item.title}</p>
                                      <p className={`text-[8px] font-black mt-1 uppercase tracking-widest ${isActive ? (isDarkMode ? 'text-indigo-500/70' : 'text-indigo-500') : (isDarkMode ? 'text-slate-600' : 'text-slate-400')}`}>
                                        {isItemLocked ? 'LOCKED' : `${item.type} • ${item.duration || 'N/A'}`}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </aside>
    </>
  );

  const renderChat = () => (
    <>
      {isChatOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsChatOpen(false)} />}
      
      <aside className={`fixed lg:relative inset-y-0 right-0 z-50 flex shrink-0 transition-all duration-300 ease-in-out shadow-[-20px_0_40px_rgba(0,0,0,0.1)] lg:shadow-none
        ${isChatOpen ? 'translate-x-0 lg:w-[320px]' : 'translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}`}>
        
        <div className={`w-[300px] lg:w-[320px] h-full flex flex-col border-l shrink-0 ${isDarkMode ? 'bg-[#0B1121] border-slate-800' : 'bg-white/90 backdrop-blur-2xl border-slate-200/60 shadow-[-10px_0_40px_rgba(0,0,0,0.04)]'}`}>
          <div className={`h-16 p-4 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-100/50 bg-gradient-to-r from-slate-50 to-white'}`}>
            <div className={`flex flex-col gap-0.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              <div className="font-black flex items-center gap-2 text-sm">
                <MessageSquare size={16} className="text-indigo-500"/> Class Q&A
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest truncate max-w-[200px] ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                {activeItem ? activeItem.title : 'Loading...'}
              </span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
              <PanelRightClose size={20}/>
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar ${isDarkMode ? '' : 'bg-transparent'}`}>
            {comments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-sm tracking-wide">Be the first to ask a question!</div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black text-white shadow-sm
                      ${comment.isTeacher ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
                      {comment.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${comment.isTeacher ? 'text-rose-500 dark:text-rose-400' : isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{comment.user}</span>
                        {comment.isTeacher && <span className="text-[8px] bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Sensei</span>}
                        <span className="text-[9px] font-bold text-slate-400">{comment.time}</span>
                      </div>
                      <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-slate-800 bg-[#151E2E]' : 'border-slate-100 bg-white/50'}`}>
            <div className={`relative flex items-center p-2 rounded-2xl border focus-within:border-indigo-500 transition-all shadow-sm
              ${isDarkMode ? 'bg-[#0B1121] border-slate-700' : 'bg-white border-slate-200 focus-within:shadow-md'}`}>
              <input 
                type="text" placeholder="Ask a question..." 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`flex-1 bg-transparent border-none outline-none px-2 text-sm font-medium placeholder:text-slate-400 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
              />
              <button onClick={handleSendMessage} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${newComment ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-600/20 active:scale-95' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  const renderMainContent = () => {
    if (!activeItem || modules.length === 0) {
      return (
        <main className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 ${isDarkMode ? 'bg-[#0B1121]' : 'bg-[#FAFAFA]'}`}>
          <div className="relative mb-8">
            <div className={`absolute inset-0 blur-3xl rounded-full ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}></div>
            <div className={`relative p-8 rounded-[2.5rem] border backdrop-blur-xl transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
              <PlaySquare size={64} className="text-indigo-500 animate-pulse" />
            </div>
          </div>
          <h2 className={`text-3xl font-black mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Curriculum Empty
          </h2>
          <p className={`max-w-md text-lg mb-10 leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            This course doesn't have any lessons uploaded yet. Check back soon for updates!
          </p>
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="group flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-600/25 active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>
        </main>
      );
    }

    const isComplete = completedItemIds.includes(activeItem.id);

    return (
      <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#0B1121]' : 'bg-[#FAFAFA]'}`}>
        <header className={`h-16 px-4 lg:px-6 shrink-0 flex items-center justify-between border-b z-10 transition-colors ${isDarkMode ? 'bg-[#151E2E] border-slate-800' : 'bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsNavOpen(!isNavOpen)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
              {isNavOpen ? <PanelLeftClose size={20}/> : <PanelLeftOpen size={20}/>}
            </button>
            <div className={`h-4 w-px mx-1 hidden sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <button onClick={() => navigate('/student-dashboard')} className={`text-xs font-black uppercase tracking-widest hidden sm:flex items-center gap-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}>
              <ArrowLeft size={14}/> Dashboard
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 🚨 STREAK FREEZE BADGE */}
            {streakFreezes > 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black transition-all duration-500
                ${isDarkMode ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' : 'bg-sky-50 text-sky-600 border-sky-200'}
              `}>
                <Snowflake size={16} />
                <span>{streakFreezes}</span>
              </div>
            )}

            {/* 🚨 THE STREAK BADGE */}
            {currentStreak > 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black transition-all duration-500
                ${showStreakAnimation ? 'bg-orange-500 text-white border-orange-500 scale-110 shadow-lg shadow-orange-500/30' : 
                isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'}
              `}>
                <Flame size={16} className={showStreakAnimation ? 'animate-bounce' : ''} />
                <span>{currentStreak}</span>
              </div>
            )}
            
            <button onClick={toggleTheme} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-xl transition-colors flex items-center gap-2 ${isChatOpen ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : (isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900')}`}>
              {isChatOpen ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}
              <span className="text-xs font-bold hidden sm:inline">Q&A</span>
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#0B1121]' : 'bg-transparent'}`}>
          <div className={`w-full border-b ${isDarkMode ? 'bg-black border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'}`}>
            <div className="max-w-6xl mx-auto aspect-video relative flex items-center justify-center group overflow-hidden bg-black">
              
              {activeItem.type === 'video' ? (
                <div className="w-full h-full bg-black relative flex items-center justify-center shadow-inner">
                  {videoData?.type === 'youtube' && <iframe src={`https://www.youtube.com/embed/${videoData.id}?rel=0&modestbranding=1`} className="absolute top-0 left-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={activeItem.title}></iframe>}
                  {videoData?.type === 'vimeo' && <iframe src={`https://player.vimeo.com/video/${videoData.id}?color=4f46e5&title=0&byline=0&portrait=0`} className="absolute top-0 left-0 w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={activeItem.title}></iframe>}
                  {videoData?.type === 'raw' && <video src={videoData.url} controls className="absolute top-0 left-0 w-full h-full object-contain bg-black"/>}
                  {(!videoData || videoData.type === 'none' || videoData.type === 'unknown') && (
                    <div className="flex flex-col items-center justify-center text-slate-500 space-y-4 p-6 text-center">
                      <PlaySquare size={48} className="opacity-40" />
                      <div>
                        <p className={`font-black tracking-widest uppercase text-xs ${isDarkMode ? 'text-white/80' : 'text-white/80'}`}>Video Source Unavailable</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeItem.type === 'quiz' ? (
                <div className={`text-center p-8 z-10 w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#151E2E]' : 'bg-gradient-to-br from-indigo-50 via-white to-rose-50'}`}>
                  <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-3 shadow-sm ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-white border border-rose-100 text-rose-500 shadow-rose-500/10'}`}>
                    <HelpCircle size={48} className="-rotate-3" />
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{activeItem.title}</h2>
                  <p className={`font-medium mb-10 max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>This is a mandatory checkpoint. You must score 80% to unlock the next chapter.</p>
                  <button onClick={() => navigate(`/test-engine/${batchId}/${activeItem.modId}/${activeItem.chapId}/${activeItem.id}`)} className="px-10 py-4.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-black rounded-2xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center mx-auto gap-3">
                    Launch Exam Engine <PlayCircle size={20}/>
                  </button>
                </div>
              ) : (
                <div className={`w-full h-full p-6 md:p-12 overflow-y-auto custom-scrollbar relative z-10 ${isDarkMode ? 'bg-[#151E2E]' : 'bg-white'}`}>
                  <div className="max-w-3xl mx-auto space-y-6">
                    <h1 className={`text-3xl md:text-4xl font-black leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeItem.title}</h1>
                    
                    <div className={`prose max-w-none ${isDarkMode ? 'prose-invert text-slate-300' : 'text-slate-700'}`}>
                      {activeItem.content ? (
                        <div dangerouslySetInnerHTML={{ __html: activeItem.content }} />
                      ) : (
                        <div className={`py-20 text-center border-2 border-dashed rounded-3xl ${isDarkMode ? 'border-slate-700 bg-transparent' : 'border-slate-200 bg-slate-50/50'}`}>
                          <FileText size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`} />
                          <p className={`font-black uppercase tracking-widest text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No Content Provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-6xl mx-auto p-6 md:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black mb-2 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{activeItem.title}</h1>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-indigo-600'}`}>{activeItem.type}</span>
                  <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}><Clock size={14}/> {activeItem.duration || 'N/A'}</span>
                </div>
              </div>
              
              <button 
                onClick={toggleCompletion}
                className={`shrink-0 w-full md:w-auto px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95
                  ${isComplete
                    ? (isDarkMode 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100')
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
              >
                {isComplete ? (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Mark as Complete</span>
                  </>
                )}
              </button>
            </div>
            
            <div className={`flex border-b mb-8 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button onClick={() => setActiveTab('overview')} className={`pb-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-400'}`}>Overview</button>
              <button onClick={() => setActiveTab('resources')} className={`pb-4 px-6 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'resources' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-400'}`}>
                Resources <span className={`px-2 py-0.5 rounded text-[10px] ${activeTab === 'resources' ? 'bg-indigo-500/20' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-100')}`}>{activeItem.resources?.length || 0}</span>
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <p className={`font-medium leading-relaxed max-w-3xl text-lg ${isDarkMode ? 'text-slate-300' : 'text-slate-600 whitespace-pre-wrap'}`}>
                  {activeItem.description || "No overview provided for this lesson."}
                </p>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl animate-in fade-in slide-in-from-bottom-4">
                {activeItem.resources && activeItem.resources.length > 0 ? (
                  activeItem.resources.map(res => (
                    <div key={res.name} className={`p-5 rounded-[1.5rem] border flex items-center justify-between group cursor-pointer transition-all hover:-translate-y-1 shadow-sm ${isDarkMode ? 'bg-[#151E2E] border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-500/10' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-indigo-500/5'}`}>
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}><FileText size={20} /></div>
                        <div className="truncate">
                          <h4 className={`font-bold text-sm truncate transition-colors ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-indigo-700'}`}>{res.name}</h4>
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{res.size || "Resource"}</p>
                        </div>
                      </div>
                      <button className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}><Download size={18} /></button>
                    </div>
                  ))
                ) : (
                  <p className={`col-span-full py-12 font-black uppercase tracking-widest text-xs text-center ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>No resources attached to this lesson.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className={`h-screen w-full flex overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'bg-[#0B1121] text-slate-200' : 'bg-[#FAFAFA] text-slate-800'}`}>
      {renderNavigation()}
      {renderMainContent()}
      {renderChat()}
      <AnimatePresence>
        {showXpDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowXpDialog(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative max-w-sm w-full p-8 rounded-[2.5rem] shadow-2xl text-center border ${
                isDarkMode ? 'bg-[#151E2E] border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Sparkles size={40} className="animate-pulse" />
              </div>

              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Lecture Mastered!
              </h2>
              <p className="text-sm text-slate-500 font-bold mb-8 uppercase tracking-widest">
                Content Completed Successfully
              </p>

              <div className={`py-4 rounded-2xl mb-8 flex flex-col items-center justify-center ${
                isDarkMode ? 'bg-[#0B1121]' : 'bg-slate-50'
              }`}>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">XP Reward</span>
                <span className="text-4xl font-black text-indigo-500">+{XP_REWARD}</span>
              </div>

              <button 
                onClick={() => setShowXpDialog(false)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Got it, Sensei!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}