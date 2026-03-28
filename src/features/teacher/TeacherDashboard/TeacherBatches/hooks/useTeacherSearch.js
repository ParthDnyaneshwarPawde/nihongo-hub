import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@services/firebase';

export function useTeacherSearch(selectedTeachers) {
  const [teacherSearch, setTeacherSearch] = useState('');
  const [foundTeachers, setFoundTeachers] = useState([]);

  useEffect(() => {
    if (!teacherSearch.trim()) {
      setFoundTeachers([]);
      return;
    }

    const searchRegistry = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'teacher'));
        const querySnapshot = await getDocs(q);
        
        const results = [];
        const searchTerm = teacherSearch.toLowerCase().trim();

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const uid = doc.id;
          
          const first = (data.firstName || '').trim();
          const last = (data.lastName || '').trim();
          const email = (data.email || '').toLowerCase().trim();
          const googleName = (data.displayName || '').trim();
          
          const constructedName = `${first} ${last}`.trim();
          const finalDisplayName = googleName || constructedName || 'Unknown Sensei';
          
          const matchesName = finalDisplayName.toLowerCase().includes(searchTerm);
          const matchesEmail = email.includes(searchTerm);
          const matchesUid = uid.toLowerCase().includes(searchTerm);

          const isMatch = matchesName || matchesEmail || matchesUid;
          const isNotMe = uid !== auth.currentUser?.uid;
          const isNotAlreadySelected = !selectedTeachers.some(t => t.uid === uid);

          if (isMatch && isNotMe && isNotAlreadySelected) {
            results.push({ 
              uid, 
              displayName: finalDisplayName,
              email: email || 'No email provided' 
            });
          }
        });
        
        setFoundTeachers(results);
      } catch (error) {
        console.error("Search Error:", error);
      }
    };

    const timeoutId = setTimeout(() => {
      searchRegistry();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [teacherSearch, selectedTeachers]);

  return { teacherSearch, setTeacherSearch, foundTeachers, setFoundTeachers };
}
