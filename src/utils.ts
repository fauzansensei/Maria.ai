// Memory fallback store in case local storage is fully locked or blocked
const memoryFallback: Record<string, string> = {};
const fallbackStore: Record<string, string> = {};

export function compressImage(base64Str: string, maxWidth = 2560, maxHeight = 2560, quality = 0.92): Promise<string> {
  return new Promise((resolve) => {
    if (base64Str.length < 1600000) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    if (!base64Str.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (fallbackStore[key] !== undefined) {
      return fallbackStore[key];
    }
    try {
      if (typeof window !== "undefined") {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (val !== null) {
          fallbackStore[key] = val;
          return val;
        }
      }
    } catch (_) {}
    return null;
  },
  setItem: (key: string, value: string): void => {
    fallbackStore[key] = value;
    try {
      if (typeof window !== "undefined") {
        try { localStorage.setItem(key, value); } catch (_) {}
        try { sessionStorage.setItem(key, value); } catch (_) {}
      }
    } catch (_) {}
  },
  removeItem: (key: string): void => {
    delete fallbackStore[key];
    try {
      if (typeof window !== "undefined") {
        try { localStorage.removeItem(key); } catch (_) {}
        try { sessionStorage.removeItem(key); } catch (_) {}
      }
    } catch (_) {}
  },
  clear: (): void => {
    for (const k in fallbackStore) {
      delete fallbackStore[k];
    }
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.clear();
      }
    } catch (_) {}
  }
};

export function pruneCookiesAndSiteData(): void {
  if (typeof window === "undefined") return;
  try {
    const legacyKeys = [
      "maria_messages",
      "maria_threads",
      "maria_saved_chats",
      "maria_custom_avatar_img"
    ];
    legacyKeys.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_) {}
    });
  } catch (_) {}
}
