import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm({
  email, setEmail, password, setPassword,
  showPassword, setShowPassword,
  onSubmit, onForgotPassword, loading
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
          placeholder="sensei@hub.com"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2 mx-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Key</label>
          <button type="button" onClick={onForgotPassword} disabled={loading} className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors disabled:opacity-50">
            Forgot?
          </button>
        </div>
        <div className="relative group">
          <input
            type={showPassword ? "text" : "password"} value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-6 py-4 pr-12 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 mt-2 disabled:opacity-50">
        SIGN IN
      </button>
    </form>
  );
}
