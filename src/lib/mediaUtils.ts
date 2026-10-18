// Media & File utilities for upload, thumbnail generation, and base64 conversions

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

// In-memory store for 100% original uncompressed media data URLs during session
const originalMediaCache = new Map<string, string>();

export function storeOriginalMedia(id: string, dataUrl: string) {
  if (originalMediaCache.size > 200) {
    const firstKey = originalMediaCache.keys().next().value;
    if (firstKey) originalMediaCache.delete(firstKey);
  }
  originalMediaCache.set(id, dataUrl);
}

export function getOriginalMedia(id: string): string | undefined {
  return originalMediaCache.get(id);
}

// Generate high-fidelity thumbnail for image preview (sharp and clear up to 1280px)
export function generateImageThumbnail(file: File, maxDimension: number = 1280, quality: number = 0.88): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Only downscale if the image exceeds maxDimension (e.g. 1280px)
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

            // Prefer WebP or clean high-quality JPEG
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
        canvas.width = Math.min(video.videoWidth || 320, 480);
        canvas.height = (canvas.width * (video.videoHeight || 240)) / (video.videoWidth || 320);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
          cleanup();
          resolve(thumbUrl);
          return;
        }
      } catch {
        // Fallback to empty if canvas security blocks it
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

    // Timeout safety
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve('');
      }
    }, 2000);
  });
}
