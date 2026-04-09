import { useState, useEffect } from 'react';
import { auth } from '@services/firebase';

export function useSenseiProfile() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return { currentUser };
}
