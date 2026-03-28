import React from 'react';
import { Bell, Sparkles } from 'lucide-react';
import InviteCard from './InviteCard';

export default function InviteSection({ invites, onAccept, onReject, isDark }) {
  // Only render if there are actually pending invites
  if (!invites || invites.length === 0) return null;

  return (
    <section className="mb-16 animate-in fade-in slide-in-from-top-6 duration-1000">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 animate-pulse" />
            <div className={`relative p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'}`}>
              <Bell size={24} className="animate-bounce" />
            </div>
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Collaboration Requests
            </h2>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-indigo-500" />
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">
                Senseis requesting your expertise
              </p>
            </div>
          </div>
        </div>
        
        <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black border border-indigo-500/20">
          {invites.length} PENDING
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {invites.map((invite) => (
          <InviteCard 
            key={invite.id} 
            invite={invite} 
            onAccept={() => onAccept(invite)} 
            onReject={() => onReject(invite.id)}
            isDark={isDark} 
          />
        ))}
      </div>
    </section>
  );
}