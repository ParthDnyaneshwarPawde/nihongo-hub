import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '@services/firebase';

function InputGroup({ label, isDate, ...props }) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600 ${isDate ? '[color-scheme:dark]' : ''}`}
      />
    </div>
  );
}

export default function RoleSelector({ formData, handleChange, loginMethod }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const user = auth.currentUser;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* SECTION 1: ACCOUNT SECURITY */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
          <input
            name="email" type="email" value={formData.email} onChange={handleChange}
            disabled={!!user} placeholder="Email"
            className="w-full bg-slate-800/40 border border-slate-800 rounded-2xl px-5 py-4 text-slate-500 cursor-not-allowed font-bold"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password" name="password" value={formData.password} onChange={handleChange}
              disabled={loginMethod === 'new'}
              placeholder={loginMethod === 'new' ? "••••••••" : "Min. 8 Chars"}
              className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none transition-all
                ${loginMethod === 'new'
                  ? 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'}`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                placeholder="Re-type to verify"
                className={`w-full border rounded-2xl px-5 pr-12 py-4 font-bold outline-none transition-all duration-300
                  ${(formData.confirmPassword !== "" && formData.password !== formData.confirmPassword)
                    ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.1)]'
                    : (formData.confirmPassword !== "" && formData.password === formData.confirmPassword)
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                  }`}
              />
              <button
                type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONAL IDENTITY */}
      <div className="pt-6 border-t border-slate-800/50 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputGroup label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Takeshi" />
          <InputGroup label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Kovacs" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2 w-full">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
            <div className="flex gap-2 w-full">
              <select
                name="countryCode" value={formData.countryCode} onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded-2xl px-3 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer shrink-0"
                style={{ minWidth: '80px' }}
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+1">🇺🇸 +1</option>
              </select>
              <input
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="98765 43210"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 font-bold transition-all"
              />
            </div>
          </div>
          <InputGroup label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} isDate />
        </div>
      </div>

      {/* SECTION 3: LOCATION */}
      <div className="pt-6 border-t border-slate-800/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputGroup label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="India" />
          <InputGroup label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" />
          <InputGroup label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Mumbai" />
        </div>
      </div>

    </div>
  );
}
