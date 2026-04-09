import React, { useEffect, useState } from 'react';
import { authService } from '../login/services/authService';

export default function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // Force redirect if unauthenticated, or let the router handle it
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    // Zero-Flash Auth: Return absolutely nothing or a minimal full-screen blackout 
    // to prevent the login UI from flashing before the Firebase token resolves.
    return <div className="fixed inset-0 bg-[#020617] z-[999] pointer-events-none"></div>;
  }

  // If not authenticated, we could redirect here: `return <Navigate to="/login" />`
  // Assuming App.js Router handles the gate properly based on this context. 
  // Normally AuthGuard wraps protected routes. We render children if validated.
  return isAuthenticated ? children : null; 
}
