import React from 'react';

export default function ProfileSetup({ formData, handleChange }) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <h3 className="text-xl font-black text-white">Japanese Proficiency</h3>

      {/* Previous Score & Level */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Previous Level</label>
          <select
            name="jlptLevel" value={formData.jlptLevel} onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500"
          >
            <option value="">None / Beginner</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className={`text-[10px] font-black uppercase tracking-widest ml-1 transition-colors ${!formData.jlptLevel ? 'text-slate-700' : 'text-slate-500'}`}>
            Previous Score {!formData.jlptLevel && "(N/A)"}
          </label>
          <div className="relative">
            <input
              type="number" name="jlptScore" value={formData.jlptScore} onChange={handleChange}
              disabled={!formData.jlptLevel}
              placeholder={!formData.jlptLevel ? "---" : "0"}
              className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none transition-all pr-16
                ${!formData.jlptLevel
                  ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500 shadow-lg shadow-indigo-500/5'}`}
            />
            {formData.jlptLevel && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">/ 180</div>
            )}
          </div>
        </div>
      </div>

      {/* Target Level */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Level</label>
        <select
          name="targetLevel" value={formData.targetLevel} onChange={handleChange}
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500"
        >
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
        </select>
      </div>

      {/* Exam Date */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Next Exam Target</label>
        <div className="grid grid-cols-2 gap-4">
          <select
            name="examMonth" value={formData.examMonth} onChange={handleChange}
            className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            <option value="July">July</option>
            <option value="December">December</option>
          </select>
          <select
            name="examYear" value={formData.examYear} onChange={handleChange}
            className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Target Exam City */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Exam City</label>
        {formData.country?.toLowerCase() === 'india' ? (
          <select
            name="targetCity" value={formData.targetCity} onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500"
          >
            <option value="">Select Center</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Pune">Pune</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Chennai">Chennai</option>
            <option value="Santiniketan">Santiniketan</option>
            <option value="Salem">Salem</option>
            <option value="Karur">Karur</option>
          </select>
        ) : (
          <input
            type="text" name="targetCity" value={formData.targetCity} onChange={handleChange}
            placeholder="Enter your local JLPT center"
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 font-bold"
          />
        )}
      </div>
    </div>
  );
}
