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

const MODEL_CALM_EMPATHY_RE =
  /\b(tenang|sabar|pelan-pelan|jangan khawatir|tidak apa-apa|gapapa|wajar kok|take your time|don't worry|it's okay|step by step)\b/i;

const CELEBRATION_RE =
  /\b(berhasil|sukses|mantap|keren|hebat|juara|selamat|akhirnya jalan|sudah bisa|udah bisa|makasih|terima kasih|thank you|thanks|fixed|solved|it works|awesome|perfect|yay|congrats|congratulations)\b/i;

const CODING_RE =
  /(```|`[^`]+`|\b(coding|code|kode|debug|debugging|typescript|javascript|python|react|three\.?js|webgl|shader|api|endpoint|server|database|firestore|sql|css|html|tailwind|compile|syntax|bug|stack trace|npm|vite|component|function|useEffect|useState|error|exception|crash)\b)/i;

const IDEA_RE =
  /\b(ide|brainstorm|saran|rekomendasi|gimana kalau|bagaimana jika|usul|konsep|desain|rencana|tips|trik|idea|suggest|recommend)\b/i;

export function analyzeMariaContext(params: {
  messages: Array<Pick<Message, 'role' | 'content'>>;
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
  const lastMessage = recent[recent.length - 1];
  const latestUser = [...recent].reverse().find((m) => m.role === 'user');
  const latestModel = [...recent].reverse().find((m) => m.role === 'model');
  const latestUserText = latestUser?.content || '';
  const latestModelText = latestModel?.content || '';
  const modelIsLatestTurn = lastMessage?.role === 'model' && latestModelText.trim().length > 0;
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

  // 2. Workspace View Context (Notebook / Projects)
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

  // 3. While waiting for first token (pure thinking state)
  if (isLoading && !isStreaming) {
    const isCodeTopic = CODING_RE.test(latestUserText);
    return {
      mood: isCodeTopic ? 'coding' : 'neutral',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: isCodeTopic ? 'Menganalisis kode...' : 'Sedang berpikir...',
      statusLabelEn: isCodeTopic ? 'Analyzing code...' : 'Thinking...',
    };
  }

  // 4. Mood & Empathy Detection (User fatigue OR Maria comforting reply)
  if (
    FATIGUE_FRUSTRATION_RE.test(latestUserText) ||
    (modelIsLatestTurn && MODEL_CALM_EMPATHY_RE.test(latestModelText))
  ) {
    return {
      mood: 'calm',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: isSpeaking ? 'Memberi semangat...' : 'Tenang, pelan-pelan',
      statusLabelEn: isSpeaking ? 'Encouraging you...' : 'Calm mode · Ready',
    };
  }

  // 5. Celebration Detection (User praise/solved OR Maria congratulating)
  if (
    !isLoading &&
    (CELEBRATION_RE.test(latestUserText) ||
      (modelIsLatestTurn && /\b(selamat|berhasil|mantap sekali|awesome|congrats|hore)\b/i.test(latestModelText)))
  ) {
    return {
      mood: 'celebrating',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: isSpeaking ? 'Merayakan bersama!' : 'Berhasil! Mantap!',
      statusLabelEn: 'Celebrating success!',
    };
  }

  // 6. Coding & Debugging Detection
  if (CODING_RE.test(combinedRecent)) {
    if (isStreaming || isSpeaking) {
      return {
        mood: 'explaining',
        spyGuardThreat: false,
        threatReason: null,
        statusLabelId: isSpeaking ? 'Menjelaskan kode' : 'Menulis kode...',
        statusLabelEn: isSpeaking ? 'Explaining code' : 'Writing code...',
      };
    }
    return {
      mood: 'coding',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: 'Siap bantu coding!',
      statusLabelEn: 'Coding Ready',
    };
  }

  // 7. Idea / Explaining / Speaking States
  if (IDEA_RE.test(latestUserText) || (modelIsLatestTurn && /\b(ide|tips|rekomendasi|saran)\b/i.test(latestModelText))) {
    if (!isStreaming && !isSpeaking) {
      return {
        mood: 'idea',
        spyGuardThreat: false,
        threatReason: null,
        statusLabelId: 'Punya ide cerdas!',
        statusLabelEn: 'Smart idea ready!',
      };
    }
  }

  if (isStreaming || isSpeaking) {
    return {
      mood: 'explaining',
      spyGuardThreat: false,
      threatReason: null,
      statusLabelId: isSpeaking ? 'Sedang berbicara' : 'Sedang menjawab...',
      statusLabelEn: isSpeaking ? 'Speaking' : 'Answering...',
    };
  }

  return {
    mood: 'neutral',
    spyGuardThreat: false,
    threatReason: null,
    statusLabelId: 'Siap membantu!',
    statusLabelEn: 'Ready to help!',
  };
}
