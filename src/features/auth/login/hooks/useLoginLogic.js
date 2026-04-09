import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, provider } from '@services/firebase';

export function useLoginLogic() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const checkRoleAndRoute = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) { navigate('/onboarding'); return; }
      const userData = userDoc.data();
      const isComplete = userData.onboardingComplete === true;
      if (isComplete) {
        const role = userData.role?.toLowerCase() || 'student';
        navigate(role === 'teacher' || role === 'admin' ? '/teacher-dashboard' : '/student-dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      console.error("Gatekeeper Error:", err);
      setLoading(false);
    }
  };

  const handleAuthError = (err) => {
    let msg = "Something went wrong. Please try again.";
    if (err.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
    if (err.code === 'auth/email-already-in-use') msg = "This email is already in use.";
    if (err.code === 'auth/weak-password') msg = "Password must be at least 6 characters.";
    if (err.code === 'auth/popup-closed-by-user') return;
    setError(msg);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await checkRoleAndRoute(userCredential.user);
    } catch (loginError) {
      setLoading(false);
      if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/user-not-found') {
        setError("No account found. Click 'Get Started' below to join the Academy!");
      } else {
        handleAuthError(loginError);
      }
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setError('');
    try {
      const result = await signInWithPopup(auth, provider);
      setLoading(true);
      await checkRoleAndRoute(result.user);
    } catch (err) {
      handleAuthError(err);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email address first to reset your password."); return; }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setError("Success! A password reset link has been sent to your email.");
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError("No account found with this email.");
      else if (err.code === 'auth/invalid-email') setError("Please enter a valid email address.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchToOnboarding = () => {
    setIsLoginMode(false);
    setEmail('');
    setPassword('');
    setError('');
    navigate('/onboarding');
  };

  return {
    isLoginMode, setIsLoginMode,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    error, loading,
    handleEmailAuth, handleGoogleAuth, handleForgotPassword, switchToOnboarding,
  };
}
