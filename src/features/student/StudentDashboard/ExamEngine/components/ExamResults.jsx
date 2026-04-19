import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  Zap, 
  BrainCircuit, 
  Star, 
  LineChart, 
  ChevronLeft, 
  X,
  Target
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@services/firebase';
import { doc, getDoc, writeBatch, increment } from 'firebase/firestore';

export default function ExamResults({ 
  score, 
  totalQuestions, 
  totalPossiblePoints, 
  examConfig, 
  totalTimeSpent, 
  isDarkMode 
}) {
  const { batchId, exerciseId } = useParams();
  const navigate = useNavigate();
  
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [redeemedStatus, setRedeemedStatus] = useState(null); 
  const [rewardData, setRewardData] = useState({ 
    participation: 0, 
    performance: 0, 
    noHintBonus: 0, 
    total: 0, 
    isRedeemed: false 
  });

  // Accuracy: (Total Score / Sum of all Question Points) * 100
  const accuracy = totalPossiblePoints > 0 
    ? Math.round((score / totalPossiblePoints) * 100) 
    : 0;

  const passed = accuracy >= (examConfig?.passPercentage || 80);

  // Fetch reward data from the database
  useEffect(() => {
    const fetchRewardStatus = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !batchId || !exerciseId) return;

      try {
        const userExerciseRef = doc(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId);
        const snap = await getDoc(userExerciseRef);

        if (snap.exists()) {
          const data = snap.data();
          const participation = Number(data.pointsEarned || 0);
          const performance = Number(data.firstAttemptScore || 0) * 10;
          const noHintBonus = Number(data.noHintBonusXP || 0); 
          
          setRewardData({
            participation,
            performance,
            noHintBonus,
            total: participation + performance + noHintBonus,
            isRedeemed: data.isRedeemed || false
          });
          
          if (data.isRedeemed) setRedeemedStatus('already_done');
        }
      } catch (err) {
        console.error("Reward fetch error:", err);
      }
    };
    fetchRewardStatus();
  }, [batchId, exerciseId]);

  const handleClaimReward = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || isRedeeming || redeemedStatus) return;

    setIsRedeeming(true);
    try {
      const userExerciseRef = doc(db, 'users', userId, 'Batches', batchId, 'exercises', exerciseId);
      const userMainRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      batch.update(userExerciseRef, { isRedeemed: true });
      batch.update(userMainRef, { xp: increment(rewardData.total) });

      await batch.commit();
      setRedeemedStatus('success');
      setShowModal(true); 
    } catch (error) {
      console.error("Redemption failed:", error);
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-[#0B1121] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background Visuals */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 10, repeat: Infinity }}
          className={`absolute -top-48 -left-48 w-[500px] h-[500px] blur-[120px] rounded-full ${passed ? 'bg-emerald-500' : 'bg-rose-500'}`} 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-lg w-full p-6 md:p-10 rounded-[3rem] border shadow-2xl text-center relative z-10 ${isDarkMode ? 'bg-[#151E2E]/90 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-2xl`}
      >
        {/* Trophy Section - Slightly Scaled Down */}
        <div className={`mx-auto w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 border-4 shadow-xl ${passed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}>
          <Trophy size={36} />
        </div>

        <h1 className="text-3xl font-black mb-1 tracking-tight">{passed ? "Assessment Cleared!" : "Training Required"}</h1>
        
        <div className="flex items-center justify-center gap-2 mb-8">
           <Target size={14} className={passed ? 'text-emerald-500' : 'text-rose-500'} />
           <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${passed ? 'text-emerald-500' : 'text-rose-500'}`}>
            Accuracy: {accuracy}%
          </p>
        </div>

        {/* REWARD CARD - Tightened Padding/Margins */}
        <div className={`mb-8 rounded-[2.5rem] p-6 border-2 border-dashed relative ${isDarkMode ? 'bg-[#0B1121]/60 border-slate-700' : 'bg-slate-50/80 border-slate-200'}`}>
          <div className="grid grid-cols-3 gap-3 mb-8">
            <RewardStat icon={<Star size={14}/>} label="Base" value={rewardData.participation} color="text-indigo-400" />
            <RewardStat icon={<Zap size={14}/>} label="Bonus" value={rewardData.performance} color="text-amber-500" />
            <RewardStat icon={<BrainCircuit size={14}/>} label="Purity" value={rewardData.noHintBonus} color={rewardData.noHintBonus > 0 ? "text-emerald-500" : "text-slate-500 opacity-40"} isStruck={rewardData.noHintBonus === 0} />
          </div>

          <motion.button 
            whileHover={{ scale: redeemedStatus ? 1 : 1.02 }}
            whileTap={{ scale: redeemedStatus ? 1 : 0.98 }}
            onClick={handleClaimReward}
            disabled={isRedeeming || !!redeemedStatus}
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-orange-500/10 ${
              redeemedStatus 
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
              : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white'
            }`}
          >
            <AnimatePresence mode="wait">
              {isRedeeming ? (
                <Loader2 className="animate-spin mx-auto" size={18} />
              ) : redeemedStatus === 'success' ? (
                <div className="flex items-center justify-center gap-2"><CheckCircle size={16}/> Points Redeemed</div>
              ) : redeemedStatus === 'already_done' ? (
                <span>XP Already Collected</span>
              ) : (
                <div className="flex items-center justify-center gap-2"><Sparkles size={16} className="animate-pulse" /> Claim {rewardData.total} XP Reward</div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Footer Actions - More Compact */}
        <div className="flex flex-col gap-3">
          <button className={`flex items-center justify-center gap-2 w-full py-4 text-[9px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <LineChart size={16} /> Calculate Deep Analytics
          </button>
          <button onClick={() => navigate(-1)} className={`flex items-center justify-center gap-2 w-full py-4 text-[9px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
            <ChevronLeft size={16} /> Return to Lecture Viewer
          </button>
        </div>
      </motion.div>

      {/* BREAKDOWN MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl relative z-10 ${isDarkMode ? 'bg-[#151E2E] border border-slate-800' : 'bg-white'}`}>
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-rose-500 transition-colors"><X size={20}/></button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4"><Sparkles size={32}/></div>
                <h2 className="text-2xl font-black mb-1">XP Collected!</h2>
                <p className="text-xs text-slate-500 font-bold">Points added to your global rank.</p>
              </div>
              <div className="space-y-3 mb-8">
                <BreakdownRow label="Participation" value={rewardData.participation} icon={<Star size={16} className="text-indigo-500"/>} />
                <BreakdownRow label="Performance" value={rewardData.performance} icon={<Zap size={16} className="text-amber-500"/>} />
                <BreakdownRow label="Purity Bonus" value={rewardData.noHintBonus} icon={<BrainCircuit size={16} className="text-emerald-500"/>} isZero={rewardData.noHintBonus === 0} />
              </div>
              <div className={`p-4 rounded-[1.5rem] mb-8 text-center ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5">Total</p>
                <p className="text-2xl font-black text-indigo-500">{rewardData.total} XP</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">Continue Learning</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RewardStat({ icon, label, value, color, isStruck }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`mb-1.5 ${color} p-2 bg-current/10 rounded-xl`}>{icon}</div>
      <p className="text-[8px] font-black uppercase text-slate-500 mb-0.5">{label}</p>
      <p className={`text-base font-black ${color} ${isStruck ? 'line-through opacity-50' : ''}`}>{value}</p>
    </div>
  );
}

function BreakdownRow({ label, value, icon, isZero }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${isZero ? 'opacity-40 grayscale border-slate-200' : 'border-slate-100 dark:border-slate-800'}`}>
      <div className="flex items-center gap-3">{icon}<span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{label}</span></div>
      <span className={`font-black text-sm ${isZero ? 'text-slate-400' : 'text-indigo-500'}`}>+{value}</span>
    </div>
  );
}