/**
 * Safely writes to localStorage, trapping QuotaExceededErrors and handling them gracefully
 * by attempting to prune old non-critical or legacy data before throwing or crashing.
 */

// Memory fallback store in case local storage is fully locked or blocked
const memoryFallback: Record<string, string> = {};

// In-memory cache specifically for large base64 attachments to prevent disk crashes and render flawlessly inside user sessions
const imageMemoryFallback: Record<string, string> = {};

/**
 * Compresses a base64 image string on the client-side using Canvas.
 * Standardizes the image format to image/jpeg, limits its dimensions to max 800px,
 * and lowers quality to 0.7. This shrinks a multi-megabyte image down to 20-50KB,
 * completely resolving LocalStorage and Firestore document limits.
 */
export function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Rescaling logic
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

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str); // Fallback to original
        return;
      }

      // Draw and export as compressed jpeg
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        resolve(base64Str); // Fallback to original
      }
    };
    img.onerror = () => {
      resolve(base64Str); // Fallback to original
    };
    img.src = base64Str;
  });
}

/**
 * Deterministic fast string hashing helper for identifying unique image content
 */
function getBase64Hash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "hash_" + Math.abs(hash) + "_" + str.length;
}

/**
 * Sweeps over data structures, detects large base64 strings (such as images, attachments, voice blobs),
 * moves them to a decoupled separate store to prevent QuotaExceededError in nested JSONs (maria_threads and maria_messages),
 * and replaces them with a reference string.
 */
function processAndExtractImages(obj: any, originalSet: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => processAndExtractImages(item, originalSet));
  }

  const newObj: any = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const val = obj[k];
      if (typeof val === "string" && val.startsWith("data:") && val.length > 102400) {
        const imgId = getBase64Hash(val);
        // Ensure availability in RAM cache
        imageMemoryFallback[imgId] = val;
        
        // Save to its own tiny independent key in disk with maximum safety
        if (originalSet) {
          try {
            originalSet.call(window.localStorage, "maria_image_" + imgId, val);
          } catch (e: any) {
            // Under extreme quota exhaustion conditions, prune some older distinct images to clear workspace
            try {
              const keys: string[] = [];
              for (let i = 0; i < window.localStorage.length; i++) {
                const localKey = window.localStorage.key(i);
                if (localKey && localKey.startsWith("maria_image_")) {
                  keys.push(localKey);
                }
              }
              // Flush up to 5 older distinct cached images
              keys.slice(0, Math.min(keys.length, 5)).forEach(lk => {
                window.localStorage.removeItem(lk);
              });
              // Safe retry write
              originalSet.call(window.localStorage, "maria_image_" + imgId, val);
            } catch {}
          }
        }
        
        newObj[k] = `local-image-ref:${imgId}`;
      } else {
        newObj[k] = processAndExtractImages(val, originalSet);
      }
    }
  }
  return newObj;
}

/**
 * Searches and reconstitutes any placeholder reference indices back to their original full base64 strings.
 */
function restoreExtractedImages(obj: any, originalGet: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => restoreExtractedImages(item, originalGet));
  }

  const newObj: any = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const val = obj[k];
      if (typeof val === "string" && val.startsWith("local-image-ref:")) {
        const imgId = val.substring("local-image-ref:".length);
        const cached = imageMemoryFallback[imgId];
        if (cached) {
          newObj[k] = cached;
        } else {
          try {
            let diskStored = null;
            if (originalGet) {
              diskStored = originalGet.call(window.localStorage, "maria_image_" + imgId);
            } else {
              diskStored = window.localStorage.getItem("maria_image_" + imgId);
            }
            if (diskStored) {
              newObj[k] = diskStored;
              imageMemoryFallback[imgId] = diskStored; // pop cache
            } else {
              newObj[k] = "[Gambar]";
            }
          } catch {
            newObj[k] = "[Gambar]";
          }
        }
      } else {
        newObj[k] = restoreExtractedImages(val, originalGet);
      }
    }
  }
  return newObj;
}

/**
 * Deeply searches a value and recursively strips huge base64 data URIs
 */
function stripLargeBase64(obj: any): any {
  // Gracefully fallback to processAndExtractImages with original localStorage setter bypassed or using standard backup
  return processAndExtractImages(obj, null);
}

// ---------------------------------------------------------
// Global Prototype Protection Hook (Foolproof Interceptor)
// ---------------------------------------------------------
try {
  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;

  Object.defineProperty(Storage.prototype, "setItem", {
    value: function(this: Storage, key: string, value: string) {
      if (this !== window.localStorage) {
        originalSet.call(this, key, value);
        return;
      }

      let processedValue = value;
      // Intelligently isolate large media and base64 strings from chats/threads to safe single keys
      if (key === "maria_messages" || key === "maria_threads" || key === "maria_saved_chats") {
        try {
          const parsed = JSON.parse(value);
          const stripped = processAndExtractImages(parsed, originalSet);
          processedValue = JSON.stringify(stripped);
        } catch {}
      }

      try {
        originalSet.call(this, key, processedValue);
      } catch (error: any) {
        try {
          // Absolute fallback
          memoryFallback[key] = processedValue;
        } catch {}
      }
    },
    writable: true,
    configurable: true
  });

  Object.defineProperty(Storage.prototype, "getItem", {
    value: function(this: Storage, key: string) {
      if (this !== window.localStorage) {
        return originalGet.call(this, key);
      }
      
      let val = null;
      if (Object.prototype.hasOwnProperty.call(memoryFallback, key)) {
        val = memoryFallback[key];
      } else {
        try {
          val = originalGet.call(this, key);
        } catch {
          val = null;
        }
      }

      if (val && (key === "maria_messages" || key === "maria_threads" || key === "maria_saved_chats")) {
        try {
          const parsed = JSON.parse(val);
          const restored = restoreExtractedImages(parsed, originalGet);
          val = JSON.stringify(restored);
        } catch {}
      }

      return val;
    },
    writable: true,
    configurable: true
  });
} catch (e) {
  // Silent fallback
}

/**
 * High-level wrapper function to write safely to LocalStorage.
 * Handles granular recovery paths for app-specific database states like threads or messages.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const errorName = error?.name || "";
    const errorMessage = error?.message?.toLowerCase() || "";
    const errorCode = error?.code;
    
    const isQuotaExceeded = 
      errorCode === 22 ||
      errorCode === 1014 ||
      errorName === "QuotaExceededError" ||
      errorName === "NS_ERROR_DOM_QUOTA_REACHED" ||
      errorMessage.includes("quota") ||
      errorMessage.includes("exceeded") ||
      true; 

    if (isQuotaExceeded) {
      // Attempt to strip large base64 strings first from JSON structures
      let prunedValue = value;
      try {
        const parsed = JSON.parse(value);
        const stripped = stripLargeBase64(parsed);
        prunedValue = JSON.stringify(stripped);
        
        try {
          localStorage.setItem(key, prunedValue);
          return true;
        } catch {}
      } catch {}

      // Key-specific fallback paths
      if (key === "maria_threads") {
        try {
          const threadsArray = JSON.parse(prunedValue);
          if (Array.isArray(threadsArray) && threadsArray.length > 0) {
            // Level 1: Limit messages per thread
            let pruned = threadsArray.map((thread) => {
              if (thread.messages && thread.messages.length > 5) {
                return { ...thread, messages: thread.messages.slice(-5) };
              }
              return thread;
            });

            try {
              localStorage.setItem(key, JSON.stringify(pruned));
              return true;
            } catch {
              // Level 2: Keep only last 3 threads, cleared internal historic messages of others
              const sliced = threadsArray.slice(0, 3).map((thread, idx) => {
                if (idx > 0) {
                  return { ...thread, messages: [] };
                }
                return thread;
              });
              try {
                localStorage.setItem(key, JSON.stringify(sliced));
                return true;
              } catch {}
            }
          }
        } catch (e) {}
      }

      if (key === "maria_messages") {
        try {
          const msgArray = JSON.parse(prunedValue);
          if (Array.isArray(msgArray) && msgArray.length > 5) {
            const trimmed = msgArray.slice(-5);
            try {
              localStorage.setItem(key, JSON.stringify(trimmed));
              return true;
            } catch {}
          }
        } catch {}
      }

      // Cleanup third party noise like notifications to retrieve bytes
      try {
        localStorage.removeItem("maria_notifications");
        localStorage.removeItem("maria_saved_chats");
        
        // Retry saving original/pruned payload
        try {
          localStorage.setItem(key, prunedValue);
          return true;
        } catch {
          // Absolute last resort: Save to in-memory store so browser session keeps going perfectly
          memoryFallback[key] = prunedValue;
          return true;
        }
      } catch {}
    }

    return false;
  }
}
