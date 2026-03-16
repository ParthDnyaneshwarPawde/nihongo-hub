import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMxIKxWYLxQ7lWalU8VTUNRW3xWzzOTpc",
  authDomain: "japanese-app-d2244.firebaseapp.com",
  projectId: "japanese-app-d2244",
  storageBucket: "japanese-app-d2244.firebasestorage.app",
  messagingSenderId: "403611281903",
  appId: "1:403611281903:web:00b2db0ff1e3704c866e1a",
  measurementId: "G-ZJFH4YZQ49"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();