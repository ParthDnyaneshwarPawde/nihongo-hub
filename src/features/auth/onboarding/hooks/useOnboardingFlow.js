import { useState, useEffect } from 'react';
import { updatePassword, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@services/firebase';
import { useNavigate } from 'react-router-dom';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    countryCode: '+91', country: '', state: '', city: '',
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', dob: '', phone: '',
    jlptScore: '', jlptLevel: '', targetLevel: 'N4',
    nextExamDate: '', examMonth: 'July', examYear: '2026',
    targetCity: '', bio: '', interests: ''
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const provider = user.providerData[0]?.providerId; 
      setLoginMethod(provider);
      setFormData(prev => ({ 
        ...prev, 
        email: user.email,
        password: '', 
        confirmPassword: ''
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'jlptScore') {
      if (parseInt(value) > 180) {
        setFormData({ ...formData, [name]: '180' });
        setError("Note: Maximum JLPT score is 180.");
        return;
      }
      if (parseInt(value) < 0) {
        setFormData({ ...formData, [name]: '0' });
        return;
      }
    }
    if (error) setError('');
    setFormData({ ...formData, [name]: value });
  };

  const nextStep = async () => {
    setError('');
    
    // Virtual step validation logic can be placed here matching original code.
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) return setError("Please enter your name.");
      if (formData.phone.length < 10) return setError("Please enter a valid mobile number.");
      if (!formData.dob) return setError("Please select your date of birth.");
      if (!formData.country || !formData.state || !formData.city) return setError("Please complete your Location info.");

      setLoading(true);
      try {
        if (!auth.currentUser) {
          if (!formData.email || !formData.password) throw new Error("Email and Password are required.");
          if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match.");
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          if (!passwordRegex.test(formData.password)) throw new Error("Security: Password requires 8+ chars, 1 uppercase, 1 number, 1 symbol.");
          await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          setLoginMethod('password'); 
        } else if (loginMethod === 'google.com') {
          if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match.");
          if (formData.password) await updatePassword(auth.currentUser, formData.password);
        }
      } catch (err) {
        setLoading(false);
        if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
        else if (err.code === 'auth/requires-recent-login') setError("SESSION_EXPIRED"); 
        else setError(err.message.replace('Error: ', '')); 
        return;
      }
      setLoading(false);
    }
    
    if (step === 2 && !formData.targetLevel) return setError("Please select a target level.");

    if (step < 3) setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  
  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (user) await setDoc(doc(db, "users", user.uid), { ...formData, onboardingComplete: false }, { merge: true });
      await signOut(auth);
      navigate('/');
    } catch (err) { navigate('/'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) { nextStep(); return; }

    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found. Please login again.");
      
      const interestsArray = formData.interests ? formData.interests.split(',').map(i => i.trim()).filter(i => i !== "") : [];

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
        onboardingComplete: true,
        role: 'student',
        enrolledCourses: [],
        completedLessons: [],
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
        email: formData.email,
      }, { merge: true });

      navigate('/student-dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    step,
    formData,
    handleChange,
    nextStep,
    prevStep,
    handleSubmit,
    handleLogout,
    loading,
    error,
    loginMethod
  };
}
