import React, { useRef, useEffect } from "react";
import { X, AlertCircle, Inbox, Bell, ChevronRight, ChevronDown, Info, RefreshCw } from "lucide-react";
import { UserSettings } from "../types";
import { doc, updateDoc } from "firebase/firestore";
import { signOut, signInWithRedirect, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, db, googleProvider, OperationType, handleFirestoreError, setSimulatedAuthActive, isSimulatedAuthActive } from "../firebase";

interface AuxiliaryModalsProps {
  // Profile settings
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  showColorSelector: boolean;
  setShowColorSelector: (show: boolean) => void;
  profileUseInitials: boolean;
  setProfileUseInitials: (use: boolean) => void;
  profileAvatarBg: string;
  setProfileAvatarBg: (bg: string) => void;
  profileDisplayName: string;
  setProfileDisplayName: (name: string) => void;
  profileAvatarUrl: string;
  setProfileAvatarUrl: (url: string) => void;
  profileUsername: string;
  setProfileUsername: (username: string) => void;
  isSignUpMode: boolean;
  setIsSignUpMode: (signUp: boolean) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (pw: string) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (auth: boolean) => void;
  authLocalError: string | null;
  setAuthLocalError: (err: string | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  
  // App context
  settings: UserSettings;
  setSettings: (s: UserSettings) => void;
  isIframe: boolean;
  handleAddSystemNotification: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
  setIsSettingsOpen: (open: boolean) => void;
  
  // Auth helper callbacks from App.tsx
  handleEmailAuthSubmit: (e: React.FormEvent) => void;
  handleAnonymousAuthSubmit: () => void;
  handleProfileImageUploadWrapper: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Delete thread
  threadToDeleteId: string | null;
  setThreadToDeleteId: (id: string | null) => void;
  threads: any[];
  executeDeleteThread: () => void;
  
  // Clear history
  isClearingAllHistory: boolean;
  setIsClearingAllHistory: (clearing: boolean) => void;
  executeClearHistory: () => void;
  
  // Simulations
  simulatedEmail: any;
  setSimulatedEmail: (email: any) => void;
  simulatedPush: any;
  setSimulatedPush: (push: any) => void;
  showGoogleGuide: boolean;
  setShowGoogleGuide: (show: boolean) => void;
}

export default function AuxiliaryModals({
  isProfileOpen,
  setIsProfileOpen,
  showColorSelector,
  setShowColorSelector,
  profileUseInitials,
  setProfileUseInitials,
  profileAvatarBg,
  setProfileAvatarBg,
  profileDisplayName,
  setProfileDisplayName,
  profileAvatarUrl,
  setProfileAvatarUrl,
  profileUsername,
  setProfileUsername,
  isSignUpMode,
  setIsSignUpMode,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  isAuthenticating,
  setIsAuthenticating,
  authLocalError,
  setAuthLocalError,
  isLoggedIn,
  setIsLoggedIn,
  
  settings,
  setSettings,
  isIframe,
  handleAddSystemNotification,
  setIsSettingsOpen,
  
  handleEmailAuthSubmit,
  handleAnonymousAuthSubmit,
  handleProfileImageUploadWrapper,
  
  threadToDeleteId,
  setThreadToDeleteId,
  threads,
  executeDeleteThread,
  
  isClearingAllHistory,
  setIsClearingAllHistory,
  executeClearHistory,
  
  simulatedEmail,
  setSimulatedEmail,
  simulatedPush,
  setSimulatedPush,
  showGoogleGuide,
  setShowGoogleGuide
}: AuxiliaryModalsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isProfileOpen) {
      setAuthLocalError(null);
      setIsAuthenticating(false);
      setLoginEmail("");
      setLoginPassword("");
    }
  }, [isProfileOpen, setAuthLocalError, setIsAuthenticating, setLoginEmail, setLoginPassword]);

  return (
    <>
      {/* Custom Edit Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 transition-opacity"
            onClick={() => {
              setIsProfileOpen(false);
              setShowColorSelector(false);
            }}
          />
          
          <div className="relative w-full max-w-[380px] bg-[#1e222b] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden z-55 text-slate-200">
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
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoggedIn ? (
              <>
                <div className="p-4 pt-1 flex flex-col items-center space-y-4">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleProfileImageUploadWrapper} 
                    accept="image/*" 
                    className="hidden" 
                  />

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
                      <div className="w-[84px] h-[84px] rounded-full overflow-hidden border border-slate-750 shadow-lg bg-slate-900 transition-all duration-350 shrink-0">
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

                    {showColorSelector && (
                      <div className="absolute top-[92px] left-1/2 transform -translate-x-1/2 bg-[#171a21] border border-slate-800 rounded-xl p-3.5 z-55 shadow-2xl w-[260px] space-y-3.5">
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block font-sans text-left pl-0.5">FOTO PROFIL</span>
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

                          <div className="grid grid-cols-6 gap-1.5 pt-1">
                            {[
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=360&h=360&fit=crop&q=60",
                              "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=360&h=360&fit=crop&q=60",
                              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=360&h=360&fit=crop&q=60",
                              "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=360&h=360&fit=crop&q=60",
                              "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=360&h=360&fit=crop&q=60",
                              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=360&h=360&fit=crop&q=60"
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

                  <div className="w-full space-y-3.5 pt-1">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                        Nama tampilan
                      </label>
                      <input
                        type="text"
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-[12.5px] focus:outline-none transition-all placeholder-slate-500 font-medium font-sans"
                        placeholder="basit fauzan"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                        Nama pengguna
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={profileUsername.startsWith("@") ? profileUsername.slice(1) : profileUsername}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                            setProfileUsername("@" + val);
                          }}
                          className="w-full bg-[#12151b] border border-slate-800 focus:border-emerald-500 rounded-xl pl-7 pr-3.5 py-2.5 text-white text-[12.5px] focus:outline-none transition-all placeholder-slate-500 font-medium font-sans"
                          placeholder="username"
                        />
                        <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 text-[12.5px] font-medium pointer-events-none font-sans">
                          @
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider pl-1 font-sans">
                        Alamat Email
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={auth.currentUser?.email || "contoh@email.com"}
                        className="w-full bg-[#12151b] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-400 text-[12.5px] cursor-not-allowed font-medium font-sans select-all"
                      />
                    </div>

                    <p className="text-[10.5px] text-slate-300 font-medium leading-normal pl-0.5 pt-0.5 select-none font-sans">
                      Profil Anda membantu orang mengenali Anda di obrolan grup.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 p-4 pt-1.5 pb-4 font-bold text-[11px]">
                  <button
                    type="button"
                    onClick={async () => {
                      setSimulatedAuthActive(false);
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
                      const finalDisplayName = profileDisplayName.trim() || "User";
                      const finalUsername = profileUsername.trim() || "@username";
                      
                      const updatedSettings: UserSettings = {
                        ...settings,
                        username: finalDisplayName
                      };
                      setSettings(updatedSettings);

                      if (isLoggedIn && auth.currentUser) {
                        const userRef = doc(db, "users", auth.currentUser.uid);
                        await updateDoc(userRef, {
                          displayName: finalDisplayName,
                          username: finalUsername,
                          avatarUrl: profileAvatarUrl,
                          settings: updatedSettings
                        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`));
                      }

                      setIsProfileOpen(false);
                      setShowColorSelector(false);

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
                <div className="p-5 flex flex-col space-y-4 w-full items-center text-center">
                  <div className="space-y-1.5 max-w-[280px] select-none">
                    <h4 className="font-sans font-extrabold text-white text-[14.5px] tracking-tight">
                      {isSignUpMode ? "Buat Akun Maria-ai" : "Masuk ke Maria-ai"}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans">
                      {isSignUpMode 
                        ? "Daftarkan email Anda untuk menyimpan riwayat obrolan dan preferensi asisten."
                        : "Gunakan kredensial akun Anda atau asuransikan sesi dengan metode pengalihan."
                      }
                    </p>
                  </div>

                  <form onSubmit={handleEmailAuthSubmit} className="w-full max-w-[280px] space-y-3 text-left pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 pl-0.5">
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="nama@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[12px] text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-slate-650"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 pl-0.5">
                        Kata Sandi
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Minimal 6 karakter"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[12px] text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-slate-650"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="w-full h-9.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[11.5px] font-sans font-bold rounded-xl transition-all shadow-md active:scale-975 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isAuthenticating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isSignUpMode ? (
                        <span>Daftarkan Akun</span>
                      ) : (
                        <span>Masuk Akun</span>
                      )}
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUpMode(!isSignUpMode);
                          setAuthLocalError(null);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-sans font-semibold transition-colors cursor-pointer"
                      >
                        {isSignUpMode ? "Sudah punya akun? Masuk di sini" : "Belum punya akun? Daftar gratis"}
                      </button>
                    </div>
                  </form>

                  <div className="w-full flex flex-col gap-2.5 items-center justify-center pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans tracking-wide">ATAU LANJUTKAN DENGAN</span>
                  </div>

                  <div className="w-full flex flex-col gap-2.5 items-center justify-center">
                    {/* Google Sign-In via Popup (Solves Google Accounts frame protection rejection) */}
                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={async () => {
                        setAuthLocalError(null);
                        setIsAuthenticating(true);
                        
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                        if (isMobile) {
                          try {
                            await signInWithRedirect(auth, googleProvider);
                          } catch (err: any) {
                            console.error("Redirect sign in error mobile:", err);
                            setAuthLocalError(`Gagal redirect: ${err.message || err}`);
                            setIsAuthenticating(false);
                          }
                          return;
                        }

                        try {
                          const isWebview = /Instagram|FBAV|FBAN|Line|MicroMessenger|TikTok/i.test(navigator.userAgent);
                          if (isWebview) {
                            setAuthLocalError("Error 403: Browser internal aplikasi (seperti Instagram/TikTok) memblokir Login Google. Silakan buka website ini di Safari atau Chrome bawaan HP Anda.");
                            setIsAuthenticating(false);
                            return;
                          }
                          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                          
                          if (isMobile) {
                             await signInWithRedirect(auth, googleProvider);
                             return;
                          }

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

                            handleAddSystemNotification(
                              "Berhasil Masuk Akun",
                              `Selamat datang kembali ${finalDisplayName} @ Maria AI (${finalEmail})!`,
                              "success"
                            );
                          }
                        } catch (err: any) {
                          console.error("Popup sign in error:", err);
                          let message = err.message || String(err);
                          
                          const isCoopOrIframeIssue = 
                            message.includes("Cross-Origin-Opener-Policy") || 
                            err.code === "auth/popup-blocked" ||
                            err.code === "auth/cancelled-popup-request" ||
                            message?.toUpperCase()?.includes("COOP") ||
                            message?.toUpperCase()?.includes("POPUP-BLOCKED") ||
                            message?.toUpperCase()?.includes("CLOSED-BY-USER");

                          if (isCoopOrIframeIssue) {
                            console.log("Coop/Popup blocked, attempting redirect...");
                            try {
                              await signInWithRedirect(auth, googleProvider);
                              return;
                            } catch (redirectErr: any) {
                               message = "Login diblokir. Gunakan Buka di Tab Baru atau Guest Account.";
                            }
                          } else {
                            if (err.code === "auth/unauthorized-domain") {
                              message = `Akses Ditolak: Domain belum didaftarkan di Firebase Console.`;
                            } else if (err.code === "auth/popup-blocked") {
                              message = "Gagal: Jendela pop-up login Google diblokir oleh browser.";
                            } else if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
                              message = "Error 403 Google Oauth atau Login dibatalkan: Jika Anda melihat layar 403, pastikan email tes Anda sudah ditambahkan di Google Cloud OAuth Consent Screen.";
                            } else if (message.includes("403") || message.includes("access_denied")) {
                              message = "Error 403: Pastikan email tes Anda sudah ditambahkan di Google Cloud OAuth Consent Screen (karena ini mode Testing).";
                            }
                          }
                          setAuthLocalError(message);
                          setIsAuthenticating(false);
                        } finally {
                          setIsAuthenticating(false);
                        }
                      }}
                      className="w-full max-w-[280px] h-10 flex items-center justify-center gap-3 bg-[#4285F4] hover:bg-[#357ae8] text-white font-sans font-bold rounded-xl transition-all shadow-md active:scale-975 cursor-pointer disabled:opacity-50 text-[11.5px]"
                    >
                      <div className="w-[18px] h-[18px] flex items-center justify-center bg-white rounded-full select-none shrink-0 p-0.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l3.66-2.82z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.82c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <span>Masuk dengan Google</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={handleAnonymousAuthSubmit}
                      className="w-full max-w-[280px] h-9 border border-dashed border-slate-800 bg-[#0d0f13]/25 hover:bg-slate-800/30 text-slate-400 font-sans font-medium hover:text-white rounded-xl transition-all active:scale-975 cursor-pointer disabled:opacity-50 text-[11px]"
                    >
                      👤 Coba Tanpa Akun (Guest Account)
                    </button>
                  </div>

                  {isAuthenticating && (
                    <div className="text-[10px] text-emerald-400 font-bold py-1 select-none flex items-center justify-center gap-1.5 animate-pulse mt-0.5 font-sans">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Menghubungkan akun Anda...</span>
                    </div>
                  )}

                  {authLocalError && (
                    <div className="w-full p-3 bg-rose-950/20 border border-rose-950/40 rounded-xl text-[10.5px] text-rose-300 flex flex-col gap-2 items-start text-left leading-relaxed">
                      <div className="flex gap-2 items-start font-medium font-sans">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                        <span>{authLocalError}</span>
                      </div>
                      
                      {/* Guide for Google 403 Error */}
                      {String(authLocalError).includes("403") && (
                        <div className="mt-2 text-[10px] text-rose-200/90 font-sans p-2.5 bg-rose-950/30 rounded-lg border border-rose-900/30 w-full">
                          <p className="font-bold mb-1.5 text-rose-100 uppercase tracking-wider text-[9px] flex items-center gap-1">
                            <Info className="w-3 h-3 text-rose-400" /> 
                            SOLUSI PERBAIKAN GOOGLE 403
                          </p>
                          <ul className="list-disc pl-3.5 space-y-1 ml-0.5 opacity-90 marker:text-rose-400">
                            <li>Layar "Error 403" ini muncul <u>dari sistem Google</u>, bukan API Key Firebase yang salah.</li>
                            <li>Aplikasi Anda di Google Cloud Console masih dalam status <b>Testing</b>.</li>
                            <li>Buka <b>Google Cloud Console</b> &rarr; <b>APIs & Services</b> &rarr; <b>OAuth consent screen</b>.</li>
                            <li>Di bagian "Test users", klik <b>+ ADD USERS</b> dan masukkan email Google yang akan Anda gunakan untuk login ini.</li>
                            <li>Atau klik tombol <b>PUBLISH APP</b> (Go to production) di Consent Screen agar bisa digunakan oleh email apa saja.</li>
                          </ul>
                        </div>
                      )}

                      {isIframe && (
                        <button
                          type="button"
                          onClick={() => {
                            window.open(window.location.href, "_blank");
                          }}
                          className="w-full mt-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all text-[9.5px] font-sans flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
                        >
                          <span>🚀 Buka di Tab Baru Sekarang</span>
                        </button>
                      )}
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
          <div 
            className="fixed inset-0 bg-slate-950/80 transition-opacity"
            onClick={() => setThreadToDeleteId(null)}
          />
          <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl z-55 text-slate-100">
            <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
              Hapus percakapan?
            </h3>
            <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed font-sans">
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
          <div 
            className="fixed inset-0 bg-slate-950/80 transition-opacity"
            onClick={() => setIsClearingAllHistory(false)}
          />
          <div className="relative bg-[#1e222b] border border-slate-800/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl z-55 text-slate-100">
             <h3 className="font-display font-medium text-white tracking-tight mb-2 text-base">
              Hapus riwayat obrolan?
            </h3>
            <p className="text-xs text-slate-350 font-medium mb-6 leading-relaxed select-text font-sans">
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

      {/* Real-time Email Simulation Drawer Overlay */}
      {simulatedEmail && simulatedEmail.shown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/90 transition-opacity"
            onClick={() => setSimulatedEmail(null)}
          />
          
          <div className="relative w-full max-w-2xl bg-[#0f1115] border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] z-[105]">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-white tracking-tight leading-none font-sans">Simulasi Inbox Email</h4>
                  <span className="text-[10px] text-zinc-400 mt-1 block font-sans">Maria AI Delivery Simulator v1.0</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setSimulatedEmail(null)}
                className="p-1 px-2 rounded-lg bg-slate-800/80 text-zinc-400 hover:text-white text-[10px] font-bold cursor-pointer transition-colors font-sans"
              >
                Tutup Simulator
              </button>
            </div>

            <div className="p-5 bg-[#141822] border-b border-slate-800/65 space-y-2 text-[11px] font-sans">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-semibold text-zinc-300">Dari:</span>
                <span className="font-mono text-zinc-400">Maria AI &lt;assistant@maria.ai&gt;</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-semibold text-zinc-300">Kepada:</span>
                <span className="font-mono text-zinc-200 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded text-[10px]">
                  {auth.currentUser?.email || "contoh@email.com"}
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

            <div className="p-6 overflow-y-auto bg-slate-900/40 divide-y divide-slate-800 font-sans">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-md max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-display font-extrabold text-[12px] tracking-widest text-emerald-400 uppercase">MARIA AI</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Notifikasi Otomatis</span>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-medium text-emerald-300">
                    Halo Kak {isLoggedIn ? (profileDisplayName || settings.username || "User") : "User"},
                  </p>
                  
                  <div className="p-4 bg-slate-900 border border-slate-800/40 rounded-xl text-[11px] text-zinc-200 select-text leading-relaxed font-sans">
                    {simulatedEmail.body}
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Simulasi email ini dikirimkan karena jenis notifikasi pintar di atas disetel ke opsi pengiriman <span className="text-emerald-400 font-semibold">Email</span> di halaman pengaturan Anda.
                  </p>
                </div>

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
                <p className="text-[9px] text-zinc-500 font-sans">
                  Ini adalah simulasi surel offline. Email asli akan dikirimkan lewat cloud mail service.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Web Push notification toast overlay */}
      {simulatedPush && simulatedPush.shown && (
        <div className="fixed top-4 right-4 z-[9999] w-80 max-w-sm bg-zinc-950/95 border border-[#333333] shadow-2xl rounded-2xl p-4 overflow-hidden text-zinc-100 flex flex-col gap-2.5 font-sans">
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
                className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-0.5 select-text">
            <h5 className="text-[11px] font-bold text-white tracking-tight">{simulatedPush.title}</h5>
            <p className="text-[10px] text-zinc-400 leading-normal font-medium">{simulatedPush.body}</p>
          </div>

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
    </>
  );
}
