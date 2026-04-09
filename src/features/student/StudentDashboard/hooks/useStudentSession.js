import { useState, useEffect } from 'react';
import { auth, db } from '@services/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export function useStudentSession() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUserData, setDbUserData] = useState(null);
  const [level, setLevel] = useState('JLPT N5'); 
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

  // Sync DB User Data
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setDbUserData(userData);
        
        if (userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
          setCurrentCourses(userData.enrolledCourses);
          setEnrolledCourseTitles(userData.enrolledCourses);
        } else {
          setCurrentCourses([]);
          setEnrolledCourseTitles([]);
        }

        if (userData.lastSelectedLevel) {
          setLevel(userData.lastSelectedLevel);
        }
      }
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Sync free batches and auto-bouncing logic
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
        
        const hasPaidAccess = currentCourses.includes(level);
        const isStillFree = strictlyFreeTitles.includes(level);
        
        if (level && !hasPaidAccess && !isStillFree && strictlyFreeTitles.length > 0) {
          setLevel(strictlyFreeTitles[0]); 
        }
      } else {
        setDynamicBatches([]);
        setFreeBatches([]);
      }
    });

    return () => unsubscribe();
  }, [level, currentCourses]);

  // Sync selected level to cloud 
  useEffect(() => {
    const syncLevelToCloud = async () => {
      if (currentUser?.uid && level) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, { lastSelectedLevel: level });
        } catch (err) {
          console.error("Cloud Sync Error:", err);
        }
      }
    };
    syncLevelToCloud();
  }, [level, currentUser]);

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
    const q = query(collection(db, "bulletins"), where("targetLevel", "in", [level, "global"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBulletins(messages);
      if (messages.length > 0 && !latestBulletin) {
        // Optional logic to trigger a latest bulletin animation
      }
    });

    return () => unsubscribe();
  }, [level, latestBulletin]);

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
