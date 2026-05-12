import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default config from environment or placeholders
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Extremely strict check to ensure we only initialize if we have what looks like real keys
// Real Google API keys usually start with AIza and are ~39 chars
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.startsWith('AIza') && 
  firebaseConfig.apiKey.length > 30 && 
  !firebaseConfig.apiKey.includes('YOUR_') &&
  firebaseConfig.projectId
);

let app: any = null;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("Maria AI: Firebase detected but failed to initialize. Falling back to Demo Mode.", error);
    auth = null;
    db = null;
  }
} else {
  console.log("Maria AI: Demo mode active (Simulation Mode)");
}

export { auth, db };
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

export const loginWithGoogle = async () => {
  if (!auth) {
    // Simulated Login for Demo / No Firebase
    console.log("Maria AI: Simulating Google Login...");
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          uid: 'demo-user-123',
          displayName: 'Demo User',
          email: 'demo@example.com',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        };
        // Persist mock user for persistence across refreshes
        localStorage.setItem('maria_mock_user', JSON.stringify(mockUser));
        // Trigger a custom event for the App component to pick up since onAuthStateChanged won't fire
        window.dispatchEvent(new CustomEvent('maria_mock_login', { detail: mockUser }));
        resolve(mockUser);
      }, 400);
    });
  }
  
  if (!googleProvider) throw new Error("Google Provider not initialized");
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) {
    // Simulated Logout for Demo
    console.log("Maria AI: Simulating Logout...");
    localStorage.removeItem('maria_mock_user');
    window.dispatchEvent(new CustomEvent('maria_mock_logout'));
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
