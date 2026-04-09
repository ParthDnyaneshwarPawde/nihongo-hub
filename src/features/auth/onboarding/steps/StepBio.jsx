import React from 'react';

function InputGroup({ label, ...props }) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
      />
    </div>
  );
}

export default function StepBio({ formData, handleChange }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase">Your Story (Bio)</label>
        <textarea
          name="bio" value={formData.bio} onChange={handleChange} rows="4"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
          placeholder="Why are you learning Japanese? Travel, Anime, Career?..."
        ></textarea>
      </div>
      <InputGroup label="Hobbies & Interests" name="interests" value={formData.interests} onChange={handleChange} placeholder="Anime, Gaming, Cooking..." />
    </div>
  );
}
