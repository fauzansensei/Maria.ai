import React, { useState, useEffect } from "react";
import { Message, UserSettings, AppNotification, ChatThread, AppTheme, UserMemory } from "./types";
import { DEFAULT_SETTINGS, THEME_OPTIONS } from "./constants";
import { generateSpeech, playAudioBlob, stopSpeech } from "./services/elevenLabsService";

import type { DiscoveryAgent } from "./components/DiscoverArea";
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs
} from "firebase/firestore";

// Helper to dynamically load components with automatic page reload upon chunk loading errors (such as outdated chunk hashes)
function lazyWithRetry(importFn: () => Promise<any>) {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error("Dynamic import failed, reloading to fetch updated compilation bundles...", error);
      try {
        const isLighthouse = typeof navigator !== 'undefined' && (
          navigator.userAgent.includes("Lighthouse") || 
          navigator.userAgent.includes("Chrome-Lighthouse") || 
          navigator.userAgent.includes("Google-PageSpeed") ||
          navigator.userAgent.includes("PageSpeed")
        );
        
        if (isLighthouse) {
          console.warn("Lighthouse/PageSpeed sandbox detected. Suppressing automatic reload.");
          throw error;
        }

        const now = Date.now();
        const lastReloadStr = sessionStorage.getItem("chunk-last-reload-time");
        const lastReload = lastReloadStr ? parseInt(lastReloadStr, 10) : 0;
        
        // Prevent infinite reload loops by enforcing a 15-second delay between automatic reloads
        if (now - lastReload > 15000) {
          sessionStorage.setItem("chunk-last-reload-time", now.toString());
          window.location.reload();
        } else {
          console.error("Chunk loading error occurred again within 15 seconds. Aborting auto-reload to protect user experience.");
        }
      } catch (_) {}
      throw error;
    }
  });
}

const Sidebar = lazyWithRetry(() => import("./components/Sidebar"));
const ChatArea = lazyWithRetry(() => import("./components/ChatArea"));
const CookiePolicyModal = lazyWithRetry(() => import("./components/CookiePolicyModal"));
const SettingsDashboard = lazyWithRetry(() => import("./components/SettingsDashboard"));
const DiscoverArea = lazyWithRetry(() => import("./components/DiscoverArea"));
const LibraryArea = lazyWithRetry(() => import("./components/LibraryArea"));
const AuxiliaryModals = lazyWithRetry(() => import("./components/AuxiliaryModals"));
const HelpArea = lazyWithRetry(() => import("./components/HelpArea"));
import { 
  Bot, 
  Settings, 
  X, 
  Menu, 
  Sparkles, 
  MessageSquare, 
  AlertCircle,
  Mail,
  Bell,
  Inbox,
  ChevronRight,
  User,
  Lock,
  LogIn,
  Info,
  ChevronDown,
  Database,
  RefreshCw
} from "lucide-react";

const safeParseResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.error || parsed.message)) {
        return parsed;
      }
    } catch {
      // Not JSON
    }
    return { error: text || `HTTP error! status: ${response.status}` };
  }
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  const [showGoogleGuide, setShowGoogleGuide] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLocalError, setAuthLocalError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Email/Password login/register handler
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthLocalError("Alamat email & password wajib diisi.");
      return;
    }
    setAuthLocalError(null);
    setIsAuthenticating(true);
    try {
      if (isSignUpMode) {
        const credential = await createUserWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
        const user = credential.user;
        const initialDisplayName = "User Email";
        const initialUsername = "@" + (user.email?.split("@")[0] || "user");
        setProfileDisplayName(initialDisplayName);
        setProfileUsername(initialUsername);
        setIsLoggedIn(true);
        setIsProfileOpen(false);
        handleAddSystemNotification(
          "Registrasi Sukses",
          `Akun baru (${user.email}) telah terdaftar dan siap digunakan!`,
          "success"
        );
      } else {
        const credential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
        const user = credential.user;
        setIsLoggedIn(true);
        setIsProfileOpen(false);
        handleAddSystemNotification(
          "Masuk Berhasil",
          `Selamat datang kembali di Maria AI! Akun: ${user.email}`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Email auth error details:", err);
      let message = err.message || String(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        message = "Email atau password yang dimasukkan tidak cocok dengan data kami.";
      } else if (err.code === "auth/weak-password") {
        message = "Keamanan Lemah: Password minimal 6 karakter.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "Email ini sudah digunakan. Silakan gunakan alamat email lain.";
      } else if (err.code === "auth/invalid-email") {
        message = "Pola/format alamat email tidak sah.";
      }
      
      setAuthLocalError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Quick anonymous login handler
  const handleAnonymousAuthSubmit = async () => {
    setAuthLocalError(null);
    setIsAuthenticating(true);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      const finalDisplayName = "Guest User";
      const finalUsername = "@guest_" + user.uid.substring(0, 5);
      setProfileDisplayName(finalDisplayName);
      setProfileUsername(finalUsername);
      setIsLoggedIn(true);
      setIsProfileOpen(false);
      handleAddSystemNotification(
        "Koneksi Cepat Aktif",
        "Anda masuk sebagai pengguna tamu anonim di Cloud server.",
        "success"
      );
    } catch (err: any) {
      console.error("Anon login error:", err);
      let message = "Koneksi Cepat gagal: " + (err.message || String(err));
      setAuthLocalError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const speakMessage = (text: string) => {
    const keyToUse = settings?.elevenlabsApiKey?.trim() || "";
    if (!settings?.voiceEnabled || !keyToUse || !text) return;
    
    stopSpeech();
    setIsPlayingAudio(true);
    
    const voiceId = settings?.elevenlabsVoiceId === "custom" 
      ? settings?.elevenlabsCustomVoiceId 
      : settings?.elevenlabsVoiceId;

    generateSpeech(text, keyToUse, voiceId, settings?.elevenlabsVoiceModel)
      .then(playAudioBlob)
      .then(() => setIsPlayingAudio(false))
      .catch((err) => {
        console.error("Gagal memutar audio dari ElevenLabs:", err);
        setIsPlayingAudio(false);
        handleAddSystemNotification(
          "Gangguan Suara",
          "Gagal memutar suara dari ElevenLabs. Periksa kecocokan API Key atau koneksi Anda.",
          "info"
        );
      });
  };


  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "not-init",
      title: "Sistem Aktif",
      body: "Asisten pintar Maria Anda diaktifkan dan terhubung.",
      type: "success",
      timestamp: new Date().toISOString(),
      read: false,
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Controls responsive drawer tracker
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCookieConsentVisible, setIsCookieConsentVisible] = useState<boolean>(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const consent = localStorage.getItem("maria_cookie_consent") !== "true";
        if (consent) {
          setIsCookieConsentVisible(true);
        }
      } catch (_) {}
    }, 2500);
    
    const handleOpenCookiePolicy = () => setIsCookieModalOpenFromBanner(true);
    window.addEventListener('open-cookie-policy', handleOpenCookiePolicy);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('open-cookie-policy', handleOpenCookiePolicy);
    };
  }, []);
  const [isCookieModalOpenFromBanner, setIsCookieModalOpenFromBanner] = useState<boolean>(false);
  const [profileDisplayName, setProfileDisplayName] = useState("User");
  const [profileUsername, setProfileUsername] = useState("@user");
  const [profileAvatarBg, setProfileAvatarBg] = useState("bg-[#064e3b]"); // premium deep green bg
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [profileUseInitials, setProfileUseInitials] = useState(true);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=360&h=360&fit=crop&q=60");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setProfileAvatarUrl(loadEvent.target.result as string);
          setProfileUseInitials(false);
          setShowColorSelector(false); // Close selector dropdown
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setProfileDisplayName(settings.username || "User");
  }, [settings.username]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Simulation states for email & web push alerts
  const [simulatedEmail, setSimulatedEmail] = useState<{ subject: string; body: string; category: string; shown: boolean } | null>(null);
  const [simulatedPush, setSimulatedPush] = useState<{ title: string; body: string; shown: boolean } | null>(null);

  // States for custom modals instead of window.confirm
  const [threadToDeleteId, setThreadToDeleteId] = useState<string | null>(null);
  const [isClearingAllHistory, setIsClearingAllHistory] = useState<boolean>(false);

  // Library and Discover states matching Maria AI suggestions
  const [activeView, setActiveView] = useState<"chat" | "library" | "discover" | "help">("chat");
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Message[]>([]);
  const [isPlus, setIsPlus] = useState(() => {
    if (typeof window !== "undefined") {
      const active = localStorage.getItem("maria_is_plus") === "true";
      const expiryStr = localStorage.getItem("maria_plus_expiry_date");
      if (active && expiryStr) {
        if (new Date() > new Date(expiryStr)) {
          localStorage.setItem("maria_is_plus", "false");
          return false;
        }
      }
      return active;
    }
    return false;
  });

  // Active check for subscription expiry
  useEffect(() => {
    const checkExpiry = () => {
      if (typeof window === "undefined") return;
      const plusActive = localStorage.getItem("maria_is_plus") === "true";
      if (!plusActive) return;

      const expiryStr = localStorage.getItem("maria_plus_expiry_date");
      if (!expiryStr) return; // Lifetime or none

      const expiryDate = new Date(expiryStr);
      const now = new Date();

      if (now > expiryDate) {
        // Revoke active subscription features automatically
        setIsPlus(false);
        localStorage.setItem("maria_is_plus", "false");

        // Reset theme to classic-blue if customized subscription colors were used
        if (settings.theme === "cosmic-purple" || settings.theme === "minimal-dark") {
          const updatedSettings = {
            ...settings,
            theme: "classic-blue" as AppTheme
          };
          setSettings(updatedSettings);
          if (isLoggedIn && auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            updateDoc(userRef, {
              settings: updatedSettings,
              isPlus: false
            }).catch(() => {});
          }
        } else {
          if (isLoggedIn && auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            updateDoc(userRef, {
              isPlus: false
            }).catch(() => {});
          }
        }

        handleAddSystemNotification(
          "Paket Berakhir ⚠️",
          "Masa aktif paket Premium Plus Anda telah berakhir. Fitur Plus dinonaktifkan.",
          "reminder"
        );
      }
    };

    checkExpiry();
    const timer = setInterval(checkExpiry, 30000); // Check every 30 seconds to optimize mobile CPU
    return () => clearInterval(timer);
  }, [isPlus, settings, isLoggedIn]);

  const handleToggleBookmark = async (msg: Message) => {
    let nextBookmarks: Message[] = [];
    const exists = bookmarkedMessages.some(b => b.id === msg.id);
    if (exists) {
      nextBookmarks = bookmarkedMessages.filter(b => b.id !== msg.id);
      handleAddSystemNotification(
        "Penanda Dihapus",
        "Pesan telah dihapus dari pustaka Library Anda.",
        "info"
      );
    } else {
      nextBookmarks = [...bookmarkedMessages, msg];
      handleAddSystemNotification(
        "Pesan Ditambahkan",
        "Pesan berhasil ditandai dan disimpan di dalam Library.",
        "success"
      );
    }

    setBookmarkedMessages(nextBookmarks);

    if (isLoggedIn && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        bookmarks: nextBookmarks
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }
  };

  const handleSelectAgent = (agent: DiscoveryAgent) => {
    const newThreadId = "thread-" + Date.now();
    const welcomeMsg: Message = {
      id: "welcome-agent-" + Date.now(),
      role: "assistant",
      content: agent.startingMessage,
      timestamp: new Date().toISOString()
    };
    
    // Set custom settings based on agent selection
    const updatedSettings: UserSettings = {
      ...settings,
      theme: agent.theme,
      customPrompt: agent.systemPrompt,
      tone: agent.id === "aiko-chat" ? "Warm" : agent.id === "sora-coder" ? "Technical" : agent.id === "rendra-copy" ? "Creative" : "Professional"
    };
    
    // Update settings inside memory and sync to Firestore
    setSettings(updatedSettings);
    if (isLoggedIn && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      updateDoc(userRef, {
        settings: updatedSettings
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }

    // Force messages list
    setMessages([welcomeMsg]);
    
    // Set new active thread
    const newThread: ChatThread = {
      id: newThreadId,
      title: agent.name,
      messages: [welcomeMsg]
    };
    
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThreadId);
    
    // Smoothly route to main chat room
    setActiveView("chat");
    
    handleAddSystemNotification(
      "Agen Diaktifkan",
      `${agent.name} kini siap membimbing Anda dengan instruksi khusus.`,
      "success"
    );
  };

  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const handleUsePromptFormula = (formulaText: string) => {
    setPendingPrompt(formulaText);
    setActiveView("chat");
    handleAddSystemNotification(
      "Prompt Dipakai",
      "Formula perintah dimasukkan ke dalam bilah teks obrolan.",
      "success"
    );
  };

  // Handle auto collapsing of sidebar when resizing below desktop viewport width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    
    // Add event listener
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Google Sign-In Redirect Handler (vital for mobile/iframe pop-up bypass)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          const user = result.user;
          const finalDisplayName = user.displayName || "User";
          const finalUsername = "@" + (user.email?.split("@")[0] || "user");
          const finalEmail = user.email || "user@example.com";
          
          setProfileDisplayName(finalDisplayName);
          setProfileUsername(finalUsername);
          setIsLoggedIn(true);

          setIsProfileOpen(false);
          setShowColorSelector(false);

          handleAddSystemNotification(
            "Berhasil Masuk Akun",
            `Sesi dipulihkan! Selamat datang ${finalDisplayName} @ Maria AI (${finalEmail}).`,
            "success"
          );
        }
      })
      .catch((err: any) => {
        console.error("Firebase auth redirect result error:", err);
        const errString = String(err).toLowerCase();
        if (err.code && err.code !== "auth/redirect-cancelled-by-user" && !errString.includes("pending promise was never set")) {
          setAuthLocalError(`Gagal memulihkan sesi Google: ${err.message || err}`);
          handleAddSystemNotification(
            "Google Auth Gagal (Redirect)",
            `Hubungkan kembali akun Google Anda: ${err.message || err}`,
            "reminder"
          );
        }
      });
  }, []);

  const handleGoogleSignInDirect = async () => {
    setAuthLocalError(null);
    setIsAuthenticating(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const user = result.user;
        const finalDisplayName = user.displayName || "User";
        const finalUsername = "@" + (user.email?.split("@")[0] || "user");
        const finalEmail = user.email || "user@example.com";
        
        setProfileDisplayName(finalDisplayName);
        setProfileUsername(finalUsername);
        setIsLoggedIn(true);

        setIsProfileOpen(false);
        setShowColorSelector(false);

        handleAddSystemNotification(
          "Berhasil Masuk Akun",
          `Selamat datang ${finalDisplayName} @ Maria AI (${finalEmail})!`,
          "success"
        );
      }
    } catch (err: any) {
      console.error(err);
      let message = err.message || String(err);
      
      const isCoopOrIframeIssue = 
        message.includes("Cross-Origin-Opener-Policy") || 
        err.code === "auth/popup-blocked" ||
        err.code === "auth/cancelled-popup-request" ||
        message?.toUpperCase()?.includes("COOP") ||
        message?.toUpperCase()?.includes("POPUP-BLOCKED") ||
        message?.toUpperCase()?.includes("CLOSED-BY-USER");

      if (isCoopOrIframeIssue) {
        message = "Pop-up login diblokir kebijakan browser (COOP/Iframe). Silakan tekan tombol 'Open in New Tab' di pojok kanan atas AI Studio untuk melanjutkan login, atau gunakan Guest Account.";
        setAuthLocalError(message);
        setIsProfileOpen(true);
        setIsAuthenticating(false);
        return;
      }

      if (err.code === "auth/unauthorized-domain") {
        message = `Gagal: Domain '${window.location.hostname}' belum diizinkan oleh Firebase Console Anda.`;
      } else if (err.code === "auth/popup-blocked") {
        message = "Gagal: Pop-up diblokir oleh browser Anda. Silakan izinkan pop-up untuk situs ini agar pendaftaran/login stabil.";
      } else if (err.code === "auth/popup-closed-by-user") {
        message = "Login dibatalkan: Jendela dialog ditutup sebelum proses selesai.";
      }
      
      setAuthLocalError(message);
      setIsProfileOpen(true);
      setIsAuthenticating(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 1. Firebase Auth and Profile real-time listener
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeThreads: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clear any prior listeners immediately to avoid overlapping/stale calls on logout or switch
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      if (unsubscribeThreads) {
        unsubscribeThreads();
        unsubscribeThreads = null;
      }

      if (user) {
        setIsLoggedIn(true);
        // Sync user document
        const userRef = doc(db, "users", user.uid);
        unsubscribeUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.settings) {
              setSettings(data.settings);
            }
            if (data.memories) {
              setMemories(data.memories);
            } else {
              setMemories([]);
            }
            if (data.bookmarks) {
              setBookmarkedMessages(data.bookmarks);
            }
            if (data.savedChats) {
              setSavedChats(data.savedChats);
            }
            if (data.displayName) {
              setProfileDisplayName(data.displayName);
            }
            if (data.username) {
              setProfileUsername(data.username);
            }
            if (data.avatarUrl) {
              setProfileAvatarUrl(data.avatarUrl);
              setProfileUseInitials(false);
            }
            
            // Sync subscription data from Firestore
            if (data.isPlus !== undefined) {
              let active = data.isPlus === true;
              if (active && data.plusExpiryDate) {
                if (new Date() > new Date(data.plusExpiryDate)) {
                  active = false;
                  // Auto-expire in database
                  updateDoc(userRef, { isPlus: false }).catch(() => {});
                }
              }
              setIsPlus(active);
              localStorage.setItem("maria_is_plus", active ? "true" : "false");
              if (data.plusPlan) localStorage.setItem("maria_plus_plan", data.plusPlan);
              if (data.plusPurchaseDate) localStorage.setItem("maria_plus_purchase_date", data.plusPurchaseDate);
              if (data.plusExpiryDate) localStorage.setItem("maria_plus_expiry_date", data.plusExpiryDate);
            }
          } else {
            // New user registration - initialize user doc
            const initialDisplayName = user.displayName || "User";
            const initialUsername = "@" + (user.email?.split("@")[0] || "user");
            setDoc(userRef, {
              displayName: initialDisplayName,
              username: initialUsername,
              email: user.email || "user@example.com",
              avatarUrl: user.photoURL || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=360&h=360&fit=crop&q=60",
              settings: {
                ...DEFAULT_SETTINGS,
                username: initialDisplayName
              },
              bookmarks: [],
              savedChats: [],
              myPrompts: []
            }).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });

        // Sync user threads
        const threadsQuery = query(collection(db, "threads"), where("userId", "==", user.uid));
        unsubscribeThreads = onSnapshot(threadsQuery, (querySnapshot) => {
          const loadedThreads: ChatThread[] = [];
          querySnapshot.forEach((docSnap) => {
            const threadData = docSnap.data();
            loadedThreads.push({
              id: docSnap.id,
              title: threadData.title || "Percakapan",
              isPinned: threadData.isPinned || false,
              messages: [] // messages are loaded per active thread
            });
          });
          setThreads(loadedThreads);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "threads");
        });

      } else {
        setIsLoggedIn(false);
        setSettings(DEFAULT_SETTINGS);
        setMemories([]);
        setProfileDisplayName("User");
        setProfileUsername("@user");
        setBookmarkedMessages([]);
        setSavedChats([]);
        setThreads([]);
        setMessages([]);
        setActiveThreadId("");
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeThreads) unsubscribeThreads();
    };
  }, []);

  // 2. Real-time active chat thread messages listener
  useEffect(() => {
    if (!activeThreadId || !isLoggedIn || !auth.currentUser) {
      return;
    }

    const messagesQuery = collection(db, "threads", activeThreadId, "messages");
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const loadedMessages: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const msgData = docSnap.data();
        loadedMessages.push({
          id: docSnap.id,
          role: msgData.role,
          content: msgData.content,
          timestamp: msgData.timestamp,
          isError: msgData.isError || false,
          isEdited: msgData.isEdited || false,
          feedback: msgData.feedback || null,
          image: msgData.image || undefined,
          images: msgData.images || undefined,
          audio: msgData.audio || undefined
        });
      });
      loadedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(loadedMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `threads/${activeThreadId}/messages`);
    });

    return () => unsubscribeMessages();
  }, [activeThreadId, isLoggedIn]);

  // Save settings when modified
  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    
    if (isLoggedIn && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        settings: newSettings
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }
    
    // Determine active theme name
    const themeName = THEME_OPTIONS.find(t => t.value === newSettings.theme)?.name || "Kustom";

    // Play chime & alert system notification
    handleAddSystemNotification(
      "Pengaturan Tersimpan", 
      `Preferensi Maria berhasil diperbarui. Tema warna: ${themeName}.`, 
      "success"
    );
  };

  // Save user memories when modified in panel
  const handleSaveMemories = async (newMemories: UserMemory[]) => {
    setMemories(newMemories);
    if (isLoggedIn && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        memories: newMemories
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }
  };

  // Synchronize active thread with messages in guest mode
  useEffect(() => {
    if (!isLoggedIn && activeThreadId) {
      setThreads(prev => prev.map(t => 
        t.id === activeThreadId ? { ...t, messages } : t
      ));
    }
  }, [messages, activeThreadId, isLoggedIn]);

  // Play polite system chime when actions succeed
  const playNotificationChime = () => {
    if (!settings.notifications?.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        // Close it immediately if the browser suspended it to avoid printing noisy warning lines
        audioCtx.close();
        return;
      }
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      // Play a lovely double chime note (D5 followed by G5)
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.12); // G5

      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Quietly consume and ignore any browser autoplay/security warnings
    }
  };

  // Trigger system notification
  const handleAddSystemNotification = (
    title: string, 
    body: string, 
    type: "info" | "success" | "reminder" | "message"
  ) => {
    const newNotification: AppNotification = {
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 25)); // keep log ceiling to 25 items
    playNotificationChime();
  };

  const handleSimulateEmail = (subject: string, body: string, category: string) => {
    setSimulatedEmail({
      subject,
      body,
      category,
      shown: true
    });
  };

  const handleSimulatePush = (title: string, body: string) => {
    setSimulatedPush({
      title,
      body,
      shown: true
    });
    playNotificationChime();

    // Native browser push integration if supported and allowed
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch (e) {
          console.warn("Could not play native notification", e);
        }
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Handles sending messages to the Express backend proxy endpoint
  const handleSendMessage = async (text: string, images?: string[], audio?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      currentThreadId = "thread-" + Date.now();
      const firstMessageText = text.trim();
      const title = firstMessageText.length > 25 
        ? firstMessageText.substring(0, 25) + "..." 
        : firstMessageText;
      
      if (isLoggedIn && auth.currentUser) {
        // Save thread in Firestore
        await setDoc(doc(db, "threads", currentThreadId), {
          id: currentThreadId,
          title,
          isPinned: false,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}`));
      } else {
        const newThread: ChatThread = {
          id: currentThreadId,
          title,
          isPinned: false,
          messages: []
        };
        setThreads(prev => [newThread, ...prev]);
      }
      setActiveThreadId(currentThreadId);
    }

    const userMsg: Message = {
      id: "msg-" + Date.now() + "-user",
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      ...(images && images.length > 0 ? { images } : {}),
      ...(audio ? { audio } : {}),
    };

    const postMessages = [...messages, userMsg];
    setMessages(postMessages);

    if (isLoggedIn && auth.currentUser) {
      await setDoc(doc(db, "threads", currentThreadId, "messages", userMsg.id), {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        timestamp: userMsg.timestamp,
        isError: false,
        isEdited: false,
        feedback: null,
        ...(userMsg.images && userMsg.images.length > 0 ? { images: userMsg.images } : {}),
        ...(userMsg.audio ? { audio: userMsg.audio } : {})
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}/messages/${userMsg.id}`));
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: postMessages,
          settings: {
            ...settings,
            username: isLoggedIn ? (profileDisplayName || settings.username || "User") : "User"
          },
          memories: memories
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        // Automate dynamic user memory update if returned from server
        if (data.updatedMemory && isLoggedIn && auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const newMemList = [{
            id: "mem-unified",
            text: data.updatedMemory,
            category: "personal" as const,
            timestamp: new Date().toISOString()
          }];
          setMemories(newMemList);
          updateDoc(userRef, {
            memories: newMemList
          }).catch(() => {});
        }

        if (isLoggedIn && auth.currentUser) {
          await setDoc(doc(db, "threads", currentThreadId, "messages", assistantMsg.id), {
            id: assistantMsg.id,
            role: assistantMsg.role,
            content: assistantMsg.content,
            timestamp: assistantMsg.timestamp,
            isError: false,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}/messages/${assistantMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === assistantMsg.id) ? prev : [...prev, assistantMsg]);
        
        // Render speak output if configured
        speakMessage(assistantMsg.content);

        // Notify user about incoming answer
        handleAddSystemNotification(
          "Respons Baru dari Maria", 
          "Maria telah selesai menyusun tanggapan terstruktur Anda.", 
          "message"
        );
      } else {
        // Handle specific server-side errors, like missing API key demo mode
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };

        if (isLoggedIn && auth.currentUser) {
          await setDoc(doc(db, "threads", currentThreadId, "messages", errorMsg.id), {
            id: errorMsg.id,
            role: errorMsg.role,
            content: errorMsg.content,
            timestamp: errorMsg.timestamp,
            isError: true,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}/messages/${errorMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
        
        handleAddSystemNotification(
          "Peringatan Sambungan", 
          "Silakan pasang kunci API Anda agar Maria dapat terhubung.", 
          "info"
        );
      }
    } catch (networkError: any) {
      console.error("Network Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      if (isLoggedIn && auth.currentUser) {
        await setDoc(doc(db, "threads", currentThreadId, "messages", errorMsg.id), {
          id: errorMsg.id,
          role: errorMsg.role,
          content: errorMsg.content,
          timestamp: errorMsg.timestamp,
          isError: true,
          isEdited: false,
          feedback: null
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}/messages/${errorMsg.id}`));
      }
      setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);

      handleAddSystemNotification(
        "Koneksi Offline", 
        "Terjadi hambatan jaringan. Silakan coba kirim ulang pesan.", 
        "info"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerates a specific assistant message
  const handleRegenerateResponse = async (messageId: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) {
      setIsLoading(false);
      return;
    }

    // Slice history up to that point
    const precedingMessages = messages.slice(0, msgIdx);
    if (precedingMessages.length === 0) {
      setIsLoading(false);
      return;
    }

    if (isLoggedIn && auth.currentUser && activeThreadId) {
      // Delete any Firestore messages from msgIdx onwards
      const messagesToDelete = messages.slice(msgIdx);
      for (const m of messagesToDelete) {
        await deleteDoc(doc(db, "threads", activeThreadId, "messages", m.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `threads/${activeThreadId}/messages/${m.id}`));
      }
    }
    
    setMessages(precedingMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: precedingMessages,
          settings: {
            ...settings,
            username: isLoggedIn ? (profileDisplayName || settings.username || "User") : "User"
          },
          memories: memories
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        // Automate dynamic user memory update if returned from server
        if (data.updatedMemory && isLoggedIn && auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const newMemList = [{
            id: "mem-unified",
            text: data.updatedMemory,
            category: "personal" as const,
            timestamp: new Date().toISOString()
          }];
          setMemories(newMemList);
          updateDoc(userRef, {
            memories: newMemList
          }).catch(() => {});
        }

        if (isLoggedIn && auth.currentUser && activeThreadId) {
          await setDoc(doc(db, "threads", activeThreadId, "messages", assistantMsg.id), {
            id: assistantMsg.id,
            role: assistantMsg.role,
            content: assistantMsg.content,
            timestamp: assistantMsg.timestamp,
            isError: false,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${assistantMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === assistantMsg.id) ? prev : [...prev, assistantMsg]);

        // Render speak output if configured
        speakMessage(assistantMsg.content);

        handleAddSystemNotification(
          "Respons Baru dari Maria",
          "Maria telah selesai menyusun ulang tanggapan atas pertanyaan Anda.",
          "message"
        );
      } else {
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };

        if (isLoggedIn && auth.currentUser && activeThreadId) {
          await setDoc(doc(db, "threads", activeThreadId, "messages", errorMsg.id), {
            id: errorMsg.id,
            role: errorMsg.role,
            content: errorMsg.content,
            timestamp: errorMsg.timestamp,
            isError: true,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${errorMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
      }
    } catch (networkError: any) {
      console.error("Regenerate Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      if (isLoggedIn && auth.currentUser && activeThreadId) {
        await setDoc(doc(db, "threads", activeThreadId, "messages", errorMsg.id), {
          id: errorMsg.id,
          role: errorMsg.role,
          content: errorMsg.content,
          timestamp: errorMsg.timestamp,
          isError: true,
          isEdited: false,
          feedback: null
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${errorMsg.id}`));
      }
      setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sets feedback status (like/dislike) for a message
  const handleSetFeedback = async (messageId: string, feedback: "like" | "dislike") => {
    if (isLoggedIn && auth.currentUser && activeThreadId) {
      await updateDoc(doc(db, "threads", activeThreadId, "messages", messageId), {
        feedback
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `threads/${activeThreadId}/messages/${messageId}`));
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
      );
    }
  };

  // Edits a user's previous message and triggers a response rebuild
  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (isLoading || !newContent.trim()) return;
    setIsLoading(true);

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) {
      setIsLoading(false);
      return;
    }

    const updatedUserMsg: Message = {
      ...messages[msgIdx],
      content: newContent,
      isEdited: true,
    };

    const nextMessages = [...messages.slice(0, msgIdx), updatedUserMsg];

    if (isLoggedIn && auth.currentUser && activeThreadId) {
      // Delete any Firestore messages from msgIdx onwards first
      const messagesToDelete = messages.slice(msgIdx);
      for (const m of messagesToDelete) {
        await deleteDoc(doc(db, "threads", activeThreadId, "messages", m.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `threads/${activeThreadId}/messages/${m.id}`));
      }
      // Save updatedUserMsg
      await setDoc(doc(db, "threads", activeThreadId, "messages", updatedUserMsg.id), {
        id: updatedUserMsg.id,
        role: updatedUserMsg.role,
        content: updatedUserMsg.content,
        timestamp: updatedUserMsg.timestamp,
        isError: false,
        isEdited: true,
        feedback: null,
        ...(updatedUserMsg.image ? { image: updatedUserMsg.image } : {}),
        ...(updatedUserMsg.audio ? { audio: updatedUserMsg.audio } : {})
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${updatedUserMsg.id}`));
    }

    setMessages(nextMessages);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          settings: {
            ...settings,
            username: isLoggedIn ? (profileDisplayName || settings.username || "User") : "User"
          },
          memories: memories
        }),
      });

      const data = await safeParseResponse(response);

      if (response.ok) {
        const assistantMsg: Message = {
          id: "msg-" + Date.now() + "-maria",
          role: "assistant",
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        if (isLoggedIn && auth.currentUser && activeThreadId) {
          await setDoc(doc(db, "threads", activeThreadId, "messages", assistantMsg.id), {
            id: assistantMsg.id,
            role: assistantMsg.role,
            content: assistantMsg.content,
            timestamp: assistantMsg.timestamp,
            isError: false,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${assistantMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === assistantMsg.id) ? prev : [...prev, assistantMsg]);

        // Render speak output if configured
        speakMessage(assistantMsg.content);

        handleAddSystemNotification(
          "Pesan Diperbarui",
          "Maria telah menyusun ulang tanggapan atas pertanyaan baru Anda.",
          "success"
        );
      } else {
        const errorMsg: Message = {
          id: "msg-" + Date.now() + "-error",
          role: "assistant",
          content: data.error || "Terjadi kesalahan sambungan",
          timestamp: new Date().toISOString(),
          isError: true,
        };

        if (isLoggedIn && auth.currentUser && activeThreadId) {
          await setDoc(doc(db, "threads", activeThreadId, "messages", errorMsg.id), {
            id: errorMsg.id,
            role: errorMsg.role,
            content: errorMsg.content,
            timestamp: errorMsg.timestamp,
            isError: true,
            isEdited: false,
            feedback: null
          }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${errorMsg.id}`));
        }
        setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
      }
    } catch (networkError: any) {
      console.error("Edit Message Error:", networkError);
      const errorMsg: Message = {
        id: "msg-" + Date.now() + "-error",
        role: "assistant",
        content: "Kesalahan Jaringan (Kondisi Offline)",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      if (isLoggedIn && auth.currentUser && activeThreadId) {
        await setDoc(doc(db, "threads", activeThreadId, "messages", errorMsg.id), {
          id: errorMsg.id,
          role: errorMsg.role,
          content: errorMsg.content,
          timestamp: errorMsg.timestamp,
          isError: true,
          isEdited: false,
          feedback: null
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${errorMsg.id}`));
      }
      setMessages((prev) => prev.some(m => m.id === errorMsg.id) ? prev : [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Select active thread
  const handleSelectThread = async (id: string) => {
    setActiveThreadId(id);
    if (!isLoggedIn) {
      const thread = threads.find(t => t.id === id);
      if (thread) {
        setMessages(thread.messages);
      }
    }
  };

  // Start fresh chat session
  const handleNewChat = () => {
    setActiveThreadId("");
    setMessages([]);
  };

  // Toggle thread pin status
  const handlePinThread = async (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    const isNowPinned = !thread.isPinned;

    if (isLoggedIn && auth.currentUser) {
      await updateDoc(doc(db, "threads", id), {
        isPinned: isNowPinned
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `threads/${id}`));
    } else {
      setThreads(prev => prev.map(t => 
        t.id === id ? { ...t, isPinned: isNowPinned } : t
      ));
    }
    
    handleAddSystemNotification(
      isNowPinned ? "Disematkan" : "Sematkan Dilepas", 
      `Percakapan "${thread.title}" kini telah ${isNowPinned ? "disematkan ke atas" : "dilepas"}.`, 
      "success"
    );
  };

  // Rename thread
  const handleRenameThread = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;

    if (isLoggedIn && auth.currentUser) {
      await updateDoc(doc(db, "threads", id), {
        title: newTitle.trim()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `threads/${id}`));
    } else {
      setThreads(prev => prev.map(t => 
        t.id === id ? { ...t, title: newTitle.trim() } : t
      ));
    }

    handleAddSystemNotification(
      "Ganti Nama", 
      `Nama percakapan berhasil diubah menjadi "${newTitle}".`, 
      "success"
    );
  };

  // Delete thread trigger
  const handleDeleteThread = (id: string) => {
    setThreadToDeleteId(id);
  };

  // Execute actual deletion of specified thread
  const executeDeleteThread = async () => {
    if (!threadToDeleteId) return;
    const threadToDelete = threads.find(t => t.id === threadToDeleteId);
    const title = threadToDelete ? threadToDelete.title : "Percakapan";
    
    // Reset active thread selection and clear messages BEFORE running deletions on the database,
    // to unsubscribe active snapshot listeners.
    if (activeThreadId === threadToDeleteId) {
      setActiveThreadId("");
      setMessages([]);
      // Small timeout to allow state dispatching and unsubscription of the real-time messages listener
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (isLoggedIn && auth.currentUser) {
      const threadId = threadToDeleteId;
      const messagesSnapshot = await getDocs(collection(db, "threads", threadId, "messages")).catch(() => null);
      if (messagesSnapshot) {
        for (const docSnap of messagesSnapshot.docs) {
          await deleteDoc(doc(db, "threads", threadId, "messages", docSnap.id)).catch(() => {});
        }
      }
      await deleteDoc(doc(db, "threads", threadId)).catch(err => handleFirestoreError(err, OperationType.DELETE, `threads/${threadId}`));
    } else {
      setThreads(prev => prev.filter(t => t.id !== threadToDeleteId));
    }
    
    handleAddSystemNotification(
      "Percakapan Dihapus", 
      `Percakapan "${title}" berhasil dibersihkan secara permanen.`, 
      "success"
    );
    setThreadToDeleteId(null);
  };

  // Share thread simulation
  const handleShareThread = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (thread) {
      const shareUrl = `${window.location.origin}/?share=${thread.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        handleAddSystemNotification(
          "Tautan Dipublikasikan", 
          `Tautan percakapan "${thread.title}" berhasil disalin ke papan klip!`, 
          "success"
        );
      }).catch(() => {
        alert(`Tautan berbagi:\n${shareUrl}`);
      });
    }
  };

  // Archive thread to private Library (local storage / firestore)
  const handleArchiveThread = async (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    if (savedChats.some((c: any) => c.id === id)) {
      handleAddSystemNotification(
        "Sudah Diarsipkan",
        `Percakapan "${thread.title}" sudah ada di Pustaka Pribadi Anda.`,
        "info"
      );
      return;
    }

    // Generate snippet
    const assistantMsgs = thread.messages.filter(m => m.role === "assistant");
    const snippetVal = assistantMsgs.length > 0
      ? assistantMsgs[assistantMsgs.length - 1].content.slice(0, 120) + "..."
      : "Sesi percakapan kosong...";

    const newSavedChat = {
      id: thread.id,
      title: thread.title,
      timestamp: new Date().toISOString(),
      snippet: snippetVal,
      messages: thread.messages
    };

    const updatedSavedChats = [...savedChats, newSavedChat];
    setSavedChats(updatedSavedChats);

    if (isLoggedIn && auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        savedChats: updatedSavedChats
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
    }

    handleAddSystemNotification(
      "Arsip Berhasil",
      `Percakapan "${thread.title}" berhasil diarsipkan ke Pustaka Library!`,
      "success"
    );
  };

  // Restore archived chat back to actual chat area
  const handleRestoreSavedChat = (savedChat: any) => {
    try {
      if (!threads.some(t => t.id === savedChat.id)) {
        const restoredThread: ChatThread = {
          id: savedChat.id,
          title: savedChat.title,
          isPinned: false,
          messages: savedChat.messages
        };
        setThreads(prev => [restoredThread, ...prev]);
      }
      setActiveThreadId(savedChat.id);
      setMessages(savedChat.messages);
      setActiveView("chat");

      handleAddSystemNotification(
        "Arsip Dipulihkan",
        `Percakapan "${savedChat.title}" berhasil dipulihkan ke menu samping!`,
        "success"
      );
    } catch (e) {
      console.error("Gagal memulihkan arsip chat:", e);
    }
  };

  // Wipes conversations trigger
  const handleClearHistory = () => {
    setIsClearingAllHistory(true);
  };

  // Execute actual clearing of all history
  const executeClearHistory = async () => {
    // Reset active selection and clear messages first to cleanly unsubscribe real-time snapshot listeners before deleting resources
    setActiveThreadId("");
    setMessages([]);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isLoggedIn && auth.currentUser) {
      // Delete all user's threads from Firestore
      const threadsQuery = query(collection(db, "threads"), where("userId", "==", auth.currentUser.uid));
      const threadsSnap = await getDocs(threadsQuery).catch(() => null);
      if (threadsSnap) {
        for (const threadDoc of threadsSnap.docs) {
          // Delete messages first
          const messagesSnap = await getDocs(collection(db, "threads", threadDoc.id, "messages")).catch(() => null);
          if (messagesSnap) {
            for (const msgDoc of messagesSnap.docs) {
              await deleteDoc(doc(db, "threads", threadDoc.id, "messages", msgDoc.id)).catch(() => {});
            }
          }
          // Delete thread
          await deleteDoc(doc(db, "threads", threadDoc.id)).catch(() => {});
        }
      }
    }

    setThreads([]);
    
    handleAddSystemNotification(
      "Riwayat Berhasil Dihapus", 
      "Semua riwayat percakapan Anda telah dibersihkan secara permanen.", 
      "success"
    );
    setIsClearingAllHistory(false);
  };

  // Setup simulated motivational prompts reminder occasionally
  useEffect(() => {
    if (!settings.notifications?.remindersEnabled) return;

    // Send a polite motivational agenda tip 2.5 seconds after mounting to greet the user
    const timer = setTimeout(() => {
      handleAddSystemNotification(
        "Tips Belajar Hari Ini",
        "Disarankan Anda menanyakan tentang Agile & Scrum Scrum untuk mengoptimalkan agenda Anda.",
        "reminder"
      );
    }, 4500);

    return () => clearTimeout(timer);
  }, [settings.notifications?.remindersEnabled]);

  // Get active themed colors
  const activeColorTheme = THEME_OPTIONS.find(t => t.value === settings.theme) || THEME_OPTIONS[0];

  return (
    <div className="h-[100dvh] w-screen flex flex-col font-sans overflow-hidden bg-slate-50 text-slate-700 select-none">
      
      {/* Main Layout Container */}
      <div className="flex-grow flex overflow-hidden relative">
        <React.Suspense fallback={
          <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#0a0f18] text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-3" />
            <p className="text-xs font-sans font-medium tracking-wide">Memuat Sistem Maria AI...</p>
          </div>
        }>
          {/* Far Left Sidebar: Beautiful Dark Maria Sidebar Vibe */}
          <Sidebar 
          settings={settings}
          messages={messages}
          onLoadChatHistory={(msgs) => setMessages(msgs)}
          onNewChat={handleNewChat}
          onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
          onOpenProfile={() => setIsProfileOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onPinThread={handlePinThread}
          onRenameThread={handleRenameThread}
          onDeleteThread={handleDeleteThread}
          onShareThread={handleShareThread}
          onArchiveThread={handleArchiveThread}
          activeView={activeView}
          onViewChange={setActiveView}
          profileAvatarProp={profileAvatarUrl}
          useInitialsAvatarProp={profileUseInitials}
          profileAvatarBgProp={profileAvatarBg}
          profileUsernameHandleProp={profileUsername}
          profileDisplayNameProp={profileDisplayName}
          isLoggedIn={isLoggedIn}
          isPlus={isPlus}
          onGoogleSignIn={handleGoogleSignInDirect}
          onUpgradeSuccess={(planType) => {
            setIsPlus(true);
            const now = new Date();
            const purchaseStr = now.toISOString();
            
            const expiry = new Date();
            if (planType === "monthly") {
              expiry.setMonth(expiry.getMonth() + 1); // 1 month from now
            } else {
              expiry.setFullYear(expiry.getFullYear() + 1); // 1 year from now
            }
            const expiryStr = expiry.toISOString();

            try {
              localStorage.setItem("maria_is_plus", "true");
              localStorage.setItem("maria_plus_plan", planType);
              localStorage.setItem("maria_plus_purchase_date", purchaseStr);
              localStorage.setItem("maria_plus_expiry_date", expiryStr);
            } catch (e) {
              console.error(e);
            }

            // Sync with Firestore if logged in
            if (isLoggedIn && auth.currentUser) {
              const userRef = doc(db, "users", auth.currentUser.uid);
              updateDoc(userRef, {
                isPlus: true,
                plusPlan: planType,
                plusPurchaseDate: purchaseStr,
                plusExpiryDate: expiryStr
              }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
            }
          }}
        />

        {/* Center Main Dynamic Workspace */}
        <main className="flex-1 h-full min-w-0 relative">
          {activeView === "chat" && (
            <ChatArea
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              settings={settings}
              notifications={notifications}
              onMarkNotificationRead={handleMarkNotificationRead}
              onClearNotifications={handleClearNotifications}
              onAddSystemNotification={handleAddSystemNotification}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
              onRegenerateResponse={handleRegenerateResponse}
              onSetFeedback={handleSetFeedback}
              onEditUserMessage={handleEditUserMessage}
              onToggleBookmark={handleToggleBookmark}
              bookmarkedMessages={bookmarkedMessages}
              isLoggedIn={isLoggedIn}
              profileDisplayNameProp={profileDisplayName}
              onOpenLogin={() => setIsProfileOpen(true)}
              pendingPrompt={pendingPrompt}
              onClearPendingPrompt={() => setPendingPrompt(null)}
              isPlus={isPlus}
              speakMessage={speakMessage}
              isPlayingAudio={isPlayingAudio}
              stopSpeech={stopSpeech}
            />
          )}

          {activeView === "library" && (
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3" />
                <p className="text-xs font-sans font-medium tracking-wide">Memuat pustaka Maria...</p>
              </div>
            }>
              <LibraryArea
                settings={settings}
                bookmarkedMessages={bookmarkedMessages}
                onToggleBookmark={handleToggleBookmark}
                onUsePromptFormula={handleUsePromptFormula}
                onRestoreSavedChat={handleRestoreSavedChat}
                onExit={() => setActiveView("chat")}
              />
            </React.Suspense>
          )}

          {activeView === "discover" && (
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-3" />
                <p className="text-xs font-sans font-medium tracking-wide">Mengeksplorasi modul pintar...</p>
              </div>
            }>
              <DiscoverArea
                settings={settings}
                isLoggedIn={isLoggedIn}
                onSelectAgent={handleSelectAgent}
                onUsePrompt={handleUsePromptFormula}
                onExit={() => setActiveView("chat")}
              />
            </React.Suspense>
          )}

          {activeView === "help" && (
            <React.Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f17] text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-3" />
                <p className="text-xs font-sans font-medium tracking-wide">Membuka bantuan teknis...</p>
              </div>
            }>
              <HelpArea
                settings={settings}
                onExit={() => setActiveView("chat")}
                onAddSystemNotification={handleAddSystemNotification}
              />
            </React.Suspense>
          )}
        </main>
      </React.Suspense>

        {/* Universal Settings Modal (ChatGPT Centered Dark Dialog) */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/80 transition-opacity animate-fade-in"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Modal centerpiece card container */}
            <div className="relative w-full max-w-xl md:max-w-3xl lg:max-w-4xl bg-[#0d0d0e] rounded-3xl border border-zinc-900 shadow-2xl h-[85vh] max-h-[640px] flex flex-col overflow-hidden animate-fade-in z-55">
              <React.Suspense fallback={
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#171717] text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500 mb-3" />
                  <p className="text-xs font-sans font-medium tracking-wide">Memuat Dasbor Pengaturan...</p>
                </div>
              }>
                <SettingsDashboard
                  settings={settings}
                  onSaveSettings={(s) => {
                    handleSaveSettings(s);
                  }}
                  onClearHistory={handleClearHistory}
                  messageCount={messages.length}
                  onClose={() => setIsSettingsOpen(false)}
                  onAddSystemNotification={handleAddSystemNotification}
                  onSimulateEmail={handleSimulateEmail}
                  onSimulatePush={handleSimulatePush}
                  isPlus={isPlus}
                  setIsPlus={setIsPlus}
                  memories={memories}
                  onSaveMemories={handleSaveMemories}
                />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* Dynamic Lazy Loaded Utility Modals */}
        {(isProfileOpen || threadToDeleteId !== null || isClearingAllHistory || simulatedEmail !== null || simulatedPush !== null || showGoogleGuide) && (
          <React.Suspense fallback={null}>
            <AuxiliaryModals
              isProfileOpen={isProfileOpen}
              setIsProfileOpen={setIsProfileOpen}
              showColorSelector={showColorSelector}
              setShowColorSelector={setShowColorSelector}
              profileUseInitials={profileUseInitials}
              setProfileUseInitials={setProfileUseInitials}
              profileAvatarBg={profileAvatarBg}
              setProfileAvatarBg={setProfileAvatarBg}
              profileDisplayName={profileDisplayName}
              setProfileDisplayName={setProfileDisplayName}
              profileAvatarUrl={profileAvatarUrl}
              setProfileAvatarUrl={setProfileAvatarUrl}
              profileUsername={profileUsername}
              setProfileUsername={setProfileUsername}
              isSignUpMode={isSignUpMode}
              setIsSignUpMode={setIsSignUpMode}
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              isAuthenticating={isAuthenticating}
              setIsAuthenticating={setIsAuthenticating}
              authLocalError={authLocalError}
              setAuthLocalError={setAuthLocalError}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
              settings={settings}
              setSettings={setSettings}
              isIframe={isIframe}
              handleAddSystemNotification={handleAddSystemNotification}
              setIsSettingsOpen={setIsSettingsOpen}
              handleEmailAuthSubmit={handleEmailAuthSubmit}
              handleAnonymousAuthSubmit={handleAnonymousAuthSubmit}
              handleProfileImageUploadWrapper={(e) => {
                handleProfileImageUpload(e);
              }}
              threadToDeleteId={threadToDeleteId}
              setThreadToDeleteId={setThreadToDeleteId}
              threads={threads}
              executeDeleteThread={executeDeleteThread}
              isClearingAllHistory={isClearingAllHistory}
              setIsClearingAllHistory={setIsClearingAllHistory}
              executeClearHistory={executeClearHistory}
              simulatedEmail={simulatedEmail}
              setSimulatedEmail={setSimulatedEmail}
              simulatedPush={simulatedPush}
              setSimulatedPush={setSimulatedPush}
              showGoogleGuide={showGoogleGuide}
              setShowGoogleGuide={setShowGoogleGuide}
            />
          </React.Suspense>
        )}

        {/* Dynamic Cookie Consent Banner */}
        {isCookieConsentVisible && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 z-45 shadow-2xl animate-fade-in text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-zinc-800/80 rounded-xl text-sm shrink-0 select-none">🍪</span>
                <div className="space-y-1">
                  <strong className="block text-[13px] font-bold text-zinc-50 tracking-tight leading-tight">Persetujuan Cookies & Privasi</strong>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    Kami menggunakan cookies esensial untuk menyimpan sesi obrolan Anda dan meningkatkan keandalan navigasi di Maria AI. Kakak dapat membaca selengkapnya pada draf <button type="button" onClick={() => setIsCookieModalOpenFromBanner(true)} className="text-blue-400 hover:text-blue-300 underline font-bold cursor-pointer transition-colors decoration-blue-400/40 hover:decoration-blue-300">Kebijakan Cookies</button> kami.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("maria_cookie_consent_level", "essential");
                    localStorage.setItem("maria_cookie_consent", "true");
                    setIsCookieConsentVisible(false);
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10.5px] font-medium cursor-pointer transition-colors"
                >
                  Hanya Esensial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("maria_cookie_consent_level", "all");
                    localStorage.setItem("maria_cookie_consent", "true");
                    setIsCookieConsentVisible(false);
                  }}
                  className={`px-4.5 py-1.5 ${
                    settings.theme === "emerald-green" ? "bg-emerald-600 hover:bg-emerald-700" :
                    settings.theme === "cosmic-purple" ? "bg-purple-600 hover:bg-purple-700" :
                    settings.theme === "minimal-dark" ? "bg-zinc-700 hover:bg-zinc-600" :
                    "bg-blue-600 hover:bg-blue-700"
                  } text-white rounded-xl text-[10.5px] font-bold cursor-pointer transition-colors shadow-md`}
                >
                  Terima Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cookie Policy Modal linked from Banner */}
        <React.Suspense fallback={null}>
          <CookiePolicyModal 
            isOpen={isCookieModalOpenFromBanner} 
            onClose={() => setIsCookieModalOpenFromBanner(false)}
            accentClass={
              settings.theme === "emerald-green" ? "text-emerald-400" :
              settings.theme === "cosmic-purple" ? "text-purple-400" :
              settings.theme === "minimal-dark" ? "text-zinc-300" :
              "text-blue-400"
            }
            accentBgClass={
              settings.theme === "emerald-green" ? "bg-emerald-600 hover:bg-emerald-700" :
              settings.theme === "cosmic-purple" ? "bg-purple-600 hover:bg-purple-700" :
              settings.theme === "minimal-dark" ? "bg-zinc-700 hover:bg-zinc-600" :
              "bg-blue-600 hover:bg-blue-700"
            }
          />
        </React.Suspense>

      </div>
    </div>
  );
}
