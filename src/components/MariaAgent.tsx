import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Share2, 
  Copy, 
  Check, 
  MapPin as MapPinIcon,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RotateCcw,
  Pencil,
  X,
  Sparkles,
  Image as ImageIcon,
  Paperclip,
  MoreVertical,
  AlertCircle,
  Timer,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { copyToClipboard } from '../lib/clipboard';
import { Message, KeywordSetting, UserNotification } from '../types';
import { askMaria } from '../services/geminiService';
import { getTranslation } from '../translations';
import { generateId } from '../lib/utils';
import MapWidget from './MapWidget';
import VTuberAvatar from './VTuberAvatar';
import Typewriter from './Typewriter';
import { useDeviceContext } from '../hooks/useDeviceContext';

interface MariaAgentProps {
  chatId: string;
  language: string;
  userName?: string;
  isFocusMode?: boolean;
  isLiteMode?: boolean;
  isDark?: boolean;
  onExitFocus?: () => void;
  onTitleUpdate?: (title: string) => void;
}

export default function MariaAgent({ chatId, language, userName, isFocusMode = false, isLiteMode = false, isDark = false, onExitFocus, onTitleUpdate }: MariaAgentProps) {
  const t = getTranslation(language);
  const transition = isLiteMode ? { duration: 0.1 } : { duration: 0.5 };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const deviceContext = useDeviceContext();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [pendingImages, setPendingImages] = useState<{ id: string; url: string; base64: string; type: string }[]>([]);
  const [mapConfig, setMapConfig] = useState<{ isOpen: boolean; location?: { lat: number; lng: number }; title?: string }>({
    isOpen: false
  });
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resetTimestamp, setResetTimestamp] = useState<number | null>(null);
  const [isPlus, setIsPlus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadProfile = () => {
      const savedProfile = localStorage.getItem('maria_profile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setIsPlus(profile.isPlus || false);
        } catch (e) {}
      }
    };
    loadProfile();
    window.addEventListener('storage', loadProfile);
    return () => window.removeEventListener('storage', loadProfile);
  }, []);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const chatsStr = localStorage.getItem('maria_chats');
        if (chatsStr && chatsStr !== 'null' && chatsStr !== 'undefined') {
          const allChats = JSON.parse(chatsStr);
          const currentChat = allChats[chatId];
          if (currentChat && Array.isArray(currentChat.messages) && currentChat.messages.length > 0) {
            setMessages(currentChat.messages);
            return;
          }
        }

        // If not in local or empty, try Firebase
        const { auth } = await import('../lib/firebase');
        if (auth?.currentUser) {
          const { collection, query, getDocs, orderBy } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          if (db) {
            const q = query(
              collection(db, 'chats', chatId, 'messages'),
              orderBy('timestamp', 'asc')
            );
            const snap = await getDocs(q);
            const msgs: Message[] = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as any));
            
            if (msgs.length > 0) {
              setMessages(msgs);
              // Update local cache
              const chatsStr = localStorage.getItem('maria_chats');
              const allChats = chatsStr ? JSON.parse(chatsStr) : {};
              allChats[chatId] = { 
                ...(allChats[chatId] || { id: chatId, title: 'Chat Baru' }), 
                messages: msgs,
                updatedAt: Date.now()
              };
              localStorage.setItem('maria_chats', JSON.stringify(allChats));
              window.dispatchEvent(new Event('storage'));
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to load chat", e);
      }
      
      // Fallback for migration or new chat
      const defaultMessages: Message[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: t.welcome,
          timestamp: Date.now(),
        },
      ];
      setMessages(defaultMessages);
    };

    loadChat();
    
    const handleStorageChange = () => {
      loadChat();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [chatId, t.welcome]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveToStorage = async (updatedMessages: Message[]) => {
    try {
      const chatsStr = localStorage.getItem('maria_chats');
      const allChats = (chatsStr && chatsStr !== 'null') ? JSON.parse(chatsStr) : {};
      let title = allChats[chatId]?.title || 'Chat Baru';
    
      // Auto-generate title if it's the first real user message
      if (title === 'Chat Baru') {
        const firstUserMsg = updatedMessages.find(m => m.role === 'user');
        if (firstUserMsg) {
          title = firstUserMsg.content.substring(0, 35) + (firstUserMsg.content.length > 35 ? '...' : '');
          if (onTitleUpdate) onTitleUpdate(title);
        }
      }

      const activeChat = {
        id: chatId,
        title: title,
        messages: updatedMessages,
        updatedAt: Date.now()
      };

      allChats[chatId] = activeChat;
      
      localStorage.setItem('maria_chats', JSON.stringify(allChats));
      window.dispatchEvent(new Event('storage'));

      // FIREBASE SYNC
      const { auth } = await import('../lib/firebase');
      if (auth?.currentUser) {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
        if (db) {
          const chatRef = doc(db, 'chats', chatId);
          await setDoc(chatRef, {
            userId: auth.currentUser.uid,
            title: title,
            isPinned: (allChats[chatId] as any)?.isPinned || false,
            isFavorite: (allChats[chatId] as any)?.isFavorite || false,
            updatedAt: activeChat.updatedAt
          }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`));

          // Save latest message to subcollection
          const latestMsg = updatedMessages[updatedMessages.length - 1];
          if (latestMsg) {
            const msgRef = doc(db, 'chats', chatId, 'messages', latestMsg.id);
            await setDoc(msgRef, latestMsg).catch(err => handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${latestMsg.id}`));
          }
        }
      }
    } catch (e) {
      console.error("Failed to save to storage", e);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if ((!input.trim() && pendingImages.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: generateId('msg-user'),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      images: pendingImages.length > 0 ? pendingImages.map(img => ({
        data: img.base64,
        mimeType: img.type
      })) : undefined
    };

    const nextMessages = [...messages.filter(m => m.id !== 'welcome' || messages.length > 1), userMsg];
    const currentInput = input;
    const currentImages = [...pendingImages];
    
    setPendingImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = '64px';
    }
    processMessage(nextMessages, currentInput, currentImages);
  };

  useEffect(() => {
    // Check for existing quota limit on load
    const savedLimit = localStorage.getItem('maria_quota_limit');
    if (savedLimit) {
      const timestamp = parseInt(savedLimit);
      if (timestamp > Date.now()) {
        setQuotaExhausted(true);
        setResetTimestamp(timestamp);
        setCountdown(Math.floor((timestamp - Date.now()) / 1000));
      } else {
        localStorage.removeItem('maria_quota_limit');
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0 && quotaExhausted) {
      interval = setInterval(() => {
        const remaining = resetTimestamp ? Math.max(0, Math.floor((resetTimestamp - Date.now()) / 1000)) : countdown - 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          setQuotaExhausted(false);
          localStorage.removeItem('maria_quota_limit');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown, quotaExhausted, resetTimestamp]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h} ${language === 'en' ? 'hours' : 'jam'} ${m} ${language === 'en' ? 'minutes' : 'menit'} ${s} ${language === 'en' ? 'seconds' : 'detik'}`;
    if (m > 0) return `${m} ${language === 'en' ? 'minutes' : 'menit'} ${s} ${language === 'en' ? 'seconds' : 'detik'}`;
    return `${s} ${language === 'en' ? 'seconds' : 'detik'}`;
  };

  const processMessage = async (currentMessages: Message[], text: string, images?: { base64: string; type: string }[] | null) => {
    // Check if we are still in quota cooldown
    const savedLimit = localStorage.getItem('maria_quota_limit');
    if (savedLimit && parseInt(savedLimit) > Date.now()) {
      setQuotaExhausted(true);
      setCountdown(Math.floor((parseInt(savedLimit) - Date.now()) / 1000));
      return;
    }

    setMessages(currentMessages);
    saveToStorage(currentMessages);

    setInput('');
    setIsLoading(true);

    // Get preferences for personality
    let preferences = { personality: 'default', useMemory: true, guardrailsEnabled: true };
    const savedProfile = localStorage.getItem('maria_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.preferences) {
          preferences = {
            personality: parsed.preferences.personality || 'default',
            useMemory: parsed.preferences.useMemory !== undefined ? parsed.preferences.useMemory : true,
            guardrailsEnabled: parsed.preferences.guardrailsEnabled !== undefined ? parsed.preferences.guardrailsEnabled : true
          };
        }
      } catch (e) {}
    }

    // Get weather data from localStorage
    let weatherContext = null;
    try {
      const savedWeather = localStorage.getItem('weather_data');
      if (savedWeather) {
        weatherContext = JSON.parse(savedWeather);
      }
    } catch (e) {}

    try {
      const response = await askMaria(
        text, 
        language, 
        images ? images.map(img => ({ data: img.base64, mimeType: img.type })) : undefined,
        preferences,
        { ...deviceContext, weather: weatherContext },
        userName,
        currentMessages.slice(0, -1)
      );
      const assistantMsg: Message = {
        id: generateId('msg-assistant'),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      const finalMessages = [...currentMessages, assistantMsg];
      setMessages(finalMessages);
      saveToStorage(finalMessages);

      // --- SMART AUTOMATION LOGIC ---
      const autoEnabled = localStorage.getItem('maria_profile') ? JSON.parse(localStorage.getItem('maria_profile')!).preferences?.autoNotify : false;
      if (autoEnabled) {
          const lowerResponse = response.toLowerCase();
          const isWorking = lowerResponse.includes('mulai kerja') || lowerResponse.includes('mode kerja') || lowerResponse.includes('semangat bekerja');
          const isHome = lowerResponse.includes('sudah pulang') || lowerResponse.includes('selamat istirahat') || lowerResponse.includes('pulang kerja');
          
          if (isWorking || isHome) {
              const status = isWorking ? 'WORKING' : 'HOME';
              const newNotif: UserNotification = {
                  id: generateId('notif-auto'),
                  type: 'system',
                  title: isWorking ? 'Mode Kerja Aktif' : 'Mode Istirahat Aktif',
                  content: isWorking ? 'Maria telah mengoptimalkan dashboard untuk fokus bekerja.' : 'Maria telah menyesuaikan dashboard untuk waktu istirahat.',
                  timestamp: Date.now(),
                  isRead: false,
                  metadata: { automation: status }
              };
              const existingNotifs = JSON.parse(localStorage.getItem('maria_notifications') || '[]');
              existingNotifs.unshift(newNotif);
              localStorage.setItem('maria_notifications', JSON.stringify(existingNotifs.slice(0, 50)));
              window.dispatchEvent(new Event('maria_new_notification'));
              
              // Effect: Trigger profile update or dashboard changes
              if (isWorking) {
                  window.dispatchEvent(new CustomEvent('maria_automation', { detail: { type: 'WORK_START' } }));
                  console.log("Maria Automation: Working Mode");
              } else if (isHome) {
                  window.dispatchEvent(new CustomEvent('maria_automation', { detail: { type: 'WORK_END' } }));
              }
          }
      }
      // -------------------------------
      const savedKeywords = localStorage.getItem('maria_keywords');
      if (savedKeywords) {
        try {
          const kws: KeywordSetting[] = JSON.parse(savedKeywords);
          const lowerResponse = response.toLowerCase();
          const foundKeywords = kws.filter(k => k.isEnabled && lowerResponse.includes(k.keyword.toLowerCase()));
          
          if (foundKeywords.length > 0) {
            const newNotif: UserNotification = {
              id: generateId('notif-keyword'),
              type: 'keyword',
              title: t.topicDetected,
              content: `${t.topicFound}: ${foundKeywords.map(k => k.keyword).join(', ')}`,
              timestamp: Date.now(),
              isRead: false
            };
            const existingNotifs = JSON.parse(localStorage.getItem('maria_notifications') || '[]');
            existingNotifs.unshift(newNotif);
            localStorage.setItem('maria_notifications', JSON.stringify(existingNotifs.slice(0, 50)));
            window.dispatchEvent(new Event('maria_new_notification'));
          }
        } catch (e) {
          console.error("Error detecting keywords", e);
        }
      }
    } catch (error: any) {
      console.error(error);
      
      const isQuotaError = error?.message?.includes("429") || 
                           error?.message?.includes("quota") || 
                           error?.status === "RESOURCE_EXHAUSTED" ||
                           error?.error?.status === "RESOURCE_EXHAUSTED" ||
                           error?.error?.code === 429 ||
                           (error instanceof Error && error.message.includes("RESOURCE_EXHAUSTED"));

      if (isQuotaError) {
        // Calculate reset time (until next midnight)
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const limitTimestamp = midnight.getTime();
        
        localStorage.setItem('maria_quota_limit', limitTimestamp.toString());
        setResetTimestamp(limitTimestamp);
        setQuotaExhausted(true);
        setCountdown(Math.floor((limitTimestamp - Date.now()) / 1000));
        
        setMessages(currentMessages.slice(0, -1));
        return;
      }

      const errorMsg: Message = {
        id: generateId('msg-error'),
        role: 'assistant',
        content: error.message || 'Maria sedang mengalami kendala teknis. Mohon coba lagi nanti.',
        timestamp: Date.now(),
      };
      const finalMessages = [...currentMessages, errorMsg];
      setMessages(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setEditInput(msg.content);
  };

  const handleUpdateMessage = async (msgId: string) => {
    if (!editInput.trim() || isLoading) return;

    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const updatedMessages = [...messages];
    updatedMessages[msgIndex] = {
      ...updatedMessages[msgIndex],
      content: editInput,
      timestamp: Date.now()
    };

    if (updatedMessages[msgIndex].role === 'user') {
      const finalMessages = updatedMessages.slice(0, msgIndex + 1);
      setEditingId(null);
      processMessage(finalMessages, editInput);
    } else {
      setMessages(updatedMessages);
      saveToStorage(updatedMessages);
      setEditingId(null);
    }
  };

  const detectLocation = (text: string) => {
    const places = [
      { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
      { name: 'Surabaya', lat: -7.2575, lng: 112.7521 },
      { name: 'Bandung', lat: -6.9175, lng: 107.6191 }
    ];
    return places.find(p => text.toLowerCase().includes(p.name.toLowerCase()));
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShare = async (text: string, id: string) => {
    const fallbackCopy = async () => {
      const success = await copyToClipboard(text);
      if (success) {
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Maria AI Chat',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        // If it's not a user cancelation, or even if it is, providing feedback is good
        if ((err as Error).name !== 'AbortError') {
          fallbackCopy();
        } else {
          // Even if canceled, we could still copy to be helpful, or just do nothing
          // Let's copy to clipboard as fallback always if the user intent was to share
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  };

  const handleRegenerate = (msgId: string) => {
    if (isLoading) return;
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Find the nearest preceding user message
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex !== -1) {
      const historyUntilUser = messages.slice(0, userMsgIndex + 1);
      processMessage(historyUntilUser, messages[userMsgIndex].content);
    }
  };

  const handleFeedback = (msgId: string) => {
    setFeedbackId(msgId);
    setTimeout(() => setFeedbackId(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newImages: { id: string; url: string; base64: string; type: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1024;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        base64: base64Data,
        type: 'image/jpeg'
      });
    }

    setPendingImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = (id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className={`flex flex-col h-full bg-transparent overflow-hidden transition-all duration-700 ${isDark || isFocusMode ? 'text-white' : 'text-slate-900'}`}>
      {/* Floating Focus Mode Exit */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            <button 
              onClick={onExitFocus}
              className="px-6 py-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-700 transition-all shadow-2xl"
            >
              <X size={14} /> {t.focusExit}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Messages Container */}
      <div className={`flex-1 overflow-y-auto px-4 md:px-10 lg:px-20 py-10 space-y-12 custom-scrollbar transition-all duration-700 ${isFocusMode ? 'pt-24' : ''}`}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={isLiteMode ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={transition}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] group flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-white shadow-sm border border-white/10 ${isPlus ? 'bg-gradient-to-tr from-brand-blue to-blue-900' : 'bg-gradient-to-br from-[#021B2B] via-[#0E4D54] to-[#14BCB2]'}`}>
                      <span className="text-[10px] font-serif italic drop-shadow-sm">{isPlus ? <Sparkles size={10} /> : 'M'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isDark || isFocusMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Maria {isPlus ? 'Plus' : ''}
                      </span>
                      {isPlus && (
                        <div className="flex items-center gap-1 px-1 py-0.5 bg-brand-blue/10 border border-brand-blue/20 rounded-md">
                          <span className="text-[6px] font-black text-brand-blue uppercase tracking-widest">Plus</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div 
                  className={`px-6 py-4 relative w-full transition-all duration-500 overflow-hidden ${
                    msg.role === 'user' 
                    ? (isDark || isFocusMode ? 'chat-bubble-user bg-brand-blue/90 shadow-2xl shadow-brand-blue/20' : 'chat-bubble-user') 
                    : (isDark || isFocusMode ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-[24px] rounded-tl-none' : 'chat-bubble-ai')
                  } ${editingId === msg.id ? 'ring-4 ring-brand-blue/10 border-brand-blue' : ''}`}
                >
                  {(msg.image || (msg.images && msg.images.length > 0)) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {msg.image && (
                         <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-sm">
                           <img 
                             src={msg.image.data ? `data:${msg.image.mimeType};base64,${msg.image.data}` : msg.image.url} 
                             alt="Shared with Maria" 
                             className="w-full h-auto object-cover max-h-[300px]" 
                           />
                         </div>
                      )}
                      {msg.images?.map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-sm">
                           <img 
                             src={img.data ? `data:${img.mimeType};base64,${img.data}` : img.url} 
                             alt={`Shared ${idx + 1}`} 
                             className="w-full h-auto object-cover max-h-[300px]" 
                           />
                        </div>
                      ))}
                    </div>
                  )}
                  {editingId === msg.id ? (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        className={`bg-transparent text-[15px] leading-relaxed whitespace-pre-wrap outline-none w-full resize-none min-h-[80px] ${isDark || isFocusMode ? 'text-white' : 'text-slate-700'}`}
                        autoFocus
                      />
                      <div className={`flex justify-end gap-3 pt-3 border-t ${isDark || isFocusMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">{t.cancel}</button>
                        <button onClick={() => handleUpdateMessage(msg.id)} className="px-4 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-bold shadow-md shadow-brand-blue/20">{t.saveChanges}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="markdown-body">
                      {msg.role === 'assistant' && msg.id === messages[messages.length - 1]?.id && (Date.now() - msg.timestamp) < 5000 ? (
                        <Typewriter 
                          text={msg.content}
                          speed={10}
                          onUpdate={scrollToBottom}
                          renderMarkdown={(content) => (
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {content}
                            </ReactMarkdown>
                          )}
                        />
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                        
                      {msg.role === 'assistant' && detectLocation(msg.content) && (
                        <div className={`mt-6 pt-5 border-t flex items-center justify-between ${isDark || isFocusMode ? 'border-slate-800' : 'border-slate-50'}`}>
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{language === 'en' ? 'Geo-Intelligence Detected' : 'Geo-Intel Terdeteksi'}</span>
                           </div>
                           <button 
                            onClick={() => {
                              const loc = detectLocation(msg.content);
                              if (loc) setMapConfig({ isOpen: true, location: { lat: loc.lat, lng: loc.lng }, title: loc.name });
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${isDark || isFocusMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-brand-blue hover:text-white' : 'bg-slate-50 border-slate-100 hover:bg-brand-blue hover:text-white'}`}
                           >
                             <MapPinIcon size={14} /> {t.viewMap}
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  
                  {/* Premium Action Bar */}
                  {!editingId && (
                    <div className={`mt-3 flex items-center gap-3 px-2 transition-all duration-300 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    } opacity-100 lg:opacity-0 lg:group-hover:opacity-100`}>
                      {msg.role === 'assistant' ? (
                        <>
                          <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleCopy(msg.content, msg.id)} icon={copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} label={t.copy} />
                          <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleShare(msg.content, msg.id)} icon={sharedId === msg.id ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />} label={t.share} />
                          <div className="flex items-center gap-1">
                            <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleFeedback(msg.id)} icon={feedbackId === msg.id ? <Check size={14} className="text-green-500" /> : <ThumbsUp size={14} />} label={t.like} />
                            <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleFeedback(msg.id)} icon={<ThumbsDown size={14} />} label={t.dislike} />
                          </div>
                          <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleRegenerate(msg.id)} icon={<RotateCcw size={14} />} label={t.regenerate} />
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => startEditing(msg)} icon={<Pencil size={14} />} label={t.edit} />
                          <ActionButton isDark={isDark} isFocusMode={isFocusMode} onClick={() => handleCopy(msg.content, msg.id)} icon={copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />} label={t.copy} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className={`border px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-4 shadow-sm ${isDark || isFocusMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark || isFocusMode ? 'text-slate-500' : 'text-slate-400'}`}>{t.typing}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-20" />
      </div>

      {/* Quota Exhausted Alert - Grok Style */}
      <AnimatePresence>
        {quotaExhausted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className={`max-w-[400px] w-full p-6 rounded-[32px] border shadow-2xl ${
                isDark || isFocusMode 
                ? 'bg-slate-900 border-slate-800' 
                : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${isDark || isFocusMode ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-blue/10 text-brand-blue'}`}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-black tracking-tight">{t.limitReached}</h3>
                </div>
                
                <p className={`text-sm font-bold leading-relaxed mb-6 ${isDark || isFocusMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.limitDesc} <span className="text-brand-blue font-black">{formatCountdown(countdown)}</span>.
                </p>

                <div className="flex flex-col gap-2 w-full">
                  <button 
                    onClick={() => {
                      // Logic for upgrade
                      setQuotaExhausted(false);
                    }}
                    className="w-full py-3.5 rounded-xl bg-brand-blue text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {t.upgrade}
                  </button>
                  
                  <button 
                    disabled={countdown > 0}
                    onClick={() => {
                      setQuotaExhausted(false);
                      setCountdown(0);
                      localStorage.removeItem('maria_quota_limit');
                    }}
                    className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                      countdown > 0 
                      ? (isDark || isFocusMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400')
                      : (isDark || isFocusMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
                    }`}
                  >
                    {countdown > 0 ? (
                      <>
                        <Timer size={14} />
                        {t.wait} ({formatCountdown(countdown)})
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        {t.tryAgain}
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setQuotaExhausted(false)}
                    className={`mt-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isDark || isFocusMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapWidget 
        isOpen={mapConfig.isOpen} 
        onClose={() => setMapConfig({ ...mapConfig, isOpen: false })}
        location={mapConfig.location}
        title={mapConfig.title}
      />

      {/* Modern Input Dock */}
      <div className={`p-4 md:p-10 pointer-events-none transition-all duration-700 ${isFocusMode ? 'pb-20' : ''}`}>
          <div className="max-w-4xl mx-auto w-full pointer-events-auto">
              <form onSubmit={handleSubmit} className="relative group">
                <AnimatePresence>
                  {pendingImages.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute -top-32 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-xl flex items-center gap-3 overflow-x-auto custom-scrollbar"
                    >
                      {pendingImages.map((img) => (
                        <div key={img.id} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-inner group/img">
                          <img src={img.url} alt="Pending" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removePendingImage(img.id)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black transition-colors opacity-0 group-hover/img:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex-shrink-0 pr-4">
                        <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">{pendingImages.length} Image{pendingImages.length > 1 ? 's' : ''} Attached</p>
                        <p className="text-[11px] text-slate-500 max-w-[120px] truncate">Ready for Maria</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="relative flex items-center gap-2">
                    <div className="flex-1 relative flex items-center">
                        <Sparkles size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-blue/30 group-focus-within:text-brand-blue transition-colors hidden sm:block" />
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                              }
                            }}
                            disabled={isLoading}
                            placeholder={t.chatInputPlaceholder}
                            rows={1}
                            className={`w-full py-4 sm:py-5 transition-all outline-none rounded-[24px] sm:rounded-[28px] pl-6 sm:pl-16 pr-14 text-sm sm:text-base shadow-xl resize-none overflow-hidden custom-scrollbar ${
                                isDark || isFocusMode 
                                ? 'bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:border-brand-blue/50 focus:ring-8 focus:ring-brand-blue/10' 
                                : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-brand-blue focus:ring-8 focus:ring-brand-blue/5'
                            } shadow-slate-200/40`}
                            style={{ minHeight: '56px', maxHeight: '200px', height: 'auto' }}
                            onInput={(e: any) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />
                        <div className="absolute right-3 flex items-center gap-0.5">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            multiple
                            className="hidden" 
                          />
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 rounded-full transition-all ${isDark || isFocusMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'} hover:text-brand-blue`}
                            title="Upload Image"
                          >
                            <ImageIcon size={18} />
                          </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
                        className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 border rounded-[22px] sm:rounded-[26px] transition-all disabled:opacity-20 flex items-center justify-center shadow-xl active:scale-95 group ${
                          isDark || isFocusMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900 border-slate-800 text-white'
                        } hover:bg-brand-blue hover:border-brand-blue`}
                    >
                        <Send size={22} className="ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
              </form>
              <div className="mt-3 text-center">
                  <p className={`text-[9px] font-bold uppercase tracking-[0.2em] px-4 ${isDark || isFocusMode ? 'text-slate-600' : 'text-slate-400'}`}>MARIA AI • {t.professionalAsst}</p>
              </div>
          </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, isFocusMode = false, isDark = false }: { icon: React.ReactNode, label: string, onClick?: () => void, isFocusMode?: boolean, isDark?: boolean }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 transition-all group/btn ${isDark || isFocusMode ? 'text-slate-400' : 'text-slate-500'} hover:text-brand-blue`}
            title={label}
        >
            <span className={`p-1.5 border rounded-lg group-hover/btn:bg-slate-50 group-hover/btn:border-brand-blue/20 shadow-sm transition-all ${
                isDark || isFocusMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}>{icon}</span>
        </button>
    );
}
