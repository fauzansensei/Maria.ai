import { Message } from '../types/index.ts';
import type { SidebarView } from '../components/Sidebar.tsx';

export type MariaMood =
  | 'neutral'
  | 'coding'
  | 'explaining'
  | 'calm'
  | 'celebrating'
  | 'idea'
  | 'alert';

export interface MariaContextSignal {
  mood: MariaMood;
  spyGuardThreat: boolean;
  threatReason: string | null;
  statusLabelId: string;
  statusLabelEn: string;
}

const THREAT_PATTERNS: Array<{ pattern: RegExp; id: string; en: string }> = [
  {
    pattern: /(<script\b|javascript:|onerror\s*=|onload\s*=|document\.cookie)/i,
    id: 'Potensi XSS terdeteksi',
    en: 'Potential XSS pattern detected',
  },
  {
    pattern: /(\bunion\s+select\b|\bdrop\s+table\b|\bor\s+1\s*=\s*1\b|--\s*$)/i,
    id: 'Pola SQL Injection terdeteksi',
    en: 'SQL Injection pattern detected',
  },
  {
    pattern: /(\bserangan\b|\bddos\b|\bbrute\s*force\b|\bmalware\b|\bransomware\b|\bphishing\b|\bexploit\b|\bbreach\b|\bintrusion\b|\bspy\s*guard\s*(alert|bahaya|merah|serangan)\b)/i,
    id: 'Peringatan ancaman keamanan Spy Guard',
    en: 'Spy Guard security threat warning',
  },
  {
    pattern: /(api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,})/i,
    id: 'Kebocoran kunci rahasia terdeteksi',
    en: 'Secret key exposure detected',
  },
];

const FATIGUE_FRUSTRATION_RE =
  /\b(capek|cape|lelah|pusing|stuck|error terus|gagal terus|gagal lagi|frustrasi|stres|stress|menyerah|nyerah|bingung banget|nggak jalan|gak jalan|not working|tired|exhausted|frustrated|burnt out|annoying)\b/i;

const CELEBRATION_RE =
  /\b(berhasil|sukses|mantap|keren|hebat|juara|akhirnya jalan|sudah bisa|udah bisa|makasih|terima kasih|thank you|thanks|fixed|solved|it works|awesome|perfect|yay)\b/i;

const CODING_RE =
  /(```|`[^`]+`|\b(coding|code|kode|debug|debugging|typescript|javascript|python|react|three\.?js|webgl|shader|api|endpoint|server|database|firestore|sql|css|html|tailwind|compile|syntax|bug|stack trace|npm|vite|component|function|useEffect|useState|error|exception|crash)\b)/i;

const IDEA_RE =
  /\b(ide|brainstorm|saran|rekomendasi|gimana kalau|bagaimana jika|usul|konsep|desain|rencana|idea|suggest|recommend)\b/i;

export function analyzeMariaContext(params: {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isSpeaking: boolean;
  activeView: SidebarView;
  manualSpyGuardAlert?: boolean;
}): MariaContextSignal {
  const {
    messages,
    isLoading,
    isStreaming,
    isSpeaking,
    activeView,
    manualSpyGuardAlert = false,
  } = params;

  const recent = messages.slice(-4);
  const latestUser = [...recent].reverse().find((m) => m.role === 'user');
  const latestModel = [...recent].reverse().find((m) => m.role === 'model');
  const latestUserText = latestUser?.content || '';
  const latestModelText = latestModel?.content || '';
  const combinedRecent = `${latestUserText}\n${latestModelText}`;

  // 1. Spy Guard Security Check
  if (manualSpyGuardAlert) {
    return {
      mood: 'alert',
      spyGuardThreat: true,
      threatReason: 'Simulasi Alert Spy Guard Aktif',
      statusLabelId: 'Spy Guard: Mode Siaga Merah',
      statusLabelEn: 'Spy Guard: Red Alert Active',
    };
  }

  for (const rule of THREAT_PATTERNS) {
    if (rule.pattern.test(latestUserText)) {
      return {
        mood: 'alert',
        spyGuardThreat: true,
        threatReason: rule.id,
        statusLabelId: `Spy Guard: ${rule.id}`,
        statusLabelEn: `Spy Guard: ${rule.en}`,
      };
    }
  }

  // 2. Workspace View Context (Notebook / Projects / etc.)
  if (activeView === 'notebooks') {
    return {
      mood: 'explaining',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Meninjau Notebook',
      statusLabelEn: 'Reviewing Notebook',
    };
  }
  if (activeView === 'projects') {
    return {
      mood: 'explaining',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Membantu Proyek',
      statusLabelEn: 'Presenting Project',
    };
  }

  // 3. Mood & Fatigue / Empathy Detection
  if (FATIGUE_FRUSTRATION_RE.test(latestUserText)) {
    return {
      mood: 'calm',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Tenang, kita selesaikan pelan-pelan',
      statusLabelEn: 'Calm mode · Here to help',
    };
  }

  // 4. Celebration Detection (only when not currently loading a fresh prompt)
  if (!isLoading && !isStreaming && CELEBRATION_RE.test(latestUserText)) {
    return {
      mood: 'celebrating',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Berhasil! Ikut merayakan',
      statusLabelEn: 'Celebrating success!',
    };
  }

  // 5. Coding & Debugging Detection
  if (CODING_RE.test(combinedRecent)) {
    if (isLoading && !isStreaming) {
      return {
        mood: 'coding',
        spyGuardThreat: false,
        threatReason: null,
        statusLabelId: 'Menganalisis kode...',
        statusLabelEn: 'Analyzing code...',
      };
    }
    if (isStreaming || isSpeaking) {
      return {
        mood: 'explaining',
        spyGuardThreat: false,
        threatReason: null,
        statusLabelId: 'Menjelaskan solusi kode',
        statusLabelEn: 'Explaining code solution',
      };
    }
    return {
      mood: 'coding',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Mode Asisten Coding',
      statusLabelEn: 'Coding Assistant Ready',
    };
  }

  // 6. Idea / Explaining / Speaking States
  if (isStreaming || isSpeaking) {
    return {
      mood: 'explaining',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: isSpeaking ? 'Sedang berbicara' : 'Menjelaskan jawaban',
      statusLabelEn: isSpeaking ? 'Speaking aloud' : 'Explaining answer',
    };
  }

  if (IDEA_RE.test(latestUserText)) {
    return {
      mood: 'idea',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Punya ide cerdas!',
      statusLabelEn: 'Smart idea ready!',
    };
  }

  return {
    mood: 'neutral',
    spyGuardThreat: false,
    threatReason: null,
    statusLabelId: isLoading ? 'Sedang berpikir...' : 'Siap membantu!',
    statusLabelEn: isLoading ? 'Thinking...' : 'Ready to help!',
  };
}
