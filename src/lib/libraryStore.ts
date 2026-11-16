import { Message, Conversation } from '../types/index.ts';
import { getOriginalMedia, getOriginalMediaBlob, storeOriginalMediaBlob } from './mediaUtils.ts';

export type LibraryCategory =
  | 'all'
  | 'images'
  | 'documents'
  | 'audio'
  | 'bookmarked'
  | 'chat-history'
  | 'archive'
  | 'formulas';

export type LibraryItemKind = 'image' | 'chat' | 'note';

export interface ArchivedAttachmentSnapshot {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'video' | 'audio' | 'file';
  previewUrl?: string;
  duration?: number;
  waveform?: number[];
}

export interface ArchivedMessageSnapshot {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  model?: string;
  mode?: string;
  imageUri?: string;
  attachments?: ArchivedAttachmentSnapshot[];
  groundingLinks?: Array<{ title?: string; uri: string }>;
  createdAtIso?: string;
}

export interface LibraryItem {
  id: string;
  userId?: string;
  title: string;
  category: Exclude<LibraryCategory, 'all'>;
  kind: LibraryItemKind;
  type: string;
  date: string;
  size?: string;
  previewUrl?: string;
  imageMediaKey?: string;
  snippet?: string;
  badge?: string;
  sourceConvId?: string;
  sourceMessageId?: string;
  model?: string;
  mode?: string;
  archivedMessages?: ArchivedMessageSnapshot[];
  createdAtIso: string;
  updatedAtIso: string;
}

const KEYS = {
  LIBRARY_ITEMS: 'maria_library_items',
  MOVED_CHAT_IMAGE_IDS: 'maria_moved_chat_image_ids',
} as const;

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeLibrary(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function formatLibraryDate(dateInput: Date | string = new Date()): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (Number.isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function toIsoStringSafe(raw: any): string {
  try {
    if (!raw) return new Date().toISOString();
    if (raw instanceof Date) return raw.toISOString();
    if (typeof raw?.toDate === 'function') return raw.toDate().toISOString();
    if (typeof raw?.seconds === 'number') return new Date(raw.seconds * 1000).toISOString();
    if (typeof raw === 'string') {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

export function makeSafeId(prefix: string = 'lib'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function loadLibraryItems(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(KEYS.LIBRARY_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) =>
          String(b.updatedAtIso || b.createdAtIso || '').localeCompare(
            String(a.updatedAtIso || a.createdAtIso || '')
          )
        );
      }
    }
  } catch {}
  return [];
}

function compactItemForLocalStorage(item: LibraryItem): LibraryItem {
  const safePreview =
    item.previewUrl && item.previewUrl.length <= 160000
      ? item.previewUrl
      : '';
  const compactMsgs = Array.isArray(item.archivedMessages)
    ? item.archivedMessages.slice(0, 200).map((m) => ({
        ...m,
        content: (m.content || '').slice(0, 20000),
        imageUri: m.imageUri && m.imageUri.length <= 90000 ? m.imageUri : undefined,
        attachments: Array.isArray(m.attachments)
          ? m.attachments.slice(0, 10).map((a) => ({
              id: a.id,
              name: a.name,
              size: a.size,
              mimeType: a.mimeType,
              type: a.type,
              previewUrl: a.previewUrl && a.previewUrl.length <= 60000 ? a.previewUrl : undefined,
            }))
          : undefined,
      }))
    : undefined;

  return {
    ...item,
    previewUrl: safePreview || undefined,
    archivedMessages: compactMsgs,
  };
}

export function saveLibraryItems(items: LibraryItem[]): LibraryItem[] {
  const sorted = [...items].sort((a, b) =>
    String(b.updatedAtIso || b.createdAtIso || '').localeCompare(
      String(a.updatedAtIso || a.createdAtIso || '')
    )
  );
  try {
    const compact = sorted.map(compactItemForLocalStorage);
    localStorage.setItem(KEYS.LIBRARY_ITEMS, JSON.stringify(compact));
  } catch (err) {
    console.warn('Library localStorage compact fallback:', err);
    try {
      // Aggressive strip of base64 thumbnails in localStorage while retaining IDB keys + text
      const ultraCompact = sorted.slice(0, 120).map((it) => ({
        ...compactItemForLocalStorage(it),
        previewUrl:
          it.previewUrl && !it.previewUrl.startsWith('data:')
            ? it.previewUrl
            : undefined,
      }));
      localStorage.setItem(KEYS.LIBRARY_ITEMS, JSON.stringify(ultraCompact));
    } catch {}
  }
  notify();
  return sorted;
}

export function upsertLibraryItem(item: LibraryItem): LibraryItem[] {
  const existing = loadLibraryItems();
  const idx = existing.findIndex((it) => it.id === item.id);
  const next =
    idx >= 0
      ? existing.map((it, i) => (i === idx ? item : it))
      : [item, ...existing];
  return saveLibraryItems(next);
}

export function removeLibraryItemLocal(id: string): LibraryItem[] {
  const existing = loadLibraryItems();
  const next = existing.filter((it) => it.id !== id);
  return saveLibraryItems(next);
}

export function mergeRemoteLibraryItems(remoteItems: LibraryItem[]): LibraryItem[] {
  const local = loadLibraryItems();
  const map = new Map<string, LibraryItem>();

  for (const item of local) {
    map.set(item.id, item);
  }
  for (const rItem of remoteItems) {
    const existingLocal = map.get(rItem.id);
    if (!existingLocal) {
      map.set(rItem.id, rItem);
    } else {
      map.set(rItem.id, {
        ...existingLocal,
        ...rItem,
        // Preserve richer local fields when remote copy was trimmed for Firestore limits
        imageMediaKey: existingLocal.imageMediaKey || rItem.imageMediaKey,
        previewUrl: rItem.previewUrl || existingLocal.previewUrl,
        archivedMessages:
          rItem.archivedMessages && rItem.archivedMessages.length >= (existingLocal.archivedMessages?.length || 0)
            ? rItem.archivedMessages
            : existingLocal.archivedMessages,
      });
    }
  }
  return saveLibraryItems(Array.from(map.values()));
}

export function loadMovedChatImageIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEYS.MOVED_CHAT_IMAGE_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((v) => String(v)));
      }
    }
  } catch {}
  return new Set();
}

export function markChatImagesMoved(ids: string[]): Set<string> {
  const current = loadMovedChatImageIds();
  ids.forEach((id) => {
    if (id) current.add(id);
  });
  try {
    localStorage.setItem(KEYS.MOVED_CHAT_IMAGE_IDS, JSON.stringify(Array.from(current)));
  } catch {}
  notify();
  return current;
}

export function unmarkChatImageMoved(id: string): Set<string> {
  const current = loadMovedChatImageIds();
  current.delete(id);
  try {
    localStorage.setItem(KEYS.MOVED_CHAT_IMAGE_IDS, JSON.stringify(Array.from(current)));
  } catch {}
  notify();
  return current;
}

/**
 * Compress any image URL / dataUrl / blob URL to a clean thumbnail safe for Firestore & localStorage (<= 140KB).
 */
export async function createCompactImagePreview(
  sourceUrl: string,
  maxDimension: number = 640,
  quality: number = 0.78
): Promise<string> {
  if (!sourceUrl) return '';
  if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
    return sourceUrl;
  }
  if (sourceUrl.startsWith('data:image/') && sourceUrl.length <= 120000) {
    return sourceUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width || 480;
          let h = img.naturalHeight || img.height || 480;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.max(1, Math.round((h * maxDimension) / w));
              w = maxDimension;
            } else {
              w = Math.max(1, Math.round((w * maxDimension) / h));
              h = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            let out = canvas.toDataURL('image/jpeg', quality);
            if (out.length > 160000) {
              out = canvas.toDataURL('image/jpeg', 0.58);
            }
            resolve(out);
            return;
          }
        } catch {}
        resolve(sourceUrl.length <= 180000 ? sourceUrl : '');
      };
      img.onerror = () => resolve(sourceUrl.length <= 180000 ? sourceUrl : '');
      img.src = sourceUrl;
    } catch {
      resolve(sourceUrl.length <= 180000 ? sourceUrl : '');
    }
  });
}

export async function resolveBestImageUrl(
  primaryUrl: string,
  mediaKey?: string,
  fallbackName?: string
): Promise<string> {
  if (mediaKey) {
    const idb = await getOriginalMediaBlob(mediaKey);
    if (idb) return idb;
  }
  if (fallbackName) {
    const mem = getOriginalMedia(fallbackName);
    if (mem) return mem;
    const idbByName = await getOriginalMediaBlob(fallbackName);
    if (idbByName) return idbByName;
  }
  return primaryUrl || '';
}

export async function buildSavedImageItem(params: {
  userId?: string;
  sourceId: string;
  title: string;
  imageUrl: string;
  model?: string;
  sourceConvId?: string;
  sourceMessageId?: string;
}): Promise<LibraryItem> {
  const existing = loadLibraryItems().find(
    (it) => it.kind === 'image' && it.sourceMessageId && it.sourceMessageId === params.sourceId
  );

  const itemId = existing?.id || makeSafeId('img');
  const imageMediaKey = `lib_media_${itemId}`;
  const nowIso = new Date().toISOString();

  const resolvedUrl = await resolveBestImageUrl(params.imageUrl, params.sourceId.replace(/^att-/, ''), params.title);
  if (resolvedUrl) {
    await storeOriginalMediaBlob(imageMediaKey, resolvedUrl).catch(() => {});
  }

  const compactPreview = await createCompactImagePreview(resolvedUrl || params.imageUrl);
  const approxBytes = resolvedUrl ? Math.round((resolvedUrl.length * 3) / 4) : 0;
  const sizeLabel =
    approxBytes > 1024 * 1024
      ? `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`
      : approxBytes > 1024
      ? `${Math.round(approxBytes / 1024)} KB`
      : undefined;

  const isUploaded = params.model === 'uploaded';
  const cleanTitle = (params.title || (isUploaded ? 'Gambar dari Chat' : 'Gambar AI Studio')).trim().slice(0, 180);

  return {
    id: itemId,
    userId: params.userId || 'guest',
    title: cleanTitle || 'Gambar Tersimpan',
    category: 'images',
    kind: 'image',
    type: isUploaded ? 'Gambar Chat • Tersimpan' : `Gambar AI • ${params.model || 'Studio'}`,
    date: formatLibraryDate(nowIso),
    size: sizeLabel,
    previewUrl: compactPreview || (params.imageUrl.length <= 180000 ? params.imageUrl : ''),
    imageMediaKey,
    snippet: isUploaded
      ? `Dipindahkan dari lampiran percakapan (${cleanTitle})`
      : `Hasil visual AI: ${cleanTitle}`,
    badge: isUploaded ? 'Dari Chat' : 'Gambar AI',
    sourceConvId: params.sourceConvId,
    sourceMessageId: params.sourceId,
    model: params.model,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso,
  };
}

export async function buildArchivedChatItem(params: {
  userId?: string;
  conv: Pick<Conversation, 'id' | 'title' | 'mode' | 'model'>;
  messages: Message[];
}): Promise<LibraryItem> {
  const existing = loadLibraryItems().find(
    (it) => it.kind === 'chat' && it.sourceConvId === params.conv.id
  );
  const itemId = existing?.id || makeSafeId('arch');
  const nowIso = new Date().toISOString();

  const sortedMsgs = [...params.messages].slice(0, 200);
  const archivedMessages: ArchivedMessageSnapshot[] = [];

  for (const m of sortedMsgs) {
    let safeImgUri = m.imageUri;
    if (safeImgUri && safeImgUri.startsWith('data:') && safeImgUri.length > 45000) {
      const msgImgKey = `lib_arch_img_${m.id}`;
      await storeOriginalMediaBlob(msgImgKey, safeImgUri).catch(() => {});
      safeImgUri = await createCompactImagePreview(safeImgUri, 380, 0.65);
    }

    const safeAttachments: ArchivedAttachmentSnapshot[] = [];
    if (Array.isArray(m.attachments)) {
      for (const att of m.attachments.slice(0, 8)) {
        let safeAttPreview = att.previewUrl || '';
        const bestAttUrl =
          att.originalUrl ||
          getOriginalMedia(att.id) ||
          getOriginalMedia(att.name) ||
          safeAttPreview;
        if (bestAttUrl && bestAttUrl.startsWith('data:image/') && bestAttUrl.length > 35000) {
          await storeOriginalMediaBlob(`lib_arch_att_${att.id}`, bestAttUrl).catch(() => {});
          safeAttPreview = await createCompactImagePreview(bestAttUrl, 320, 0.62);
        } else if (safeAttPreview.length > 35000) {
          safeAttPreview = '';
        }

        safeAttachments.push({
          id: String(att.id || makeSafeId('att')).slice(0, 64),
          name: String(att.name || 'Lampiran').slice(0, 128),
          size: typeof att.size === 'number' ? att.size : 0,
          mimeType: String(att.mimeType || 'application/octet-stream').slice(0, 64),
          type: att.type || 'file',
          previewUrl: safeAttPreview || undefined,
        });
      }
    }

    archivedMessages.push({
      id: String(m.id || makeSafeId('msg')).slice(0, 64),
      role: m.role,
      content: String(m.content || '').slice(0, 12000),
      model: m.model ? String(m.model).slice(0, 100) : undefined,
      mode: m.mode ? String(m.mode).slice(0, 50) : undefined,
      imageUri: safeImgUri && safeImgUri.length <= 60000 ? safeImgUri : undefined,
      attachments: safeAttachments.length > 0 ? safeAttachments : undefined,
      groundingLinks: Array.isArray(m.groundingLinks)
        ? m.groundingLinks.slice(0, 12).map((g) => ({
            title: String(g.title || '').slice(0, 160),
            uri: String(g.uri || '').slice(0, 600),
          }))
        : undefined,
      createdAtIso: toIsoStringSafe(m.createdAt),
    });
  }

  const cleanTitle = (params.conv.title || 'Percakapan Tanpa Judul').replace(/^📌\s*/, '').trim().slice(0, 180);
  const lastMeaningfulMsg = [...archivedMessages]
    .reverse()
    .find((m) => m.content && m.content.trim().length > 0);
  const firstUserMsg = archivedMessages.find((m) => m.role === 'user' && m.content.trim().length > 0);
  const rawSnippet =
    lastMeaningfulMsg?.content ||
    firstUserMsg?.content ||
    `Arsip percakapan (${archivedMessages.length} pesan)`;

  return {
    id: itemId,
    userId: params.userId || 'guest',
    title: cleanTitle || 'Arsip Percakapan',
    category: 'archive',
    kind: 'chat',
    type: `Arsip Chat • ${archivedMessages.length} Pesan`,
    date: formatLibraryDate(nowIso),
    snippet: rawSnippet.replace(/\s+/g, ' ').trim().slice(0, 260),
    badge: 'Arsip Chat',
    sourceConvId: params.conv.id,
    model: params.conv.model || 'gemini-3.5-flash',
    mode: params.conv.mode || 'general',
    archivedMessages,
    createdAtIso: existing?.createdAtIso || nowIso,
    updatedAtIso: nowIso,
  };
}
