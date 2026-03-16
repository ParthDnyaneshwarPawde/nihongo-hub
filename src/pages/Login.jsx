import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, provider } from '../firebase';

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // The Gatekeeper Logic
  const checkRoleAndRoute = async (user) => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists() || !userDoc.data().onboardingComplete) {
      // New user or incomplete profile -> Onboarding
      navigate('/onboarding');
    } else {
      // Existing user -> Dashboard based on role
      const role = userDoc.data().role;
      if (role === 'teacher' || role === 'admin') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isLoginMode) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      await checkRoleAndRoute(userCredential.user);
    } catch (err) {
      handleAuthError(err);
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, provider);
      setLoading(true);
      await checkRoleAndRoute(result.user);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const handleAuthError = (err) => {
    let msg = err.message;
    if (err.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
    if (err.code === 'auth/email-already-in-use') msg = "An account with this email already exists.";
    if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
    if (err.code === 'auth/popup-closed-by-user') msg = "Login popup was closed.";
    setError(msg);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      <nav className="w-full bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="text-xl font-bold text-indigo-600 tracking-tight flex items-center gap-2">
          <span className="text-2xl text-red-500">桜</span> Nihongo Hub
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Master Japanese with <span className="text-indigo-600">Real-Time</span> Immersion.
            </h1>
            <p className="text-lg text-slate-600">
              Join live 1-on-1 tutoring sessions, participate in audio lounges, and access exclusive live streams.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center rounded-2xl">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-indigo-600 font-medium">Verifying credentials...</p>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {isLoginMode ? "Welcome Back" : "Create an Account"}
              </h2>
              <p className="text-slate-500">
                {isLoginMode ? "Sign in to access your classes." : "Start your Japanese journey today."}
              </p>
            </div>
            
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition mt-2">
                {isLoginMode ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <span className="px-2 bg-white text-slate-500 text-sm relative z-10">Or continue with</span>
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            </div>

            <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 font-semibold py-3 px-4 rounded-xl transition">
              Google
            </button>

            <p className="text-center text-sm text-slate-600 mt-6">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-indigo-600 font-semibold hover:underline">
                {isLoginMode ? "Sign up" : "Sign in"}
              </button>
            </p>

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-4 text-center font-medium">{error}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}