import React, { useState } from 'react';
import { 
  Ticket, Plus, Trash2, Save, HardHat, Loader2
} from 'lucide-react';

// 🚨 1. IMPORT FIREBASE DEPS
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function BatchSettings({ batchData, isDarkMode }) {
  // Local state initialized from Firebase data
  const [coupons, setCoupons] = useState(batchData?.coupons || []);
  const [isSaving, setIsSaving] = useState(false); 

  // State for creating a new coupon
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');

  const handleAddCoupon = () => {
    if (!newCode || !newDiscount || !newMaxUses) return;
    
    // Create new coupon matching your Firebase schema exactly
    const newCoupon = {
      code: newCode.toUpperCase(),
      discount: newDiscount.toString(), 
      maxUses: newMaxUses.toString(),   
      usedCount: 0                      
    };

    setCoupons([...coupons, newCoupon]);
    
    setNewCode('');
    setNewDiscount('');
    setNewMaxUses('');
  };

  const removeCoupon = (codeToRemove) => {
    setCoupons(coupons.filter(c => c.code !== codeToRemove));
  };

  // 🚨 2. THE FIREBASE SAVE FUNCTION
  const handleSaveToFirestore = async () => {
    if (!batchData?.id) {
      alert("Error: Missing Batch ID. Cannot save to Firestore.");
      return;
    }

    setIsSaving(true);
    try {
      const batchRef = doc(db, 'batches', batchData.id);
      
      await updateDoc(batchRef, {
        coupons: coupons
      });

      alert("Batch settings saved successfully!");
    } catch (error) {
      console.error("Error updating Firestore:", error);
      alert("Failed to save settings. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 🚀 HEADER & SAVE BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 dark:border-white/10 border-slate-200">
        <div>
          <h2 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Batch Configuration
          </h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
            Editing settings for: <span className="text-indigo-500">{batchData?.title || 'Current Batch'}</span>
          </p>
        </div>

        {/* 🚨 3. THE SAVE BUTTON */}
        <button 
          onClick={handleSaveToFirestore}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 group ${
            isSaving 
              ? 'bg-slate-500 text-white cursor-not-allowed opacity-80' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20'
          }`}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} className="group-hover:scale-110 transition-transform" />
          )}
          {isSaving ? 'Saving to Database...' : 'Save Changes'}
        </button>
      </div>

      {/* 🎟️ COUPON MANAGER */}
      <section className="space-y-4">
        <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <Ticket size={14} /> Coupon & Promo Codes
        </h3>

        <div className={`p-6 sm:p-8 rounded-[2rem] border ${isDarkMode ? 'bg-[#0B1120] border-white/5' : 'bg-white border-slate-200'}`}>
          
          {/* Add New Coupon Form */}
          <div className={`p-4 rounded-2xl border mb-8 flex flex-col sm:flex-row gap-3 items-end ${isDarkMode ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-full sm:flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Coupon Code</label>
              <input 
                type="text" 
                placeholder="e.g. FREEYON"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black tracking-widest outline-none border transition-colors ${isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
              />
            </div>
            
            <div className="w-full sm:w-28 space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Discount (%)</label>
              <input 
                type="number" 
                placeholder="100"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black outline-none border transition-colors ${isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
              />
            </div>

            <div className="w-full sm:w-28 space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Max Uses</label>
              <input 
                type="number" 
                placeholder="10"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-black outline-none border transition-colors ${isDarkMode ? 'bg-slate-950 border-white/10 text-white focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
              />
            </div>

            <button 
              onClick={handleAddCoupon}
              className="w-full sm:w-auto px-6 py-3 h-[42px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Active Coupons List */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 dark:border-white/10 border-slate-200">
              Active Database Records
            </p>

            {coupons.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center opacity-50">
                <Ticket size={32} className="text-slate-400 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">No coupons active</p>
              </div>
            ) : (
              coupons.map((coupon, idx) => {
                const maxUsesInt = parseInt(coupon.maxUses) || 1;
                const isMaxedOut = coupon.usedCount >= maxUsesInt;
                const usagePercent = (coupon.usedCount / maxUsesInt) * 100;

                return (
                  <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${isMaxedOut ? (isDarkMode ? 'bg-slate-900 border-white/5 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60') : (isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200')}`}>
                    
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${isMaxedOut ? 'bg-slate-500/20 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}>
                        %
                      </div>
                      <div>
                        <p className={`text-lg font-black tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'} ${isMaxedOut && 'line-through decoration-slate-500'}`}>
                          {coupon.code}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {coupon.discount}% Discount Amount
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="w-32 sm:w-40 space-y-2">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                          <span>Used: {coupon.usedCount}</span>
                          <span>Max: {coupon.maxUses}</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isMaxedOut ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => removeCoupon(coupon.code)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 🚧 PLACEHOLDER FOR FUTURE SETTINGS */}
      <section className="pt-8">
        <div className={`p-10 rounded-[2rem] border border-dashed flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-[#0B1120]/50 border-white/10' : 'bg-slate-50 border-slate-300'}`}>
          <div className="w-16 h-16 bg-slate-500/10 text-slate-400 rounded-3xl flex items-center justify-center mb-4">
            <HardHat size={28} />
          </div>
          <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Advanced Settings Coming Soon
          </h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-sm">
            Pricing, vault security, and drip-schedule configurations will be deployed in a future update.
          </p>
        </div>
      </section>

    </div>
  );
}