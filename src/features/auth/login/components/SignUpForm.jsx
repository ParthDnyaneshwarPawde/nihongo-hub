import React from 'react';

export default function SignUpForm({ onStartOnboarding, onSwitchToLogin }) {
  return (
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
        type="button"
        onClick={onStartOnboarding}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all active:scale-95 mt-4 flex items-center justify-center gap-3"
      >
        START ONBOARDING <span className="text-xl leading-none">→</span>
      </button>
    </div>
  );
}
