import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useThemeActions } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { Sidebar, SidebarView } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { LibraryArea } from './components/LibraryArea.tsx';
import { DiscoverArea } from './components/DiscoverArea.tsx';
import { NotebookArea } from './components/NotebookArea.tsx';
import { ImagesArea } from './components/ImagesArea.tsx';
import { ProjectsArea } from './components/ProjectsArea.tsx';
import { PluginsArea } from './components/PluginsArea.tsx';
import { StudentsArea } from './components/StudentsArea.tsx';
import { SkillsArea } from './components/SkillsArea.tsx';
import { VideoArea } from './components/VideoArea.tsx';
import { ScienceScoutModal } from './components/ScienceScoutModal.tsx';
import { SettingsDashboard } from './components/SettingsDashboard.tsx';
import { TwoFactorModal } from './components/TwoFactorModal.tsx';
import { ImageStudioModal } from './components/ImageStudioModal.tsx';
import { MusicVoiceModal } from './components/MusicVoiceModal.tsx';
import { CanvasCodeModal } from './components/CanvasCodeModal.tsx';
import { MariaPlusModal } from './components/MariaPlusModal.tsx';
import { Conversation, Message, AiMode, UserSettings, MediaAttachment } from './types/index.ts';
import { DEFAULT_SETTINGS, VOICE_PERSONAS, ACCENT_COLORS } from './constants.ts';
import { speechService } from './lib/speechService.ts';
import { optimizeCookies, pruneLocalStorageBloat } from './lib/storageOptimizer.ts';
import { detectLaunchAction, executeLaunch, LaunchAction } from './lib/actionLauncher.ts';
import { isImageIntent, extractImagePrompt } from './lib/imageIntent.ts';
import {
  getMediaBase64,
  getMediaFileUri,
  storeMediaFileUri,
  resolveOriginalBlob,
  uploadMediaToGemini,
} from './lib/mediaUtils.ts';
import {
  subscribeConversations,
  subscribeMessages,
  createConversation,
  addMessage,
  updateMessage,
  deleteMessage,
  deleteConversation,
  updateConversation,
  getUserProfile,
} from './lib/firestoreService.ts';
import { userMemoryService } from './lib/userMemoryService.ts';
import {
  NotebookItem,
  ProjectItem,
  SkillItem,
  loadNotebooks,
  saveNotebooks,
} from './lib/workspaceStore.ts';

function AppContent() {
  const { user } = useAuth();
  const { setTheme } = useThemeActions();
  const [activeConnectingAction, setActiveConnectingAction] = useState<LaunchAction | null>(null);

  // Enforce super-compact 1-byte micro cookies and clean storage on launch
  useEffect(() => {
    optimizeCookies();
    pruneLocalStorageBloat();
  }, []);

  // Navigation View State
  const [activeView, setActiveView] = useState<SidebarView>('chat');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);

  // Conversations & Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AiMode>('search');

  // Modals & Drawers - default closed so chat has full focus and hamburger menu is clean
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isScienceScoutOpen, setIsScienceScoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isMusicVoiceOpen, setIsMusicVoiceOpen] = useState(false);
  const [isCanvasCodeOpen, setIsCanvasCodeOpen] = useState(false);
  const [isPlusModalOpen, setIsPlusModalOpen] = useState(false);
  const [studioBaseImage, setStudioBaseImage] = useState<string | null>(null);
  const [studioPrompt, setStudioPrompt] = useState<string>('');

  // User Settings for TTS, voice, and preferences
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('maria_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const handleUpdateSettings = (patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch };
      if ('voiceEnabled' in patch) {
        updated.voiceResponses = Boolean(patch.voiceEnabled);
      }
      try {
        localStorage.setItem('maria_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleTogglePlus = (active: boolean) => {
    handleUpdateSettings({
      isPlus: active,
      plusPlan: active ? 'yearly' : 'free',
    });
  };

  // Apply Accent Color & Speech Dictionary dynamically whenever settings change
  useEffect(() => {
    const foundAccent = ACCENT_COLORS.find((a) => a.id === (settings.accentColor || 'blue'));
    const hex = foundAccent?.hex || '#2563eb';
    document.documentElement.style.setProperty('--maria-accent', hex);
    speechService.setDictionary(settings.speechDictionary || []);
  }, [settings.accentColor, settings.speechDictionary]);

  const shouldAllowEmojis = (cfg: UserSettings): boolean => {
    return Boolean(
      cfg.customPrompt?.trim() ||
        cfg.languageStyle === 'Gaul' ||
        cfg.languageStyle === 'Santai' ||
        cfg.tone === 'Friendly' ||
        cfg.tone === 'Casual' ||
        cfg.tone === 'Creative' ||
        cfg.personalityEnthusiasm
    );
  };

  const buildSettingsSystemAddendum = (
    cfg: UserSettings,
    project: ProjectItem | null = activeProject
  ): string => {
    const toneGuides: Record<string, string> = {
      Professional: 'Profesional, jelas, objektif, dan terstruktur.',
      Friendly: 'Ramah, akrab, komunikatif, dan mudah didekati.',
      Casual: 'Santai, rileks, mengalir natural seperti obrolan sehari-hari tanpa kaku.',
      Creative: 'Ekspresif, imajinatif, penuh ide segar dan analogi menarik.',
      Academic: 'Analitis, mendalam, sistematis, dan berlandaskan logika ilmiah.',
      Warm: 'Hangat, empatik, penuh perhatian, dan menenangkan.',
      Technical: 'Presisi, teknis, fokus detail implementasi dan terminologi akurat.',
      Minimalist: 'Sangat ringkas, hemat kata, langsung ke inti tanpa basa-basi.',
    };

    const styleGuides: Record<string, string> = {
      Baku: 'Bahasa Indonesia baku dan rapi (gunakan sapaan "Saya" dan "Anda").',
      Santai: 'Bahasa sehari-hari yang luwes dan akrab (gunakan sapaan "aku/kamu" secara natural).',
      Gaul: 'Bahasa anak muda Indonesia yang ekspresif dan santai (boleh memakai "gue/lo" atau partikel santai seperti "nih, sih, dong, wkwk" jika cocok).',
      Puitis: 'Bahasa yang indah, berirama, dan kaya metafora.',
      Teknis: 'Gaya dokumentasi teknis/engineering yang lugas, to-the-point, dan akurat.',
    };

    const parts: string[] = [];

    if (project) {
      parts.push(
        `KONTEKS WORKSPACE PROYEK AKTIF ("${project.name}"):\n- Instruksi Proyek: ${project.customInstruction}${
          project.contextNotes ? `\n- Catatan Konteks Proyek: ${project.contextNotes}` : ''
        }`
      );
    }

    if (cfg.customPrompt?.trim()) {
      parts.push(
        `INSTRUKSI KEPRIBADIAN & PROMPT KHUSUS PENGGUNA (WAJIB DIPATUHI 100%, MENGGANTIKAN GAYA BAWAAN BILA BERBEDA):\n${cfg.customPrompt.trim()}`
      );
    }

    if (cfg.tone) {
      parts.push(`- Gaya / Nada Respon Utama (${cfg.tone}): ${toneGuides[cfg.tone] || cfg.tone}`);
    }
    if (cfg.languageStyle) {
      parts.push(`- Gaya Bahasa & Sapaan (${cfg.languageStyle}): ${styleGuides[cfg.languageStyle] || cfg.languageStyle}`);
    }
    if (cfg.regionalLanguage?.trim() && cfg.regionalLanguage !== 'Tidak ada') {
      parts.push(`- Sentuhan Bahasa Daerah: ${cfg.regionalLanguage.trim()}`);
    }
    if (cfg.language === 'English') {
      parts.push('- Bahasa Antarmuka & Respon: English (US) kecuali pengguna menulis dalam Bahasa Indonesia.');
    }
    if (cfg.userBio?.trim()) {
      parts.push(`- Profil & Konteks Pengguna (dari Pengaturan): ${cfg.userBio.trim()}`);
    }
    if (cfg.responsePreferences?.trim()) {
      parts.push(`- Preferensi Format & Gaya Respon Pengguna: ${cfg.responsePreferences.trim()}`);
    }
    if (cfg.fastAnswers) {
      parts.push('- Mode Jawaban Cepat: Berikan jawaban ringkas, padat, langsung ke poin utama.');
    }
    if (cfg.personalityWarmth === false) {
      parts.push('- Kehangatan: Netral dan objektif, minim basa-basi emosional.');
    } else {
      parts.push('- Kehangatan: Tunjukkan kehangatan dan empati yang wajar sesuai kepribadian.');
    }
    if (cfg.personalityEnthusiasm) {
      parts.push('- Antusiasme: Berikan respon yang antusias, ekspresif, dan bersemangat.');
    }
    if (cfg.personalityStructured === false) {
      parts.push('- Format Jawaban: Utamakan paragraf naratif yang mengalir tanpa terlalu banyak daftar bullet.');
    } else if (!cfg.customPrompt?.trim() && cfg.languageStyle !== 'Gaul' && cfg.languageStyle !== 'Santai') {
      parts.push('- Format Jawaban: Gunakan judul bagian atau daftar poin terstruktur bila penjelasan panjang.');
    }
    if (cfg.reduceSensitiveContent) {
      parts.push('- Filter Keamanan Konten (Safety): Hindari pembahasan topik sensitif, kekerasan eksplisit, atau konten berisiko tinggi.');
    }

    return parts.join('\n');
  };

  // Keep settings synchronized across external browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'maria_settings' && e.newValue) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Local state messages for guest / unauthenticated preview
  const [guestMessages, setGuestMessages] = useState<Message[]>([]);
  const guestMessagesRef = useRef<Message[]>([]);
  useEffect(() => {
    guestMessagesRef.current = guestMessages;
  }, [guestMessages]);

  const activeConvIdRef = useRef<string | null>(activeConvId);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const hasAutoSelectedConvRef = useRef<boolean>(false);
  const prevSubscribedConvRef = useRef<{ uid: string | null; convId: string | null }>({
    uid: null,
    convId: null,
  });

  // 1. Sync User Profile Theme from Firestore once per login (never overwrite user selection)
  const syncedThemeUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) {
      syncedThemeUidRef.current = null;
      return;
    }
    if (syncedThemeUidRef.current === user.uid) return;
    syncedThemeUidRef.current = user.uid;

    const themeBeforeFetch = localStorage.getItem('maria_theme');
    getUserProfile(user.uid)
      .then((profile) => {
        const themeNow = localStorage.getItem('maria_theme');
        if (profile?.theme && themeNow === themeBeforeFetch) {
          setTheme(profile.theme);
        }
      })
      .catch((err) => {
        console.warn('Could not sync user profile theme:', err);
      });
  }, [user?.uid, setTheme]);

  // 2. Subscribe to User's Firestore Conversations
  useEffect(() => {
    if (!user) {
      hasAutoSelectedConvRef.current = false;
      activeConvIdRef.current = null;
      setConversations([]);
      setActiveConvId(null);
      return;
    }

    const unsubscribe = subscribeConversations(user.uid, (convs) => {
      setConversations(convs);
      // Auto select first conversation only on initial session load (never override explicit New Chat)
      if (convs.length > 0 && !activeConvIdRef.current && !hasAutoSelectedConvRef.current) {
        hasAutoSelectedConvRef.current = true;
        activeConvIdRef.current = convs[0].id;
        setActiveConvId(convs[0].id);
      } else if (convs.length > 0) {
        hasAutoSelectedConvRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Subscribe to Active Conversation Messages
  useEffect(() => {
    const prevCtx = prevSubscribedConvRef.current;

    if (!user) {
      if (prevCtx.uid !== null) {
        setMessages(guestMessagesRef.current);
      }
      prevSubscribedConvRef.current = { uid: null, convId: null };
      return;
    }

    if (!activeConvId) {
      // Switching from an existing conversation back to New Chat already clears messages in handleNewConversation;
      // Do NOT clear messages here so Temporary Chat & saveChatHistory=false sessions keep their live messages.
      prevSubscribedConvRef.current = { uid: user.uid, convId: null };
      return;
    }

    if (prevCtx.convId && prevCtx.convId !== activeConvId) {
      setMessages([]);
    }
    prevSubscribedConvRef.current = { uid: user.uid, convId: activeConvId };

    const unsubscribe = subscribeMessages(activeConvId, (msgs) => {
      setMessages((prev) => {
        const merged = [...msgs];
        for (const localMsg of prev) {
          if (localMsg.conversationId !== activeConvId) continue;
          const isOptimisticOrStreaming =
            localMsg.isStreaming ||
            localMsg.id.startsWith('usr_') ||
            localMsg.id.startsWith('ai_') ||
            localMsg.id.startsWith('err_');
          if (!isOptimisticOrStreaming) continue;

          const createdMs =
            localMsg.createdAt instanceof Date ? localMsg.createdAt.getTime() : 0;
          const isRecent = createdMs > 0 && Date.now() - createdMs < 25000;
          if (!localMsg.isStreaming && !isRecent) continue;

          const localCount = prev.filter(
            (m) => m.role === localMsg.role && m.content === localMsg.content
          ).length;
          const remoteCount = merged.filter(
            (m) => m.role === localMsg.role && m.content === localMsg.content
          ).length;

          if (remoteCount < localCount) {
            merged.push(localMsg);
          }
        }
        return merged;
      });
    });

    return () => unsubscribe();
  }, [user?.uid, activeConvId]);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || null;

  // Handler: Start New Conversation
  const handleNewConversation = () => {
    hasAutoSelectedConvRef.current = true;
    activeConvIdRef.current = null;
    setActiveConvId(null);
    setGuestMessages([]);
    setMessages([]);
    setActiveView('chat');
  };

  // Handler: Create Notebook from Sidebar
  const handleCreateNotebookFromSidebar = () => {
    const existing = loadNotebooks();
    const isEnglish = settings.language === 'English';
    const newNb: NotebookItem = {
      id: `nb-${Date.now()}`,
      title: isEnglish ? `Untitled Notebook ${existing.length + 1}` : `Notebook Baru ${existing.length + 1}`,
      description: isEnglish
        ? 'Personal knowledge & research notebook'
        : 'Catatan riset & sumber pengetahuan pribadi',
      sources: [],
      notes: '',
      aiSummary: '',
      updatedAt: new Date().toISOString(),
    };
    saveNotebooks([newNb, ...existing]);
    setSelectedNotebookId(newNb.id);
    setActiveView('notebooks');
  };

  // Handler: Delete Conversation
  const handleDeleteConversation = async (convId: string) => {
    // 1. Unbind active conversation if deleted to unsubscribe message listeners
    if (activeConvIdRef.current === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      const nextId = remaining.length > 0 ? remaining[0].id : null;
      activeConvIdRef.current = nextId;
      setActiveConvId(nextId);
      setMessages([]);
    }
    setConversations((prev) => prev.filter((c) => c.id !== convId));

    try {
      if (user) {
        await deleteConversation(convId, user.uid);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Handler: Rename Conversation
  const handleRenameConversation = async (convId: string, newTitle: string) => {
    try {
      if (user) {
        await updateConversation(convId, { title: newTitle });
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Handler: Pin / Unpin Conversation
  const handleTogglePinConversation = (convId: string) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;
      const target = prev[idx];
      // Move to top when pinned
      const rest = prev.filter((c) => c.id !== convId);
      return [{ ...target, title: target.title.startsWith('📌 ') ? target.title.replace('📌 ', '') : `📌 ${target.title}` }, ...rest];
    });
  };

  // Handler: Archive Conversation to Library
  const handleArchiveConversation = (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      alert(`Percakapan "${conv.title}" berhasil diarsipkan ke Pustaka Maria!`);
    }
  };

  // Handler: Clear All History with 2FA verification
  const handleConfirmPurgeAllHistory = async () => {
    const toDelete = [...conversations];
    hasAutoSelectedConvRef.current = true;
    activeConvIdRef.current = null;
    setActiveConvId(null);
    setConversations([]);
    setMessages([]);
    setGuestMessages([]);

    try {
      if (user) {
        for (const conv of toDelete) {
          await deleteConversation(conv.id, user.uid);
        }
      }
      alert('Seluruh riwayat percakapan berhasil dihapus secara aman.');
    } catch (err) {
      console.error('Error purging history:', err);
    }
  };

  // Handler: Edit Message (Fix typo / wrong text without duplicating turns)
  const handleEditMessage = async (messageId: string, newContent: string, resend: boolean) => {
    const currentList = messages;
    const targetIdx = currentList.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    const targetMessage = currentList[targetIdx];
    const updatedTarget: Message = {
      ...targetMessage,
      content: newContent,
      editedAt: new Date(),
    };

    // If user only wanted to save in place without requesting a new AI reply
    if (!resend) {
      if (user && activeConvId) {
        await updateMessage(activeConvId, messageId, newContent);
      }
      setGuestMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updatedTarget : m))
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updatedTarget : m))
      );
      return;
    }

    // RESEND REQUESTED:
    // Truncate previous subsequent turns following this user message to avoid duplicate messages & duplicate AI replies
    speechService.unlockAudio();
    setIsLoading(true);

    const prunedList = [
      ...currentList.slice(0, targetIdx),
      updatedTarget,
    ];

    // In state, replace message list up to this edited user turn
    setGuestMessages(prunedList);
    setMessages(prunedList);

    // If logged in with active conversation, prune subsequent messages in Firestore and update the edited message
    if (user && activeConvId) {
      const subsequentMessages = currentList.slice(targetIdx + 1);
      for (const m of subsequentMessages) {
        await deleteMessage(activeConvId, m.id).catch(() => {});
      }
      await updateMessage(activeConvId, messageId, newContent);
    }

    try {
      // Prepare conversation history up to the edited user message, preferring lightweight Gemini fileUris
      let remainingEditMediaBudget = 8 * 1024 * 1024;
      const historyTurns = prunedList.map((m, idx) => {
        const isCurrentOrRecent = idx >= Math.max(0, prunedList.length - 3);
        return {
          role: m.role as 'user' | 'model',
          content: m.content,
          attachments: m.attachments?.map((a) => {
            const cachedUri = a.fileUri || getMediaFileUri(a.id) || getMediaFileUri(a.name);
            if (cachedUri && isCurrentOrRecent) {
              return {
                type: a.type,
                mimeType: a.mimeType,
                fileUri: cachedUri,
                data: '',
                name: a.name,
                size: a.size,
              };
            }
            const rawData = isCurrentOrRecent
              ? a.base64Data || getMediaBase64(a.id) || getMediaBase64(a.name) || ''
              : '';
            let safeData = '';
            if (rawData && rawData.length <= remainingEditMediaBudget) {
              safeData = rawData;
              remainingEditMediaBudget -= rawData.length;
            }
            return {
              type: a.type,
              mimeType: a.mimeType,
              data: safeData,
              name: a.name,
              size: a.size,
            };
          }),
        };
      });

      const isVoiceAuto = Boolean(settings.voiceEnabled || settings.voiceResponses);
      const personaObj = VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita'));
      const activeVoiceName = personaObj?.geminiVoice || settings.geminiVoice || 'Aoede';

      // Check if edited message contains launch action (e.g. music or app open)
      const editLaunchAction = detectLaunchAction(newContent);
      if (editLaunchAction) {
        executeLaunch(editLaunchAction);
      }

      // Auto-trigger Image Generation on Edit if requested
      if (isImageIntent(newContent) || targetMessage.mode === 'image') {
        const effectivePrompt = targetMessage.mode === 'image' ? newContent : extractImagePrompt(newContent);
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: effectivePrompt,
            imageSize: '1K',
            aspectRatio: '1:1',
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          let messageContent = `Berikut adalah ilustrasi AI yang dihasilkan untuk: "${newContent}"`;
          if (imgData.notice) {
            messageContent += `\n\n> ℹ️ ${imgData.notice}`;
          }

          const modelMessageObj: Message = {
            id: `ai_${Date.now()}`,
            conversationId: activeConvId || 'guest_conv',
            userId: user ? user.uid : 'guest',
            role: 'model',
            content: messageContent,
            model: imgData.model || 'gemini-3.1-flash-lite-image',
            mode: 'image',
            imageUri: imgData.imageUrl,
            createdAt: new Date(),
          };

          if (user && activeConvId) {
            await addMessage(activeConvId, user.uid, {
              role: 'model',
              content: modelMessageObj.content,
              model: modelMessageObj.model,
              imageUri: modelMessageObj.imageUri,
            });
          } else {
            setGuestMessages((prev) => [...prev, modelMessageObj]);
          }
          setMessages((prev) => [...prev, modelMessageObj]);
          setIsLoading(false);
          return;
        }
      }

      const editNow = new Date();
      const editDeviceTime = {
        iso: editNow.toISOString(),
        localTime: editNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        localDate: editNow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
      };
      const editUserName = user?.displayName || settings.username || '';
      const editUserMemories =
        settings.memoryEnabled !== false ? userMemoryService.getFormattedMemoryPrompt(editUserName) : '';

      // Resilient fetch with automatic retry for transient network reconnections
      let response: Response | null = null;
      let lastFetchError: any = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: historyTurns,
              mode: targetMessage.mode || activeMode,
              systemInstruction: buildSettingsSystemAddendum(settings),
              webSearch: (settings.webSearchDefault ?? true) && (settings.enabledPlugins?.includes('google-search') ?? true),
              allowEmojis: shouldAllowEmojis(settings),
              location: undefined,
              withVoice: isVoiceAuto,
              voiceName: activeVoiceName,
              personaId: settings.voicePersona || 'wanita',
              deviceTime: editDeviceTime,
              userMemories: editUserMemories,
              userName: editUserName,
            }),
          });
          if (response.ok) break;
        } catch (fetchErr: any) {
          lastFetchError = fetchErr;
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 600)); // Brief backoff for reconnection
          }
        }
      }

      if (!response || !response.ok) {
        let errMessage = 'Gagal mengambil jawaban AI.';
        try {
          if (response) {
            const ct = response.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const errData = await response.json();
              if (errData.error) errMessage = errData.error;
            } else if (response.status === 429) {
              errMessage = 'Batas frekuensi permintaan tercapai (Rate limit). Tunggu 1 menit lalu coba kembali.';
            } else if (response.status === 403) {
              errMessage = 'Permintaan tidak dapat diproses (HTTP 403).';
            } else if (response.status === 503) {
              errMessage = 'Layanan AI sedang sibuk (503). Silakan coba kirim ulang.';
            } else if (response.status >= 500) {
              errMessage = 'Server AI sedang memproses permintaan. Silakan coba kirim ulang.';
            } else {
              errMessage = `Koneksi ke server AI terganggu (HTTP ${response.status}). Silakan coba kirim ulang.`;
            }
          } else if (lastFetchError?.message) {
            errMessage = `Koneksi terputus: ${lastFetchError.message}`;
          }
        } catch {}

        const errorNotice: Message = {
          id: `ai_${Date.now()}`,
          conversationId: activeConvId || 'guest_conv',
          userId: user ? user.uid : 'guest',
          role: 'model',
          content: `Mohon maaf, terjadi kendala saat memproses pesan: ${errMessage}. Silakan coba kirim ulang.`,
          model: 'system',
          createdAt: new Date(),
        };

        if (user && activeConvId) {
          await addMessage(activeConvId, user.uid, {
            role: 'model',
            content: errorNotice.content,
            model: errorNotice.model,
          }).catch(() => {});
        } else {
          setGuestMessages((prev) => [...prev, errorNotice]);
        }
        setMessages((prev) => [...prev, errorNotice]);
        return;
      }

      const ct = response.headers.get('content-type') || '';
      let data: any = {};
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Layanan sedang menyinkronkan data. Silakan coba sesaat lagi.');
      }

      const modelMessageObj: Message = {
        id: `ai_${Date.now()}`,
        conversationId: activeConvId || 'guest_conv',
        userId: user ? user.uid : 'guest',
        role: 'model',
        content: data.text || 'Tidak ada teks yang dihasilkan.',
        model: data.model,
        mode: targetMessage.mode || activeMode,
        groundingLinks: data.groundingLinks,
        audioUri: data.audioUrl,
        launchAction: editLaunchAction || undefined,
        createdAt: new Date(),
      };

      if (user && activeConvId) {
        await addMessage(activeConvId, user.uid, {
          role: 'model',
          content: modelMessageObj.content,
          model: modelMessageObj.model,
          groundingLinks: modelMessageObj.groundingLinks,
          audioUri: modelMessageObj.audioUri,
          launchAction: modelMessageObj.launchAction ? { ...modelMessageObj.launchAction } : undefined,
        });
      } else {
        setGuestMessages((prev) => [...prev, modelMessageObj]);
      }
      setMessages((prev) => [...prev, modelMessageObj]);

      // Auto TTS voice readout if enabled
      if (isVoiceAuto && modelMessageObj.content) {
        if (data.audioUrl) {
          speechService.playAudioDirectly(data.audioUrl, {
            messageId: modelMessageObj.id,
            speed: settings.speechSpeed || '1x',
            personaId: settings.voicePersona || 'wanita',
          });
        } else {
          speechService.speak(modelMessageObj.content, {
            messageId: modelMessageObj.id,
            speed: settings.speechSpeed || '1x',
            voiceName: activeVoiceName,
            personaId: settings.voicePersona || 'wanita',
            ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
          });
        }
      }
    } catch (err: any) {
      console.warn('Notice during message edit exchange:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Regenerate AI Response from the preceding user prompt
  const handleRegenerateMessage = async (modelMessageId: string) => {
    if (isLoading) return;
    const currentList = messages;
    const modelIdx = currentList.findIndex((m) => m.id === modelMessageId);
    if (modelIdx === -1) return;

    let targetUserMsg: Message | null = null;
    for (let i = modelIdx - 1; i >= 0; i--) {
      if (currentList[i].role === 'user') {
        targetUserMsg = currentList[i];
        break;
      }
    }
    if (!targetUserMsg) return;
    await handleEditMessage(targetUserMsg.id, targetUserMsg.content, true);
  };

  // Image Studio Modal Handlers
  const handleOpenImageStudio = (baseImage?: string, prompt?: string) => {
    setStudioBaseImage(baseImage || null);
    setStudioPrompt(prompt || '');
    setIsImageStudioOpen(true);
  };

  const handleSendStudioImageToChat = async (
    imageUrl: string,
    promptText: string,
    modelName: string
  ) => {
    let currentConvId = activeConvIdRef.current;
    if (user && !currentConvId) {
      currentConvId = await createConversation(
        user.uid,
        promptText.slice(0, 32) || 'Studio Gambar AI',
        'image'
      );
      activeConvIdRef.current = currentConvId;
      setActiveConvId(currentConvId);
    }

    const modelMessageObj: Message = {
      id: `ai_${Date.now()}`,
      conversationId: currentConvId || 'guest_conv',
      userId: user ? user.uid : 'guest',
      role: 'model',
      content: `Berikut adalah hasil kreasi Studio Gambar AI untuk: "${promptText}"`,
      model: modelName,
      mode: 'image',
      imageUri: imageUrl,
      createdAt: new Date(),
    };

    if (user && currentConvId) {
      await addMessage(currentConvId, user.uid, {
        role: 'model',
        content: modelMessageObj.content,
        model: modelMessageObj.model,
        imageUri: modelMessageObj.imageUri,
      });
    } else {
      setGuestMessages((prev) => [...prev, modelMessageObj]);
    }
    setMessages((prev) => [...prev, modelMessageObj]);
  };

  // Handler: Send Message
  const handleSendMessage = async (
    content: string,
    mode: AiMode = activeMode,
    imageConfig?: { imageSize: '1K' | '2K' | '4K'; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' },
    attachments?: MediaAttachment[],
    webSearchEnabled: boolean = true
  ) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    const safeContent = content;

    // Pre-unlock audio context within user gesture
    speechService.unlockAudio();

    // Detect Windows Open action (Music, Discord, YouTube, external sites)
    const launchAction = detectLaunchAction(safeContent);
    if (launchAction) {
      setActiveConnectingAction(launchAction);
      executeLaunch(launchAction);
    }

    setIsLoading(true);
    setActiveView('chat');

    const isEphemeral = Boolean(settings.temporaryChat) || settings.saveChatHistory === false;
    let resolvedConvId: string | null = isEphemeral ? null : activeConvIdRef.current;

    const userMsgId = `usr_${Date.now()}`;
    const userMessageObj: Message = {
      id: userMsgId,
      conversationId: resolvedConvId || 'guest_conv',
      userId: user ? user.uid : 'guest',
      role: 'user',
      content: safeContent,
      mode,
      attachments,
      createdAt: new Date(),
    };

    // Show user message immediately in the UI (zero perceived latency)
    setMessages((prev) => [...prev, userMessageObj]);
    if (!user || isEphemeral) {
      setGuestMessages((prev) => [...prev, userMessageObj]);
    }

    try {
      let currentConvId = resolvedConvId;

      // Create conversation if first turn for logged-in user (skipped in Temporary Chat)
      if (user && !currentConvId && !isEphemeral) {
        const titleSnippet = safeContent.length > 35 ? safeContent.slice(0, 35) + '...' : (attachments?.[0]?.name || safeContent);
        currentConvId = await createConversation(user.uid, titleSnippet, mode);
        resolvedConvId = currentConvId;
        activeConvIdRef.current = currentConvId;
        setActiveConvId(currentConvId);
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsgId ? { ...m, conversationId: currentConvId! } : m))
        );
      }

      if (user && currentConvId && !isEphemeral) {
        await addMessage(currentConvId, user.uid, {
          role: 'user',
          content,
          attachments: attachments?.map((a) => ({
            id: a.id,
            name: a.name,
            size: a.size,
            mimeType: a.mimeType,
            type: a.type,
            previewUrl: a.previewUrl,
            ...(a.fileUri ? { fileUri: a.fileUri } : {}),
          })),
        });
      }

      // Handle Image Generation & Editing Mode (Explicit Mode OR Auto-Detected Intent from prompt)
      const isAutoImage = isImageIntent(safeContent);
      if (mode === 'image' || isAutoImage) {
        const imgAttachment = attachments?.find((a) => a.type === 'image');
        const baseImage = imgAttachment?.base64Data || imgAttachment?.originalUrl || imgAttachment?.previewUrl;
        const mimeType = imgAttachment?.mimeType;

        const effectivePrompt = mode === 'image' ? content : extractImagePrompt(content);

        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: effectivePrompt,
            imageSize: imageConfig?.imageSize || '1K',
            aspectRatio: imageConfig?.aspectRatio || '1:1',
            baseImage,
            mimeType,
          }),
        });

        if (!imgRes.ok) {
          let errMessage = 'Gagal menghasilkan gambar AI.';
          try {
            const errData = await imgRes.json();
            if (errData.error) errMessage = errData.error;
          } catch {}
          throw new Error(errMessage);
        }

        const imgData = await imgRes.json();

        let messageContent = baseImage
          ? `Berikut adalah hasil modifikasi / edit gambar untuk: "${content}"`
          : `Berikut adalah ilustrasi AI yang dihasilkan untuk: "${content}"`;
        if (imgData.notice) {
          messageContent += `\n\n> ℹ️ ${imgData.notice}`;
        }

        const modelMessageObj: Message = {
          id: `ai_${Date.now()}`,
          conversationId: currentConvId || 'guest_conv',
          userId: user ? user.uid : 'guest',
          role: 'model',
          content: messageContent,
          model: imgData.model || 'gemini-3.1-flash-lite-image',
          mode: 'image',
          imageUri: imgData.imageUrl,
          createdAt: new Date(),
        };

        if (user && currentConvId && !isEphemeral) {
          await addMessage(currentConvId, user.uid, {
            role: 'model',
            content: modelMessageObj.content,
            model: modelMessageObj.model,
            imageUri: modelMessageObj.imageUri,
          });
        } else {
          setGuestMessages((prev) => [...prev, modelMessageObj]);
        }
        setMessages((prev) => [...prev, modelMessageObj]);

        // Auto TTS voice readout if enabled
        const isVoiceAuto = Boolean(settings.voiceEnabled || settings.voiceResponses);
        if (isVoiceAuto) {
          speechService.speak(modelMessageObj.content, {
            messageId: modelMessageObj.id,
            speed: settings.speechSpeed || '1x',
            voiceName: settings.geminiVoice || 'Kore',
            ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
          });
        }

        setIsLoading(false);
        return;
      }

      // Handle Standard, Thinking, Fast, Search, Maps, Science Chat
      let userLocation: { latitude: number; longitude: number } | undefined;
      if (mode === 'maps' && navigator.geolocation) {
        try {
          userLocation = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }),
              () => resolve(undefined),
              { timeout: 3000 }
            );
          });
        } catch {}
      }

      // Ensure any large video/media attachment in the current turn uses Gemini Files API fileUri
      const resolvedCurrentAttachments = attachments
        ? await Promise.all(
            attachments.map(async (a) => {
              let uri = a.fileUri || getMediaFileUri(a.id) || getMediaFileUri(a.name);
              let data = uri ? '' : a.base64Data || getMediaBase64(a.id) || getMediaBase64(a.name) || '';

              const needsFilesApi =
                !uri && (a.type === 'video' || (a.size || 0) > 6 * 1024 * 1024 || data.length > 8 * 1024 * 1024);

              if (needsFilesApi) {
                const blob = (await resolveOriginalBlob(a.id)) || (await resolveOriginalBlob(a.name));
                if (blob) {
                  const uploaded = await uploadMediaToGemini(blob, a.name, a.mimeType || 'video/mp4');
                  uri = uploaded.fileUri;
                  storeMediaFileUri(a.id, uri);
                  storeMediaFileUri(a.name, uri);
                  data = '';
                } else if (data.length > 10 * 1024 * 1024) {
                  throw new Error(
                    `Ukuran berkas "${a.name}" (${(a.size / (1024 * 1024)).toFixed(1)} MB) terlalu besar untuk dikirim tanpa unggahan chunk.`
                  );
                }
              }

              return {
                type: a.type,
                mimeType: a.mimeType,
                ...(uri ? { fileUri: uri } : {}),
                data,
                name: a.name,
                size: a.size,
              };
            })
          )
        : undefined;

      // Prepare conversation history excluding the current message, preferring lightweight fileUris and capping base64
      const filteredHistory = messages.filter(
        (m) =>
          m.id !== userMessageObj.id &&
          (m.content.trim().length > 0 || (m.attachments && m.attachments.length > 0))
      );
      let remainingHistoryMediaBudget = 8 * 1024 * 1024;
      const priorTurns = filteredHistory.map((m, idx) => {
        const isVeryRecent = idx >= Math.max(0, filteredHistory.length - 2);
        return {
          role: m.role as 'user' | 'model',
          content: m.content,
          attachments: m.attachments?.map((a) => {
            const cachedUri = a.fileUri || getMediaFileUri(a.id) || getMediaFileUri(a.name);
            if (cachedUri && isVeryRecent) {
              return {
                type: a.type,
                mimeType: a.mimeType,
                fileUri: cachedUri,
                data: '',
                name: a.name,
                size: a.size,
              };
            }
            const rawData = isVeryRecent
              ? a.base64Data || getMediaBase64(a.id) || getMediaBase64(a.name) || ''
              : '';
            let safeData = '';
            if (rawData && rawData.length <= remainingHistoryMediaBudget) {
              safeData = rawData;
              remainingHistoryMediaBudget -= rawData.length;
            }
            return {
              type: a.type,
              mimeType: a.mimeType,
              data: safeData,
              name: a.name,
              size: a.size,
            };
          }),
        };
      });

      // Append current turn
      const historyTurns = [
        ...priorTurns,
        {
          role: 'user' as const,
          content,
          attachments: resolvedCurrentAttachments,
        },
      ];

      const isVoiceAuto = Boolean(settings.voiceEnabled || settings.voiceResponses);
      const personaObj = VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita'));
      const activeVoiceName = personaObj?.geminiVoice || settings.geminiVoice || 'Aoede';

      // Read device real-time clock and timezone for accurate temporal responses
      const now = new Date();
      const deviceTime = {
        iso: now.toISOString(),
        localTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        localDate: now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
      };

      // Auto-extract personal facts and preferences to Maria's permanent memory (only if memoryEnabled & not temporaryChat)
      const isEphemeralSession = Boolean(settings.temporaryChat) || settings.saveChatHistory === false;
      if (settings.memoryEnabled !== false && !isEphemeralSession) {
        userMemoryService.extractFromUserText(content);
      }
      const activeUserName = user?.displayName || settings.username || '';
      const userMemories =
        settings.memoryEnabled !== false ? userMemoryService.getFormattedMemoryPrompt(activeUserName) : '';
      const effectiveWebSearch =
        webSearchEnabled && (settings.enabledPlugins?.includes('google-search') ?? true);
      const customSystemInstruction = buildSettingsSystemAddendum(settings);

      // Stream SSE response for instant real-time tokens (Zero waiting time!)
      let streamedSuccess = false;
      const streamAiId = `ai_${Date.now()}`;
      let fullText = '';
      let streamModel = effectiveWebSearch ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite';
      let streamGroundingLinks: any[] = [];

      const allowEmojis = shouldAllowEmojis(settings);

      let definitiveStreamError: string | null = null;
      try {
        const streamRes = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyTurns,
            mode,
            systemInstruction: customSystemInstruction,
            location: userLocation,
            webSearch: effectiveWebSearch,
            allowEmojis,
            deviceTime,
            userMemories,
            userName: activeUserName,
          }),
        });

        const contentType = streamRes.headers.get('content-type') || '';
        if (!streamRes.ok && (streamRes.status === 400 || streamRes.status === 403 || streamRes.status === 429)) {
          if (contentType.includes('application/json')) {
            const errJson = await streamRes.json().catch(() => ({}));
            if (errJson?.error) definitiveStreamError = errJson.error;
          }
          if (!definitiveStreamError) {
            definitiveStreamError =
              streamRes.status === 429
                ? 'Terlalu banyak permintaan. Tunggu 1 menit lalu coba kembali.'
                : `Permintaan tidak dapat diproses (HTTP ${streamRes.status}).`;
          }
        } else if (streamRes.ok && streamRes.body && contentType.includes('text/event-stream')) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const initialAiMsg: Message = {
            id: streamAiId,
            conversationId: currentConvId || 'guest_conv',
            userId: user ? user.uid : 'guest',
            role: 'model',
            content: '',
            model: streamModel,
            mode,
            launchAction: launchAction || undefined,
            isStreaming: true,
            createdAt: new Date(),
          };

          setMessages((prev) => [...prev, initialAiMsg]);
          if (!user || !currentConvId) {
            setGuestMessages((prev) => [...prev, initialAiMsg]);
          }

          setIsLoading(false); // Stop loading indicator immediately as tokens begin streaming

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'chunk' && parsed.text) {
                  fullText += parsed.text;
                  if (parsed.model) streamModel = parsed.model;

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamAiId
                        ? { ...m, content: fullText, model: streamModel, isStreaming: true }
                        : m
                    )
                  );
                } else if (parsed.type === 'done') {
                  if (parsed.model) streamModel = parsed.model;
                  if (parsed.groundingLinks) streamGroundingLinks = parsed.groundingLinks;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamAiId
                        ? {
                            ...m,
                            content: fullText,
                            model: streamModel,
                            groundingLinks: streamGroundingLinks,
                            isStreaming: false,
                          }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }

          // Process any residual trailing line in buffer
          if (buffer.trim().startsWith('data: ')) {
            const dataStr = buffer.trim().slice(6);
            if (dataStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'chunk' && parsed.text) {
                  fullText += parsed.text;
                }
              } catch {}
            }
          }

          // Mark streaming completed
          setMessages((prev) =>
            prev.map((m) => (m.id === streamAiId ? { ...m, isStreaming: false } : m))
          );

          if (fullText.trim()) {
            const finalLaunchAction = launchAction || detectLaunchAction(fullText);
            if (finalLaunchAction && !launchAction) {
              setActiveConnectingAction(finalLaunchAction);
              executeLaunch(finalLaunchAction);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamAiId
                  ? {
                      ...m,
                      isStreaming: false,
                      launchAction: finalLaunchAction ? { ...finalLaunchAction } : m.launchAction,
                    }
                  : m
              )
            );

            if (user && currentConvId && !isEphemeral) {
              await addMessage(currentConvId, user.uid, {
                role: 'model',
                content: fullText,
                model: streamModel,
                groundingLinks:
                  streamGroundingLinks.length > 0 ? streamGroundingLinks : undefined,
                launchAction: finalLaunchAction ? { ...finalLaunchAction } : undefined,
              });
            } else {
              setGuestMessages((prev) =>
                prev.map((m) =>
                  m.id === streamAiId
                    ? {
                        ...m,
                        content: fullText,
                        model: streamModel,
                        groundingLinks: streamGroundingLinks,
                        isStreaming: false,
                        launchAction: finalLaunchAction ? { ...finalLaunchAction } : m.launchAction,
                      }
                    : m
                )
              );
            }

            // Play Gemini AI Voice Engine
            if (isVoiceAuto) {
              speechService.speak(fullText, {
                messageId: streamAiId,
                speed: settings.speechSpeed || '1x',
                voiceName: activeVoiceName,
                personaId: settings.voicePersona || 'wanita',
                ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
              });
            }

            streamedSuccess = true;
            return;
          } else {
            // Clean up empty placeholder if no content arrived
            setMessages((prev) => prev.filter((m) => m.id !== streamAiId));
            setGuestMessages((prev) => prev.filter((m) => m.id !== streamAiId));
          }
        }
      } catch (streamErr) {
        console.warn('Streaming failed, falling back to standard completion:', streamErr);
        setMessages((prev) => prev.filter((m) => m.id !== streamAiId));
        setGuestMessages((prev) => prev.filter((m) => m.id !== streamAiId));
      }

      if (definitiveStreamError) {
        throw new Error(definitiveStreamError);
      }

      if (!streamedSuccess) {
        setIsLoading(true);
        let response: Response | null = null;
        let lastNetworkErr: any = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((r) => setTimeout(r, 700));
            }
            response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: historyTurns,
                mode,
                systemInstruction: customSystemInstruction,
                location: userLocation,
                withVoice: isVoiceAuto,
                voiceName: activeVoiceName,
                personaId: settings.voicePersona || 'wanita',
                webSearch: effectiveWebSearch,
                allowEmojis,
                deviceTime,
                userMemories,
                userName: activeUserName,
              }),
            });
            if (response.ok || (response.status >= 400 && response.status < 500)) break;
          } catch (netErr: any) {
            lastNetworkErr = netErr;
          }
        }

        if (!response) {
          throw new Error(
            lastNetworkErr?.message && !/failed to fetch|load failed/i.test(lastNetworkErr.message)
              ? lastNetworkErr.message
              : 'Koneksi ke server terputus sementara atau ukuran lampiran terlalu besar. Silakan coba kirim ulang.'
          );
        }

        const ct = response.headers.get('content-type') || '';
        if (!response.ok) {
          let errMessage = 'Gagal mengambil jawaban AI.';
          try {
            if (ct.includes('application/json')) {
              const errData = await response.json();
              if (errData.error) errMessage = errData.error;
            } else if (response.status === 429) {
              errMessage = 'Terlalu banyak permintaan. Tunggu 1 menit lalu coba kembali.';
            } else if (response.status === 503) {
              errMessage = 'Layanan AI sedang sibuk (503). Silakan coba kirim ulang.';
            } else if (response.status >= 500) {
              errMessage = 'Server AI sedang memproses pembaruan. Silakan coba kirim ulang.';
            } else {
              errMessage = `Server merespon dengan status ${response.status}. Silakan coba kirim ulang.`;
            }
          } catch {}
          throw new Error(errMessage);
        }

        let data: any = {};
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error('Format balasan server tidak sesuai.');
        }

        const finalLaunchAction = launchAction || detectLaunchAction(data.text || '');
        if (finalLaunchAction && !launchAction) {
          setActiveConnectingAction(finalLaunchAction);
          executeLaunch(finalLaunchAction);
        }

        const modelMessageObj: Message = {
          id: `ai_${Date.now()}`,
          conversationId: currentConvId || 'guest_conv',
          userId: user ? user.uid : 'guest',
          role: 'model',
          content: data.text || 'Tidak ada teks yang dihasilkan.',
          model: data.model,
          mode,
          groundingLinks: data.groundingLinks,
          audioUri: data.audioUrl,
          launchAction: finalLaunchAction ? { ...finalLaunchAction } : undefined,
          createdAt: new Date(),
        };

        if (user && currentConvId && !isEphemeral) {
          await addMessage(currentConvId, user.uid, {
            role: 'model',
            content: modelMessageObj.content,
            model: modelMessageObj.model,
            groundingLinks: modelMessageObj.groundingLinks,
            audioUri: modelMessageObj.audioUri,
            launchAction: modelMessageObj.launchAction ? { ...modelMessageObj.launchAction } : undefined,
          });
        } else {
          setGuestMessages((prev) => [...prev, modelMessageObj]);
        }
        setMessages((prev) => [...prev, modelMessageObj]);

        // Auto TTS voice readout if enabled
        if (isVoiceAuto && modelMessageObj.content) {
          if (data.audioUrl) {
            speechService.playAudioDirectly(data.audioUrl, {
              messageId: modelMessageObj.id,
              speed: settings.speechSpeed || '1x',
              personaId: settings.voicePersona || 'wanita',
            });
          } else {
            speechService.speak(modelMessageObj.content, {
              messageId: modelMessageObj.id,
              speed: settings.speechSpeed || '1x',
              voiceName: activeVoiceName,
              personaId: settings.voicePersona || 'wanita',
              ttsModel: settings.ttsModel || 'gemini-3.8-flash-lite-tts',
            });
          }
        }
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Koneksi gagal';
      const friendlyMsg = /failed to fetch|load failed|networkerror/i.test(rawMsg)
        ? 'Koneksi ke server terputus sementara atau ukuran lampiran melebihi batas jaringan. Silakan coba kirim ulang.'
        : rawMsg;
      console.warn('Notice during message exchange:', rawMsg);
      const errorMessageObj: Message = {
        id: `err_${Date.now()}`,
        conversationId: resolvedConvId || 'guest_conv',
        userId: user ? user.uid : 'guest',
        role: 'model',
        content: `Mohon maaf, terjadi kendala saat memproses permintaan Anda: ${friendlyMsg}. Silakan coba lagi.`,
        model: 'system',
        createdAt: new Date(),
      };

      if (user && resolvedConvId) {
        await addMessage(resolvedConvId, user.uid, {
          role: 'model',
          content: errorMessageObj.content,
          model: 'system',
        }).catch(() => {});
      } else {
        setGuestMessages((prev) => [...prev, errorMessageObj]);
      }
      setMessages((prev) => [...prev, errorMessageObj]);
    } finally {
      setActiveConnectingAction(null);
      setIsLoading(false);
    }
  };

  const isEnApp = settings.language === 'English';

  return (
    <LanguageProvider language={settings.language || 'Indonesia'}>
    <div className="flex h-[100dvh] w-screen overflow-hidden font-sans bg-white text-slate-900 dark:bg-[#0e0f12] dark:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={(id) => {
          activeConvIdRef.current = id;
          setActiveConvId(id);
          setActiveView('chat');
        }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePinConversation}
        onArchiveConversation={handleArchiveConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeView={activeView}
        onNavigateView={(view) => setActiveView(view)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotebook={(notebookId) => {
          if (notebookId) setSelectedNotebookId(notebookId);
          setActiveView('notebooks');
        }}
        onCreateNotebook={handleCreateNotebookFromSidebar}
        activeProjectName={activeProject?.name || null}
        isPlus={Boolean(settings.isPlus)}
        onOpenPlusModal={() => setIsPlusModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#0e0f12]">
        {activeView === 'chat' && (
          <ChatArea
            activeConversation={activeConversation}
            messages={messages}
            isLoading={isLoading}
            activeMode={activeMode}
            onModeChange={(m) => setActiveMode(m)}
            onSendMessage={handleSendMessage}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            onTogglePinConversation={handleTogglePinConversation}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            onOpenScienceScout={() => setIsScienceScoutOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            speechSpeed={settings.speechSpeed || '1x'}
            voicePersona={settings.voicePersona || 'wanita'}
            onSelectVoicePersona={(p) => {
              const personaObj = VOICE_PERSONAS.find((item) => item.id === p);
              handleUpdateSettings({
                voicePersona: p,
                ...(personaObj?.geminiVoice ? { geminiVoice: personaObj.geminiVoice } : {}),
              });
            }}
            onEditMessage={handleEditMessage}
            onRegenerateMessage={handleRegenerateMessage}
            userPhoto={user?.photoURL}
            userName={user?.displayName}
            activeConnectingAction={activeConnectingAction}
            onOpenImageStudio={handleOpenImageStudio}
            onOpenMusicVoice={() => setIsMusicVoiceOpen(true)}
            onOpenCanvasCode={() => setIsCanvasCodeOpen(true)}
            isPlus={Boolean(settings.isPlus)}
            onOpenPlusModal={() => setIsPlusModalOpen(true)}
            enterToSend={settings.enterToSend !== false}
            voiceLanguage={settings.voiceLanguage || 'auto'}
            webSearchDefault={settings.webSearchDefault !== false}
            homepageSuggestions={settings.homepageSuggestions !== false}
            temporaryChat={Boolean(settings.temporaryChat)}
          />
        )}

        {activeView === 'library' && (
          <LibraryArea
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onSelectPrompt={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'general');
            }}
          />
        )}

        {activeView === 'discover' && (
          <DiscoverArea
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onLaunchAgent={(prompt) => {
              handleNewConversation();
              setActiveView('chat');
              handleSendMessage(prompt, 'thinking');
            }}
          />
        )}

        {activeView === 'notebooks' && (
          <NotebookArea
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            selectedNotebookId={selectedNotebookId}
            onSendPromptToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'thinking');
            }}
          />
        )}

        {activeView === 'images' && (
          <ImagesArea
            messages={messages}
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenImageStudio={handleOpenImageStudio}
            onSendImageToChat={(imageUrl, prompt, model) => {
              setActiveView('chat');
              handleSendStudioImageToChat(imageUrl, prompt, model);
            }}
          />
        )}

        {activeView === 'projects' && (
          <ProjectsArea
            activeProjectId={activeProject?.id || null}
            onSelectActiveProject={setActiveProject}
            onStartProjectChat={(project) => {
              setActiveProject(project);
              handleNewConversation();
              setActiveView('chat');
            }}
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        )}

        {activeView === 'plugins' && (
          <PluginsArea
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onLaunchConnectorPrompt={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'general');
            }}
            onOpenScienceScout={() => setIsScienceScoutOpen(true)}
            onOpenImageStudio={() => handleOpenImageStudio()}
            onOpenCanvasCode={() => setIsCanvasCodeOpen(true)}
          />
        )}

        {activeView === 'students' && (
          <StudentsArea
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onStartTutorChat={(prompt) => {
              handleNewConversation();
              setActiveView('chat');
              handleSendMessage(prompt, 'thinking');
            }}
          />
        )}

        {activeView === 'skills' && (
          <SkillsArea
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onRunSkillInChat={(skill: SkillItem, taskInput: string) => {
              const fullPrompt = taskInput.trim()
                ? `${skill.promptTemplate}\n\nTugas:\n${taskInput.trim()}`
                : skill.promptTemplate;
              handleNewConversation();
              setActiveView('chat');
              handleSendMessage(fullPrompt, 'thinking');
            }}
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        )}

        {activeView === 'video' && (
          <VideoArea
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onAnalyzeVideoInChat={(prompt, attachment) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'general', undefined, [attachment], false);
            }}
            onSendPromptToChat={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'general');
            }}
          />
        )}
      </main>

      {/* Science Scout Modal */}
      <ScienceScoutModal
        isOpen={isScienceScoutOpen}
        onClose={() => setIsScienceScoutOpen(false)}
        onSelectPrompt={(prompt) => {
          setActiveMode('science');
          setActiveView('chat');
          handleSendMessage(prompt, 'science');
        }}
      />

      {/* 7-Tab Settings Dashboard */}
      <SettingsDashboard
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearHistoryRequest={() => setIs2FAOpen(true)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenPlusModal={() => setIsPlusModalOpen(true)}
        onOpenPluginsDirectory={() => setActiveView('plugins')}
        conversations={conversations}
      />

      {/* 2FA Security Modal for Purging History */}
      <TwoFactorModal
        isOpen={is2FAOpen}
        onClose={() => setIs2FAOpen(false)}
        title={isEnApp ? '2FA Security Authentication' : 'Otentikasi Keamanan 2FA'}
        description={
          isEnApp
            ? 'Enter your 6-digit security PIN to confirm permanent deletion of all chat history from Cloud Firestore.'
            : 'Masukkan PIN keamanan 6-digit untuk mengonfirmasi penghapusan seluruh riwayat obrolan secara permanen dari server database Cloud Firestore.'
        }
        expectedPin={settings.securityPin}
        onConfirm={handleConfirmPurgeAllHistory}
      />

      {/* Maria AI Image Creation & Editing Studio */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onSendToChat={handleSendStudioImageToChat}
        initialBaseImage={studioBaseImage}
        initialPrompt={studioPrompt}
      />

      {/* Maria AI Music & Voice Audio Studio Modal */}
      <MusicVoiceModal
        isOpen={isMusicVoiceOpen}
        onClose={() => setIsMusicVoiceOpen(false)}
        onSendToChat={(prompt) => {
          handleSendMessage(prompt, 'general');
        }}
      />

      {/* Maria AI Interactive Canvas & Code Modal */}
      <CanvasCodeModal
        isOpen={isCanvasCodeOpen}
        onClose={() => setIsCanvasCodeOpen(false)}
        onSendToChat={(content) => {
          handleSendMessage(content, 'general');
        }}
      />

      {/* Maria PLUS Subscription & Plan Upgrade Modal */}
      <MariaPlusModal
        isOpen={isPlusModalOpen}
        onClose={() => setIsPlusModalOpen(false)}
        isPlus={Boolean(settings.isPlus)}
        onTogglePlus={handleTogglePlus}
      />
    </div>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
