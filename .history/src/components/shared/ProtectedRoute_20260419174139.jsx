import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '@services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children, requiredRole }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // 🚨 Wrapped in a try/catch so it can't silently crash the app
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            console.warn("ProtectedRoute: User document does not exist!");
          }
        } catch (error) {
          console.error("ProtectedRoute: Error fetching user role:", error);
        } finally {
          // 🚨 FINALLY guarantees the loading screen goes away, even if the DB fails
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false); // Make sure to stop loading if there is no user
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-400 font-bold animate-pulse">Verifying Access...</p>
      </div>
    );
  }

  // If not logged in at all, send to Login
  if (!user) {
    return <Navigate to="/" />;
  }

  // If a specific role is required (like 'teacher') and they don't have it, kick them out
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/student-dashboard" />;
  }

  return children;
}