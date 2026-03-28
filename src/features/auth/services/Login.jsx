import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, provider } from '@services/firebase';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false); 
  

  // --- THE GATEKEEPER ---
  // Decides if a user goes to Onboarding or the Dashboard
  const checkRoleAndRoute = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        navigate('/onboarding');
        return;
      }

      const userData = userDoc.data();

      // Only redirect if the flag is missing OR explicitly false
      // This is the most "bugless" way to handle the transition
      const isComplete = userData.onboardingComplete === true;

      if (isComplete) {
        console.log("Profile verified. Entering Academy.");
        const role = userData.role?.toLowerCase() || 'student';
        navigate(role === 'teacher' || role === 'admin' ? '/teacher-dashboard' : '/student-dashboard', { replace: true });
      } else {
        console.log("Profile incomplete. Sending to onboarding.");
        navigate('/onboarding', { replace: true });
      }
      
    } catch (err) {
      console.error("Gatekeeper Error:", err);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loading) return; 
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // --- STRICT LOGIN ONLY ---
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          await checkRoleAndRoute(userCredential.user);
        } catch (loginError) {
          setLoading(false);
          // If the account doesn't exist, tell them to use "Get Started"
          if (loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/user-not-found') {
            setError("No account found. Click 'Get Started' below to join the Academy!");
          } else {
            handleAuthError(loginError);
          }
        }
      }
    } catch (err) {
      handleAuthError(err);
      setLoading(false);
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
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      // We are hijacking your error state to show a success message!
      setError("Success! A password reset link has been sent to your email.");
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("No account found with this email.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message);
      }
    } finally {
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

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans overflow-hidden">
      {/* Navbar */}
      <nav className="w-full bg-white shadow-sm p-6 flex justify-between items-center z-50">
        <div className="text-xl font-black text-indigo-600 tracking-tighter flex items-center gap-2">
          <span className="text-2xl text-rose-500">桜</span> NIHONGO HUB
        </div>
      </nav>

      <main className="flex-grow flex items-center justify-center p-6 relative">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Branding */}
          <div className="space-y-6 hidden md:block">
            <h1 className="text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tighter">
              Master Japanese <br />
              <span className="text-indigo-600 underline decoration-indigo-100">Real-Time.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-sm">
              Live intensive batches, expert Senseis, and a community of Samurai learners.
            </p>
          </div>

          {/* Right Side: Auth Card */}
          <div className="bg-white p-10 lg:p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-200/40 border border-slate-100 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 mb-4"></div>
                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Entering Academy...</p>
              </div>
            )}

            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                {isLoginMode ? "Welcome Back" : "Join the Academy"}
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                {isLoginMode ? "Unlock your intensive batches." : "Start your path to JLPT mastery."}
              </p>
            </div>
            
            {isLoginMode ? (
  /* --- LOGIN MODE (Fields Visible) --- */
  <form onSubmit={handleEmailAuth} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
    <div>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800" placeholder="sensei@hub.com" />
    </div>
    <div>
  <div>
  <div className="flex justify-between items-center mb-2 mx-1">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Key</label>
    <button 
      type="button" 
      onClick={handleForgotPassword}
      disabled={loading}
      className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors disabled:opacity-50"
    >
      Forgot?
    </button>
  </div>
  
  {/* The Relative Container */}
  <div className="relative group">
    <input 
      type={showPassword ? "text" : "password"} // 👈 Toggles the text visibility
      value={password} 
      onChange={(e) => setPassword(e.target.value)} 
      required 
      className="w-full px-6 py-4 pr-12 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800" 
      placeholder="••••••••" 
    />
    
    {/* The Show/Hide Button */}
    <button 
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
</div>
</div>
    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 mt-2 disabled:opacity-50">
                 SIGN IN          </button>
  </form>
) : (
  /* --- SIGN UP MODE (Beautiful CTA Button) --- */
  <div className="space-y-6 text-center animate-in zoom-in-95 duration-300 py-4">
    <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
      <span className="text-3xl">⛩️</span>
    </div>
    <div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Begin Your Journey</h3>
      <p className="text-slate-500 text-sm font-medium mt-2 max-w-xs mx-auto">
        Create your profile, set your JLPT goals, and join the Academy in less than 2 minutes.
      </p>
    </div>
    <button 
  type='button'
  onClick={() => {
    setIsLoginMode(!isLoginMode);
    setEmail('');    
    setPassword(''); 
    setError('');    
    console.log("🟢 1. 'START ONBOARDING' button was clicked!");
    console.log("🟢 2. Attempting to run navigate('/onboarding')...");
    try {
      navigate('/onboarding');
      console.log("🟢 3. navigate() fired successfully.");
    } catch (err) {
      console.error("🔴 4. ERROR: Navigation failed!", err);
    }
  }} 
  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all active:scale-95 mt-4 flex items-center justify-center gap-3"
>
  START ONBOARDING <span className="text-xl leading-none">→</span>
</button>
  </div>
)}

            <div className="relative my-8 text-center">
              <span className="px-4 bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest relative z-10">Secure Access</span>
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            </div>

            {/* Google Login Button */}
            <button 
              type="button"
              onClick={handleGoogleAuth} 
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-700 font-black py-4 rounded-2xl transition-all active:scale-95 shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="tracking-tight text-xs">GOOGLE ACCESS</span>
            </button>

            <p className="text-center text-xs text-slate-500 mt-10 font-bold">
              {isLoginMode ? "New to the Hub? " : "Already a member? "}
              <button 
                type="button" 
                onClick={() => setIsLoginMode(!isLoginMode)} 
                className="text-indigo-600 font-black hover:underline uppercase tracking-tighter"
              >
                {isLoginMode ? "Get Started" : "Sign In"}
              </button>
            </p>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl mt-6 text-center border border-rose-100 animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}