import React, { useState, useEffect } from "react";
import { Message, UserSettings, AppNotification, ChatThread, AppTheme } from "./types";
import { DEFAULT_SETTINGS, THEME_OPTIONS } from "./constants";
import { generateSpeech, playAudioBlob } from "./services/elevenLabsService";
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

// Static imports for primary main-screen components to avoid lazy-loading network handshakes and CLS
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
const SettingsDashboard = React.lazy(() => import("./components/SettingsDashboard"));
const DiscoverArea = React.lazy(() => import("./components/DiscoverArea"));
const LibraryArea = React.lazy(() => import("./components/LibraryArea"));
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

  const [authMethod, setAuthMethod] = useState<"google" | "email" | "anon" | "firebase">("google");
  const [showGoogleGuide, setShowGoogleGuide] = useState<boolean>(false);
  
  // States for Custom Firebase SDK Configuration
  const [customFirebaseJson, setCustomFirebaseJson] = useState("");
  const [isCustomFirebaseSaved, setIsCustomFirebaseSaved] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("maria_custom_firebase_config");
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("maria_custom_firebase_config");
      if (saved) {
        try {
          setCustomFirebaseJson(JSON.stringify(JSON.parse(saved), null, 2));
        } catch {
          setCustomFirebaseJson(saved);
        }
      } else {
        const template = {
          apiKey: "SALIN_API_KEY_ANDA_DI_SINI",
          authDomain: "PROJECT_ID.firebaseapp.com",
          projectId: "PROJECT_ID",
          storageBucket: "PROJECT_ID.firebasestorage.app",
          messagingSenderId: "SENDER_ID",
          appId: "APP_ID",
          firestoreDatabaseId: ""
        };
        setCustomFirebaseJson(JSON.stringify(template, null, 2));
      }
    }
  }, [authMethod]);
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
      
      const isApiKeyError = (err.message || "").toLowerCase().includes("api-key-not-valid") || 
                           (err.message || "").toLowerCase().includes("api key not valid") ||
                           (err.message || "").toLowerCase().includes("invalid-api-key");
      if (isApiKeyError) {
        localStorage.removeItem("maria_custom_firebase_config");
        handleAddSystemNotification(
          "Koneksi Dipulihkan",
          "Kunci Firebase kustom tidak valid. Menyetel ulang konfigurasi ke server default...",
          "success"
        );
        setTimeout(() => {
          window.location.reload();
        }, 2500);
        return;
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
      const isApiKeyError = (err.message || "").toLowerCase().includes("api-key-not-valid") || 
                           (err.message || "").toLowerCase().includes("api key not valid") ||
                           (err.message || "").toLowerCase().includes("invalid-api-key");
      if (isApiKeyError) {
        localStorage.removeItem("maria_custom_firebase_config");
        handleAddSystemNotification(
          "Koneksi Dipulihkan",
          "Konfigurasi Firebase custom Anda tidak valid. Mengembalikan server aslinya...",
          "success"
        );
        setTimeout(() => {
          window.location.reload();
        }, 2500);
        return;
      }
      setAuthLocalError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Custom Firebase configuration handlers
  const handleSaveCustomFirebase = () => {
    if (!customFirebaseJson.trim()) {
      setAuthLocalError("Teks JSON pengaturan tidak boleh kosong.");
      return;
    }
    try {
      const parsed = JSON.parse(customFirebaseJson);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error("Objek JSON wajib menyertakan 'apiKey' dan 'projectId'.");
      }
      localStorage.setItem("maria_custom_firebase_config", JSON.stringify(parsed, null, 2));
      setIsCustomFirebaseSaved(true);
      setAuthLocalError(null);
      handleAddSystemNotification(
        "Kredensial SDK Diubah",
        "Firebase SDK custom berhasil disimpan! Mereload halaman dalam hitungan detik...",
        "success"
      );
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setAuthLocalError("JSON Tidak Sah: " + (err.message || String(err)));
    }
  };

  const handleResetCustomFirebase = () => {
    localStorage.removeItem("maria_custom_firebase_config");
    setIsCustomFirebaseSaved(false);
    setAuthLocalError(null);
    handleAddSystemNotification(
      "Kredensial Diatur Ulang",
      "Kembali memuat konfigurasi server bawaan Google AI Studio...",
      "success"
    );
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>(() => {
    return localStorage.getItem("elevenlabs_api_key") || (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "";
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const speakMessage = (text: string) => {
    const keyToUse = elevenlabsApiKey.trim() || (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "";
    if (!keyToUse || !text) return;
    setIsPlayingAudio(true);
    generateSpeech(text, keyToUse)
      .then(playAudioBlob)
      .then(() => setIsPlayingAudio(false))
      .catch((err) => {
        console.error("Gagal memutar audio dari ElevenLabs:", err);
        setIsPlayingAudio(false);
        handleAddSystemNotification(
          "Gangguan Suara",
          "Gagal memutar suara dari ElevenLabs. Cek kecocokan API Key Anda.",
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
  const [profileDisplayName, setProfileDisplayName] = useState("User");
  const [profileUsername, setProfileUsername] = useState("@user");
  const [profileAvatarBg, setProfileAvatarBg] = useState("bg-[#064e3b]"); // premium deep green bg
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [profileUseInitials, setProfileUseInitials] = useState(true);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80");

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
  const [activeView, setActiveView] = useState<"chat" | "library" | "discover">("chat");
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
    const timer = setInterval(checkExpiry, 5000); // Check every 5 seconds
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
        if (err.code && err.code !== "auth/redirect-cancelled-by-user") {
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
      const user = result.user;
      setProfileDisplayName(user.displayName || "User");
      setProfileUsername("@" + (user.email?.split("@")[0] || "user"));
      setIsLoggedIn(true);
      setIsProfileOpen(false);
      handleAddSystemNotification(
        "Selamat Datang",
        `Hai ${user.displayName || "User"}, Anda sukses masuk ke asisten pintar!`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
      let message = err.message || String(err);
      if (err.code === "auth/popup-blocked") {
        message = "Pop-up diblokir. Silakan aktifkan popup untuk situs ini atau gunakan metode Redirect di bawah.";
        setIsProfileOpen(true);
      } else if (err.code === "auth/unauthorized-domain") {
        message = `Gagal: Domain '${window.location.hostname}' belum diizinkan oleh Firebase Console Anda.`;
        setIsProfileOpen(true);
      }
      
      const isApiKeyError = (err.message || "").toLowerCase().includes("api-key-not-valid") || 
                           (err.message || "").toLowerCase().includes("api key not valid") ||
                           (err.message || "").toLowerCase().includes("invalid-api-key");
      if (isApiKeyError) {
        localStorage.removeItem("maria_custom_firebase_config");
        handleAddSystemNotification(
          "Konfigurasi Diperbarui",
          "Modul kustom tidak cocok. Sistem otomatis mengembalikan konfigurasi hosting default. Silakan memuat ulang.",
          "success"
        );
        setTimeout(() => { window.location.reload(); }, 2500);
        return;
      }
      setAuthLocalError(message);
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
              avatarUrl: user.photoURL || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&h=150&fit=crop&q=80",
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
          feedback: msgData.feedback || null
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
  const handleSendMessage = async (text: string, image?: string, audio?: string) => {
    if (isLoading) return;

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
      ...(image ? { image } : {}),
      ...(audio ? { audio } : {}),
    };

    const postMessages = [...messages, userMsg];

    if (isLoggedIn && auth.currentUser) {
      await setDoc(doc(db, "threads", currentThreadId, "messages", userMsg.id), {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        timestamp: userMsg.timestamp,
        isError: false,
        isEdited: false,
        feedback: null
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${currentThreadId}/messages/${userMsg.id}`));
    } else {
      setMessages(postMessages);
    }

    setIsLoading(true);

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
        } else {
          setMessages((prev) => [...prev, assistantMsg]);
        }
        
        // Speak message using ElevenLabs Text-to-Speech
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
        } else {
          setMessages((prev) => [...prev, errorMsg]);
        }
        
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
      } else {
        setMessages((prev) => [...prev, errorMsg]);
      }

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

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

    // Slice history up to that point
    const precedingMessages = messages.slice(0, msgIdx);
    if (precedingMessages.length === 0) return;

    if (isLoggedIn && auth.currentUser && activeThreadId) {
      // Delete any Firestore messages from msgIdx onwards
      const messagesToDelete = messages.slice(msgIdx);
      for (const m of messagesToDelete) {
        await deleteDoc(doc(db, "threads", activeThreadId, "messages", m.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `threads/${activeThreadId}/messages/${m.id}`));
      }
    } else {
      setMessages(precedingMessages);
    }

    setIsLoading(true);

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
        } else {
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Speak message using ElevenLabs Text-to-Speech
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
        } else {
          setMessages((prev) => [...prev, errorMsg]);
        }
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
      } else {
        setMessages((prev) => [...prev, errorMsg]);
      }
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

    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

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
        feedback: null
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `threads/${activeThreadId}/messages/${updatedUserMsg.id}`));
    } else {
      setMessages(nextMessages);
    }

    setIsLoading(true);

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
        } else {
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Speak message using ElevenLabs Text-to-Speech
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
        } else {
          setMessages((prev) => [...prev, errorMsg]);
        }
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
      } else {
        setMessages((prev) => [...prev, errorMsg]);
      }
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
    
    if (activeThreadId === threadToDeleteId) {
      setActiveThreadId("");
      setMessages([]);
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

    setMessages([]);
    setThreads([]);
    setActiveThreadId("");
    
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
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-slate-50 text-slate-700 select-none">
      
      {/* Main Layout Container */}
      <div className="flex-grow flex overflow-hidden relative">
        
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
                onSelectAgent={handleSelectAgent}
                onUsePrompt={handleUsePromptFormula}
                onExit={() => setActiveView("chat")}
              />
            </React.Suspense>
          )}
        </main>

        {/* Universal Settings Modal (ChatGPT Centered Dark Dialog) */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark Backdrop overlay with subtle blur */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Modal centerpiece card container */}
            <div className="relative w-full max-w-xl md:max-w-2xl bg-[#171717] rounded-3xl border border-zinc-850 shadow-2xl h-[85vh] max-h-[640px] flex flex-col overflow-hidden animate-fade-in z-55">
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
                />
              </React.Suspense>
            </div>
          </div>
        )}

        {/* Custom Edit Profile Modal (Beautiful Centered Dark Dialog matching Screenshot 2) */}
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => {
                setIsProfileOpen(false);
                setShowColorSelector(false);
              }}
            />
            
            {/* Modal centerpiece container */}
            <div className="relative w-full max-w-[380px] bg-[#1e222b] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fade-in z-55 text-slate-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-sans font-semibold text-white text-[15px]">
                  {isLoggedIn ? "Edit profil" : "Masuk ke Akun"}
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsProfileOpen(false);
                    setShowColorSelector(false);
                  }} 
                  className="p-1 rounded-full text-slate-305 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoggedIn ? (
                <>
                  {/* Modal Body */}
                  <div className="p-4 pt-1 flex flex-col items-center space-y-4">
                    
                    {/* File Input for uploading custom image */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleProfileImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    {/* Large Circle Avatar or Initials with Camera Button */}
                    <div className="relative mt-2">
                      {profileUseInitials ? (
                        <div className={`w-[84px] h-[84px] rounded-full ${profileAvatarBg} flex items-center justify-center border border-slate-700 shadow-lg text-white font-bold text-2xl select-none transition-all duration-350`}>
                          {(() => {
                            const name = profileDisplayName || "basit fauzan";
                            const parts = name.trim().split(/\s+/);
                            if (parts.length === 0 || !parts[0]) return "P";
                            if (parts.length === 1) return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
                            return (parts[0][0] + parts[1][0]).toUpperCase();
                          })()}
                        </div>
                      ) : (
                        <div className="w-[84px] h-[84px] rounded-full overflow-hidden border border-slate-705 shadow-lg bg-slate-900 transition-all duration-350 shrink-0">
                          <img 
                            src={profileAvatarUrl} 
                            alt="Preview Foto Profil" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                      
                      {/* Camera Icon Button */}
                      <button
                        type="button"
                        onClick={() => setShowColorSelector(!showColorSelector)}
                        className="absolute bottom-0 right-0 w-[28px] h-[28px] rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center shadow-md border border-slate-600 cursor-pointer active:scale-95 transition-all"
                        title="Ubah Foto / Warna Latar"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                        </svg>
                      </button>

                      {/* Dynamic Color & Image Popover */}
                      {showColorSelector && (
                        <div className="absolute top-[92px] left-1/2 transform -translate-x-1/2 bg-[#171a21] border border-slate-800 rounded-xl p-3.5 z-55 shadow-2xl w-[260px] animate-fade-in space-y-3.5">
                          
                          {/* Section 1: Upload Photo & Presets */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block font-sans text-left pl-0.5">FOTO PROFIL</span>
                            
                            {/* Custom File Upload Button */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Unggah Foto Profil
                            </button>

                            {/* Preset Avatars Row */}
                            <div className="grid grid-cols-6 gap-1.5 pt-1">
                              {[
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=100&h=100&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80"
                              ].map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setProfileAvatarUrl(url);
                                    setProfileUseInitials(false);
                                    setShowColorSelector(false);
                                  }}
                                  className="w-7.5 h-7.5 rounded-full overflow-hidden border border-slate-700 hover:border-emerald-500 hover:scale-110 active:scale-95 transition-all shrink-0 cursor-pointer bg-slate-950"
                                  title={`Preset ${idx + 1}`}
                                >
                                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Section 2: Initials Colored Background Palette */}
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-800/60">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block font-sans text-left pl-0.5">WARNA INISIAL</span>
                            <div className="grid grid-cols-4 gap-1.5 justify-items-center">
                              {[
                                { bg: "bg-[#064e3b]", name: "Deep Emerald" },
                                { bg: "bg-[#1e3a8a]", name: "Deep Blue" },
                                { bg: "bg-[#581c87]", name: "Deep Purple" },
                                { bg: "bg-[#881337]", name: "Deep Rose" },
                                { bg: "bg-[#78350f]", name: "Deep Amber" },
                                { bg: "bg-[#164e63]", name: "Deep Cyan" },
                                { bg: "bg-[#831843]", name: "Deep Pink" },
                                { bg: "bg-[#1e293b]", name: "Deep Slate" }
                              ].map((c) => (
                                <button
                                  key={c.bg}
                                  type="button"
                                  onClick={() => {
                                    setProfileAvatarBg(c.bg);
                                    setProfileUseInitials(true);
                                    setShowColorSelector(false);
                                  }}
                                  className={`w-5.5 h-5.5 rounded-full ${c.bg} hover:scale-110 active:scale-90 transition-all border border-white/10 shrink-0 cursor-pointer`}
                                  title={c.name}
                                  aria-label={`Ubah warna profil ke ${c.name}`}
                                />
                              ))}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Form Fields exactly matching Screenshot 2 */}
                    <div className="w-full space-y-3.5 pt-1">
                      
                      {/* Nama tampilan */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                          Nama tampilan
                        </label>
                        <input
                          type="text"
                          value={profileDisplayName}
                          onChange={(e) => setProfileDisplayName(e.target.value)}
                          className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-[12.5px] focus:outline-hidden transition-all placeholder-slate-500 font-medium"
                          placeholder="basit fauzan"
                        />
                      </div>

                      {/* Nama pengguna */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                          Nama pengguna
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profileUsername.startsWith("@") ? profileUsername.slice(1) : profileUsername}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, ""); // strip bad chars for username
                              setProfileUsername("@" + val);
                            }}
                            className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl pl-7 pr-3.5 py-2.5 text-white text-[12.5px] focus:outline-hidden transition-all placeholder-slate-500 font-medium font-sans"
                            placeholder="basitfauzan42"
                          />
                          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 text-[12.5px] font-medium pointer-events-none">
                            @
                          </span>
                        </div>
                      </div>

                      {/* Alamat Email */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                          Alamat Email
                        </label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={auth.currentUser?.email || "user@example.com"}
                          className="w-full bg-[#12151b] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-400 text-[12.5px] cursor-not-allowed font-medium font-sans select-all"
                        />
                      </div>

                      {/* Kunci API ElevenLabs (Text-to-Speech) */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center pr-1">
                          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                            ElevenLabs API Key
                          </label>
                          <span className="text-[9.5px] font-sans font-medium text-slate-400 italic">
                            Untuk Suara Maria AI
                          </span>
                        </div>
                        <input
                          type="password"
                          value={elevenlabsApiKey}
                          onChange={(e) => setElevenlabsApiKey(e.target.value)}
                          placeholder="xi-api-key..."
                          className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-[12.5px] focus:outline-hidden transition-all placeholder-slate-600 font-mono"
                        />
                      </div>

                      {/* Note about group chats */}
                      <p className="text-[10.5px] text-slate-300 font-medium leading-normal pl-0.5 pt-0.5 select-none font-sans">
                        Profil Anda membantu orang mengenali Anda di obrolan grup.
                      </p>
                    </div>
                  </div>

                   {/* Modal Footer Buttons */}
                  <div className="flex items-center justify-end gap-2.5 p-4 pt-1.5 pb-4 font-bold text-[11px]">
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut(auth).catch(() => {});
                        setIsLoggedIn(false);
                        setIsProfileOpen(false);
                        setShowColorSelector(false);
                        handleAddSystemNotification(
                          "Keluar Akun",
                          "Anda telah keluar ke akun tamu (user).",
                          "info"
                        );
                      }}
                      className="mr-auto px-3.5 py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all font-semibold cursor-pointer"
                    >
                      Keluar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setShowColorSelector(false);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-300 hover:text-white transition-all cursor-pointer font-semibold"
                    >
                      Batalkan
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const finalDisplayName = profileDisplayName.trim() || "basit fauzan";
                        const finalUsername = profileUsername.trim() || "@basitfauzan42";
                        
                        // 1. Save settings
                        const updatedSettings: UserSettings = {
                          ...settings,
                          username: finalDisplayName
                        };
                        setSettings(updatedSettings);

                        // Save ElevenLabs API Key in localStorage
                        if (elevenlabsApiKey.trim()) {
                          localStorage.setItem("elevenlabs_api_key", elevenlabsApiKey.trim());
                        } else {
                          localStorage.removeItem("elevenlabs_api_key");
                        }

                        if (isLoggedIn && auth.currentUser) {
                          const userRef = doc(db, "users", auth.currentUser.uid);
                          await updateDoc(userRef, {
                            displayName: finalDisplayName,
                            username: finalUsername,
                            avatarUrl: profileAvatarUrl,
                            settings: updatedSettings
                          }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
                        }

                        // Hide modal
                        setIsProfileOpen(false);
                        setShowColorSelector(false);

                        // Toast success message
                        handleAddSystemNotification(
                          "Profil Diperbarui",
                          `Profil Anda diubah menjadi ${finalDisplayName} (${finalUsername}).`,
                          "success"
                        );
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-5 flex flex-col space-y-4.5 w-full items-center text-center">
                    
                    {/* Official colored Google Icon as in image tab / screenshot */}
                    <div className="w-13 h-13 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-slate-200 shrink-0 select-none mt-2">
                      <svg className="w-7.5 h-7.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                    </div>

                    <div className="space-y-1.5 max-w-[280px] select-none">
                      <h4 className="font-sans font-extrabold text-white text-[14.5px] tracking-tight">
                        Login Resmi Google Account
                      </h4>
                      <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed font-sans">
                        Otorisasikan sesi obrolan Anda penuh dengan integrasi Firestore Cloud Database Google.
                      </p>
                    </div>

                    {/* Button exactly like Image 3 */}
                    <div className="w-full flex flex-col gap-3.5 items-center justify-center pt-2">
                      <button
                        type="button"
                        disabled={isAuthenticating}
                        onClick={handleGoogleSignInDirect}
                        className="w-full max-w-[280px] h-11 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13px] font-sans font-medium border border-[#cbd5e1] hover:border-[#94a3b8] rounded-lg transition-all shadow-md active:scale-975 cursor-pointer disabled:opacity-50"
                      >
                        <div className="w-[18px] h-[18px] select-none shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <span>Sign in with Google</span>
                      </button>

                      {/* Redirect alternative exactly as backup strategy */}
                      <button
                        type="button"
                        disabled={isAuthenticating}
                        onClick={async () => {
                          setAuthLocalError(null);
                          setIsAuthenticating(true);
                          try {
                            await signInWithRedirect(auth, googleProvider);
                          } catch (err: any) {
                            console.error(err);
                            let message = err.message || String(err);
                            if (err.code === "auth/unauthorized-domain") {
                              message = `Gagal: Domain '${window.location.hostname}' belum diizinkan oleh Firebase Console Anda.`;
                            }
                            setAuthLocalError(message);
                            setIsAuthenticating(false);
                          }
                        }}
                        className="w-full max-w-[280px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-755 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-975 cursor-pointer disabled:opacity-50 text-[11px]"
                      >
                        <span>Metode Pengalihan (Redirect)</span>
                      </button>
                    </div>

                    {/* Loader */}
                    {isAuthenticating && (
                      <div className="text-[10.5px] text-emerald-400 font-bold py-1 select-none flex items-center justify-center gap-2 animate-pulse mt-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghubungkan ke Google Auth...</span>
                      </div>
                    )}

                    {/* Pop-up and domain blocker helpers directly underneath */}
                    {authLocalError && (
                      <div className="w-full p-3 bg-rose-950/20 border border-rose-950/40 rounded-xl text-[10.5px] text-rose-300 flex flex-col gap-2 items-start text-left leading-relaxed">
                        <div className="flex gap-2 items-start font-medium">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                          <span>{authLocalError}</span>
                        </div>
                        
                        {(authLocalError.toLowerCase().includes("pop-up") || 
                          authLocalError.toLowerCase().includes("popup")) && (
                          <div className="mt-1 pt-2 border-t border-rose-900/30 w-full space-y-2 text-[10px] text-slate-350">
                            <p className="font-extrabold text-amber-400 flex items-center gap-1 text-[10.5px]">
                              💡 Solusi Cepat Pop-up Diblokir:
                            </p>
                            <p>
                              Platform editor preview membatasi pop-up browser secara default demi keamanan.
                            </p>
                            <div className="grid grid-cols-1 gap-2 mt-2 w-full font-bold">
                              <button
                                type="button"
                                onClick={async () => {
                                  setAuthLocalError(null);
                                  setIsAuthenticating(true);
                                  try {
                                    await signInWithRedirect(auth, googleProvider);
                                  } catch (err: any) {
                                    console.error(err);
                                    let message = "Gagal mengalihkan: " + (err.message || String(err));
                                    if (err.code === "auth/unauthorized-domain") {
                                      message = "Domain '" + window.location.hostname + "' belum diotorisasi di Firebase Console.";
                                    }
                                    setAuthLocalError(message);
                                    setIsAuthenticating(false);
                                  }
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-850 border border-emerald-500/30 text-emerald-400 py-2 px-3 rounded-lg transition-all text-center cursor-pointer text-[10px]"
                              >
                                🔄 Jalankan Metode Pengalihan (Redirect)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Setup / domain helper guide dropdown */}
                    <div className="w-full max-w-[280px] border border-slate-800/80 rounded-xl bg-[#0b0d10]/40 text-left overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowGoogleGuide(!showGoogleGuide)}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-800/20 transition-colors text-slate-400 hover:text-white"
                      >
                        <div className="flex items-center gap-1.5 font-sans font-bold text-[10px]">
                          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Mengapa Google Login Gagal?</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showGoogleGuide ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showGoogleGuide && (
                        <div className="p-3 border-t border-slate-900 bg-slate-950/40 space-y-2.5 text-[9.5px] text-slate-350 leading-relaxed font-sans max-h-[140px] overflow-y-auto select-text">
                          <div>
                            <p className="font-bold text-slate-205">1. Domain Belum Diotorisasi</p>
                            <p className="text-slate-405 mt-0.5">
                              Daftarkan domain kontainer ini di Authentication Settings Firebase Console Anda:
                            </p>
                            <code className="block mt-1 p-1.5 bg-slate-900 text-emerald-400 rounded-sm text-center font-mono text-[8.5px] select-all">
                              {window.location.hostname}
                            </code>
                          </div>
                          <div className="border-t border-slate-900 pt-2">
                            <p className="font-bold text-slate-205">2. Provider Google Tidak Aktif</p>
                            <p className="text-slate-405 mt-0.5">
                              Pastikan tab <strong>Google</strong> diaktifkan di Firebase Console &gt; Authentication &gt; Sign-in method.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Iframe Warnings */}
                    {isIframe && (
                      <div className="w-full max-w-[280px] p-3 bg-teal-950/20 border border-teal-500/10 rounded-xl text-[9.5px] text-teal-350 text-left space-y-2 leading-relaxed font-sans">
                        <p>
                          💡 Anda berada dalam viewport frame editor preview. Jalankan di Tab Baru agar Google Sign-In bebas hambatan:
                        </p>
                        <button
                          type="button"
                          onClick={() => { window.open(window.location.href, "_blank"); }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          🚀 Buka Aplikasi di Tab Baru
                        </button>
                      </div>
                    )}

                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal: Delete Chat Thread */}
        {threadToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setThreadToDeleteId(null)}
            />
            {/* Modal Card */}
            <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in z-55 text-slate-100">
              <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
                Hapus percakapan?
              </h3>
              <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus percakapan <span className="font-semibold text-slate-200">"{(threads.find(t => t.id === threadToDeleteId))?.title || "Percakapan"}"</span> secara permanen dari riwayat Anda? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex items-center justify-end gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setThreadToDeleteId(null)}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeDeleteThread}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-950/20 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal: Clear All History */}
        {isClearingAllHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsClearingAllHistory(false)}
            />
            {/* Modal Card */}
            <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in z-55 text-slate-100">
               <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
                Hapus riwayat obrolan?
              </h3>
              <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed flex-col select-text">
                Tindakan ini akan menghapus habis seluruh percakapan yang tersimpan dengan asisten Maria secara permanen dari perangkat ini. Apakah Anda ingin melanjutkan?
              </p>
              <div className="flex items-center justify-end gap-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsClearingAllHistory(false)}
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeClearHistory}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-950/20 active:scale-95 transition-all cursor-pointer font-semibold"
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== SIMULATION CENTER: DISPATCHERS ===================== */}
        
        {/* Real-time Email Simulation Drawer Overlay */}
        {simulatedEmail && simulatedEmail.shown && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Blurred Backdrop */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
              onClick={() => setSimulatedEmail(null)}
            />
            
            {/* Simulated Desktop Email Hub Case */}
            <div className="relative w-full max-w-2xl bg-[#0f1115] border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-fade-in z-[105]">
              {/* Mail Application Header Layout */}
              <div className="px-5 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Inbox className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-white tracking-tight leading-none">Simulasi Inbox Email</h4>
                    <span className="text-[10px] text-zinc-450 mt-1 block">Maria AI Delivery Simulator v1.0</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSimulatedEmail(null)}
                  className="p-1 px-2 rounded-lg bg-slate-800/80 text-zinc-400 hover:text-white text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Tutup Simulator
                </button>
              </div>

              {/* Email Envelope Attributes */}
              <div className="p-5 bg-[#141822] border-b border-slate-800/65 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Dari:</span>
                  <span className="font-mono text-zinc-400">Maria AI &lt;assistant@maria.ai&gt;</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Kepada:</span>
                  <span className="font-mono text-zinc-200 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    basitfauzan42@gmail.com
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300">Kategori:</span>
                  <span className="font-mono text-zinc-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                    {simulatedEmail.category}
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-zinc-400 mr-2 font-semibold">Subjek:</span>
                  <span className="text-zinc-100 font-bold select-text text-xs">{simulatedEmail.subject}</span>
                </div>
              </div>

              {/* HTML Simulated Email Styled Template Container */}
              <div className="p-6 overflow-y-auto bg-slate-900/40 divide-y divide-slate-800">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-md max-w-xl mx-auto space-y-4">
                  {/* Brand logo banner */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-display font-extrabold text-[12px] tracking-widest text-emerald-400 uppercase">MARIA AI</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Notifikasi Otomatis</span>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium text-emerald-300">
                      Halo Kak {isLoggedIn ? (profileDisplayName || settings.username || "User") : "User"},
                    </p>
                    
                    <div className="p-4 bg-slate-900 border border-slate-800/40 rounded-xl text-[11px] text-zinc-200 select-text leading-relaxed">
                      {simulatedEmail.body}
                    </div>

                    <p className="text-[10px] text-zinc-450 leading-relaxed">
                      Simulasi email ini dikirimkan karena jenis notifikasi pintar di atas disetel ke opsi pengiriman <span className="text-emerald-400 font-semibold">Email</span> di halaman pengaturan Anda.
                    </p>
                  </div>

                  {/* Operational Action CTA */}
                  <div className="pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500 font-mono">ID Pengiriman: MAIL-{Date.now().toString().slice(-6)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedEmail(null);
                        setIsSettingsOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shrink-0"
                    >
                      Buka Asisten Maria
                    </button>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-[9px] text-zinc-500">
                    Ini adalah simulasi surel offline. Email asli akan dikirimkan lewat cloud mail service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Web Push notification toast overlay (slides into screen on top right) */}
        {simulatedPush && simulatedPush.shown && (
          <div className="fixed top-4 right-4 z-[9999] w-80 max-w-sm bg-zinc-950/95 border border-[#333333] shadow-2xl rounded-2xl p-4 overflow-hidden animate-slide-in-right text-zinc-100 flex flex-col gap-2.5">
            {/* Browser push design wrapper */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-[10px] text-zinc-300 font-bold tracking-tight">Maria AI Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 font-mono">Sekarang</span>
                <button
                  type="button"
                  onClick={() => setSimulatedPush(null)}
                  className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-805 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Notification payload content */}
            <div className="space-y-0.5 select-text">
              <h5 className="text-[11px] font-bold text-white tracking-tight">{simulatedPush.title}</h5>
              <p className="text-[10px] text-zinc-400 leading-normal font-medium">{simulatedPush.body}</p>
            </div>

            {/* Action Buttons inside notification toast */}
            <div className="flex items-center gap-1.5 border-t border-zinc-900/60 pt-2 mt-0.5">
              <button
                type="button"
                onClick={() => {
                  setSimulatedPush(null);
                  setIsSettingsOpen(false);
                }}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg p-1.5 text-[9px] font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <span>Buka Chat</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => setSimulatedPush(null)}
                className="flex-1 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg p-1.5 text-[9px] font-bold cursor-pointer transition-all text-center"
              >
                Tolak
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
