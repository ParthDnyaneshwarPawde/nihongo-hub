import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '@services/firebase';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  loginWithEmail: async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  registerWithEmail: async (email, password) => {
    return await createUserWithEmailAndPassword(auth, email, password);
  },

  loginWithGoogle: async () => {
    return await signInWithPopup(auth, googleProvider);
  },

  logout: async () => {
    return await signOut(auth);
  },

  // Observes auth state. Returns the unsubscribe function.
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};
