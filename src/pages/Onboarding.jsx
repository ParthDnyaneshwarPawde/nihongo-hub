import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// --- ADDED FIREBASE IMPORTS ---
import { auth, db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); // Added loading state for UX

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    jlptScore: '',
    jlptLevel: '',
    targetLevel: 'N4',
    nextExamDate: '',
    targetCity: '',
    bio: '',
    interests: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // --- UPGRADED SUBMIT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found. Please login again.");

      // Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        role: 'student',
        onboardingComplete: true,
        setupAt: new Date().toISOString()
      }, { merge: true });

      navigate('/student-dashboard');
    } catch (error) {
      console.error("Onboarding Error:", error);
      alert("Something went wrong: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans flex items-center justify-center p-6">
      
      {/* Container */}
      <div className="w-full max-w-2xl bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header Content */}
        <div className="p-8 border-b border-slate-800 relative bg-gradient-to-r from-slate-950 to-slate-900">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl text-rose-500 font-bold font-serif">桜</span>
              <span className="text-2xl font-bold text-white tracking-tight">Nihongo Hub</span>
            </div>
            {/* Step Counter Badge */}
            <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-500/20">
              Step {step} of 3
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome! Let's get to know you.</h2>
          <p className="text-slate-400 text-sm">This helps us customize your JLPT study path.</p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-6">
            <div 
              className="bg-gradient-to-r from-indigo-600 to-rose-500 h-1.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Takeshi" required />
                  <InputGroup label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Kovacs" required />
                </div>
                <InputGroup label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required isDate />
                <InputGroup label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
              </div>
            )}

            {/* STEP 2: JLPT & Goals */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Previous JLPT Level</label>
                    <select 
                      name="jlptLevel" value={formData.jlptLevel} onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    >
                      <option value="">None</option>
                      <option value="N5">N5</option>
                      <option value="N4">N4</option>
                      <option value="N3">N3</option>
                      <option value="N2">N2</option>
                      <option value="N1">N1</option>
                    </select>
                  </div>
                  <InputGroup label="Previous Score" name="jlptScore" type="number" value={formData.jlptScore} onChange={handleChange} placeholder="e.g. 120" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Target JLPT Level</label>
                  <select 
                    name="targetLevel" value={formData.targetLevel} onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                  >
                    <option value="N5">JLPT N5</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N3">JLPT N3</option>
                    <option value="N2">JLPT N2</option>
                    <option value="N1">JLPT N1</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Next Exam Date" name="nextExamDate" type="month" value={formData.nextExamDate} onChange={handleChange} isDate />
                  <InputGroup label="Target Exam City" name="targetCity" value={formData.targetCity} onChange={handleChange} placeholder="e.g. New Delhi" />
                </div>
              </div>
            )}

            {/* STEP 3: Bio & Interests */}
            {step === 3 && (
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
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-8">
              <button 
                type="button" 
                onClick={prevStep} 
                disabled={step === 1 || loading}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  step === 1 
                    ? 'opacity-0 cursor-default' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Back
              </button>

              {step < 3 ? (
                <button 
                  type="button" 
                  onClick={nextStep}
                  className="px-10 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper component for cleaner inputs
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