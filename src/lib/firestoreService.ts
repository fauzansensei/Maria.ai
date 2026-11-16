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
import { LibraryItem, ArchivedMessageSnapshot } from './libraryStore.ts';

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
          launchAction: data.launchAction,
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
    launchAction?: any;
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
    if (message.imageUri && message.imageUri.length <= 5000) {
      dataToSave.imageUri = message.imageUri;
    }
    if (message.thinkingProcess) {
      dataToSave.thinkingProcess = message.thinkingProcess.slice(0, 48000);
    }
    if (message.audioUri && message.audioUri.length <= 48000) {
      dataToSave.audioUri = message.audioUri;
    }

    if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
      // Sanitize attachments: only store lightweight metadata and thumbnail to never breach 1MB document limit
      dataToSave.attachments = message.attachments.slice(0, 10).map((a) => ({
        id: String(a.id || generateId('att')).slice(0, 64),
        name: String(a.name || 'Berkas').slice(0, 128),
        size: typeof a.size === 'number' ? a.size : 0,
        mimeType: String(a.mimeType || 'image/jpeg').slice(0, 64),
        type: String(a.type || 'image').slice(0, 20),
        previewUrl: typeof a.previewUrl === 'string' && a.previewUrl.length <= 200000 ? a.previewUrl : '',
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

// Fetch all messages for any conversation one-time (used when archiving chats)
export async function getConversationMessages(convId: string): Promise<Message[]> {
  const collPath = `conversations/${convId}/messages`;
  try {
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        conversationId: data.conversationId,
        userId: data.userId,
        role: data.role,
        content: data.content || '',
        model: data.model,
        mode: data.mode,
        imageUri: data.imageUri,
        attachments: data.attachments,
        groundingLinks: data.groundingLinks,
        thinkingProcess: data.thinkingProcess,
        audioUri: data.audioUri,
        launchAction: data.launchAction,
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
    return [];
  }
}

function sanitizeArchivedMessagesForFirestore(
  msgs?: ArchivedMessageSnapshot[]
): ArchivedMessageSnapshot[] {
  if (!Array.isArray(msgs) || msgs.length === 0) return [];
  // Enforce <= 200 messages and keep total serialized size well below Firestore 1MB limit
  const trimmed = msgs.slice(-200);
  let runningBytes = 0;
  const MAX_TOTAL_BYTES = 550000;
  const result: ArchivedMessageSnapshot[] = [];

  for (const m of trimmed) {
    const contentBudget = trimmed.length > 60 ? 3500 : 8000;
    const content = String(m.content || '').slice(0, contentBudget);
    let imageUri = m.imageUri && String(m.imageUri).length <= 40000 ? String(m.imageUri) : undefined;

    const cleanAttachments = Array.isArray(m.attachments)
      ? m.attachments.slice(0, 8).map((a) => ({
          id: String(a.id || 'att').slice(0, 64),
          name: String(a.name || 'Lampiran').slice(0, 128),
          size: typeof a.size === 'number' ? a.size : 0,
          mimeType: String(a.mimeType || 'application/octet-stream').slice(0, 64),
          type: (a.type || 'file') as 'image' | 'video' | 'file',
          ...(a.previewUrl && String(a.previewUrl).length <= 24000
            ? { previewUrl: String(a.previewUrl) }
            : {}),
        }))
      : undefined;

    const cleanLinks = Array.isArray(m.groundingLinks)
      ? m.groundingLinks.slice(0, 10).map((g) => ({
          title: String(g.title || '').slice(0, 160),
          uri: String(g.uri || '').slice(0, 600),
        }))
      : undefined;

    const entrySize =
      content.length +
      (imageUri?.length || 0) +
      JSON.stringify(cleanAttachments || []).length +
      JSON.stringify(cleanLinks || []).length;

    if (runningBytes + entrySize > MAX_TOTAL_BYTES) {
      // Strip inline base64 previews first if approaching Firestore budget while preserving all message text
      imageUri = imageUri && imageUri.startsWith('http') ? imageUri : undefined;
    }

    runningBytes += content.length + (imageUri?.length || 0);
    if (runningBytes > 680000) break;

    const entry: ArchivedMessageSnapshot = {
      id: String(m.id || generateId('msg')).slice(0, 64),
      role: m.role,
      content,
      ...(m.model ? { model: String(m.model).slice(0, 100) } : {}),
      ...(m.mode ? { mode: String(m.mode).slice(0, 50) } : {}),
      ...(imageUri ? { imageUri } : {}),
      ...(cleanAttachments && cleanAttachments.length > 0 ? { attachments: cleanAttachments } : {}),
      ...(cleanLinks && cleanLinks.length > 0 ? { groundingLinks: cleanLinks } : {}),
      ...(m.createdAtIso ? { createdAtIso: String(m.createdAtIso).slice(0, 60) } : {}),
    };
    result.push(entry);
  }
  return result;
}

// Subscribe to User Library Items & Archived Chats
export function subscribeLibraryItems(
  userId: string,
  onUpdate: (items: LibraryItem[]) => void,
  onError?: (error: any) => void
) {
  const collPath = `users/${userId}/library`;
  const q = query(collection(db, 'users', userId, 'library'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LibraryItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId,
          title: d.title || 'Item Pustaka',
          category: d.category || 'archive',
          kind: d.kind || 'note',
          type: d.type || 'Item',
          date: d.date || '',
          size: d.size,
          previewUrl: d.previewUrl,
          imageMediaKey: d.imageMediaKey,
          snippet: d.snippet,
          badge: d.badge,
          sourceConvId: d.sourceConvId,
          sourceMessageId: d.sourceMessageId,
          model: d.model,
          mode: d.mode,
          archivedMessages: Array.isArray(d.archivedMessages) ? d.archivedMessages : undefined,
          createdAtIso: d.createdAtIso || new Date().toISOString(),
          updatedAtIso: d.updatedAtIso || d.createdAtIso || new Date().toISOString(),
        };
      });
      items.sort((a, b) =>
        String(b.updatedAtIso || b.createdAtIso).localeCompare(String(a.updatedAtIso || a.createdAtIso))
      );
      onUpdate(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  );
}

// Persist or update a Library Item (image or archived chat snapshot) in Firestore
export async function saveLibraryItemToCloud(
  userId: string,
  item: LibraryItem
): Promise<void> {
  const safeId = String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `users/${userId}/library/${safeId}`;
  const docRef = doc(db, 'users', userId, 'library', safeId);
  const cleanPreview =
    item.previewUrl && item.previewUrl.length <= 210000 ? item.previewUrl : undefined;
  const cleanArchivedMessages =
    item.kind === 'chat' ? sanitizeArchivedMessagesForFirestore(item.archivedMessages) : undefined;
  const safeTitle = (item.title || '').trim().slice(0, 200) || 'Item Pustaka';

  let docExists = false;
  try {
    const existingSnap = await getDoc(docRef);
    docExists = existingSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return;
  }

  if (docExists) {
    try {
      const updatePayload: Record<string, any> = {
        title: safeTitle,
        type: (item.type || 'Item').slice(0, 100),
        date: (item.date || '').slice(0, 60),
        updatedAtIso: (item.updatedAtIso || new Date().toISOString()).slice(0, 60),
        updatedAt: serverTimestamp(),
      };
      if (cleanPreview !== undefined) updatePayload.previewUrl = cleanPreview;
      if (item.imageMediaKey) updatePayload.imageMediaKey = String(item.imageMediaKey).slice(0, 128);
      if (item.snippet) updatePayload.snippet = String(item.snippet).slice(0, 1000);
      if (cleanArchivedMessages !== undefined) updatePayload.archivedMessages = cleanArchivedMessages;
      await updateDoc(docRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    const createPayload: Record<string, any> = {
      id: safeId,
      userId,
      title: safeTitle,
      category: item.category,
      kind: item.kind,
      type: (item.type || 'Item').slice(0, 100),
      date: (item.date || '').slice(0, 60),
      createdAtIso: (item.createdAtIso || new Date().toISOString()).slice(0, 60),
      updatedAtIso: (item.updatedAtIso || new Date().toISOString()).slice(0, 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (item.size) createPayload.size = String(item.size).slice(0, 40);
    if (cleanPreview) createPayload.previewUrl = cleanPreview;
    if (item.imageMediaKey) createPayload.imageMediaKey = String(item.imageMediaKey).slice(0, 128);
    if (item.snippet) createPayload.snippet = String(item.snippet).slice(0, 1000);
    if (item.badge) createPayload.badge = String(item.badge).slice(0, 50);
    if (item.sourceConvId) createPayload.sourceConvId = String(item.sourceConvId).slice(0, 128);
    if (item.sourceMessageId) createPayload.sourceMessageId = String(item.sourceMessageId).slice(0, 128);
    if (item.model) createPayload.model = String(item.model).slice(0, 100);
    if (item.mode) createPayload.mode = String(item.mode).slice(0, 50);
    if (cleanArchivedMessages !== undefined) createPayload.archivedMessages = cleanArchivedMessages;

    await setDoc(docRef, createPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteLibraryItemFromCloud(
  userId: string,
  itemId: string
): Promise<void> {
  const safeId = String(itemId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `users/${userId}/library/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'library', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Restore an archived conversation snapshot back into active Cloud Firestore conversations
export async function restoreArchivedConversation(
  userId: string,
  archivedItem: LibraryItem
): Promise<string> {
  const mode = (archivedItem.mode as AiMode) || 'general';
  const model = archivedItem.model || 'gemini-3.5-flash';
  const newConvId = await createConversation(userId, archivedItem.title || 'Percakapan Dipulihkan', mode, model);

  const msgs = archivedItem.archivedMessages || [];
  for (const m of msgs) {
    await addMessage(newConvId, userId, {
      role: m.role,
      content: m.content || '',
      model: m.model,
      mode: m.mode,
      imageUri: m.imageUri,
      attachments: m.attachments,
      groundingLinks: m.groundingLinks,
    });
  }
  return newConvId;
}



