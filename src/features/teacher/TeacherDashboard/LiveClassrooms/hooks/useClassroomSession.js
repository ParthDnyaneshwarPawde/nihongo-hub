import { useState, useEffect } from 'react';
import { auth, db } from '@services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CLASSROOM_STATUS } from '../constants/classroomConstants';

export function useClassroomSession() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [myBatches, setMyBatches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Live Sessions Effect
  useEffect(() => {
    const q = query(
      collection(db, "classes"), 
      where("status", "==", CLASSROOM_STATUS.LIVE)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        studentCount: doc.data().activeParticipants || 0
      }));
      setLiveSessions(sessions);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // My Batches Effect
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, "batches"), 
      where("teacherIds", "array-contains", currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const batchTitles = snapshot.docs.map(doc => doc.data().title);
      setMyBatches(batchTitles);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  return { liveSessions, myBatches, currentUser, isLoading };
}
