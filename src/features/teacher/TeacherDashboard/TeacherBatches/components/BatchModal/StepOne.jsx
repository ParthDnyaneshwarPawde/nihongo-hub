import React from 'react';
import { Tag, X, Search, Plus, Shield, ArrowRight, RotateCw } from 'lucide-react'; // 🚨 Added RotateCw
import { auth } from '@services/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const BATCH_LEVELS = ["JLPT N5", "JLPT N4", "JLPT N3", "JLPT N2", "JLPT N1", "Custom Course"];

export default function StepOne({
  newBatch, setNewBatch, editingBatchId,
  couponInput, setCouponInput, addedCoupons, setAddedCoupons,
  isCurrentUserLead, leadTeacherName,
  teacherSearch, setTeacherSearch, foundTeachers,
  selectedTeachers, setSelectedTeachers, 
  pendingSentInvites = [], // 🚨 NEW PROP: Invites waiting for acceptance
  onNext,
  onRemoveCollaborator, // 🚨 ADD THIS
  onCancelInvite
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-in slide-in-from-right-8 duration-500">
      <div className="space-y-8">
        {/* --- PRODUCT TITLE & MODEL (Existing UI) --- */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
            Product Title {editingBatchId && <span className="text-rose-500 ml-2">(LOCKED)</span>}
          </label>
          <input 
            required 
            value={newBatch.title} 
            onChange={e => setNewBatch({...newBatch, title: e.target.value})} 
            disabled={!!editingBatchId}
            className={`w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white font-bold text-lg transition-all outline-none ${
              editingBatchId ? 'opacity-50 cursor-not-allowed' : 'focus:border-indigo-500' 
            }`} 
            placeholder="Ex: Master N3 Vocabulary" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Tier</label>
            <select value={newBatch.level} onChange={e => setNewBatch({...newBatch, level: e.target.value})} className="w-full p-6 rounded-[2rem] bg-slate-900 border border-slate-800 text-white font-bold text-lg outline-none cursor-pointer">
              {BATCH_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Model</label>
            <button type="button" onClick={() => setNewBatch({...newBatch, isFree: !newBatch.isFree})} className={`w-full py-6 rounded-[2rem] font-black text-xs transition-all shadow-xl ${newBatch.isFree ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
              {newBatch.isFree ? 'FREE ACCESS' : 'PREMIUM'}
            </button>
          </div>
        </div>

        {/* --- PRICING & COUPONS (Existing UI) --- */}
        {!newBatch.isFree && (
          <div className="p-10 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10 space-y-8 shadow-inner animate-in zoom-in-95">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Listing Price (₹)</label>
              <input type="number" value={newBatch.price} onChange={e => setNewBatch({...newBatch, price: e.target.value})} className="w-full p-6 rounded-3xl bg-slate-950 border border-slate-800 text-white font-black text-2xl shadow-inner outline-none" />
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Limited Coupons</label>
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="CODE" value={couponInput.code} onChange={e => setCouponInput({...couponInput, code: e.target.value.toUpperCase()})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
                <input placeholder="-%" type="number" value={couponInput.discount} onChange={e => setCouponInput({...couponInput, discount: e.target.value})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
                <input placeholder="MAX" type="number" value={couponInput.maxUses} onChange={e => setCouponInput({...couponInput, maxUses: e.target.value})} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white text-xs font-black outline-none" />
              </div>
              <button type="button" onClick={() => { if(couponInput.code && couponInput.maxUses) { setAddedCoupons([...addedCoupons, couponInput]); setCouponInput({code:'', discount:'', maxUses:''}); }}} className="w-full py-4 bg-indigo-600/20 text-indigo-400 rounded-2xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 uppercase tracking-widest">Register Coupon</button>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto premium-scroll">
                {addedCoupons.map((c, i) => <div key={i} className="bg-indigo-600 text-white text-[9px] px-4 py-2 rounded-xl flex items-center gap-3 font-black">{c.code} (-{c.discount}%) • Qty: {c.maxUses} <X size={12} className="cursor-pointer hover:rotate-90 transition-all" onClick={() => setAddedCoupons(addedCoupons.filter((_, idx) => idx !== i))} /></div>)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8 flex flex-col">
        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">Collaborators</label>
        <div className="flex-1 bg-slate-950/50 p-10 rounded-[3rem] border border-slate-800 shadow-inner flex flex-col space-y-6">
          {/* --- SEARCH BAR (Lead Only) --- */}
          {isCurrentUserLead && (
            <>
              <div className="flex gap-2">
                <input 
                  value={teacherSearch} 
                  onChange={e => setTeacherSearch(e.target.value)} 
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all" 
                  placeholder="Search Sensei Name or UID..." 
                />
                <button type="button" className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg hover:scale-105 transition-all">
                  <Search size={20}/>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto premium-scroll pr-2 space-y-2">
                {teacherSearch.length === 0 ? (
                  <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-slate-600">Type to search registry</p>
                ) : foundTeachers.length === 0 ? (
                  <p className="text-[10px] uppercase font-black text-center mt-10 tracking-widest text-rose-500">No matching Sensei found</p>
                ) : (
                  foundTeachers.map(t => (
                    <div key={t.uid} className="flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div>
                        <p className="text-xs font-black text-white">{t.displayName}</p>
                        <p className="text-[9px] font-bold text-slate-500 tracking-wider">{t.email}</p> 
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setSelectedTeachers([...selectedTeachers, t]);
                          setTeacherSearch(''); 
                        }} 
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          
          {/* --- TEAM REGISTRY PILLS --- */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-3">
            <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
              <Shield size={12}/> Verified Lead ({isCurrentUserLead ? "You" : leadTeacherName})
            </span>

            <AnimatePresence>
              {/* Active Teachers (Accepted) */}
              {selectedTeachers.map(t => (
                <motion.span 
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  key={t.uid} 
                  className="bg-slate-800 text-white border border-slate-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2"
                >
                  {t.uid === auth.currentUser?.uid ? "You" : t.displayName}
                  
                  {isCurrentUserLead && t.uid !== auth.currentUser?.uid && (
                    <X 
                      size={12} 
                      className="cursor-pointer hover:text-rose-500 transition-colors ml-1" 
                      onClick={async () => {
                        if (window.confirm(`Permanently remove ${t.displayName}?`)) {
                          await onRemoveCollaborator(t); 
                        }
                      }} 
                    />
                  )}
                </motion.span>
              ))}

              {/* Pending Sent Invites */}
              {pendingSentInvites.map(invite => (
                <motion.span 
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  key={invite.id} 
                  className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2"
                >
                  <RotateCw size={10} className="animate-spin" />
                  Pending: {invite.targetName}
                  
                  {isCurrentUserLead && (
                    <X 
                      size={12} 
                      className="ml-1 cursor-pointer hover:text-rose-500 transition-colors" 
                      onClick={() => onCancelInvite(invite.id)} 
                    />
                  )}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <button type="button" onClick={onNext} className="w-full py-8 bg-white text-black font-black rounded-[2.5rem] flex items-center justify-center gap-4 hover:scale-[1.02] transition-all shadow-2xl uppercase tracking-[0.2em] text-sm">
          Next: Design Interface <ArrowRight size={20}/>
        </button>
      </div>
    </div>
  );
}