import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@services/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export function useStudentSession() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUserData, setDbUserData] = useState(null);
  // 🚨 FIX 1: Start null to force the app to wait for your database
  const [level, setLevel] = useState(null); 
  const [currentCourses, setCurrentCourses] = useState([]); 
  const [freeBatches, setFreeBatches] = useState([]);
  const [dynamicBatches, setDynamicBatches] = useState([]);
  const [enrolledCourseTitles, setEnrolledCourseTitles] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [allLevelClasses, setAllLevelClasses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [latestBulletin, setLatestBulletin] = useState(null);
  const navigate = useNavigate();

  // 🚨 FIX 2: The Shield to prevent overwriting Firebase on reload
  const initialSyncRef = useRef(true);

  // --- STATE TRACKER LOG ---
  useEffect(() => {
    console.log("📊 [STATE] Level is currently:", level);
  }, [level]);

  // Current User Hook
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Teacher Redirect
  useEffect(() => {
    const checkAuthorization = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role?.toLowerCase();

        if (role === 'teacher' || role === 'admin') {
          console.log("Teacher detected on Student Dash. Redirecting...");
          navigate('/teacher-dashboard', { replace: true });
        }
      }
    };
    checkAuthorization();
  }, [navigate, currentUser]);

  // 🚨 FIX 3: Sync DB User Data (Loads your choice once)
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log("📥 [DB LOAD] Fetching User Profile from Firebase...");

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      console.log("📥 [DB LOAD] Received snapshot from Firebase!");
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setDbUserData(userData);
        
        console.log("📥 [DB LOAD] Enrolled Courses in DB:", userData.enrolledCourses);

        if (userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
          setCurrentCourses(userData.enrolledCourses);
          setEnrolledCourseTitles(userData.enrolledCourses);
        } else {
          setCurrentCourses([]);
          setEnrolledCourseTitles([]);
        }

        console.log("📥 [DB LOAD] Last Selected Level in DB:", userData.lastSelectedLevel);

        // Only set the level from the DB if it is our very first load
        if (initialSyncRef.current) {
          const savedLevel = userData.lastSelectedLevel || 'JLPT N5';
          console.log(`📥 [DB LOAD] Setting App Level to: ${savedLevel}`);
          setLevel(savedLevel);
        }
      }
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 🚨 FIX 4: Split Batch Fetching from Bouncing
  // A. FETCH BATCHES (Always runs)
  useEffect(() => {
    const q = query(collection(db, 'batches')); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedBatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDynamicBatches(fetchedBatches);
        
        const strictlyFreeTitles = fetchedBatches
          .filter(course => course.isFree === true || course.isFree === "true" || Number(course.price || 0) === 0)
          .map(course => course.title);
          
        setFreeBatches(strictlyFreeTitles);
      } else {
        setDynamicBatches([]);
        setFreeBatches([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // B. THE BOUNCER (Only checks once data is downloaded)
  useEffect(() => {
    if (!isDataLoaded || !level || freeBatches.length === 0) return;

    console.log("🛑 [BOUNCER] Hook triggered. Checking access for level:", level);
    console.log("🛑 [BOUNCER] Currently known Paid Courses:", currentCourses);

    const hasPaidAccess = currentCourses.includes(level);
    const isStillFree = freeBatches.includes(level);
    
    console.log(`🛑 [BOUNCER] Validating "${level}"... Paid Access: ${hasPaidAccess}, Free Access: ${isStillFree}`);

    if (!hasPaidAccess && !isStillFree) {
      console.warn("⚠️ [BOUNCER KICK] User does not own this course and it is not free!");
      console.warn(`⚠️ [BOUNCER KICK] Forcing level change to: ${freeBatches[0]}`);
      setLevel(freeBatches[0] || 'JLPT N5'); 
    } else {
      console.log("✅ [BOUNCER] Access approved. No kick necessary.");
      // The level is safe. Drop the shield so future clicks can save to Firebase!
      initialSyncRef.current = false;
    }
  }, [level, currentCourses, freeBatches, isDataLoaded]);

  // 🚨 FIX 5: Protected Cloud Sync
  useEffect(() => {
    const syncLevelToCloud = async () => {
      // Only save if:
      // 1. We are past the first load (!initialSyncRef.current)
      // 2. Data is fully loaded
      // 3. The level actually changed from what DB says
      if (!initialSyncRef.current && isDataLoaded && currentUser?.uid && level && dbUserData?.lastSelectedLevel !== level) {
        console.log(`☁️ [CLOUD UPLOAD] Attempting to save "${level}" to Firebase...`);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
            lastSelectedLevel: level 
          });
          console.log(`✅ [CLOUD UPLOAD] Successfully saved "${level}" to Firebase.`);
        } catch (err) {
          console.error("❌ [CLOUD UPLOAD] Cloud Sync Error:", err);
        }
      }
    };
    syncLevelToCloud();
  }, [level, currentUser, isDataLoaded, dbUserData]);

  // Subscribe to classes for selected level
  useEffect(() => {
    if (!level) return; 

    const q = query(collection(db, "classes"), where("level", "==", level));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllLevelClasses(fetched); 
      setUpcomingClasses(fetched.filter(c => c.status === 'upcoming' || c.status === 'live')); 
    });
    
    return () => unsubscribe();
  }, [level]);

  // Subscribe to bulletins
  useEffect(() => {
    if (!level) return;

    // 1. Exact query from your old code (NO orderBy to bypass the Firebase Error!)
    const q = query(
      collection(db, "bulletins"),
      where("targetLevel", "in", [level, "global"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 2. Map the data safely
      const messages = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // 3. Sort them locally in JavaScript! (Newest first)
      messages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA; 
      });

      // 4. Update the main list (This fixes the History Modal!)
      setBulletins(messages);

      // 5. Update the Top Banner (This fixes the blue drop-down alert!)
      if (messages.length > 0) {
        setLatestBulletin(messages[0]);
      } else {
        setLatestBulletin(null);
      }
    }, (error) => {
      console.error("❌ FIREBASE BULLETIN ERROR:", error.message);
    });

    return () => unsubscribe();
  }, [level]); // Only re-run if the user changes their level

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

  return {
    currentUser,
    dbUserData,
    level,
    setLevel,
    currentCourses,
    setCurrentCourses,
    freeBatches,
    dynamicBatches,
    enrolledCourseTitles,
    isDataLoaded,
    allLevelClasses,
    upcomingClasses,
    bulletins,
    latestBulletin,
    setLatestBulletin,
    displayName,
    displayInitial
  };
}