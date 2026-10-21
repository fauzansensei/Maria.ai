// Media & File utilities for upload, thumbnail generation, base64 conversions, and full-resolution IndexedDB caching

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getMediaType(file: File): 'image' | 'video' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

export function extractBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

// In-memory store for 100% original uncompressed media data URLs / object URLs during session
const originalMediaCache = new Map<string, string>();

export function storeOriginalMedia(id: string, url: string) {
  if (originalMediaCache.size > 300) {
    const firstKey = originalMediaCache.keys().next().value;
    if (firstKey) originalMediaCache.delete(firstKey);
  }
  originalMediaCache.set(id, url);
}

export function getOriginalMedia(id: string): string | undefined {
  return originalMediaCache.get(id);
}

// Persistent IndexedDB store for 100% uncompressed raw Blobs/Files
const DB_NAME = 'maria_highres_media_db';
const STORE_NAME = 'original_media';

function getMediaDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function storeOriginalMediaBlob(key: string, data: Blob | File | string): Promise<void> {
  try {
    const db = await getMediaDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, key);
  } catch (err) {
    console.warn('Could not store full media in IndexedDB:', err);
  }
}

export async function getOriginalMediaBlob(key: string): Promise<string | null> {
  // 1. Check memory cache first
  const cached = originalMediaCache.get(key);
  if (cached) return cached;

  // 2. Check IndexedDB
  try {
    const db = await getMediaDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
        } else if (result instanceof Blob) {
          const blobUrl = URL.createObjectURL(result);
          originalMediaCache.set(key, blobUrl);
          resolve(blobUrl);
        } else if (typeof result === 'string') {
          originalMediaCache.set(key, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Generate crystal-sharp high-fidelity thumbnail for image preview (up to 480px with clean quality, safe for Firestore)
export function generateImageThumbnail(file: File, maxDimension: number = 480, quality: number = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Only downscale if the image exceeds maxDimension (e.g. 1600px)
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const thumbUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(thumbUrl);
            return;
          }
        } catch {
          // Fallback to raw data url
        }
        resolve(reader.result as string);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Generate thumbnail for video preview from the first video frame
export function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.5;

    let resolved = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      if (resolved) return;
      resolved = true;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 720);
        canvas.height = (canvas.width * (video.videoHeight || 360)) / (video.videoWidth || 640);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
          cleanup();
          resolve(thumbUrl);
          return;
        }
      } catch {
        // Fallback
      }
      cleanup();
      resolve('');
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve('');
      }
    };

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve('');
      }
    }, 2000);
  });
}
