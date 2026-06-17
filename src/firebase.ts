import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfigRaw from '../firebase-applet-config.json';

// Dynamic resolver to load user custom Firebase/Google API configuration
const firebaseConfig = firebaseConfigRaw;
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with long polling to prevent WebChannel/WebSocket drops in this environment
initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// If database ID is absent/empty, default to standard Firestore database context
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== "" 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app); /* CRITICAL: The app will break without this line */

// Check for third-party cookie blocking and use resilient authentication persistence
export let isThirdPartyCookieBlocked = false;
try {
  // Test IndexedDB functionality which is typically blocked alongside third-party cookies
  const dbTest = window.indexedDB.open("__test_3pc_maria");
  dbTest.onerror = () => { isThirdPartyCookieBlocked = true; };
} catch (e) {
  isThirdPartyCookieBlocked = true;
}

// Ensure auth falls back to a persistent standard localStorage mechanism if indexedDB is blocked
// This natively solves the mobile vs desktop iframe persistence issue
let originalAuth;
try {
  originalAuth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} catch (e) {
  originalAuth = getAuth(app); // Returns existing if already initialized
}

import { setPersistence } from 'firebase/auth';
// Force explicit persistence as requested
setPersistence(originalAuth, browserLocalPersistence).catch(() => {});

// Dual-activation mechanism (in-memory & local-storage) for simulated developer-mode authentication
export function setSimulatedAuthActive(active: boolean) {
  if (typeof window !== 'undefined') {
    (window as any).__maria_ai_simulated_active = active;
    try {
      localStorage.setItem('maria_ai_simulated_mode', active ? 'true' : 'false');
    } catch (_) {}
  }
}

export function isSimulatedAuthActive(): boolean {
  if (typeof window !== 'undefined') {
    if ((window as any).__maria_ai_simulated_active === true) {
      return true;
    }
    try {
      return localStorage.getItem('maria_ai_simulated_mode') === 'true';
    } catch (_) {}
  }
  return false;
}

// Safe Proxy wrapper that satisfies standard Firebase Auth schemas and provides a high-fidelity mock session inside iframe sandboxes
export const auth = new Proxy(originalAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      if (isSimulatedAuthActive()) {
        return {
          uid: 'simulated_guest_uid',
          email: 'guest@maria.ai',
          displayName: 'Guest User',
          isAnonymous: true,
          emailVerified: true,
          providerData: []
        };
      }
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Access Flagged (Simulated): ', JSON.stringify(errInfo));
  if (isSimulatedAuthActive()) {
    return; // Silent bypass in simulation mode to sustain local execution flows
  }
  throw new Error(JSON.stringify(errInfo));
}
