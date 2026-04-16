import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@services/firebase'; // Ensure this path matches your project
import { useSenseiProfile } from './useSenseiProfile';


export function useDashboardHomeEffects() {
  const navigate = useNavigate();
  const { currentUser } = useSenseiProfile();

  // --- STRICTLY BUSINESS/FIREBASE STATE ---
  const [isLive, setIsLive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempClassData, setTempClassData] = useState(null);
  const [bulletinMessage, setBulletinMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [bulletinTitle, setBulletinTitle] = useState("");
  const [bulletinTarget, setBulletinTarget] = useState("global");
  const [dynamicBatches, setDynamicBatches] = useState([]);
  const [step, setStep] = useState('selection');
  const [tempClassID, setTempClassID] = useState(null);
  const [activeType, setActiveType] = useState(null); 
  const [roomPassword, setRoomPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState(""); 
  const [myUpcomingClasses, setMyUpcomingClasses] = useState([]);
  

  // --- 2. ALL USE EFFECTS ---

  // Auth Listener
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       setCurrentUser(user);
//     });
//     return () => unsubscribe();
//   }, []);

  // Fetch Upcoming Classes
  useEffect(() => {
    const q = query(
      collection(db, "classes"),
      where("status", "==", "upcoming")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Found raw docs:", snapshot.docs.length); 
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyUpcomingClasses(fetched);
    }, (error) => {
      console.error("Firebase fetch error:", error.message);
    });

    return () => unsubscribe();
  }, []);

  // Fetch teacher's batches for the Bulletin Dropdown
  useEffect(() => {
    // Make sure we have a user!
    if (!currentUser?.uid) return; 

    // Assuming you want batches assigned to this specific teacher
    const q = query(
      collection(db, 'batches'),
      where('teacherIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedBatches = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setDynamicBatches(fetchedBatches);
      } else {
        setDynamicBatches([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // The "Live Session Radar"
  useEffect(() => {
    if (!currentUser) return; 
    if (step === 'password') return;

    const q = query(
      collection(db, "classes"), 
      where("status", "==", "live"), 
      where("hostId", "==", currentUser.uid), 
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const liveDoc = snapshot.docs[0];
        const data = liveDoc.data();
        
        setCurrentSessionId(liveDoc.id);
        setTempClassData(data);
        setActiveRoomCode(data.roomID);
        setIsLive(true);
        setStep('selection');
      } else {
        setIsLive(false);
        setCurrentSessionId(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser, step]); 

  // --- 3. ALL HANDLER FUNCTIONS ---

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const activateScheduledClass = (cls) => {
    setTempClassData(cls);
    setTempClassID(cls.id);
    setActiveType(cls.type || "Video"); 
    setActiveRoomCode(cls.roomID);
    setStep('password'); 
  };

  const handleTypeSelection = (type) => {
    setError(null);
    setActiveType(type);
    setIsModalOpen(true);
  };

  const handleSaveClass = async (classData) => {
    try {
      setTempClassData(classData);
      const docRef = await addDoc(collection(db, "classes"), {
        ...classData,
        hostId: auth.currentUser.uid,
        status: classData.status === "Starting Now" ? "pending" : "upcoming",
        createdAt: new Date(),
      });

      if (classData.status === "Starting Now") {
        setStep('password');
        setIsModalOpen(false);
        setTempClassID(docRef.id); 
        setActiveRoomCode(classData.roomID); 
      } else {
        alert("Class Scheduled Successfully!");
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Error saving class:", error);
    }
  };

  const launchClass = async () => {
    if (!activeType || !tempClassID) return;
    setIsProcessing(true);
    setError(null);

    try {
      const classRef = doc(db, "classes", tempClassID);
      const roomCode = tempClassData.roomID;
      const batchLevel = tempClassData.level;
      const now = new Date();
      const istTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      
      await updateDoc(classRef, {
        code: roomCode,
        password: roomPassword || "", 
        type: activeType,
        teacher: currentUser?.displayName || "Sensei",
        status: 'live',
        batchLevel: batchLevel,
        createdAt: serverTimestamp(),
        scheduledTime: istTime,
        studentsJoined: 0
      });

      await addDoc(collection(db, "bulletins"), {
        message: `🏮 ${tempClassData.classTitle} is starting! Access Key: ${roomPassword || 'None'}`,
        sender: currentUser?.displayName || "Sensei",
        createdAt: serverTimestamp(),
        type: "batch-specific", 
        targetLevel: batchLevel  
      });

      setCurrentSessionId(tempClassID);
      setActiveRoomCode(roomCode); 
      setIsLive(true);
      setIsProcessing(false);
      
      navigate(`/room/${roomCode}?type=${activeType}&role=host&pass=${roomPassword}`);
    } catch (err) {
      console.error("Launch Error:", err);
      setError("Failed to create room. Please check your connection.");
      setIsProcessing(false); 
    }
  };

  const resetForm = () => {
    setActiveType(null);
    setRoomPassword("");
    setError(null);
    setStep('selection');
  };

  const endSession = async () => {
    if (!currentSessionId) {
      alert("No active session found to end.");
      return;
    }
    const confirmEnd = window.confirm("Are you sure? This will disconnect all students.");
    if (!confirmEnd) return;
    
    try {
      const sessionRef = doc(db, "classes", currentSessionId);
      await updateDoc(sessionRef, {
        status: 'ended',
        endedAt: serverTimestamp() 
      });
      
      setIsLive(false);
      setCurrentSessionId(null);
      setActiveRoomCode("");
      setActiveType(null);
      setRoomPassword("");
      setStep('selection');
      alert("Session Ended Successfully.");
    } catch (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session. Check your internet.");
    }
  };

  const deleteScheduledClass = async (classId) => {
    const confirmDelete = window.confirm("Are you sure you want to cancel this scheduled session? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "classes", classId));
      alert("Session cancelled and removed.");
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to cancel session.");
    }
  };



  const broadcastBulletin = async () => {
    if (!bulletinTitle.trim() || !bulletinMessage.trim()) {
      alert("Please enter both a title and a message.");
      return;
    }
    
    setIsBroadcasting(true);
    try {
      await addDoc(collection(db, "bulletins"), {
        title: bulletinTitle,     
        message: bulletinMessage, 
        
        // 👇 THE MAGIC: This now pulls directly from your Dropdown!
        targetLevel: bulletinTarget, 
        
        sender: currentUser?.displayName || "Sensei Panel",
        createdAt: new Date()
      });
      
      // Clear the form
      setBulletinTitle("");       
      setBulletinMessage("");
      alert("Broadcast sent successfully!");
    } catch (error) {
      console.error("Broadcast failed:", error);
      alert("Failed to send broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const copyGuestInvite = (roleType) => {
    if (!isLive || !activeRoomCode) return;
    const guestLink = `${window.location.origin}/room/${activeRoomCode}?type=${activeType}&role=${roleType}&pass=${roomPassword}`;
    navigator.clipboard.writeText(guestLink);
    alert(`${roleType === 'guest_teacher' ? 'Sensei' : 'Student'} link copied!`);
  };


//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       navigate('/'); 
//     } catch (error) {
//       console.error("Logout failed:", error);
//     }
//   };

  return {
    isLive, setIsLive, isModalOpen, setIsModalOpen, tempClassData, setTempClassData,
    bulletinMessage, setBulletinMessage, isBroadcasting, setIsBroadcasting, bulletinTitle, setBulletinTitle, bulletinTarget, setBulletinTarget,
    step, setStep, tempClassID, setTempClassID, activeType, setActiveType,
    roomPassword, setRoomPassword, isProcessing, setIsProcessing, error, setError,
    currentSessionId, setCurrentSessionId, activeRoomCode, setActiveRoomCode,
    currentUser, myUpcomingClasses, setMyUpcomingClasses, dynamicBatches,
    
    handleLogout, activateScheduledClass, handleTypeSelection, handleSaveClass,
    launchClass, resetForm, endSession, deleteScheduledClass, broadcastBulletin, copyGuestInvite
  };
}