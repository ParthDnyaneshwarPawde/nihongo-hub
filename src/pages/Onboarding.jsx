import { useState, useEffect } from 'react';
import { updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Eye, EyeOff, Video, Mic, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
// --- ADDED FIREBASE IMPORTS ---
import { getAuth } from 'firebase/auth';
// import { updatePassword } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // 👈 Add this
import { signOut } from 'firebase/auth'; // 👈 Added signOut here

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false); // Added loading state for UX
  const [loginMethod, setLoginMethod] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    countryCode: '+91',
  country: '',
  state: '',
  city: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    jlptScore: '',
    jlptLevel: '',
    targetLevel: 'N4',
    nextExamDate: '',
    examMonth: 'July', // Default to July
  examYear: '2026',
    targetCity: '',
    bio: '',
    interests: ''
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Find out if they used Google or Email/Pass
      const provider = user.providerData[0]?.providerId; 
      setLoginMethod(provider);

      setFormData(prev => ({ 
        ...prev, 
        email: user.email,
        // If Email user, fill with dots. If Google, leave empty to allow typing.
        password: '', 
        confirmPassword: ''
      }));
    }
  }, []);

  const handleChange = (e) => {

    const { name, value } = e.target;
  
  // 🚨 THE FIX: Real-time Score Capping
  if (name === 'jlptScore') {
    // If the value is higher than 180, force it back to 180
    if (parseInt(value) > 180) {
      setFormData({ ...formData, [name]: '180' });
      setError("Note: Maximum JLPT score is 180.");
      return;
    }
    // Prevent negative numbers
    if (parseInt(value) < 0) {
      setFormData({ ...formData, [name]: '0' });
      return;
    }
  }
    if (error) setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- UPDATE THIS FUNCTION ---
const nextStep = async () => {
    setError(''); // Clear previous errors

    if (step === 1) {
      // --- 1. LOCAL VALIDATION FIRST (Before talking to Firebase) ---
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError("Identification: Please enter your first and last name.");
        return;
      }
      if (formData.phone.length < 10) {
        setError("Contact: Please enter a valid mobile number.");
        return;
      }
      if (!formData.dob) {
        setError("DOB: Please select your date of birth.");
        return;
      }
      
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }

      if (age < 14) {
        setError("Policy: You must be at least 14 years old to join the Academy.");
        return;
      }
      if (!formData.country || !formData.state || !formData.city) {
        setError("Location: Please complete your Country, State, and City info.");
        return;
      }

      // --- 2. FIREBASE AUTH (Start Loading!) ---
      setLoading(true);

      try {
        if (!auth.currentUser) {
          // Creating a New Account
          if (!formData.email || !formData.password) {
            throw new Error("Account: Email and Password are required.");
          }
          if (formData.password !== formData.confirmPassword) {
            throw new Error("Mismatch: Passwords do not match.");
          }
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          if (!passwordRegex.test(formData.password)) {
            throw new Error("Security: Password must be 8+ chars, 1 uppercase, 1 number, 1 symbol.");
          }

          // Create the user
          await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          setLoginMethod('password'); 

        } else if (loginMethod === 'google.com') {
          // Updating Google Account Password
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          if (!formData.password || !formData.confirmPassword) {
            throw new Error("Security required: Please set a password.");
          }
          if (formData.password !== formData.confirmPassword) {
            throw new Error("Mismatch: Passwords do not match.");
          }
          if (!passwordRegex.test(formData.password)) {
            throw new Error("Security: Password must be 8+ chars, include 1 uppercase, 1 number, and 1 symbol (@$!%*?&).");
          }

          await updatePassword(auth.currentUser, formData.password);
        }
      } catch (err) {
        // 🚨 CRITICAL FIX: Turn loading OFF if there is an error
        setLoading(false);
        
        if (err.code === 'auth/email-already-in-use') {
          setError("This email is already registered. Please go back and Sign In.");
        } else if (err.code === 'auth/requires-recent-login') {
          setError("SESSION_EXPIRED"); 
        } else {
          setError(err.message.replace('Error: ', '')); // Clean up the error text
        }
        return; // Stop them from moving to Step 2
      }

      // 🚨 CRITICAL FIX: Turn loading OFF when it succeeds!
      setLoading(false);
    }

    // --- STEP 2 VALIDATION ---
    if (step === 2) {
      if (!formData.targetLevel) {
        setError("Please select a target JLPT level.");
        return;
      }
    }

    if (step < 3) {
      setStep(prev => prev + 1);
      return;
    }

    // If all checks pass, go to next step
    setStep((prev) => Math.min(prev + 1, 3));
  };
const calculateAge = (birthday) => {
  const ageDifMs = Date.now() - new Date(birthday).getTime();
  const ageDate = new Date(ageDifMs); 
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
  const handleLogout = async () => {
  try {
    const user = auth.currentUser;
    
    // --- OPTIONAL BUT SMART ---
    // Save their current progress to Firestore so they don't have to 
    // re-type their name/phone when they log back in.
    if (user) {
      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        onboardingComplete: false 
      }, { merge: true });
    }

    await signOut(auth); // Sign them out of Firebase
    navigate('/');       // Send them back to the Login page
  } catch (err) {
    console.error("Logout Error:", err);
    // If logout fails, just force them to the home page
    navigate('/');
  }
};

  // --- UPGRADED SUBMIT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🚨 THE FIREWALL: Prevent submission if not on the final step
    if (step < 3) {
      console.log("Submit blocked: Not on Step 3 yet. Running nextStep() instead.");
      nextStep();
      return;
    }

    
    // 1. Password Check for Google users
    if (loginMethod === 'google.com' && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
    if (!user) throw new Error("No user found. Please login again.");

    // Convert interests string to array
    const interestsArray = formData.interests
      ? formData.interests.split(',').map(i => i.trim()).filter(i => i !== "")
      : [];

    // 🚨 THE CRITICAL PART: Use setDoc with { merge: true }
    await setDoc(doc(db, "users", user.uid), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      countryCode: formData.countryCode,
      dob: formData.dob,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      jlptLevel: formData.jlptLevel,
      jlptScore: formData.jlptScore,
      targetLevel: formData.targetLevel,
      examMonth: formData.examMonth,
      examYear: formData.examYear,
      targetCity: formData.targetCity,
      bio: formData.bio,
      interests: interestsArray,
      onboardingComplete: true, // 👈 Marks the process as finished
      role: 'student',
      enrolledCourses: [],
      completedLessons: [],
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
      email: formData.email,
    }, { merge: true }); // 👈 This prevents the "Already in use" conflict

    navigate('/student-dashboard');
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // This creates an array: [2026, 2027, 2028, 2029, 2030]
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());

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
          <form onSubmit={(e) => {
    e.preventDefault(); // Stop the page refresh
    if (step < 3) {
      // If they hit 'Enter' on Step 1 or 2, just trigger nextStep
      nextStep();
    } else {
      // Only allow handleSubmit to run on Step 3
      handleSubmit(e);
    }
  }} className="space-y-6">
            
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-500">
  
  {/* SECTION 1: ACCOUNT SECURITY */}
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
      <input 
      name="email" 
    type="email" 
    value={formData.email} 
    onChange={handleChange} 
        disabled={!!auth.currentUser}
        placeholder='Email'
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
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
    <div className="relative">
      <input 
        type={showConfirm ? "text" : "password"}
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
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
        type="button"
        onClick={() => setShowConfirm(!showConfirm)}
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
      <div className="space-y-2 w-full"> {/* Ensure parent is full width */}
  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
    Mobile Number
  </label>
  <div className="flex gap-2 w-full"> {/* Flex container */}
    <select 
      name="countryCode" 
      value={formData.countryCode} 
      onChange={handleChange}
      className="bg-slate-900 border border-slate-700 rounded-2xl px-3 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer shrink-0"
      style={{ minWidth: '80px' }} // Keeps the flag/code from getting squashed
    >
      <option value="+91">🇮🇳 +91</option>
      <option value="+81">🇯🇵 +81</option>
      <option value="+1">🇺🇸 +1</option>
    </select>
    
    <input 
      type="tel" 
      name="phone" 
      value={formData.phone} 
      onChange={handleChange} 
      placeholder="98765 43210"
      className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:border-indigo-500 font-bold transition-all"
      /* min-w-0 is the secret here - it tells the input it's allowed to be smaller than its content */
    />
  </div>
</div>
      <InputGroup label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} isDate />
    </div>
  </div>

  {/* SECTION 3: LOCATION (CLEAN 3-COLUMN GRID) */}
  <div className="pt-6 border-t border-slate-800/50">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <InputGroup label="Country" name="country" value={formData.country} onChange={handleChange} placeholder="India" />
      <InputGroup label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" />
      <InputGroup label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Mumbai" />
    </div>
  </div>

</div>

            )}

            {/* STEP 2: JLPT & Goals */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
    <h3 className="text-xl font-black text-white">Japanese Proficiency</h3>

    {/* Previous Score & Level */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  {/* Previous Level Dropdown */}
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
      Previous Level
    </label>
    <select 
      name="jlptLevel" 
      value={formData.jlptLevel} 
      onChange={handleChange} 
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

  {/* Previous Score (Conditionally Disabled) */}
  <div className="space-y-2">
    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 transition-colors ${!formData.jlptLevel ? 'text-slate-700' : 'text-slate-500'}`}>
      Previous Score {!formData.jlptLevel && "(N/A)"}
    </label>
    <div className="relative">
      <input 
        type="number" 
        name="jlptScore" 
        value={formData.jlptScore} 
        onChange={handleChange}
        disabled={!formData.jlptLevel} // 👈 LOCKS THE FIELD
        placeholder={!formData.jlptLevel ? "---" : "0"}
        className={`w-full border rounded-2xl px-5 py-4 font-bold outline-none transition-all pr-16
          ${!formData.jlptLevel 
            ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed' // Greyed out
            : 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500 shadow-lg shadow-indigo-500/5'}`}
      />
      {formData.jlptLevel && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
          / 180
        </div>
      )}
    </div>
  </div>
</div>

    {/* Restricted Exam Date Selection */}
    <div className="space-y-2">
  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
    Next Exam Target
  </label>
  <div className="grid grid-cols-2 gap-4">
    {/* Month Dropdown */}
    <select 
      name="examMonth" 
      value={formData.examMonth} 
      onChange={handleChange} 
      className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer"
    >
      <option value="July">July</option>
      <option value="December">December</option>
    </select>

    {/* Dynamic Year Dropdown */}
    <select 
      name="examYear" 
      value={formData.examYear} 
      onChange={handleChange} 
      className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-indigo-500 appearance-none cursor-pointer"
    >
      {yearOptions.map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  </div>
</div>

    {/* Conditional City Dropdown */}
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

            {/* --- ERROR DISPLAY AREA --- */}
{/* --- IMPROVED ERROR DISPLAY --- */}
{error && (
  <div className="mb-6 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] animate-in slide-in-from-top-4 duration-300">
    <div className="flex flex-col items-center text-center gap-4">
      <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
        <Clock size={20} className="text-rose-500 animate-pulse" />
      </div>
      
      <div>
        <p className="text-rose-500 text-xs font-black uppercase tracking-widest">
          {error === "SESSION_EXPIRED" ? "Security Session Timed Out" : "Validation Error"}
        </p>
        <p className="text-slate-400 text-[11px] font-medium mt-1">
          {error === "SESSION_EXPIRED" 
            ? "For your protection, password changes require a fresh login. Don't worry, your progress is cached." 
            : error}
        </p>
      </div>

      {error === "SESSION_EXPIRED" && (
        <button 
          onClick={handleLogout}
          className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-95"
        >
          LOGOUT & RE-AUTHENTICATE
        </button>
      )}
    </div>
  </div>
)}

{/* Navigation Buttons */}
<div className="flex justify-between pt-6 border-t border-slate-800/50 mt-2">
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
                  disabled={loading}
                  className="px-10 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95"
                >
                  {loading ? 'Processing...' : 'Next Step'}
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

            {/* Navigation Buttons
            <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-8">
              
            </div> */}
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