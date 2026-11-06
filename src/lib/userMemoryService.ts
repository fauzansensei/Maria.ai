// Maria AI User Memory Service
// Allows Maria to remember personal facts, preferences, background, and work details
// Supports manual entry, auto-extraction from chat, and persistent local/cloud storage.

import { UserMemory } from '../types.ts';

const MEMORY_STORAGE_KEY = 'maria_user_memories';

type MemoryListener = (memories: UserMemory[]) => void;

class UserMemoryService {
  private memories: UserMemory[] = [];
  private listeners: Set<MemoryListener> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.memories = parsed;
        }
      } else {
        // Default initial memory based on user profile
        this.memories = [
          {
            id: 'mem_init_1',
            text: 'Pengguna bernama Basit Fauzan (@basitfauzan42).',
            category: 'personal',
            timestamp: new Date().toISOString(),
            source: 'auto',
          },
          {
            id: 'mem_init_2',
            text: 'Menyukai jawaban yang jelas, sopan, to the point, dan terstruktur.',
            category: 'preferences',
            timestamp: new Date().toISOString(),
            source: 'auto',
          },
        ];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Error loading memories:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
    } catch {}
  }

  private notify() {
    this.saveToStorage();
    const snapshot = [...this.memories];
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch {}
    });
  }

  public subscribe(listener: MemoryListener): () => void {
    this.listeners.add(listener);
    listener([...this.memories]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getMemories(): UserMemory[] {
    return [...this.memories];
  }

  public addMemory(
    text: string,
    category: UserMemory['category'] = 'personal',
    source: 'manual' | 'auto' = 'manual'
  ): UserMemory | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Check duplicate
    const exists = this.memories.some(
      (m) => m.text.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return null;

    const newMem: UserMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      category,
      timestamp: new Date().toISOString(),
      source,
    };

    this.memories = [newMem, ...this.memories];
    this.notify();
    return newMem;
  }

  public removeMemory(id: string): void {
    this.memories = this.memories.filter((m) => m.id !== id);
    this.notify();
  }

  public clearMemories(): void {
    this.memories = [];
    this.notify();
  }

  /**
   * Formats all saved memories into a clean prompt context for Gemini system instructions
   */
  public getFormattedMemoryPrompt(userName?: string): string {
    if (this.memories.length === 0 && !userName) {
      return '';
    }

    const lines: string[] = [];
    if (userName && userName.trim()) {
      lines.push(`- Nama Pengguna: ${userName.trim()}`);
    }

    this.memories.forEach((m, idx) => {
      lines.push(`- [${m.category.toUpperCase()}] ${m.text}`);
    });

    return `MEMORI & FAKTA PENTING TENTANG PENGGUNA (YANG ANDA INGAT):
${lines.join('\n')}

PETUNJUK MEMORI:
Gunakan informasi di atas secara natural saat berbincang dengan pengguna. Anda mengingat hal-hal ini tentang mereka, sehingga jika pengguna bertanya tentang identitas mereka atau preferensi yang pernah mereka sebutkan, Anda dapat langsung menjawab dengan akurat dan hangat tanpa perlu mereka ulangi.`;
  }

  /**
   * Intelligently auto-extracts personal facts from user messages
   */
  public extractFromUserText(userText: string): string[] {
    if (!userText || typeof userText !== 'string') return [];

    const extracted: string[] = [];
    const text = userText.trim();

    // Pattern 1: Explicit remember commands ("ingat ya...", "tolong ingat...", "inget...", "jangan lupa...")
    const explicitRegex = /(?:tolong\s+ingat(?:kan)?|ingat\s+ya|inget\s+ya|jangan\s+lupa\s+bahwa|catat\s+bahwa)\s+(?:kalo|kalau|bahwa)?\s*([^.!?\n]{5,100})/gi;
    let match;
    while ((match = explicitRegex.exec(text)) !== null) {
      const fact = match[1]?.trim();
      if (fact && fact.length > 4) {
        this.addMemory(fact, 'personal', 'auto');
        extracted.push(fact);
      }
    }

    // Pattern 2: Name introductions ("nama saya...", "panggil saya...", "namaku...")
    const nameRegex = /(?:nama\s+(?:saya|ku)|panggil\s+(?:saya|aku))\s+(?:adalah\s+)?([A-Za-z0-9\s]{2,40})/i;
    const nameMatch = text.match(nameRegex);
    if (nameMatch && nameMatch[1]) {
      const nameFact = `Nama panggilan: ${nameMatch[1].trim()}`;
      this.addMemory(nameFact, 'personal', 'auto');
      extracted.push(nameFact);
    }

    // Pattern 3: Profession / Hobbies ("saya bekerja sebagai...", "hobi saya...", "saya suka...")
    const workRegex = /(?:saya\s+bekerja\s+sebagai|profesi\s+saya|pekerjaan\s+saya)\s+(?:adalah\s+)?([^.!?\n]{3,60})/i;
    const workMatch = text.match(workRegex);
    if (workMatch && workMatch[1]) {
      const workFact = `Profesi / Pekerjaan: ${workMatch[1].trim()}`;
      this.addMemory(workFact, 'work', 'auto');
      extracted.push(workFact);
    }

    // Pattern 4: Likes / Preferences ("saya suka...", "aku paling suka...")
    const likeRegex = /(?:saya|aku)\s+(?:paling\s+)?suka\s+([^.!?\n]{4,60})/i;
    const likeMatch = text.match(likeRegex);
    if (likeMatch && likeMatch[1] && !likeMatch[1].toLowerCase().includes('kamu')) {
      const prefFact = `Menyukai: ${likeMatch[1].trim()}`;
      this.addMemory(prefFact, 'preferences', 'auto');
      extracted.push(prefFact);
    }

    return extracted;
  }
}

export const userMemoryService = new UserMemoryService();
