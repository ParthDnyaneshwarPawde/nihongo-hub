import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useOnboardingFlow } from './hooks/useOnboardingFlow';
import RoleSelector from './steps/RoleSelector';
import ProfileSetup from './steps/ProfileSetup';
import StepBio from './steps/StepBio';
import OnboardingBackground from './components/OnboardingBackground';
import { useLogoutConfirm } from '@hooks/useLogoutConfirm';
import LogoutShield from '@components/shared/LogoutShield';

export default function Onboarding() {
  const {
    step, formData, handleChange, nextStep, prevStep,
    handleSubmit, handleLogout, loading, error, loginMethod
  } = useOnboardingFlow();

  const { isConfirming, requestLogout, cancelLogout, confirmLogout } = useLogoutConfirm({
    onBeforeLogout: handleLogout // This ensures partial progress is saved
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex items-center justify-center p-6 relative overflow-hidden">

      {/* Kinetic 3D Scene — locked behind the modal at z-0 */}
      <OnboardingBackground />

      {/* Container — z-10 ensures it floats above the z-0 canvas */}
      <div className="relative z-10 w-full max-w-2xl bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-8 border-b border-slate-800 relative bg-gradient-to-r from-slate-950 to-slate-900">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl text-rose-500 font-bold font-serif">桜</span>
              <span className="text-2xl font-bold text-white tracking-tight">Nihongo Hub</span>
            </div>
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-500/20">
              Step {step} of 3
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome! Let's get to know you.</h2>
          <p className="text-slate-400 text-sm">This helps us customize your JLPT study path.</p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-6">
            <div
              className="bg-gradient-to-r from-indigo-600 to-rose-500 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <form
            onSubmit={(e) => { e.preventDefault(); step < 3 ? nextStep() : handleSubmit(e); }}
            className="space-y-6"
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <RoleSelector formData={formData} handleChange={handleChange} loginMethod={loginMethod} />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="step2" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ProfileSetup formData={formData} handleChange={handleChange} />
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="step3" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.3 }}>
                  <StepBio formData={formData} handleChange={handleChange} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                    <Clock size={20} className="text-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-rose-500 text-xs font-black uppercase tracking-widest">
                      {error === "SESSION_EXPIRED" ? "Security Session Timed Out" : "Validation Error"}
                    </p>
                    <p className="text-slate-400 text-[11px] font-medium mt-1">
                      {error === "SESSION_EXPIRED"
                        ? "For your protection, password changes require a fresh login. Don't worry, your progress is cached."
                        : error}
                    </p>
                  </div>
                  {error === "SESSION_EXPIRED" && (
                    <button
                      onClick={requestLogout} type="button"
                      className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                      LOGOUT & RE-AUTHENTICATE
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-2">
              <button
                type="button" onClick={prevStep} disabled={step === 1 || loading}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${step === 1 ? 'opacity-0 cursor-default' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                Back
              </button>
              {step < 3 ? (
                <button
                  type="button" onClick={nextStep} disabled={loading}
                  className="px-10 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95"
                >
                  {loading ? 'Processing...' : 'Next Step'}
                </button>
              ) : (
                <button
                  type="submit" disabled={loading}
                  className="px-10 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      {/* Confirmation Shield — sits above everything */}
      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} />
    </div>
  );
}