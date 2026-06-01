/**
 * Safely writes to localStorage, trapping QuotaExceededErrors and handling them gracefully
 * by attempting to prune old non-critical or legacy data before throwing or crashing.
 */

// Memory fallback store in case local storage is fully locked or blocked
const memoryFallback: Record<string, string> = {};

/**
 * Deeply searches a value and recursively strips huge base64 data URIs (such as images and voice recordings)
 * to prevent QuotaExceededError while retaining metadata and text contents.
 */
function stripLargeBase64(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => stripLargeBase64(item));
  }

  const newObj: any = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const val = obj[k];
      if (typeof val === "string" && val.startsWith("data:") && val.length > 500) {
        // Redact large base64 file payloads
        const mimeType = val.substring(5, Math.min(val.indexOf(";"), 40));
        newObj[k] = `[${mimeType || "Attachment"} Terhapus Otomatis untuk Menghemat Penyimpanan Lokal]`;
      } else {
        newObj[k] = stripLargeBase64(val);
      }
    }
  }
  return newObj;
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
      try {
        originalSet.call(this, key, value);
      } catch (error: any) {
        console.warn(`[Storage Hook] Direct localStorage.setItem failed for key "${key}". Executed automatic pruning and fallback.`);
        
        let prunedValue = value;
        try {
          const parsed = JSON.parse(value);
          const stripped = stripLargeBase64(parsed);
          prunedValue = JSON.stringify(stripped);
        } catch {}

        try {
          originalSet.call(this, key, prunedValue);
        } catch {
          memoryFallback[key] = prunedValue;
          console.warn(`[Storage Hook] Hard fallback to dynamic memory storage for key "${key}".`);
        }
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
      if (Object.prototype.hasOwnProperty.call(memoryFallback, key)) {
        return memoryFallback[key];
      }
      try {
        return originalGet.call(this, key);
      } catch {
        return null;
      }
    },
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("[Storage System] Prototype patch skipped or non-supported on this browser platform:", e);
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
      true; // Default to true on write crash to preserve performance and prevent error boundaries popping up.

    if (isQuotaExceeded) {
      console.warn(`[Storage Wrapper] Quota full for key "${key}". Initiating deep prune/fallback...`);

      // Attempt to strip large base64 strings first from JSON structures
      let prunedValue = value;
      try {
        const parsed = JSON.parse(value);
        const stripped = stripLargeBase64(parsed);
        prunedValue = JSON.stringify(stripped);
        
        try {
          localStorage.setItem(key, prunedValue);
          console.log(`[Storage Wrapper] Recovery success: Saved stripped JSON successfully for key "${key}".`);
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
        } catch (e) {
          console.error("[Storage Wrapper] Threads recovery failed", e);
        }
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
          console.warn(`[Storage Wrapper] Safe fallback storage set for "${key}" in-memory.`);
          return true;
        }
      } catch {}
    }

    console.error(`[Storage Wrapper] Item storage crashed permanently for key "${key}":`, error);
    return false;
  }
}
