import React from 'react';
import { useLoginLogic } from './hooks/useLoginLogic';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import SocialAuth from './components/SocialAuth';

export default function Login() {
  const {
    isLoginMode, setIsLoginMode,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    error, loading,
    handleEmailAuth, handleGoogleAuth, handleForgotPassword, switchToOnboarding,
  } = useLoginLogic();

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
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tighter">
              Master Japanese <br />
              <span className="text-indigo-600 underline decoration-indigo-100">Real-Time.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-sm">
              Live intensive batches, expert Senseis, and a community of Samurai learners.
            </p>
          </div>

          {/* Right Side: Auth Card */}
          <div className="bg-white p-10 lg:p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-200/40 border border-slate-100 relative overflow-hidden">

            {/* Loading Overlay */}
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
              /* Login Mode: Atomic LoginForm component */
              <LoginForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPassword={showPassword} setShowPassword={setShowPassword}
                onSubmit={handleEmailAuth}
                onForgotPassword={handleForgotPassword}
                loading={loading}
              />
            ) : (
              /* Sign Up Mode: Atomic SignUpForm component */
              <SignUpForm
                onStartOnboarding={switchToOnboarding}
                onSwitchToLogin={() => setIsLoginMode(true)}
              />
            )}

            {/* Atomic SocialAuth component */}
            <SocialAuth onGoogleSignIn={handleGoogleAuth} loading={loading} />

            <p className="text-center text-xs text-slate-500 mt-10 font-bold">
              {isLoginMode ? "New to the Hub? " : "Already a member? "}
              <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-indigo-600 font-black hover:underline uppercase tracking-tighter">
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