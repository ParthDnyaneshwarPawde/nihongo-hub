import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { auth } from '@services/firebase';
import { X, ShieldCheck } from 'lucide-react';

// At the top of Room.jsx
import { useLocation } from 'react-router-dom';

export default function Room() {
  const { roomID } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const location = useLocation();

  // --- CONFIGURATION ---
  // Note: For production, move these to a .env file
  const appID = 132188252; // Your Zego AppID
  const serverSecret = "e6e314518bdedecc412bc14ce9ce43a7"; 

useEffect(() => {
    let zp;
    let isInitialized = false; // Guard to prevent React Strict Mode crashes

    const startClass = async () => {
      if (isInitialized) return;
      isInitialized = true;

      const searchParams = new URLSearchParams(window.location.search);
      const roomType = searchParams.get('type') || 'Video';
      
      // 🚨 FIX: Unify variable names so 'role' and 'classDocId' work in the Firestore functions
      const role = searchParams.get('role'); 
      const classDocId = searchParams.get('classId'); 
      const isGuestTeacher = role === 'guest';

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID, 
        serverSecret, 
        roomID, 
        auth.currentUser?.uid || Date.now().toString(), 
        auth.currentUser?.displayName || "Nihongo Student"
      );

      zp = ZegoUIKitPrebuilt.create(kitToken);

      // --- SCENARIO LOGIC ---
      let scenarioMode;
      switch (roomType) {
        case 'Audio': scenarioMode = ZegoUIKitPrebuilt.StandardVoiceCall; break;
        case 'Broadcast': scenarioMode = ZegoUIKitPrebuilt.LiveStreaming; break;
        default: scenarioMode = ZegoUIKitPrebuilt.GroupCall;
      }

      // --- ZEGO ROLE LOGIC ---
      let zegoRole;
      if (role === 'teacher' || isGuestTeacher || role === 'host') {
        zegoRole = ZegoUIKitPrebuilt.Host;
      } else if (['co-host', 'admin', 'moderator'].includes(role)) {
        zegoRole = ZegoUIKitPrebuilt.Cohost;
      } else {
        zegoRole = ZegoUIKitPrebuilt.Audience;
      }

      zp.joinRoom({
        container: containerRef.current,
        branding: {
          logoURL: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="25" fill="%23e11d48"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="55" font-weight="900" fill="%23ffffff" font-family="sans-serif">桜</text></svg>', 
        },
        scenario: {
          mode: scenarioMode,
          config: {
            role: zegoRole,
            enableScreenSharing: ['teacher', 'host', 'co-host', 'admin', 'moderator'].includes(role),
            layout: "Sidebar", 
            showLayoutButton: true,
          },
        },

        // --- UI BUTTONS & CONTROLS ---
        showScreenSharingButton: ['teacher', 'host', 'co-host', 'admin', 'moderator'].includes(role),
        showUserList: true,
        showAudioVideoSettingsButton: true,
        showMyCameraToggleButton: roomType !== 'Audio',
        showMyMicrophoneToggleButton: true,
        showTextChat: true,
        showNonVideoUser: true,
        showPreJoinView: false, 
        turnOnMicrophoneWhenJoining: false, 
        turnOnCameraWhenJoining: roomType !== 'Audio',
        theme: 'dark', 
        whiteboardConfig: { showAddImageButton: true },
        showRemoveUserButton: ['teacher', 'host', 'co-host', 'admin', 'moderator'].includes(role),
        showPinButton: true,

        // --- CONSOLIDATED EVENTS (Merged your two versions into one) ---
        onJoinRoom: async () => {
          console.log("Joined Nihongo Hub Live Session");
          if (classDocId) {
            try {
              const classRef = doc(db, "classes", classDocId);
              const field = role === 'student' ? "activeParticipants" : "activePowerParticipants";
              await updateDoc(classRef, { [field]: increment(1) });
            } catch (err) { console.error("Counter Error:", err); }
          }
        },

        onLeaveRoom: async () => {
          console.log("Leaving Room...");
          
          // 1. Decrement the count in Firestore
          if (classDocId) {
            try {
              const classRef = doc(db, "classes", classDocId);
              const field = role === 'student' ? "activeParticipants" : "activePowerParticipants";
              await updateDoc(classRef, { [field]: increment(-1) });
            } catch (err) { console.error("Counter Error:", err); }
          }

          // 2. Host Logic: Auto-end the class
          if (role === 'host' || role === 'teacher') {
            try {
              const q = query(collection(db, "classes"), where("roomID", "==", roomID), where("status", "==", "live"));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                await updateDoc(doc(db, "classes", querySnapshot.docs[0].id), {
                  status: 'ended',
                  endedAt: serverTimestamp()
                });
              }
            } catch (err) { console.error("Auto-end failed:", err); }
          }
          
          // 3. Navigate back to correct dashboard
          const target = (role === 'host' || role === 'teacher') ? '/teacher-dashboard' : '/student-dashboard';
          navigate(target);
        },
      });
    };

    if (auth.currentUser) {
      startClass();
    }

    return () => {
      if (zp) zp.destroy();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [roomID]); // Removed 'navigate' from dependency to ensure room stability

  return (
    <div className="w-screen h-screen bg-[#0A0F1C] flex flex-col overflow-hidden relative">
      
      {/* Top Navigation Overlay */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 hover:bg-rose-600 text-white rounded-2xl transition-all border border-white/10 backdrop-blur-xl group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600 rounded-full border border-indigo-400/30 w-fit">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Live: {roomID}</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-md pointer-events-auto">
          <ShieldCheck size={16} className="text-emerald-500" />
          <p className="text-xs font-bold text-slate-300">Encrypted Classroom</p>
        </div>
      </div>

      {/* The Zego Video Engine Container */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full border-none outline-none z-10"
      />

      {/* Background Kanji Watermark (Hidden when video starts) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
        <span className="text-[500px] font-black text-white select-none">教室</span>
      </div>
    </div>
  );
}