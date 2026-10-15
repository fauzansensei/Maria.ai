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
