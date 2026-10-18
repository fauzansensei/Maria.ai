import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { LibraryArea } from './components/LibraryArea.tsx';
import { DiscoverArea } from './components/DiscoverArea.tsx';
import { ScienceScoutModal } from './components/ScienceScoutModal.tsx';
import { SettingsDashboard } from './components/SettingsDashboard.tsx';
import { TwoFactorModal } from './components/TwoFactorModal.tsx';
import { Conversation, Message, AiMode, UserSettings, MediaAttachment } from './types/index.ts';
import { DEFAULT_SETTINGS, VOICE_PERSONAS } from './constants.ts';
import { speechService } from './lib/speechService.ts';
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

function AppContent() {
  const { user } = useAuth();
  const { setTheme } = useTheme();

  // Navigation View State: 'chat' | 'library' | 'discover'
  const [activeView, setActiveView] = useState<'chat' | 'library' | 'discover'>('chat');

  // Conversations & Messages
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<AiMode>('general');

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScienceScoutOpen, setIsScienceScoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);

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

  // 1. Sync User Profile Theme from Firestore on Login
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((profile) => {
        if (profile?.theme) {
          setTheme(profile.theme);
        }
      })
      .catch((err) => {
        console.warn('Could not sync user profile theme:', err);
      });
  }, [user, setTheme]);

  // 2. Subscribe to User's Firestore Conversations
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveConvId(null);
      return;
    }

    const unsubscribe = subscribeConversations(user.uid, (convs) => {
      setConversations(convs);
      // Auto select first conversation if none selected
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Subscribe to Active Conversation Messages
  useEffect(() => {
    if (!user || !activeConvId) {
      if (!user) {
        setMessages(guestMessages);
      } else {
        setMessages([]);
      }
      return;
    }

    const unsubscribe = subscribeMessages(activeConvId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [user, activeConvId, guestMessages]);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || null;

  // Handler: Start New Conversation
  const handleNewConversation = () => {
    setActiveConvId(null);
    setGuestMessages([]);
    setMessages([]);
    setActiveView('chat');
  };

  // Handler: Delete Conversation
  const handleDeleteConversation = async (convId: string) => {
    // 1. Unbind active conversation if deleted to unsubscribe message listeners
    if (activeConvId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
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
    const currentList = user ? messages : guestMessages;
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
      // Prepare conversation history up to the edited user message
      const historyTurns = prunedList.map((m) => ({
        role: m.role as 'user' | 'model',
        content: m.content,
        attachments: m.attachments?.map((a) => ({
          type: a.type,
          mimeType: a.mimeType,
          data: a.base64Data,
          name: a.name,
          size: a.size,
        })),
      }));

      const isVoiceAuto = Boolean(settings.voiceEnabled || settings.voiceResponses);
      const personaObj = VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita'));
      const activeVoiceName = personaObj?.geminiVoice || settings.geminiVoice || 'Aoede';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyTurns,
          mode: targetMessage.mode || activeMode,
          location: undefined,
          withVoice: isVoiceAuto,
          voiceName: activeVoiceName,
          personaId: settings.voicePersona || 'wanita',
        }),
      });

      if (!response.ok) {
        let errMessage = 'Gagal mengambil jawaban AI.';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }

      const data = await response.json();

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
        createdAt: new Date(),
      };

      if (user && activeConvId) {
        await addMessage(activeConvId, user.uid, {
          role: 'model',
          content: modelMessageObj.content,
          model: modelMessageObj.model,
          groundingLinks: modelMessageObj.groundingLinks,
          audioUri: modelMessageObj.audioUri,
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
      console.error('Error generating response for edited message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Send Message
  const handleSendMessage = async (
    content: string,
    mode: AiMode = activeMode,
    imageConfig?: { imageSize: '1K' | '2K' | '4K'; aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' },
    attachments?: MediaAttachment[]
  ) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    // Pre-unlock audio context within user gesture
    speechService.unlockAudio();

    setIsLoading(true);
    setActiveView('chat');

    try {
      let currentConvId = activeConvId;

      // Create conversation if first turn for logged-in user
      if (user && !currentConvId) {
        const titleSnippet = content.length > 35 ? content.slice(0, 35) + '...' : (attachments?.[0]?.name || content);
        currentConvId = await createConversation(user.uid, titleSnippet, mode);
        setActiveConvId(currentConvId);
      }

      // Add user turn
      const userMessageObj: Message = {
        id: `usr_${Date.now()}`,
        conversationId: currentConvId || 'guest_conv',
        userId: user ? user.uid : 'guest',
        role: 'user',
        content,
        mode,
        attachments,
        createdAt: new Date(),
      };

      if (user && currentConvId) {
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
          })),
        });
      } else {
        setGuestMessages((prev) => [...prev, userMessageObj]);
      }

      // Handle Image Generation Mode
      if (mode === 'image') {
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: content,
            imageSize: imageConfig?.imageSize || '1K',
            aspectRatio: imageConfig?.aspectRatio || '1:1',
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

        let messageContent = `Berikut adalah ilustrasi AI yang dihasilkan untuk: "${content}"`;
        if (imgData.notice) {
          messageContent += `\n\n> ℹ️ ${imgData.notice}`;
        }

        const modelMessageObj: Message = {
          id: `ai_${Date.now()}`,
          conversationId: currentConvId || 'guest_conv',
          userId: user ? user.uid : 'guest',
          role: 'model',
          content: messageContent,
          model: imgData.model || 'gemini-nano-banana-2.1',
          mode: 'image',
          imageUri: imgData.imageUrl,
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

      // Prepare conversation history
      const historyTurns = (user ? messages : guestMessages).map((m) => ({
        role: m.role as 'user' | 'model',
        content: m.content,
        attachments: m.attachments?.map((a) => ({
          type: a.type,
          mimeType: a.mimeType,
          data: a.base64Data,
          name: a.name,
          size: a.size,
        })),
      }));

      // Append latest turn
      historyTurns.push({
        role: 'user',
        content,
        attachments: attachments?.map((a) => ({
          type: a.type,
          mimeType: a.mimeType,
          data: a.base64Data,
          name: a.name,
          size: a.size,
        })),
      });

      const isVoiceAuto = Boolean(settings.voiceEnabled || settings.voiceResponses);
      const personaObj = VOICE_PERSONAS.find((p) => p.id === (settings.voicePersona || 'wanita'));
      const activeVoiceName = personaObj?.geminiVoice || settings.geminiVoice || 'Aoede';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyTurns,
          mode,
          location: userLocation,
          withVoice: isVoiceAuto,
          voiceName: activeVoiceName,
          personaId: settings.voicePersona || 'wanita',
        }),
      });

      if (!response.ok) {
        let errMessage = 'Gagal mengambil jawaban AI.';
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }

      const data = await response.json();

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
        createdAt: new Date(),
      };

      if (user && currentConvId) {
        await addMessage(currentConvId, user.uid, {
          role: 'model',
          content: modelMessageObj.content,
          model: modelMessageObj.model,
          groundingLinks: modelMessageObj.groundingLinks,
          audioUri: modelMessageObj.audioUri,
        });
      } else {
        setGuestMessages((prev) => [...prev, modelMessageObj]);
      }

      // Auto TTS voice readout if enabled (plays instantly with 0ms delay if audioUrl is returned!)
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
      console.error('Error during message exchange:', err);
      const errorMessageObj: Message = {
        id: `err_${Date.now()}`,
        conversationId: activeConvId || 'guest_conv',
        userId: user ? user.uid : 'guest',
        role: 'model',
        content: `⚠️ Maaf, terjadi kesalahan: ${err.message || 'Koneksi gagal'}. Silakan coba lagi.`,
        createdAt: new Date(),
      };

      if (user && activeConvId) {
        await addMessage(activeConvId, user.uid, {
          role: 'model',
          content: errorMessageObj.content,
        });
      } else {
        setGuestMessages((prev) => [...prev, errorMessageObj]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0e0f12] font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={(id) => {
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
      />

      {/* Main Workspace: Chat, Library, or Discover View */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-[#0e0f12]">
        {activeView === 'chat' && (
          <ChatArea
            activeConversation={activeConversation}
            messages={user ? messages : guestMessages}
            isLoading={isLoading}
            activeMode={activeMode}
            onModeChange={(m) => setActiveMode(m)}
            onSendMessage={handleSendMessage}
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
            userPhoto={user?.photoURL}
            userName={user?.displayName}
          />
        )}

        {activeView === 'library' && (
          <LibraryArea
            onBackToChat={() => setActiveView('chat')}
            onSelectPrompt={(prompt) => {
              setActiveView('chat');
              handleSendMessage(prompt, 'general');
            }}
          />
        )}

        {activeView === 'discover' && (
          <DiscoverArea
            onBackToChat={() => setActiveView('chat')}
            onLaunchAgent={(prompt, title) => {
              handleNewConversation();
              setActiveView('chat');
              handleSendMessage(prompt, 'thinking');
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
      />

      {/* 2FA Security Modal for Purging History */}
      <TwoFactorModal
        isOpen={is2FAOpen}
        onClose={() => setIs2FAOpen(false)}
        title="Otentikasi Keamanan 2FA"
        description="Masukkan PIN keamanan 6-digit untuk mengonfirmasi penghapusan seluruh riwayat obrolan secara permanen dari server database Cloud Firestore."
        onConfirm={handleConfirmPurgeAllHistory}
      />
    </div>
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
