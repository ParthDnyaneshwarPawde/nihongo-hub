import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { auth } from '../firebase';
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
  const appID = 520395769; // Your Zego AppID
  const serverSecret = "b2d938f6be27ccdc4fece654e0cc830e"; 

  useEffect(() => {
    let zp;
    const startClass = async () => {
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID, 
        serverSecret, 
        roomID, 
        auth.currentUser?.uid || Date.now().toString(), 
        auth.currentUser?.displayName || "Nihongo Student"
      );

      zp = ZegoUIKitPrebuilt.create(kitToken);
      // 1. Get the type from your state or URL (e.g., /room/:roomID?type=Video)
const searchParams = new URLSearchParams(window.location.search);
const roomType = searchParams.get('type') || 'Video';

// 2. Set the scenario based on the type
let scenarioMode;
switch (roomType) {
  case 'Audio':
    scenarioMode = ZegoUIKitPrebuilt.StandardVoiceCall;
    break;
  case 'Broadcast':
    scenarioMode = ZegoUIKitPrebuilt.LiveStreaming;
    break;
  default:
    scenarioMode = ZegoUIKitPrebuilt.GroupCall;
}

// 1. Determine the Role based on Firebase User Data
// Assuming you have the 'role' stored in your user profile
const userRole = searchParams.get('role'); // 'teacher', 'co-host', or 'student'

// const searchParams = new URLSearchParams(window.location.search);
const isGuestTeacher = searchParams.get('role') === 'guest';

let zegoRole;
if (userRole === 'teacher' || isGuestTeacher) {
  zegoRole = ZegoUIKitPrebuilt.Host;
} else if (userRole === 'co-host'|| userRole === 'admin' || userRole === 'moderator') {
  zegoRole = ZegoUIKitPrebuilt.Cohost; // This gives them moderation powers
} else {
  zegoRole = ZegoUIKitPrebuilt.Audience;
}

      zp.joinRoom({
        container: containerRef.current,
  branding: {
    logoURL: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="25" fill="%23e11d48"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="55" font-weight="900" fill="%23ffffff" font-family="sans-serif">桜</text></svg>', 
  },
  scenario: {
    mode: scenarioMode, // Dynamically set based on our previous logic
    config: {
      role: zegoRole, // Host, Cohost, or Audience
      
      // --- SCREEN SHARING SETTINGS ---
      // Only Sensei and Co-hosts should be allowed to share by default
      enableScreenSharing: userRole === 'teacher' || userRole === 'co-host' || userRole === 'admin' || userRole === 'moderator',
      
      // --- LAYOUT SETTINGS ---
      // 'Grid' is standard, 'Sidebar' puts the speaker in focus (good for teaching)
      layout: "Sidebar", 
      showLayoutButton: true, // Allow users to switch views
    },
  },

  // --- UI BUTTONS & CONTROLS ---
  showScreenSharingButton: userRole === 'teacher' || userRole === 'co-host' || userRole === 'admin' || userRole === 'moderator', 
  showUserList: true,
  showAudioVideoSettingsButton: true,
  showMyCameraToggleButton: true,
  showMyMicrophoneToggleButton: true,
  showTextChat: true,
  showNonVideoUser: true, // Shows users who have their cameras off (crucial for attendance)
  
  // --- PRE-JOIN & BEHAVIOR ---
  showPreJoinView: false, // Skip the "check your mic" screen to make it feel faster
  turnOnMicrophoneWhenJoining: false, // Professional standard: join muted
//   turnOnCameraWhenJoining: false, 
  showScreenSharingButton: true,
  turnOnCameraWhenJoining: roomType !== 'Audio',
  showMyCameraToggleButton: roomType !== 'Audio',
  
  // --- BRANDING & THEME ---
  theme: 'dark', 
// (can turn any guest into host)  showManagementButton: zegoRole === ZegoUIKitPrebuilt.Host,
  whiteboardConfig: {            
     showAddImageButton: true, // Sensei can upload Kanji worksheets to draw on
  },

  // --- PRIVACY & SECURITY ---
  showRemoveUserButton: userRole === 'teacher' || userRole === 'co-host' || userRole === 'admin' || userRole === 'moderator',
  showPinButton: true, // Allow pinning the Sensei's video
        
        // --- THE SENSEI CONTROLS ---
        onJoinRoom: () => {
          console.log("Joined Nihongo Hub Live Session");
        },
        onLeaveRoom: () => {
          // The easiest way: Send them back to the exact page they came from!
          // If they came from Teacher Dashboard, it sends them there.
          // If they came from Student Dashboard, it sends them there.
          navigate(-1); 
        },
      });
    };

    if (auth.currentUser) {
      startClass();
    }
    return () => {
  if (zp) {
    zp.destroy();
  }
  if (containerRef.current) {
    containerRef.current.innerHTML = "";
  }
};


  }, [roomID, navigate]);

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