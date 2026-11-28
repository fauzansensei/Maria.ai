import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useThemeActions } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { Sidebar, SidebarView } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { LibraryArea } from './components/LibraryArea.tsx';
import { DiscoverArea } from './components/DiscoverArea.tsx';
import { NotebookArea } from './components/NotebookArea.tsx';
import { ImagesArea, GalleryImageRecord } from './components/ImagesArea.tsx';
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
import { MariaCompanionDock } from './components/MariaCompanionDock.tsx';
import { analyzeMariaContext } from './lib/mariaContextAnalyzer.ts';
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
  getConversationMessages,
  subscribeLibraryItems,
  saveLibraryItemToCloud,
  deleteLibraryItemFromCloud,
  restoreArchivedConversation,
} from './lib/firestoreService.ts';
import {
  LibraryItem,
  loadLibraryItems,
  upsertLibraryItem,
  removeLibraryItemLocal,
  mergeRemoteLibraryItems,
  markChatImagesMoved,
  buildSavedImageItem,
  buildArchivedChatItem,
  subscribeLibrary,
} from './lib/libraryStore.ts';
import { userMemoryService } from './lib/userMemoryService.ts';
import {
  NotebookItem,
  ProjectItem,
  SkillItem,
  loadNotebooks,
  saveNotebooks,
} from './lib/workspaceStore.ts';
import { buildActiveConnectorsPayload } from './lib/pluginsCatalog.ts';

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
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [manualSpyGuardAlert, setManualSpyGuardAlert] = useState(false);

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
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(() => loadLibraryItems());
  const [globalToast, setGlobalToast] = useState<{
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showGlobalToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setGlobalToast({ message, actionLabel, onAction });
    toastTimerRef.current = setTimeout(() => {
      setGlobalToast(null);
    }, 4500);
  };

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

  // 2b. Sync Persistent Maria Library (local cache + Firestore cloud sync)
  useEffect(() => {
    setLibraryItems(loadLibraryItems());
    const unsubLocal = subscribeLibrary(() => {
      setLibraryItems(loadLibraryItems());
    });

    if (!user?.uid) {
      return () => unsubLocal();
    }

    const unsubCloud = subscribeLibraryItems(
      user.uid,
      (remoteItems) => {
        const merged = mergeRemoteLibraryItems(remoteItems);
        setLibraryItems(merged);
      },
      (err) => {
        console.warn('Library Firestore sync warning:', err);
      }
    );

    return () => {
      unsubLocal();
      unsubCloud();
    };
  }, [user?.uid]);

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

  // Handler: Archive Full Conversation Snapshot to Library (survives Sidebar deletion/purge)
  const handleArchiveConversation = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    const isEnglish = settings.language === 'English';

    try {
      let targetMessages: Message[] = [];
      if (convId === activeConvIdRef.current && messages.length > 0) {
        targetMessages = messages;
      } else if (user) {
        targetMessages = await getConversationMessages(convId);
      } else {
        targetMessages = guestMessages;
      }

      const archivedItem = await buildArchivedChatItem({
        userId: user?.uid || 'guest',
        conv: conv || {
          id: convId,
          title:
            targetMessages.find((m) => m.role === 'user')?.content?.slice(0, 60) ||
            (isEnglish ? 'Archived Chat' : 'Arsip Percakapan'),
          mode: activeMode,
          model: 'gemini-3.5-flash',
        },
        messages: targetMessages,
      });

      upsertLibraryItem(archivedItem);
      if (user) {
        await saveLibraryItemToCloud(user.uid, archivedItem).catch((err) => {
          console.warn('Cloud archive save warning:', err);
        });
      }

      showGlobalToast(
        isEnglish
          ? `Archived "${archivedItem.title}" (${archivedItem.archivedMessages?.length || 0} messages) to Library.`
          : `"${archivedItem.title}" (${archivedItem.archivedMessages?.length || 0} pesan) disimpan permanen ke Pustaka.`,
        isEnglish ? 'Open Library' : 'Buka Pustaka',
        () => setActiveView('library')
      );
    } catch (err) {
      console.error('Failed to archive conversation:', err);
      showGlobalToast(
        isEnglish
          ? 'Could not archive conversation. Please try again.'
          : 'Gagal mengarsipkan percakapan. Silakan coba lagi.'
      );
    }
  };

  // Handler: Move a single chat/studio image into Library and hide it from ImagesArea
  const handleMoveImageToLibrary = async (img: GalleryImageRecord) => {
    const libItem = await buildSavedImageItem({
      userId: user?.uid || 'guest',
      sourceId: img.id,
      title: img.prompt,
      imageUrl: img.imageUrl,
      model: img.model,
      sourceConvId: activeConvIdRef.current || undefined,
      sourceMessageId: img.sourceMessageId || img.id,
    });
    markChatImagesMoved([img.id]);
    upsertLibraryItem(libItem);
    if (user) {
      await saveLibraryItemToCloud(user.uid, libItem).catch((err) => {
        console.warn('Cloud library image save warning:', err);
      });
    }
  };

  // Handler: Move all visible chat images into Library in one click
  const handleMoveAllImagesToLibrary = async (imgs: GalleryImageRecord[]) => {
    if (imgs.length === 0) return;
    markChatImagesMoved(imgs.map((i) => i.id));
    for (const img of imgs) {
      const libItem = await buildSavedImageItem({
        userId: user?.uid || 'guest',
        sourceId: img.id,
        title: img.prompt,
        imageUrl: img.imageUrl,
        model: img.model,
        sourceConvId: activeConvIdRef.current || undefined,
        sourceMessageId: img.sourceMessageId || img.id,
      });
      upsertLibraryItem(libItem);
      if (user) {
        await saveLibraryItemToCloud(user.uid, libItem).catch(() => {});
      }
    }
  };

  // Handler: Quick-save image directly from a chat bubble into Library
  const handleSaveImageFromChat = async (data: {
    id: string;
    imageUrl: string;
    title: string;
    model?: string;
    sourceMessageId?: string;
  }) => {
    const isEnglish = settings.language === 'English';
    const libItem = await buildSavedImageItem({
      userId: user?.uid || 'guest',
      sourceId: data.id,
      title: data.title,
      imageUrl: data.imageUrl,
      model: data.model,
      sourceConvId: activeConvIdRef.current || undefined,
      sourceMessageId: data.sourceMessageId || data.id,
    });
    upsertLibraryItem(libItem);
    if (user) {
      await saveLibraryItemToCloud(user.uid, libItem).catch(() => {});
    }
    showGlobalToast(
      isEnglish ? 'Image saved to Maria Library' : 'Gambar disimpan ke Pustaka Maria',
      isEnglish ? 'Open Library' : 'Buka Pustaka',
      () => setActiveView('library')
    );
  };

  // Handler: Delete an item from Library
  const handleDeleteLibraryItem = async (itemId: string) => {
    removeLibraryItemLocal(itemId);
    if (user) {
      await deleteLibraryItemFromCloud(user.uid, itemId).catch((err) => {
        console.warn('Cloud library delete warning:', err);
      });
    }
  };

  // Handler: Restore an archived chat snapshot back into active Chat Sidebar
  const handleRestoreArchivedChat = async (item: LibraryItem) => {
    const isEnglish = settings.language === 'English';
    try {
      if (user) {
        const restoredId = await restoreArchivedConversation(user.uid, item);
        activeConvIdRef.current = restoredId;
        setActiveConvId(restoredId);
        setActiveView('chat');
      } else {
        const restoredMsgs: Message[] = (item.archivedMessages || []).map((m, idx) => ({
          id: m.id || `restored_${Date.now()}_${idx}`,
          conversationId: 'guest_conv',
          userId: 'guest',
          role: m.role,
          content: m.content,
          model: m.model,
          mode: (m.mode as AiMode) || 'general',
          imageUri: m.imageUri,
          attachments: m.attachments?.map((a) => ({
            ...a,
            previewUrl: a.previewUrl || '',
            base64Data: '',
          })),
          groundingLinks: m.groundingLinks,
          createdAt: m.createdAtIso ? new Date(m.createdAtIso) : new Date(),
        }));
        activeConvIdRef.current = null;
        setActiveConvId(null);
        setGuestMessages(restoredMsgs);
        setMessages(restoredMsgs);
        setActiveView('chat');
      }
      showGlobalToast(
        isEnglish
          ? `Restored "${item.title}" back to chat.`
          : `Chat "${item.title}" berhasil dipulihkan.`
      );
    } catch (err) {
      console.error('Failed to restore archived chat:', err);
      showGlobalToast(
        isEnglish ? 'Failed to restore chat.' : 'Gagal memulihkan arsip chat.'
      );
    }
  };

  // Handler: Clear All Active History with 2FA verification (Library archives remain intact!)
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
      showGlobalToast(
        settings.language === 'English'
          ? 'Active chat history cleared. Library archives remain intact.'
          : 'Riwayat chat aktif dihapus. Arsip & gambar di Pustaka tetap aman.'
      );
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
              activeConnectors: buildActiveConnectorsPayload(settings.enabledPlugins || []),
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

    const streamAiId = `ai_${Date.now()}`;
    try {
      let currentConvId = resolvedConvId;
      const isImageRequest = mode === 'image' || isImageIntent(safeContent);

      // Run Firestore conversation creation & user message persistence concurrently so it never blocks AI response latency
      const userPersistPromise: Promise<string | null> = (async () => {
        if (!user || isEphemeral) return currentConvId;
        let convId = currentConvId;
        if (!convId) {
          const firstAtt = attachments?.[0];
          const voiceTitle =
            firstAtt?.type === 'audio'
              ? `Pesan Suara (${
                  typeof firstAtt.duration === 'number'
                    ? `${Math.floor(firstAtt.duration / 60)}:${Math.floor(firstAtt.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : '0:01'
                })`
              : firstAtt?.name;
          const trimmed = safeContent.trim();
          const titleSnippet =
            trimmed.length > 35
              ? trimmed.slice(0, 35) + '...'
              : trimmed || voiceTitle || 'Percakapan Baru';
          convId = await createConversation(user.uid, titleSnippet, mode);
          currentConvId = convId;
          resolvedConvId = convId;
          activeConvIdRef.current = convId;
          setActiveConvId(convId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId || m.id === streamAiId ? { ...m, conversationId: convId! } : m
            )
          );
        }

        if (convId) {
          await addMessage(convId, user.uid, {
            role: 'user',
            content,
            attachments: attachments?.map((a) => ({
              id: a.id,
              name: a.name,
              size: a.size,
              mimeType: a.mimeType,
              type: a.type,
              previewUrl: a.previewUrl,
              ...(typeof a.duration === 'number' ? { duration: a.duration } : {}),
              ...(Array.isArray(a.waveform) ? { waveform: a.waveform } : {}),
              ...(a.fileUri ? { fileUri: a.fileUri } : {}),
            })),
          });
        }
        return convId;
      })();

      // Handle Image Generation & Editing Mode (Explicit Mode OR Auto-Detected Intent from prompt)
      if (isImageRequest) {
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

        const persistedConvId = await userPersistPromise;
        const modelMessageObj: Message = {
          id: `ai_${Date.now()}`,
          conversationId: persistedConvId || currentConvId || 'guest_conv',
          userId: user ? user.uid : 'guest',
          role: 'model',
          content: messageContent,
          model: imgData.model || 'gemini-3.1-flash-lite-image',
          mode: 'image',
          imageUri: imgData.imageUrl,
          createdAt: new Date(),
        };

        if (user && persistedConvId && !isEphemeral) {
          await addMessage(persistedConvId, user.uid, {
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

      // Show orbital responding animation immediately at t=0ms in Maria's message slot
      let streamModel = webSearchEnabled && (settings.enabledPlugins?.includes('google-search') ?? true)
        ? 'gemini-4-hydrogen'
        : 'gemini-3.1-flash-lite';
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
              let uri = a.fileUri || getMediaFileUri(a.id);
              let data = uri ? '' : a.base64Data || getMediaBase64(a.id) || '';

              const needsFilesApi =
                !uri && (a.type === 'video' || (a.size || 0) > 6 * 1024 * 1024 || data.length > 8 * 1024 * 1024);

              if (needsFilesApi) {
                const blob = await resolveOriginalBlob(a.id);
                if (blob) {
                  const uploaded = await uploadMediaToGemini(blob, a.name, a.mimeType || 'video/mp4');
                  uri = uploaded.fileUri;
                  storeMediaFileUri(a.id, uri);
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
            const cachedUri = a.fileUri || getMediaFileUri(a.id);
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
              ? a.base64Data || getMediaBase64(a.id) || ''
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
      let fullText = '';
      let streamGroundingLinks: any[] = [];

      const allowEmojis = shouldAllowEmojis(settings);
      const activeConnectors = buildActiveConnectorsPayload(settings.enabledPlugins || []);

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
            activeConnectors,
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
          setMessages((prev) => prev.filter((m) => m.id !== streamAiId));
          setGuestMessages((prev) => prev.filter((m) => m.id !== streamAiId));
        } else if (streamRes.ok && streamRes.body && contentType.includes('text/event-stream')) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          setIsLoading(false); // Release input lock cleanly as SSE stream opens

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

            const persistedConvId = await userPersistPromise;
            if (user && persistedConvId && !isEphemeral) {
              await addMessage(persistedConvId, user.uid, {
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
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== streamAiId));
          setGuestMessages((prev) => prev.filter((m) => m.id !== streamAiId));
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
                activeConnectors,
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

        const persistedConvId = await userPersistPromise;
        const modelMessageObj: Message = {
          id: `ai_${Date.now()}`,
          conversationId: persistedConvId || currentConvId || 'guest_conv',
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

        if (user && persistedConvId && !isEphemeral) {
          await addMessage(persistedConvId, user.uid, {
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
      setMessages((prev) => prev.filter((m) => m.id !== streamAiId));
      setGuestMessages((prev) => prev.filter((m) => m.id !== streamAiId));
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

  const liveConvCreatePromiseRef = useRef<Promise<string | null> | null>(null);

  const handleCommitLiveTurn = async (role: 'user' | 'model', text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const isEphemeral = Boolean(settings.temporaryChat) || settings.saveChatHistory === false;
    let convId: string | null = isEphemeral ? null : activeConvIdRef.current;

    if (user && !convId && !isEphemeral) {
      if (!liveConvCreatePromiseRef.current) {
        const titleSnippet =
          cleanText.length > 35 ? cleanText.slice(0, 35) + '...' : cleanText || 'Maria Live';
        liveConvCreatePromiseRef.current = createConversation(user.uid, titleSnippet, 'general')
          .then((newId) => {
            activeConvIdRef.current = newId;
            setActiveConvId(newId);
            return newId;
          })
          .catch(() => null)
          .finally(() => {
            liveConvCreatePromiseRef.current = null;
          });
      }
      convId = await liveConvCreatePromiseRef.current;
    }

    if (settings.memoryEnabled !== false && !isEphemeral && role === 'user') {
      userMemoryService.extractFromUserText(cleanText);
    }

    const msgObj: Message = {
      id: `${role === 'user' ? 'usr' : 'ai'}_live_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      conversationId: convId || 'guest_conv',
      userId: user ? user.uid : 'guest',
      role,
      content: cleanText,
      ...(role === 'model' ? { model: 'gemini-3.8-live' } : {}),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, msgObj]);
    if (!user || isEphemeral || !convId) {
      setGuestMessages((prev) => [...prev, msgObj]);
    } else {
      await addMessage(convId, user.uid, {
        role,
        content: cleanText,
        ...(role === 'model' ? { model: 'gemini-3.8-live' } : {}),
      }).catch((err) => {
        console.warn('Failed to persist live transcript message:', err);
      });
    }
  };

  const livePersonaObj = VOICE_PERSONAS.find(
    (p) => p.id === (settings.voicePersona || 'wanita')
  );
  const activeLiveVoiceName =
    livePersonaObj?.geminiVoice || settings.geminiVoice || 'Aoede';
  const activeLiveUserName = user?.displayName || settings.username || '';
  const activeLiveMemories =
    settings.memoryEnabled !== false
      ? userMemoryService.getFormattedMemoryPrompt(activeLiveUserName)
      : '';

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
            onArchiveConversation={handleArchiveConversation}
            onSaveImageToLibrary={handleSaveImageFromChat}
            liveConfig={{
              voiceName: activeLiveVoiceName,
              customInstruction: buildSettingsSystemAddendum(settings),
              userMemories: activeLiveMemories,
              userName: activeLiveUserName,
              allowEmojis: shouldAllowEmojis(settings),
              voiceLanguage: settings.voiceLanguage || 'auto',
              appLanguage: settings.language || 'Indonesia',
            }}
            onCommitLiveTurn={handleCommitLiveTurn}
            onLiveStateChange={setIsLiveActive}
            onChangeLiveVoice={(voiceName) => {
              const matchedPersona = VOICE_PERSONAS.find((item) => item.geminiVoice === voiceName);
              if (matchedPersona) {
                handleUpdateSettings({
                  geminiVoice: matchedPersona.geminiVoice,
                  voicePersona: matchedPersona.id,
                });
              }
            }}
            spyGuardAlert={
              manualSpyGuardAlert ||
              analyzeMariaContext({
                messages,
                isLoading,
                isStreaming: messages.some((m) => m.role === 'model' && m.isStreaming),
                isSpeaking: false,
                activeView,
                manualSpyGuardAlert,
              }).spyGuardThreat
            }
            liveMood={
              analyzeMariaContext({
                messages,
                isLoading,
                isStreaming: messages.some((m) => m.role === 'model' && m.isStreaming),
                isSpeaking: false,
                activeView,
                manualSpyGuardAlert,
              }).mood
            }
          />
        )}

        {activeView === 'library' && (
          <LibraryArea
            items={libraryItems}
            onBackToChat={() => setActiveView('chat')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onDeleteItem={handleDeleteLibraryItem}
            onRestoreArchivedChat={handleRestoreArchivedChat}
            onOpenImageStudio={handleOpenImageStudio}
            onSendImageToChat={(imageUrl, prompt, model) => {
              setActiveView('chat');
              handleSendStudioImageToChat(imageUrl, prompt, model);
            }}
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
            onMoveImageToLibrary={handleMoveImageToLibrary}
            onMoveAllImagesToLibrary={handleMoveAllImagesToLibrary}
            onOpenLibrary={() => setActiveView('library')}
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

      {/* Context-Aware 3D Sparkle Companion Dock (Notebook/Projects pointing, Coding wrench, Mood, & Spy Guard) */}
      <MariaCompanionDock
        messages={messages}
        isLoading={isLoading}
        activeView={activeView}
        isLiveActive={isLiveActive}
        manualSpyGuardAlert={manualSpyGuardAlert}
        onToggleSpyGuardAlert={() => setManualSpyGuardAlert((prev) => !prev)}
      />

      {/* Global Non-Blocking Feedback Toast */}
      {globalToast && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm px-4 py-3 rounded-2xl bg-slate-900 dark:bg-[#171b28] text-white border border-slate-700/80 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <span className="leading-snug">{globalToast.message}</span>
          {globalToast.actionLabel && globalToast.onAction && (
            <button
              type="button"
              onClick={() => {
                const fn = globalToast.onAction;
                setGlobalToast(null);
                fn?.();
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0 cursor-pointer"
            >
              {globalToast.actionLabel}
            </button>
          )}
        </div>
      )}
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
