import React from 'react';

export default function Stat({ icon, count, color, bg }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`p-2.5 rounded-xl ${bg} ${color} shadow-inner`}>{icon}</div>
      <span className="text-sm font-black text-slate-500">{count}</span>
    </div>
  );
}
