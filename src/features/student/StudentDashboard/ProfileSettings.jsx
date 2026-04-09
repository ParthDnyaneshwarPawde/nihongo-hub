import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  ArrowLeft, User, Phone, FileText, BookOpen, 
  Target, Calendar, Award, Lock, LogOut, Save, 
  CheckCircle2, AlertCircle, Heart
} from 'lucide-react';
import { useLogoutConfirm } from '@hooks/useLogoutConfirm';
import LogoutShield from '@components/shared/LogoutShield';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [resetSent, setResetSent] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    interests: '',
    previousLevel: 'None',
    highestScore: '',
    targetLevel: 'JLPT N5',
    targetDate: ''
  });

  // Load User Data on Mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            bio: data.bio || '',
            interests: data.interests || '',
            previousLevel: data.previousLevel || 'None',
            highestScore: data.highestScore || '',
            targetLevel: data.targetLevel || 'JLPT N5',
            targetDate: data.targetDate || ''
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Save Data to Firestore
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, formData);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 4000); // Hide after 4 seconds
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Password Reset Logic
  const handlePasswordReset = async () => {
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setResetSent(true);
      setMessage({ 
        type: 'success', 
        text: `A password reset link has been sent to ${auth.currentUser.email}.` 
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send reset email. ' + err.message });
    }
  };

  const { isConfirming, requestLogout, cancelLogout, confirmLogout } = useLogoutConfirm();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-black">Loading Profile...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} // Goes back to Dashboard
              className="p-2 -ml-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Profile Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-200">
              {formData.firstName ? formData.firstName[0].toUpperCase() : 'S'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8">
        
        {/* DYNAMIC ALERT BANNER */}
        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 border shadow-sm
            ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Actions & Danger Zone */}
          <div className="space-y-6 md:col-span-1">
            
            {/* Account Card */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Account Security</p>
              
              <button 
                onClick={handlePasswordReset}
                disabled={resetSent}
                className="w-full mb-4 flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock size={18} />
                {resetSent ? "Link Sent!" : "Reset Password"}
              </button>

              <button 
                onClick={requestLogout}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors font-bold text-sm"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: The Form */}
          <div className="md:col-span-2 space-y-8">
            <form onSubmit={handleSave} className="space-y-8">
              
              {/* SECTION 1: Personal Details */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                  <User size={24} className="text-indigo-500" />
                  <h2 className="text-xl font-black">Personal Details</h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><Phone size={12}/> Mobile Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" placeholder="+91 XXXXX XXXXX" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><FileText size={12}/> Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 resize-none" placeholder="Tell us about your Japanese journey..."></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><Heart size={12}/> Interests</label>
                  <input type="text" name="interests" value={formData.interests} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" placeholder="e.g. Anime, Manga, Tech, Travel" />
                </div>
              </div>

              {/* SECTION 2: Academic Profile */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                  <BookOpen size={24} className="text-rose-500" />
                  <h2 className="text-xl font-black">Academy Profile</h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><Award size={12}/> Previous JLPT</label>
                    <select name="previousLevel" value={formData.previousLevel} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 bg-white">
                      <option value="None">None</option>
                      <option value="JLPT N5">JLPT N5</option>
                      <option value="JLPT N4">JLPT N4</option>
                      <option value="JLPT N3">JLPT N3</option>
                      <option value="JLPT N2">JLPT N2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Past Score</label>
                    <input type="number" name="highestScore" value={formData.highestScore} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" placeholder="e.g. 110/180" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><Target size={12}/> Target Level</label>
                    <select name="targetLevel" value={formData.targetLevel} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 bg-white">
                      <option value="JLPT N5">JLPT N5</option>
                      <option value="JLPT N4">JLPT N4</option>
                      <option value="JLPT N3">JLPT N3</option>
                      <option value="JLPT N2">JLPT N2</option>
                      <option value="JLPT N1">JLPT N1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><Calendar size={12}/> Target Date</label>
                    <input type="month" name="targetDate" value={formData.targetDate} onChange={handleChange} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" />
                  </div>
                </div>
              </div>

              {/* SAVE BUTTON */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {saving ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    SAVE CHANGES
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      </main>

      {/* Confirmation Shield */}
      <LogoutShield isOpen={isConfirming} onCancel={cancelLogout} onConfirm={confirmLogout} isDarkMode={false} />
    </div>
  );
}