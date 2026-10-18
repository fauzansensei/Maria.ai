import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal Firestore offline/retry warnings
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize with in-memory cache and auto-detecting transport
try {
  initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (_) {
  // If already initialized
}

// CRITICAL: The app will break without this line
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Operation Types for security audit error handling
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isUnavailable =
    (error as any)?.code === 'unavailable' ||
    errMessage.includes('Could not reach Cloud Firestore') ||
    errMessage.includes('unavailable') ||
    errMessage.includes('client is offline');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (isUnavailable) {
    console.warn('Firestore Connection/Offline State Notice: ', JSON.stringify(errInfo));
    return; // Gracefully handle offline or transient connection failures without throwing fatal crashes
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on app boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {
      // Client operates in offline cache mode until backend is reached
    });
  } catch {
    // Client operates in offline cache mode until backend is reached
  }
}
testConnection();

// Auth Helpers
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Sync or initialize user profile record
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        {
          userId: result.user.uid,
          displayName: result.user.displayName || 'Pengguna',
          email: result.user.email || '',
          photoURL: result.user.photoURL || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Failed to sync user profile to Firestore:', err);
      });
    }
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export interface ConversationItem {
  id: string;
  userId: string;
  title: string;
  model: string;
  mode: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  model?: string;
  imageUri?: string;
  groundingLinks?: Array<{ title?: string; uri: string }>;
  thinkingProcess?: string;
  audioUri?: string;
  createdAt?: any;
}
