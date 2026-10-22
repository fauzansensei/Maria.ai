import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { Conversation, Message, AiMode, UserProfile } from '../types/index.ts';

// Generate a URL-safe unique ID
export function generateId(prefix: string = 'doc'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get User Profile & Settings
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (errMessage.includes('offline') || errMessage.includes('unavailable')) {
      console.warn(`Firestore getUserProfile offline/unavailable for ${path}:`, errMessage);
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Update User Profile & Settings
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'theme'>>
): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Subscribe to User Conversations
export function subscribeConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: any) => void
) {
  const collPath = 'conversations';
  const q = query(
    collection(db, collPath),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: Conversation[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          title: data.title || 'Percakapan Tanpa Judul',
          model: data.model || 'gemini-3.5-flash',
          mode: (data.mode as AiMode) || 'general',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onUpdate(convs);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  );
}

// Create a new conversation
export async function createConversation(
  userId: string,
  title: string,
  mode: AiMode = 'general',
  model: string = 'gemini-3.5-flash'
): Promise<string> {
  const convId = generateId('conv');
  const path = `conversations/${convId}`;

  try {
    const docRef = doc(db, 'conversations', convId);
    await setDoc(docRef, {
      id: convId,
      userId,
      title: title.slice(0, 190),
      model,
      mode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return convId;
  }
}

// Update conversation title or updatedAt
export async function updateConversation(
  convId: string,
  updates: Partial<Pick<Conversation, 'title' | 'mode' | 'model'>>
): Promise<void> {
  const path = `conversations/${convId}`;
  try {
    const docRef = doc(db, 'conversations', convId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete conversation and messages
export async function deleteConversation(convId: string, userId?: string): Promise<void> {
  const path = `conversations/${convId}`;
  try {
    // Attempt to delete child messages if accessible without failing the main conversation deletion
    try {
      const msgQuery = userId
        ? query(collection(db, 'conversations', convId, 'messages'), where('userId', '==', userId))
        : query(collection(db, 'conversations', convId, 'messages'));
      const msgSnaps = await getDocs(msgQuery);
      for (const msgDoc of msgSnaps.docs) {
        await deleteDoc(msgDoc.ref).catch(() => {});
      }
    } catch (cleanErr) {
      console.warn('Child message cleanup non-fatal warning:', cleanErr);
    }

    // Delete conversation document
    await deleteDoc(doc(db, 'conversations', convId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Subscribe to conversation messages
export function subscribeMessages(
  convId: string,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: any) => void
) {
  const collPath = `conversations/${convId}/messages`;
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          conversationId: data.conversationId,
          userId: data.userId,
          role: data.role,
          content: data.content,
          model: data.model,
          mode: data.mode,
          imageUri: data.imageUri,
          attachments: data.attachments,
          groundingLinks: data.groundingLinks,
          thinkingProcess: data.thinkingProcess,
          audioUri: data.audioUri,
          createdAt: data.createdAt,
        };
      });
      onUpdate(messages);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  );
}

// Add a single message turn
export async function addMessage(
  convId: string,
  userId: string,
  message: {
    role: 'user' | 'model' | 'system';
    content: string;
    model?: string;
    mode?: string;
    imageUri?: string;
    attachments?: any[];
    groundingLinks?: any[];
    thinkingProcess?: string;
    audioUri?: string;
  }
): Promise<string> {
  const messageId = generateId('msg');
  const path = `conversations/${convId}/messages/${messageId}`;

  try {
    const docRef = doc(db, 'conversations', convId, 'messages', messageId);
    const dataToSave: any = {
      id: messageId,
      conversationId: convId,
      userId,
      role: message.role,
      content: (message.content || '').slice(0, 48000), // Enforce schema limit
      createdAt: serverTimestamp(),
    };

    if (message.model) {
      dataToSave.model = message.model.slice(0, 100);
    }
    if (message.mode) {
      dataToSave.mode = message.mode.slice(0, 50);
    }
    if (message.imageUri) {
      dataToSave.imageUri = message.imageUri.slice(0, 5000);
    }
    if (message.thinkingProcess) {
      dataToSave.thinkingProcess = message.thinkingProcess.slice(0, 48000);
    }
    if (message.audioUri) {
      dataToSave.audioUri = message.audioUri.slice(0, 48000);
    }

    if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
      // Sanitize attachments: only store lightweight metadata and thumbnail to never breach 1MB document limit
      dataToSave.attachments = message.attachments.slice(0, 10).map((a) => ({
        id: String(a.id || generateId('att')).slice(0, 64),
        name: String(a.name || 'Berkas').slice(0, 128),
        size: typeof a.size === 'number' ? a.size : 0,
        mimeType: String(a.mimeType || 'image/jpeg').slice(0, 64),
        type: String(a.type || 'image').slice(0, 20),
        previewUrl: typeof a.previewUrl === 'string' && a.previewUrl.length <= 32000 ? a.previewUrl : '',
      }));
    }

    if (message.groundingLinks && Array.isArray(message.groundingLinks) && message.groundingLinks.length > 0) {
      dataToSave.groundingLinks = message.groundingLinks.slice(0, 20).map((g) => ({
        title: String(g.title || '').slice(0, 200),
        uri: String(g.uri || '').slice(0, 1000),
      }));
    }

    await setDoc(docRef, dataToSave);

    // Touch conversation updatedAt
    await updateDoc(doc(db, 'conversations', convId), {
      updatedAt: serverTimestamp(),
    });

    return messageId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return messageId;
  }
}

// Update a message content (e.g. edit text when typo/salah ketik)
export async function updateMessage(
  convId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  const path = `conversations/${convId}/messages/${messageId}`;
  try {
    const docRef = doc(db, 'conversations', convId, 'messages', messageId);
    await updateDoc(docRef, {
      content: (newContent || '').slice(0, 48000),
      editedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete a single message from Firestore
export async function deleteMessage(
  convId: string,
  messageId: string
): Promise<void> {
  const path = `conversations/${convId}/messages/${messageId}`;
  try {
    const docRef = doc(db, 'conversations', convId, 'messages', messageId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


