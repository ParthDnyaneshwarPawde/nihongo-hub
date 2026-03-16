import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Room from "./pages/Room"; 

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Semi-Protected (Need login, but any role can access) */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />

        {/* Student Only */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* Teacher Only */}
        <Route path="/teacher-dashboard" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        } />
        // Simplified logic for App.jsx
<Route path="/room/:roomID" element={
  // If the URL has 'role=guest', we bypass the strict login check
  window.location.search.includes('role=guest') 
    ? <Room /> 
    : <ProtectedRoute><Room /></ProtectedRoute>
} />
        
        {/* Admin/Moderator can be added here easily later! */}
      </Routes>
    </Router>
  );
}

export default App;