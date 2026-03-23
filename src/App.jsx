import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React from 'react';

// Pages & Components
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Room from "./pages/Room"; 
import LiveClassrooms from './pages/LiveClassrooms';
import CourseCatalog from './pages/CourseCatalog';
import ProfileSettings from './pages/ProfileSettings';
import TeacherBatches from './pages/TeacherBatches';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Helps us see where the user is trying to go
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // 1. If we're already on a deeper page (like a Room), don't force-redirect 
          // to the dashboard, just let them stay where they are.
          const isAtRoot = location.pathname === "/";

          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const role = userSnap.data().role?.toLowerCase();
            
            // Only redirect if they are sitting on the Login page
            if (isAtRoot) {
              if (role === 'teacher' || role === 'admin') {
                navigate('/teacher-dashboard', { replace: true });
              } else {
                navigate('/student-dashboard', { replace: true });
              }
            }
          } else {
            // User exists in Auth but no profile yet
            if (isAtRoot || location.pathname !== "/onboarding") {
              navigate('/onboarding', { replace: true });
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        // 🚨 THE FIX: This runs whether the user exists or not!
        // It hides the "Synchronizing Dojo" screen.
        setIsInitializing(false); 
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0F172A]">
         <div className="flex flex-col items-center gap-6">
            {/* Smooth spinner */}
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="animate-pulse flex flex-col items-center gap-1">
               <span className="text-indigo-500 font-black tracking-[0.3em] text-[10px] uppercase">
                  Synchronizing Dojo
               </span>
               <span className="text-slate-600 text-[8px] font-bold uppercase">Preparing your session...</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route path="/student-dashboard" element={
        <ProtectedRoute requiredRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/teacher-dashboard" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />

      <Route path="/live-classrooms" element={
        <ProtectedRoute requiredRole="teacher">
          <LiveClassrooms isDarkMode={isDarkMode} />
        </ProtectedRoute>
      } />

      <Route path="/course-catalog" element={
        <ProtectedRoute requiredRole="student">
          <CourseCatalog />
        </ProtectedRoute>
      } />

      <Route path="/teacher-batches" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherBatches isDarkMode={isDarkMode} />
        </ProtectedRoute>
      } />

      <Route path="/profile-settings" element={
        <ProtectedRoute requiredRole="student">
          <ProfileSettings />
        </ProtectedRoute>
      } />
      
      <Route path="/room/:roomID" element={
        window.location.search.includes('role=guest') 
          ? <Room /> 
          : <ProtectedRoute><Room /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;