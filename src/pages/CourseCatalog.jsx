import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Lock, Zap, Shield, X,
  ChevronRight, Loader2, Search, Tag, Sparkles, Moon, Sun, Globe, Users,
  Calendar, ExternalLink, MessageCircle, Copy, Layout, AlertTriangle, Receipt, 
  CreditCard, Clock, Info, Check  
} from 'lucide-react';
import { collection, setDoc, onSnapshot, arrayRemove, doc, deleteDoc, getDoc, query, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function CourseCatalog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // --- 1. Global & Data States ---
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userEnrollments, setUserEnrollments] = useState([]);

  // --- 2. Strict View Machine (Prevents modal overlaps) ---
  const [activeView, setActiveView] = useState('CATALOG');
  const [activeCourse, setActiveCourse] = useState(null);



  // --- 3. Interaction & Transaction States ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  
  // 🚨 NEW: Danger Zone State
  const [deEnrollInput, setDeEnrollInput] = useState('');

  // 🚨 NEW: Execute the Abandon Protocol
 // You will need to import deleteDoc at the top of your file if you haven't already!
  // import { collection, setDoc, onSnapshot, arrayRemove, doc, getDoc, query, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';

  const executeDeEnroll = async () => {
    // Double check that they typed their name exactly right
    if (deEnrollInput !== auth.currentUser?.displayName) return;
    
    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      // 1. Remove the course from their database array
      await updateDoc(userRef, { enrolledCourses: arrayRemove(activeCourse.title) });
      
      // 2. 🚨 NEW: Remove them from the teacher's roster
      await deleteDoc(doc(db, "enrollmentRequests", `${auth.currentUser.uid}_${activeCourse.id}`));
      
      // Instantly update the local UI so they don't have to refresh
      setUserEnrollments(prev => prev.filter(course => course !== activeCourse.title));
      closeModals(); // Close the modal completely
    } catch (error) {
      console.error(error);
      alert("Error executing drop protocol.");
    } finally {
      setIsProcessing(false);
    }
  };

  

  const orderReference = useMemo(() => `NH-${Math.floor(100000 + Math.random() * 900000)}`, [activeCourse]);

  useEffect(() => {
  const params = new URLSearchParams(location.search);
  const filterParam = params.get('filter');
  
  if (filterParam === 'free') setActiveFilter('FREE');
  if (filterParam === 'premium') setActiveFilter('PREMIUM');
}, [location]);

const filteredBatches = useMemo(() => {
  return batches.filter(batch => {
    const matchesSearch = batch.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeFilter === 'ALL' ? true :
      activeFilter === 'FREE' ? batch.isFree === true :
      activeFilter === 'PREMIUM' ? batch.isFree === false : true;
      
    return matchesSearch && matchesTab;
  });
}, [batches, searchQuery, activeFilter]);

  // --- 4. Initialization & Firebase Sync ---
  useEffect(() => {
    document.body.style.overflow = activeView !== 'CATALOG' ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [activeView]);

  useEffect(() => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists()) setUserEnrollments(snap.data().enrolledCourses || []);
      });
    }

    const q = query(collection(db, 'batches'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBatches(fetched.filter(b => !b.isSystem));
      setLoading(false);
    }, (error) => {
      console.error("Catalog fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 5. Core Business Logic ---
  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return setCouponError("Please enter a code.");
    if (!activeCourse?.coupons || activeCourse.coupons.length === 0) return setCouponError("No active promotions for this course.");
    
    const coupon = activeCourse.coupons.find(c => c.code === couponCode.trim().toUpperCase());
    if (!coupon) return setCouponError("Invalid promotion code.");
    if (coupon.usedCount >= coupon.maxUses) return setCouponError("This code has reached its usage limit.");
    
    setAppliedCoupon(coupon);
    setCouponCode('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const calculatePrice = () => {
    const base = parseFloat(activeCourse?.price || 0);
    if (!appliedCoupon) return base;
    return Math.max(0, base - (base * (parseFloat(appliedCoupon.discount) / 100)));
  };

  const executeBurnProtocol = async () => {
    if (!appliedCoupon || !activeCourse) return;
    try {
      const batchRef = doc(db, 'batches', activeCourse.id);
      const updatedCoupons = activeCourse.coupons.map(c => 
        c.code === appliedCoupon.code 
          ? { ...c, usedCount: (parseInt(c.usedCount) || 0) + 1 } 
          : c
      );
      await updateDoc(batchRef, { coupons: updatedCoupons });
    } catch (error) { 
      console.error("Critical: Burn Protocol failed", error); 
    }
  };

const handleFinalEnrollment = async () => {
    const finalPrice = calculatePrice();
    
    // 🚨 UPDATED LOGIC: If course is free OR price became 0 via coupon
    if (activeCourse.isFree || finalPrice === 0) {
       setIsProcessing(true);
       try {
         const userRef = doc(db, "users", auth.currentUser.uid);
         
         // Give the student access in their profile (Sync both Title and ID)
         await updateDoc(userRef, { 
           enrolledCourses: arrayUnion(activeCourse.title),
           enrolledCourseIds: arrayUnion(activeCourse.id) // 🚨 Ensure IDs are synced too
         });

         // Create/Update the record for the Teacher's Roster (in case not created in step 1)
         const requestRef = doc(db, "enrollmentRequests", `${auth.currentUser.uid}_${activeCourse.id}`);
         await setDoc(requestRef, {
           studentUid: auth.currentUser.uid,
           studentName: auth.currentUser.displayName || "Anonymous Student",
           studentEmail: auth.currentUser.email,
           courseId: activeCourse.id,
           courseTitle: activeCourse.title,
           courseLevel: activeCourse.level,
           orderRef: activeCourse.isFree ? "FREE_ACCESS" : "COUPON_100",
           amountDue: 0,
           status: 'APPROVED', 
           timestamp: new Date().toISOString(),
           joinedAt: new Date().toLocaleDateString(),
           appliedCoupon: appliedCoupon ? appliedCoupon.code : null
         }, { merge: true });

         alert("🎉 Mastery Granted! Your course is now unlocked.");
         navigate('/student-dashboard');
       } catch (e) {
         console.error(e);
         alert("Error joining course.");
       } finally {
         setIsProcessing(false);
       }
       return;
    }

    // For PAID courses that are still > 0, just close and wait for teacher
    alert("Request Sent! Once Sensei verifies your payment, the course will appear in your dashboard.");
    closeModals();
    navigate('/student-dashboard');
  };

  // --- 6. View Transition Handlers ---
  const closeModals = () => {
    setActiveView('CATALOG');
    setActiveCourse(null);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleInitialCheckoutRequest = () => {
    if (activeCourse.isFree) {
      handleFinalEnrollment(); 
      return;
    }
    setActiveView('CONFIRM');
  };

  const handleConfirmationAccept = async () => {
    setIsProcessing(true);
    const finalPrice = calculatePrice();
    const isAutoApproved = finalPrice === 0; // 🚨 Check if it's free now
    
    try {
      // Create the Enrollment Request for the Teacher Roster
      const requestRef = doc(db, "enrollmentRequests", `${auth.currentUser.uid}_${activeCourse.id}`);
      
      await setDoc(requestRef, {
        studentUid: auth.currentUser.uid,
        studentName: auth.currentUser.displayName || "Anonymous Student",
        studentEmail: auth.currentUser.email,
        courseId: activeCourse.id,
        courseTitle: activeCourse.title,
        courseLevel: activeCourse.level,
        orderRef: isAutoApproved ? "COUPON_FREE" : orderReference, // 🚨 Custom ref for free
        amountDue: finalPrice,
        status: isAutoApproved ? 'APPROVED' : 'PENDING', // 🚨 AUTO-APPROVE IF 0
        timestamp: new Date().toISOString(),
        joinedAt: isAutoApproved ? new Date().toLocaleDateString() : null, // 🚨 Set join date
        appliedCoupon: appliedCoupon ? appliedCoupon.code : null
      });

      // Burn the coupon if one was used
      if (appliedCoupon) {
        await executeBurnProtocol();
      }

      setIsProcessing(false);
      
      // Route to Success if 0, otherwise show UPI Checkout
      if (isAutoApproved) {
        setActiveView('SUCCESS'); 
      } else {
        setActiveView('CHECKOUT');
      }
      
    } catch (error) {
      console.error("Roster Sync Error:", error);
      alert("System could not sync with Roster. Please try again.");
      setIsProcessing(false);
    }
  };

  // --- 7. Theme Variables ---
  const theme = {
    bg: isDarkMode ? 'bg-[#09090b]' : 'bg-[#FAFAFA]',
    text: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    card: isDarkMode ? 'bg-[#121214]' : 'bg-white',
    cardHover: isDarkMode ? 'hover:bg-[#1c1c1f]' : 'hover:bg-zinc-50',
    border: isDarkMode ? 'border-white/5' : 'border-zinc-200',
    input: isDarkMode ? 'bg-[#09090b] border-white/10 text-white' : 'bg-white border-zinc-300 text-zinc-900',
    modalOverlay: 'bg-black/80 backdrop-blur-md',
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${theme.bg} ${theme.text}`}>
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
        <span className="font-bold text-xs tracking-widest uppercase text-indigo-500">Loading Academy Vault...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      
      {/* Abstract Backgrounds */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[140px] rounded-full pointer-events-none" />

      {/* --- NAVBAR --- */}
      <nav className={`sticky top-0 z-40 border-b ${theme.border} backdrop-blur-xl ${isDarkMode ? 'bg-[#09090b]/80' : 'bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <button onClick={() => navigate('/student-dashboard')} className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit Vault</span>
          </button>
          <div className="font-black tracking-tight text-lg sm:text-xl flex items-center gap-2 italic">
            Nihongo Hub <span className="text-indigo-500">Pro</span>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl transition-colors border ${theme.border} ${isDarkMode ? 'hover:bg-white/10 text-yellow-400 bg-white/5' : 'hover:bg-gray-50 text-indigo-600 bg-white'}`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      {/* --- VIEW: CATALOG --- */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 relative z-10 transition-all duration-500 ${activeView !== 'CATALOG' ? 'scale-[0.98] opacity-40 blur-md pointer-events-none' : 'scale-100 opacity-100'}`}>
        
        <header className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8 mb-12 sm:mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 shadow-inner">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.3em]">Premium Curriculum</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05]">
            Master <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-blue-600">Japanese.</span>
          </h1>
          <p className={`text-base sm:text-lg font-medium leading-relaxed max-w-2xl mx-auto ${theme.textMuted}`}>
            Secure your seat in our elite learning paths. Lifetime access, verified instructors, and comprehensive mastery.
          </p>
          
          <div className={`relative max-w-xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border shadow-2xl transition-all focus-within:ring-4 focus-within:ring-indigo-500/20 ${theme.card} ${theme.border}`}>
            <Search size={22} className={`${theme.textMuted} shrink-0`} />
            <input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search for your next mastery (e.g., N4)..." 
              className={`bg-transparent outline-none w-full font-bold text-xs sm:text-sm ${theme.text}`} 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1.5 rounded-lg hover:bg-zinc-500/20 transition-colors shrink-0">
                <X size={14} className={theme.textMuted} />
              </button>
            )}
          </div>
          
          {/* --- FILTER TABS --- */}
          <div className="flex flex-wrap justify-center items-center gap-2 mb-12">
            {['ALL', 'PREMIUM', 'FREE'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border
                  ${activeFilter === tab 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105' 
                    : `${theme.card} ${theme.border} ${theme.textMuted} hover:border-indigo-500/50`
                  }`}
              >
                {tab === 'PREMIUM' ? '💎 Premium' : tab === 'FREE' ? '🍃 Free' : 'All Courses'}
              </button>
            ))}
          </div>
        </header>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          {filteredBatches.map((batch, idx) => {
            const isEnrolled = userEnrollments.includes(batch.title);
            return (
              <div 
                key={batch.id} 
                onClick={() => { setActiveCourse(batch); setActiveView('DETAIL'); }} 
                className={`group flex flex-col rounded-[2rem] sm:rounded-[2.5rem] border transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 ${theme.card} ${theme.border}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="h-48 sm:h-64 lg:h-72 relative overflow-hidden bg-zinc-900 border-b border-white/5">
                  <img src={batch.bannerURL || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200'} alt={batch.title} className="w-full h-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 flex flex-col items-start gap-3 sm:gap-4">
                     <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full shadow-xl">
                       {batch.level}
                     </span>
                     <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">{batch.title}</h3>
                  </div>
                </div>
                <div className="p-6 sm:p-8 lg:p-10 flex flex-col flex-1">
                   <p className={`text-xs sm:text-sm font-medium leading-relaxed line-clamp-2 mb-6 sm:mb-8 italic ${theme.textMuted}`}>
                     "{batch.description}"
                   </p>
                   <div className={`mt-auto pt-5 sm:pt-6 border-t flex items-end justify-between ${theme.border}`}>
                     
                     {/* 🚨 UPDATED GRID PRICE AREA */}
                     {isEnrolled ? (
                       <div>
                           <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-1.5 text-emerald-500">Status</p>
                           <p className="text-2xl sm:text-3xl font-black tracking-tighter text-emerald-500">ENROLLED</p>
                       </div>
                     ) : (
                       <div>
                           <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 sm:mb-1.5 ${theme.textMuted}`}>Investment</p>
                           <p className="text-2xl sm:text-3xl font-black tracking-tighter">
                             {batch.isFree ? <span className="text-emerald-500">FREE</span> : `₹${batch.price}`}
                           </p>
                       </div>
                     )}
                     
                     {/* 🚨 UPDATED GRID ARROW/CHECK */}
                     <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.2rem] flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${isEnrolled ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-indigo-600 shadow-indigo-600/30 group-hover:rotate-12'}`}>
                       {isEnrolled ? <Check size={20} className="sm:w-6 sm:h-6" /> : <ChevronRight size={20} className="sm:w-6 sm:h-6" />}
                     </div>
                   </div>
                </div>
              </div>
            );
          })}
          {batches.length === 0 && !loading && (
             <div className={`col-span-full py-20 sm:py-32 text-center rounded-[2rem] sm:rounded-[3rem] border border-dashed ${theme.border}`}>
                <p className={`text-base sm:text-lg font-bold ${theme.textMuted}`}>No curriculums available in the vault yet.</p>
             </div>
          )}
        </div>
      </main>

      {/* ============================================================================ */}
      {/* MODAL SYSTEM */}
      {/* ============================================================================ */}
      
      {activeView !== 'CATALOG' && (
  <div className={`fixed inset-0 z-[100] flex items-start justify-center p-4 lg:p-8 pt-10 sm:pt-16 lg:pt-24 ${theme.modalOverlay} animate-in fade-in duration-200 overflow-y-auto hide-scrollbar`}>          
          {/* -------------------------------------------------- */}
          {/* VIEW: COURSE DETAILS */}
          {/* -------------------------------------------------- */}
          {activeView === 'DETAIL' && activeCourse && (() => {
            const isCurrentlyEnrolled = userEnrollments.includes(activeCourse.title);
            
            // 🚨 COLLAB TEXT FORMATTER FOR MODAL
            const teachers = activeCourse.teacherNames || ["Unknown Sensei"];
            const leadSensei = teachers[0];
            const collabs = teachers.slice(1);
            let collabText = "";
            if (collabs.length > 0) {
              const visibleCollabs = collabs.slice(0, 2);
              const extraCount = collabs.length - 2;
              collabText = visibleCollabs.join(', ') + (extraCount > 0 ? ` & +${extraCount}` : '');
            }

            return (
              <div className={`w-full max-w-7xl relative flex flex-col lg:flex-row rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border animate-in zoom-in-95 duration-300 ${theme.card} ${theme.border}`}>
                
                <button onClick={closeModals} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 sm:p-3 bg-black/20 hover:bg-rose-500/90 text-white rounded-full backdrop-blur-xl transition-all border border-white/10 shadow-2xl">
                    <X size={20} className="sm:w-5 sm:h-5 w-4 h-4"/>
                </button>

                {/* Detail Content Pane (Left) */}
                <div className="flex-1 lg:overflow-y-auto lg:max-h-[90vh] hide-scrollbar pb-10 sm:pb-20 relative">
                  <div className="absolute top-10 left-0 text-[200px] sm:text-[300px] font-black opacity-[0.02] pointer-events-none select-none hidden sm:block">学</div>
                  
                  {/* Image Header */}
                  <div className="h-[250px] sm:h-[350px] lg:h-[450px] relative bg-zinc-900 group">
                     <img src={activeCourse.bannerURL} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000" alt="Course Hero" />
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/60 to-[#09090b]" />
                     <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 lg:left-16 sm:right-10">
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-indigo-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] rounded-full mb-4 sm:mb-6 inline-block shadow-lg">
                          {activeCourse.level} Specialization
                        </span>
                        <h2 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-2 sm:mb-4">
                          {activeCourse.title}
                        </h2>
                     </div>
                  </div>

                  <div className="px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 space-y-12 sm:space-y-16 relative z-10">
                    
                    {/* Trust Badges & Collabs */}
                    <div className={`flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-10 border-b pb-8 sm:pb-12 ${theme.border}`}>
                      
                      {/* Teacher / Collab Stack */}
                      <div className="flex flex-col gap-1">
                        <TrustBadge icon={<Users/>} text={`Lead: ${leadSensei}`} theme={theme} />
                        {collabs.length > 0 && (
                          <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest pl-10 ${theme.textMuted}`}>
                            Collabs: {collabText}
                          </span>
                        )}
                      </div>

                      <TrustBadge icon={<Shield/>} text="Academy Verified" theme={theme} />
                      <TrustBadge icon={<Globe/>} text="Global Access" theme={theme} />
                    </div>

                    <section className="space-y-4 sm:space-y-6">
                      <SectionHeader icon={<Zap/>} title="Course Overview" />
                      <p className={`text-lg sm:text-2xl font-medium leading-relaxed tracking-tight italic ${theme.text}`}>
                        "{activeCourse.description}"
                      </p>
                    </section>

                    <section className="space-y-6 sm:space-y-8">
                      <SectionHeader icon={<Layout/>} title="Curriculum Structure" />
                      <div className={`p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] whitespace-pre-line text-sm sm:text-base leading-loose font-semibold shadow-inner border ${isDarkMode ? 'bg-white/[0.02] border-white/5 text-zinc-300' : 'bg-gray-50 border-gray-200 text-zinc-700'}`}>
                        {activeCourse.curriculum || "Syllabus modules are currently being finalized."}
                      </div>
                    </section>

                    {activeCourse.timetableURL && (
                      <section className="pt-2 sm:pt-6">
                        <a href={activeCourse.timetableURL} target="_blank" rel="noreferrer" className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border shadow-lg transition-all group ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'}`}>
                           <div className="flex items-center gap-6 sm:gap-8">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600 flex shrink-0 items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                              </div>
                              <div>
                                 <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1 sm:mb-2 ${theme.textMuted}`}>Master Schedule</p>
                                 <p className={`text-xl sm:text-2xl font-black tracking-tight ${theme.text}`}>View Timetable</p>
                              </div>
                           </div>
                           <ExternalLink className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity self-end sm:self-auto" />
                        </a>
                      </section>
                    )}
                  </div>
                </div>

                {/* Detail Sidebar Pane (Right) */}
                <div className={`w-full lg:w-[450px] border-t lg:border-t-0 lg:border-l flex flex-col lg:max-h-[90vh] lg:overflow-y-auto hide-scrollbar ${theme.border} ${isDarkMode ? 'bg-[#0a0a0c]' : 'bg-gray-50'}`}>
                  
                  <div className="p-6 sm:p-10 lg:p-12 flex-1 space-y-10 sm:space-y-14">
                    <section>
                      <h4 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-6 sm:mb-8 ${theme.textMuted}`}>Included Privileges</h4>
                      <div className="space-y-4 sm:space-y-6">
                        {activeCourse.keyPoints?.map((point, i) => (
                          <div key={i} className="flex items-start gap-4 sm:gap-5 animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                              <Check size={14} className="text-emerald-500" />
                            </div>
                            <span className={`text-xs sm:text-sm font-bold leading-relaxed pt-0.5 sm:pt-1 ${theme.text}`}>{point}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 🚨 HIDES PROMO CODE IF ALREADY ENROLLED */}
                    {!activeCourse.isFree && !isCurrentlyEnrolled && (
                      <section className={`pt-8 sm:pt-12 border-t ${theme.border}`}>
                        <h4 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-4 sm:mb-6 ${theme.textMuted}`}>Promotion Code</h4>
                        {!appliedCoupon ? (
                          <div className="flex flex-col gap-3 sm:gap-4">
                            <div className="flex gap-2">
                              <input 
                                value={couponCode} 
                                onChange={e => setCouponCode(e.target.value)} 
                                placeholder="Enter code (e.g. PRO20)" 
                                className={`flex-1 p-4 sm:p-5 rounded-2xl text-xs font-bold outline-none border transition-all shadow-inner focus:border-indigo-500 ${theme.input}`} 
                              />
                              <button onClick={handleApplyCoupon} className="px-6 sm:px-8 rounded-2xl bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg">
                                Apply
                              </button>
                            </div>
                            {couponError && <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-rose-500 px-2 animate-pulse">{couponError}</p>}
                          </div>
                        ) : (
                          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between animate-in zoom-in-95">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <Tag size={18} className="text-emerald-500 sm:w-5 sm:h-5" />
                              <div>
                                <p className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-wider">{appliedCoupon.code} APPLIED</p>
                                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-0.5 sm:mt-1">-{appliedCoupon.discount}% Discount</p>
                              </div>
                            </div>
                            <button onClick={removeCoupon} className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"><X size={16} className="sm:w-[18px] sm:h-[18px]"/></button>
                          </div>
                        )}
                      </section>
                    )}
                  </div>

                  {/* 🚨 BOTTOM ACTION AREA */}
                  <div className={`p-6 sm:p-10 lg:p-12 border-t ${theme.border} ${isDarkMode ? 'bg-[#09090b]' : 'bg-white'}`}>
                     <div className="flex items-end justify-between mb-6 sm:mb-8">
                        <div>
                          <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1.5 sm:mb-2 ${theme.textMuted}`}>
                            {isCurrentlyEnrolled ? 'Access Status' : 'Total Investment'}
                          </p>
                          <p className="text-4xl sm:text-5xl font-black tracking-tighter italic">
                            {isCurrentlyEnrolled ? (
                              <span className="text-emerald-500">UNLOCKED</span>
                            ) : activeCourse.isFree ? (
                              <span className="text-emerald-500">FREE</span>
                            ) : (
                              `₹${calculatePrice()}`
                            )}
                          </p>
                        </div>
                        {appliedCoupon && !isCurrentlyEnrolled && <p className={`text-lg sm:text-xl line-through font-bold mb-1 italic ${theme.textMuted}`}>₹{activeCourse.price}</p>}
                     </div>
                     
                     {isCurrentlyEnrolled ? (
                       <div className="w-full space-y-4">
                         <button 
                           onClick={() => navigate('/student-dashboard')} 
                           className="w-full py-5 sm:py-6 bg-emerald-600 text-white font-black rounded-2xl sm:rounded-full hover:bg-emerald-500 active:scale-[0.98] transition-all flex justify-center items-center gap-2 sm:gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.3)] text-xs sm:text-sm tracking-[0.15em] uppercase"
                         >
                           Enter Dashboard
                         </button>
                         {/* 🚨 THE NEW DANGER BUTTON */}
                         <button 
                           onClick={() => { setDeEnrollInput(''); setActiveView('DEENROLL'); }}
                           className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 transition-colors"
                         >
                           Danger: Drop Course
                         </button>
                       </div>
                     ) : (
                       <button 
                         onClick={handleInitialCheckoutRequest} 
                         className="w-full py-5 sm:py-6 bg-indigo-600 text-white font-black rounded-2xl sm:rounded-full hover:bg-indigo-500 active:scale-[0.98] transition-all flex justify-center items-center gap-2 sm:gap-3 shadow-[0_20px_50px_rgba(79,70,229,0.3)] text-xs sm:text-sm tracking-[0.15em] uppercase"
                       >
                         {activeCourse.isFree ? 'Initialize Access' : 'Proceed to Checkout'} 
                       </button>
                     )}
                     <p className={`text-center text-[8px] sm:text-[9px] font-black mt-6 sm:mt-8 uppercase tracking-[0.5em] ${theme.textMuted}`}>
                       {isCurrentlyEnrolled ? 'Active Student License' : 'Encrypted Academy Protocol'}
                     </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* -------------------------------------------------- */}
          {/* VIEW: WARNING MODAL (Coupon Burn) */}
          {/* -------------------------------------------------- */}
          {activeView === 'CONFIRM' && (
            <div className={`max-w-lg w-full p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border shadow-2xl text-center animate-in zoom-in-95 duration-300 ${theme.card} ${theme.border}`}>
              
              {appliedCoupon ? (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-rose-500/20">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic mb-4 sm:mb-6">Finalize Discount?</h3>
                  <div className={`p-4 sm:p-6 rounded-2xl mb-8 sm:mb-10 border ${isDarkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'}`}>
                    <p className={`text-[10px] sm:text-xs font-bold leading-relaxed uppercase tracking-widest ${isDarkMode ? 'text-rose-200' : 'text-rose-800'}`}>
                      By clicking proceed, code <span className="font-black text-rose-500">[{appliedCoupon?.code}]</span> will be consumed from our registry. <br/><br/>
                      <span className="text-rose-500 font-black border-b border-rose-500/30 pb-1">This use is deducted immediately, regardless of whether you complete the payment.</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-indigo-500/20">
                    <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic mb-4 sm:mb-6">Confirm Intent</h3>
                  <p className={`text-[10px] sm:text-xs font-bold leading-relaxed uppercase tracking-widest mb-8 sm:mb-10 ${theme.textMuted}`}>
                    You are about to initialize the secure payment protocol for <span className={`font-black ${theme.text}`}>{activeCourse?.title}</span>.
                  </p>
                </>
              )}
              
              <div className="space-y-4 flex flex-col items-center">
                <button 
                  onClick={handleConfirmationAccept} 
                  disabled={isProcessing} 
                  className="w-full py-5 sm:py-6 bg-indigo-600 text-white font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase rounded-full hover:bg-indigo-500 transition-colors flex justify-center items-center shadow-[0_15px_40px_rgba(79,70,229,0.3)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'Acknowledge & Proceed'}
                </button>
                <button 
                  onClick={() => setActiveView('DETAIL')} 
                  className={`py-3 sm:py-4 px-6 sm:px-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  Abort Protocol
                </button>
              </div>
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* VIEW: SUCCESS MODAL (100% Scholarship / Free) */}
          {/* -------------------------------------------------- */}
          {activeView === 'SUCCESS' && (
            <div className={`max-w-xl w-full p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3rem] border shadow-2xl text-center animate-in zoom-in-95 duration-500 ${theme.card} ${theme.border}`}>
              <div className="relative inline-block mb-8 sm:mb-12">
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-500/10 rounded-[2rem] sm:rounded-[2.5rem] border border-emerald-500/30 flex items-center justify-center relative z-10 mx-auto rotate-12 shadow-xl">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic mb-4 sm:mb-6">Mastery <span className="text-emerald-500">Granted.</span></h3>
              <p className={`text-xs sm:text-sm font-bold uppercase tracking-widest leading-relaxed mb-8 sm:mb-12 ${theme.textMuted}`}>
                You now have full lifetime access to <span className={`font-black ${theme.text}`}>{activeCourse?.title}</span>.
              </p>
              <button 
                onClick={handleFinalEnrollment} 
                disabled={isProcessing} 
                className="w-full py-5 sm:py-7 bg-emerald-600 text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] rounded-full hover:bg-emerald-500 transition-transform hover:scale-[1.02] flex justify-center items-center shadow-[0_20px_50px_rgba(16,185,129,0.3)]"
              >
                 {isProcessing ? <Loader2 className="animate-spin" size={24}/> : 'Enter Academy Dashboard'}
              </button>
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* VIEW: DIGITAL INVOICE CHECKOUT */}
          {/* -------------------------------------------------- */}
          {activeView === 'CHECKOUT' && (
            <div className={`max-w-6xl w-full rounded-[2rem] sm:rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-8 duration-500 ${theme.card} ${theme.border}`}>
              
              {/* Left Pane: The Digital Receipt */}
              <div className={`w-full md:w-[45%] p-6 sm:p-10 lg:p-16 border-b md:border-b-0 md:border-r flex flex-col justify-between ${theme.border} ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>
                 <div>
                   <div className="flex items-center justify-between mb-8 sm:mb-12">
                     <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20">
                       <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                     </div>
                     <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] px-3 py-1.5 border rounded-full ${theme.border} ${theme.textMuted}`}>Step 01: Dispatch</span>
                   </div>
                   <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic mb-2">Checkout</h2>
                   <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>Order {orderReference}</p>
                 </div>

                 <div className="py-10 sm:py-14 space-y-5 sm:space-y-6">
                    <InvoiceItem label="Curriculum Access" value={`₹${activeCourse?.price}`} theme={theme} />
                    {appliedCoupon && (
                      <InvoiceItem label={`Promo (${appliedCoupon.code})`} value={`- ₹${activeCourse.price - calculatePrice()}`} isDiscount theme={theme} />
                    )}
                    
                    <div className="w-full border-t-2 border-dashed border-gray-500/20 my-4 sm:my-6" />
                    
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Total Due</span>
                       <span className="text-5xl sm:text-6xl font-black tracking-tighter italic">₹{calculatePrice()}</span>
                    </div>
                 </div>

                 <div className={`p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border ${theme.border} ${theme.card}`}>
                    <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2 ${theme.textMuted}`}>
                      <CreditCard size={12} className="sm:w-[14px] sm:h-[14px]" /> Secure Merchant UPI
                    </p>
                    <div 
                      onClick={() => { navigator.clipboard.writeText('parthpawde@ybl'); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }} 
                      className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all group ${isDarkMode ? 'hover:border-indigo-500 bg-black/50 border-white/5' : 'hover:border-indigo-400 bg-white border-gray-200 shadow-sm'}`}
                    >
                       <span className={`font-black text-lg sm:text-2xl tracking-tight transition-colors ${isDarkMode ? 'group-hover:text-indigo-400' : 'group-hover:text-indigo-600'}`}>parthpawde@ybl</span>
                       <div className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors ${copiedId ? 'bg-emerald-500 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                         {copiedId ? 'Copied!' : 'Copy ID'}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Right Pane: Action & Instructions */}
              <div className={`w-full md:w-[55%] p-6 sm:p-10 lg:p-16 flex flex-col justify-center ${theme.card}`}>
                 
                 <div className="flex items-center justify-end mb-6 sm:mb-8 lg:mb-12">
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] px-3 py-1.5 border rounded-full ${theme.border} ${theme.textMuted}`}>Step 02: Verification</span>
                 </div>

                 <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12">
                   <h3 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic">Secure your seat.</h3>
                   <p className={`text-xs sm:text-sm font-bold leading-relaxed uppercase tracking-widest ${theme.textMuted}`}>
                     Transfer the total amount to the merchant ID. Then, dispatch your transaction screenshot to activate your dashboard.
                   </p>
                 </div>
                 
                 <div className={`p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border mb-8 sm:mb-10 space-y-4 sm:space-y-6 shadow-inner ${theme.border} ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                    <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2 ${theme.textMuted}`}>
                      <Info size={14}/> Include in WhatsApp Message
                    </p>
                    <ul className="text-[10px] sm:text-xs font-bold uppercase tracking-widest space-y-3 sm:space-y-4">
                      <li className="flex items-center gap-3 sm:gap-4"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500"/> Full Legal Name</li>
                      <li className="flex items-center gap-3 sm:gap-4"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500"/> Registered Email</li>
                      <li className="flex items-center gap-3 sm:gap-4"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500"/> Order #{orderReference}</li>
                    </ul>
                 </div>

                 <a 
                   href={`https://wa.me/919309293450?text=Enrollment%20Request%20-%20Order%20${orderReference}:%20I%20have%20paid%20%E2%82%B9${calculatePrice()}%20for%20${activeCourse?.title}.`} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="w-full py-5 sm:py-6 bg-emerald-600 text-white font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase rounded-xl sm:rounded-full hover:bg-emerald-500 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 shadow-[0_15px_40px_rgba(16,185,129,0.3)]"
                 >
                   <MessageCircle size={18} className="sm:w-5 sm:h-5" /> Open Secure WhatsApp
                 </a>

                 <div className="flex flex-col items-center gap-4 sm:gap-6 mt-auto">
                    <div className="flex items-center gap-2 sm:gap-3 text-amber-500">
                      <Clock size={12} className="animate-spin-slow sm:w-[14px] sm:h-[14px]" />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em]">Activation Window: 3-24 Hrs</span>
                    </div>
                    <button onClick={closeModals} className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] transition-colors hover:text-rose-500 ${theme.textMuted}`}>
                      Abort Protocol
                    </button>
                 </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* VIEW: DANGER ZONE (De-Enroll) */}
          {/* -------------------------------------------------- */}
          {activeView === 'DEENROLL' && (
            <div className={`max-w-lg w-full p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border shadow-2xl text-center animate-in zoom-in-95 duration-300 ${theme.card} border-rose-500/20`}>
              
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-pulse" />
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic mb-4 sm:mb-6 text-rose-500">Abandon Course?</h3>
              
              <div className={`p-4 sm:p-6 rounded-2xl mb-8 sm:mb-10 border text-left ${isDarkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100'}`}>
                <p className={`text-[10px] sm:text-xs font-bold leading-relaxed uppercase tracking-widest mb-4 ${isDarkMode ? 'text-rose-200' : 'text-rose-800'}`}>
                  You are about to permanently remove your access to <span className="font-black text-rose-500">{activeCourse?.title}</span>. 
                  This action cannot be undone without repurchasing the course.
                </p>
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                  Type <span className="text-white bg-rose-500/20 px-2 py-1 rounded">"{auth.currentUser?.displayName}"</span> to confirm.
                </p>
                <input 
                  value={deEnrollInput}
                  onChange={(e) => setDeEnrollInput(e.target.value)}
                  placeholder={auth.currentUser?.displayName}
                  className={`w-full p-4 rounded-xl text-center font-black outline-none border transition-all ${isDarkMode ? 'bg-[#09090b] border-rose-500/30 text-white focus:border-rose-500' : 'bg-white border-rose-200 text-slate-900 focus:border-rose-500'}`}
                />
              </div>

              <div className="space-y-4 flex flex-col items-center">
                {/* Button is completely disabled until the input exactly matches their name */}
                <button 
                  onClick={executeDeEnroll} 
                  disabled={isProcessing || deEnrollInput !== auth.currentUser?.displayName} 
                  className="w-full py-5 sm:py-6 bg-rose-600 text-white font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase rounded-full hover:bg-rose-500 transition-colors flex justify-center items-center shadow-[0_15px_40px_rgba(244,63,94,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'Permanently De-enroll'}
                </button>
                <button 
                  onClick={() => setActiveView('DETAIL')} 
                  className={`py-3 sm:py-4 px-6 sm:px-8 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/5 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  Cancel & Return
                </button>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MICRO-COMPONENTS
// ============================================================================

function TrustBadge({ icon, text, theme }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-black uppercase tracking-widest ${theme.textMuted}`}>
      {React.cloneElement(icon, { className: "text-indigo-500 w-5 h-5 sm:w-6 sm:h-6" })}
      {text}
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      {React.cloneElement(icon, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" })} {title}
    </h4>
  );
}

function InvoiceItem({ label, value, isDiscount, theme }) {
  return (
    <div className="flex justify-between items-center text-xs sm:text-sm font-bold uppercase tracking-widest">
      <span className={theme.textMuted}>{label}</span>
      <span className={isDiscount ? 'text-emerald-500' : theme.text}>{value}</span>
    </div>
  );
}