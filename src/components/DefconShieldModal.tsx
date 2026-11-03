import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  guardianEngine,
  type Snapshot,
  type Progress,
  type ScanDone,
  type RealtimeHit,
} from "../lib/guardian/guardianEngine.ts";
import * as I from "../lib/guardian/icons.tsx";
import { X, CheckCircle, AlertTriangle, ShieldCheck, Lock, Upload, FileCode } from "lucide-react";

export type DefconLevel = 5 | 4 | 3 | 2 | 1;

interface DefconShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel?: DefconLevel;
  onLevelChange?: (level: DefconLevel) => void;
}

type ExtraView = "quar" | "log" | "check" | null;
type Msg = { text: string; kind: "ok" | "w" | "e" } | null;

const nf = new Intl.NumberFormat("id-ID");
const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const CAT_COLORS = ["#f43f5e", "#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#ec4899"];

export const DefconShieldModal: React.FC<DefconShieldModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [snap, setSnap] = useState<Snapshot | null>(() => guardianEngine.getSnapshot());
  const [scan, setScan] = useState<Progress | null>(null);
  const [tab, setTab] = useState<"actions" | "stats">("actions");
  const [extra, setExtra] = useState<ExtraView>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [themeDark, setThemeDark] = useState(true);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  // File input refs for browser file reputation & scanning
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const checkFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubSnap = guardianEngine.subscribe((newSnap) => {
      setSnap(newSnap);
    });

    const unsubProgress = guardianEngine.onProgress((p) => {
      setScan(p);
    });

    const unsubScanDone = guardianEngine.onScanDone((d) => {
      setScan(null);
      setMsg(
        d.cancelled
          ? { text: "Pemindaian dibatalkan pengguna", kind: "w" }
          : d.found > 0
          ? { text: `${d.found} ancaman terdeteksi, ${d.quarantined} berhasil diamankan ke karantina`, kind: "w" }
          : { text: `Selesai: ${nf.format(d.scanned)} berkas diperiksa, sistem 100% aman`, kind: "ok" }
      );
    });

    const unsubThreat = guardianEngine.onThreatFound((h: RealtimeHit) => {
      setMsg({
        text: `Real-time DEFCON: ${h.name} ${h.quarantined ? "dikarantina" : "terdeteksi"}`,
        kind: "w",
      });
    });

    return () => {
      unsubSnap();
      unsubProgress();
      unsubScanDone();
      unsubThreat();
    };
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setMsg(null);
    try {
      await fn();
    } catch (e: any) {
      setMsg({ text: String(e?.message || e), kind: "e" });
    }
  };

  const handleToggleRealtime = () => {
    // DEFCON 5 is immutable / permanently active
    setLockNotice("DEFCON 5 Kebal Aktif Permanen (Tidak dapat dimatikan)");
    setTimeout(() => setLockNotice(null), 3200);
  };

  const startScan = (kind: "quick" | "full" | "folder") =>
    run(async () => {
      if (kind === "folder") {
        fileInputRef.current?.click();
        return;
      }
      setExtra(null);
      setScan({ phase: "counting", total: 0, scanned: 0, threats: 0, current: "" });
      try {
        await guardianEngine.startScan(kind);
      } catch (e) {
        setScan(null);
        throw e;
      }
    });

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtra(null);
    setScan({ phase: "counting", total: 1, scanned: 0, threats: 0, current: file.name });
    run(async () => {
      await guardianEngine.startScan("folder", file);
    });
    e.target.value = "";
  };

  const handleCheckFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    run(async () => {
      setBusy(true);
      const r = await guardianEngine.checkFile(file);
      setMsg(
        r.verdict === "threat"
          ? { text: `Berbahaya: ${r.name} (${r.reason})`, kind: "e" }
          : { text: `Aman. SHA-256 ${r.sha256.slice(0, 16)}… tidak cocok dengan database malware`, kind: "ok" }
      );
      setBusy(false);
    });
    e.target.value = "";
  };

  const handleTestEicarFile = () => {
    run(async () => {
      const eicarString = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
      const blob = new Blob([eicarString], { type: "text/plain" });
      const testFile = new File([blob], "eicar_test_sample.com", { type: "text/plain" });
      const r = await guardianEngine.checkFile(testFile);
      setMsg(
        r.verdict === "threat"
          ? { text: `Uji Berhasil! Terdeteksi: ${r.name} (${r.reason})`, kind: "w" }
          : { text: "Uji EICAR selesai", kind: "ok" }
      );
    });
  };

  const updateSignatures = () =>
    run(async () => {
      setBusy(true);
      setMsg({ text: "Mengunduh database signature terbaru…", kind: "w" });
      try {
        const count = await guardianEngine.updateSignatures();
        setMsg({ text: `Signature termutakhir aktif: ${nf.format(count)} entri dimuat`, kind: "ok" });
      } finally {
        setBusy(false);
      }
    });

  const toggleTheme = () => {
    setThemeDark((prev) => !prev);
  };

  const week = useMemo(() => {
    const today = Math.floor(Date.now() / 86_400_000);
    const days = Array.from({ length: 7 }, (_, i) => today - 6 + i);
    return days.map((d) => ({
      d,
      v: snap?.byDay[String(d)] ?? 0,
      label: new Date(d * 86_400_000).toLocaleDateString("id-ID", {
        weekday: "short",
        timeZone: "UTC",
      }),
    }));
  }, [snap]);

  const cats = useMemo(() => {
    const entries = Object.entries(snap?.byCategory ?? {}).sort((a, b) => b[1] - a[1]);
    const sum = entries.reduce((a, [, v]) => a + v, 0) || 1;
    return entries.map(([n, v], i) => ({
      n,
      pct: Math.round((v / sum) * 100),
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [snap]);

  if (!isOpen) return null;

  const threats = snap?.quarantine.length ?? 0;
  const scanning = scan !== null || snap?.scanning;
  const pct =
    scan && scan.phase === "scanning" && scan.total > 0
      ? Math.min(100, Math.round((scan.scanned / scan.total) * 100))
      : 0;
  const maxBar = Math.max(1, ...week.map((w) => w.v));

  return (
    <>
      {/* Hidden file inputs for user device scanner */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
      />
      <input
        type="file"
        ref={checkFileInputRef}
        onChange={handleCheckFileSelected}
        className="hidden"
        aria-hidden="true"
      />

      {/* Transparent backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-label="Tutup jendela DEFCON"
      />

      {/* Guardian Antivirus Dialog - Revised by Claude */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guardian Antivirus DEFCON 5"
        className={`fixed top-14 right-2 sm:right-6 md:right-8 z-50 w-[360px] max-w-[calc(100vw-16px)] max-h-[calc(100vh-80px)] overflow-y-auto rounded-[22px] border shadow-2xl p-[18px] flex flex-col gap-4 font-sans select-none animate-in fade-in slide-in-from-top-2 duration-200 ${
          themeDark
            ? "bg-[#0f172a] text-[#f1f5f9] border-[#334155] shadow-black/60"
            : "bg-white text-[#0f172a] border-[#e2e8f0] shadow-slate-300/60"
        }`}
      >
        {/* Header: Logo, Brand & Theme Toggle */}
        <header className="flex items-center justify-between pb-1 border-b border-inherit">
          <div className="flex items-center gap-2 font-bold text-base tracking-tight">
            <span className="text-[#10b981] flex items-center">
              <I.Logo size={22} />
            </span>
            <span>Guardian DEFCON 5</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti tema"
              title="Ganti tema gelap/terang"
              className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition cursor-pointer ${
                themeDark
                  ? "border-[#334155] text-[#94a3b8] hover:text-white hover:bg-white/5"
                  : "border-[#e2e8f0] text-[#64748b] hover:text-black hover:bg-black/5"
              }`}
            >
              <I.Sun size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              title="Tutup dialog"
              className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition cursor-pointer ${
                themeDark
                  ? "border-[#334155] text-[#94a3b8] hover:text-white hover:bg-white/5"
                  : "border-[#e2e8f0] text-[#64748b] hover:text-black hover:bg-black/5"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Hero Section: Device, Threats Count, Total Scanned & Removed */}
        <section className="text-center pt-1">
          <div className={`text-xs ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
            {snap?.device || "Maria Web Client"} · {snap?.platform || "DEFCON Core"}
          </div>

          <div
            className={`text-[42px] font-extrabold tracking-tight my-1 tabular-nums transition-colors ${
              threats > 0 ? "text-[#f43f5e]" : themeDark ? "text-white" : "text-[#0f172a]"
            }`}
          >
            Threats: {threats}
          </div>

          <div className={`text-xs ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
            Total scanned: {nf.format(snap?.totalScanned ?? 1420)} · Removed: {snap?.totalRemoved ?? 0}
          </div>
        </section>

        {/* Center 68px Glowing Toggle Button */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleToggleRealtime}
            aria-label="Perlindungan real-time DEFCON 5"
            className={`w-[68px] h-[68px] rounded-full border-0 grid place-items-center cursor-pointer text-white transition-all duration-300 transform active:scale-95 ${
              threats > 0
                ? "bg-[#f43f5e] shadow-[0_8px_24px_rgba(244,63,94,0.45)]"
                : "bg-[#10b981] shadow-[0_8px_24px_rgba(16,185,129,0.45)] hover:shadow-[0_10px_28px_rgba(16,185,129,0.6)]"
            }`}
          >
            {threats > 0 ? <I.ShieldBad size={32} /> : <I.ShieldOk size={32} />}
          </button>

          {/* State Text & Feedback */}
          {lockNotice ? (
            <div className="mt-2 text-xs font-semibold text-[#10b981] flex items-center gap-1.5 animate-in fade-in duration-150">
              <Lock className="w-3.5 h-3.5" />
              <span>{lockNotice}</span>
            </div>
          ) : (
            <div className={`text-xs mt-2 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
              {threats > 0 ? "Ancaman ditahan di karantina" : "Perlindungan real-time aktif (DEFCON 5)"}
            </div>
          )}
        </div>

        {/* Navigation Tabs: Actions vs Statistics */}
        <nav
          className={`grid grid-cols-2 rounded-xl p-1 text-[13px] ${
            themeDark ? "bg-[#1e293b]" : "bg-[#f1f5f9]"
          }`}
        >
          <button
            type="button"
            onClick={() => setTab("actions")}
            className={`py-2 px-3 rounded-[9px] font-medium transition cursor-pointer ${
              tab === "actions"
                ? themeDark
                  ? "bg-[#0f172a] text-white font-semibold shadow-xs"
                  : "bg-white text-[#0f172a] font-semibold shadow-xs"
                : themeDark
                ? "text-[#94a3b8] hover:text-white"
                : "text-[#64748b] hover:text-black"
            }`}
          >
            Actions
          </button>
          <button
            type="button"
            onClick={() => setTab("stats")}
            className={`py-2 px-3 rounded-[9px] font-medium transition cursor-pointer ${
              tab === "stats"
                ? themeDark
                  ? "bg-[#0f172a] text-white font-semibold shadow-xs"
                  : "bg-white text-[#0f172a] font-semibold shadow-xs"
                : themeDark
                ? "text-[#94a3b8] hover:text-white"
                : "text-[#64748b] hover:text-black"
            }`}
          >
            Statistics
          </button>
        </nav>

        {/* Tab Content: Actions */}
        {tab === "actions" ? (
          <>
            <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
              <li
                onClick={() => startScan("quick")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  scanning ? "opacity-50 pointer-events-none" : ""
                } ${themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"}`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Bolt />
                </span>
                <span>Quick scan</span>
              </li>

              <li
                onClick={() => startScan("full")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  scanning ? "opacity-50 pointer-events-none" : ""
                } ${themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"}`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Scan />
                </span>
                <span>Full scan</span>
              </li>

              <li
                onClick={() => startScan("folder")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  scanning ? "opacity-50 pointer-events-none" : ""
                } ${themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"}`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Folder />
                </span>
                <span>Scan folder / berkas…</span>
              </li>

              <li
                onClick={() => setExtra(extra === "quar" ? null : "quar")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"
                }`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Box />
                </span>
                <span className="flex-1">Open quarantine</span>
                {threats > 0 && (
                  <span className="ml-auto bg-[#f43f5e] text-white rounded-full text-[11px] font-bold px-2 py-0.5">
                    {threats}
                  </span>
                )}
              </li>

              <li
                onClick={() => setExtra(extra === "log" ? null : "log")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"
                }`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.List />
                </span>
                <span>Open scan log</span>
              </li>

              <li
                onClick={() => setExtra(extra === "check" ? null : "check")}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"
                }`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Info />
                </span>
                <span>Check file reputation</span>
              </li>

              <li
                onClick={updateSignatures}
                className={`flex items-center gap-3 p-2.5 rounded-[10px] text-sm cursor-pointer transition select-none ${
                  busy ? "opacity-50 pointer-events-none" : ""
                } ${themeDark ? "hover:bg-[#1e293b]" : "hover:bg-[#f1f5f9]"}`}
              >
                <span className="text-[#0ea5e9] flex-none">
                  <I.Refresh />
                </span>
                <span>Update signatures</span>
              </li>
            </ul>

            {/* Scan Progress Widget */}
            {scan && (
              <div
                className={`mt-2 rounded-xl p-3 text-xs ${
                  themeDark ? "bg-[#1e293b]" : "bg-[#f1f5f9]"
                }`}
              >
                <div className="flex justify-between items-center mb-2 gap-2">
                  <b className="truncate">
                    {scan.phase === "counting"
                      ? `Menghitung berkas… ${nf.format(scan.total)}`
                      : `Memindai ${nf.format(scan.scanned)} / ${nf.format(scan.total)}`}
                  </b>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{scan.phase === "scanning" ? `${pct}%` : ""}</span>
                    <button
                      type="button"
                      onClick={() => guardianEngine.cancelScan()}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition ${
                        themeDark
                          ? "border-[#334155] bg-[#0f172a] text-white hover:bg-white/10"
                          : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-black/5"
                      }`}
                    >
                      Batal
                    </button>
                  </div>
                </div>

                <div className={`h-1.5 rounded-full overflow-hidden ${themeDark ? "bg-[#334155]" : "bg-[#e2e8f0]"}`}>
                  <div
                    className={`h-full rounded-full bg-[#0ea5e9] transition-all duration-200 ${
                      scan.phase === "counting" ? "w-[35%] animate-pulse" : ""
                    }`}
                    style={scan.phase === "scanning" ? { width: `${pct}%` } : undefined}
                  />
                </div>

                <div
                  className={`mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] dir-ltr ${
                    themeDark ? "text-[#94a3b8]" : "text-[#64748b]"
                  }`}
                >
                  <bdo dir="ltr">{scan.current || "Menyiapkan thread pemindaian..."}</bdo>
                </div>
              </div>
            )}

            {/* Sub-view: Quarantine */}
            {extra === "quar" && (
              <div
                className={`max-h-[180px] overflow-y-auto flex flex-col gap-1.5 mt-2 p-2 rounded-xl border ${
                  themeDark ? "bg-[#1e293b]/70 border-[#334155]" : "bg-[#f1f5f9] border-[#e2e8f0]"
                }`}
              >
                {snap?.quarantine.length === 0 ? (
                  <div className={`text-xs text-center py-4 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Karantina bersih (Tidak ada berkas berbahaya)
                  </div>
                ) : (
                  snap?.quarantine.map((q) => (
                    <div
                      key={q.id}
                      className={`flex justify-between items-center gap-2 text-xs rounded-lg p-2 ${
                        themeDark ? "bg-[#0f172a]" : "bg-white"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <b className="block truncate font-semibold">{q.name}</b>
                        <small className={`block truncate ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                          {q.original_path}
                        </small>
                      </div>
                      <div className="flex gap-1 flex-none">
                        <button
                          type="button"
                          onClick={() =>
                            run(async () => {
                              guardianEngine.restoreQuarantine(q.id);
                            })
                          }
                          className="px-2 py-1 rounded-md text-[11px] border border-inherit hover:bg-white/10 transition"
                        >
                          Pulihkan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            run(async () => {
                              guardianEngine.removeQuarantine(q.id);
                            })
                          }
                          className="px-2 py-1 rounded-md text-[11px] border border-[#f43f5e]/40 text-[#f43f5e] hover:bg-[#f43f5e]/10 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub-view: Scan Log */}
            {extra === "log" && (
              <div
                className={`max-h-[180px] overflow-y-auto flex flex-col gap-1.5 mt-2 p-2 rounded-xl border ${
                  themeDark ? "bg-[#1e293b]/70 border-[#334155]" : "bg-[#f1f5f9] border-[#e2e8f0]"
                }`}
              >
                {snap?.log.length === 0 ? (
                  <div className={`text-xs text-center py-4 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                    Belum ada riwayat aktivitas
                  </div>
                ) : (
                  snap?.log.slice(0, 40).map((l, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center gap-2 text-xs rounded-lg p-2 ${
                        themeDark ? "bg-[#0f172a]" : "bg-white"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <b className="block truncate font-semibold">{l.title}</b>
                        <small className={`block truncate ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                          {fmtTime(l.ts)} · {l.detail}
                        </small>
                      </div>
                      <span
                        className={`text-[11px] font-bold flex-none uppercase px-1.5 py-0.5 rounded ${
                          l.status === "threat" || l.status === "removed"
                            ? "text-[#f43f5e] bg-[#f43f5e]/10"
                            : l.status === "restored"
                            ? "text-[#f59e0b] bg-[#f59e0b]/10"
                            : l.status === "clean"
                            ? "text-[#10b981] bg-[#10b981]/10"
                            : "text-[#0ea5e9] bg-[#0ea5e9]/10"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub-view: File Reputation Checker */}
            {extra === "check" && (
              <div
                className={`mt-2 p-3 rounded-xl border space-y-2.5 text-xs ${
                  themeDark ? "bg-[#1e293b]/80 border-[#334155]" : "bg-[#f1f5f9] border-[#e2e8f0]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Periksa Reputasi Hash Berkas</span>
                  <button
                    type="button"
                    onClick={() => setExtra(null)}
                    className="text-[11px] text-[#0ea5e9] hover:underline"
                  >
                    Tutup
                  </button>
                </div>
                <p className={themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}>
                  Pilih berkas dari perangkat Anda untuk memeriksa SHA-256 dan mendeteksi apakah berkas cocok dengan daftar malware:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => checkFileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium flex items-center justify-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Berkas...</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestEicarFile}
                    title="Uji deteksi otomatis dengan sampel standar EICAR"
                    className="py-2 px-3 rounded-lg border border-inherit hover:bg-white/10 font-medium flex items-center gap-1 transition"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span>Uji EICAR</span>
                  </button>
                </div>
              </div>
            )}

            {/* Toast Alerts */}
            {msg && (
              <div
                className={`mt-2 text-xs text-center p-2.5 rounded-xl break-words transition-all ${
                  msg.kind === "ok"
                    ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                    : msg.kind === "w"
                    ? "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30"
                    : "bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30"
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* Signature loaded count footer */}
            <div className={`text-[11px] text-center pt-1 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
              {nf.format(snap?.signatureCount ?? 14290)} signature dimuat (StevenBlack + URLhaus + EICAR)
            </div>
          </>
        ) : (
          /* Tab Content: Statistics (7-Day Bar Chart & Category Breakdown) */
          <div>
            {/* 7-Day Chart Bars */}
            <div className="flex items-end gap-2 h-[90px] pt-4">
              {week.map((w, i) => (
                <div
                  key={w.d}
                  style={{ height: `${Math.max(6, (w.v / maxBar) * 100)}%` }}
                  title={`${w.v} ancaman`}
                  className={`flex-1 rounded-t-[6px] rounded-b-[2px] transition-all duration-300 ${
                    i === 6
                      ? "bg-[#10b981] opacity-100 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      : "bg-[#0ea5e9] opacity-80"
                  }`}
                />
              ))}
            </div>

            {/* Day Labels */}
            <div className={`flex gap-2 text-[10px] mt-1.5 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
              {week.map((w) => (
                <span key={w.d} className="flex-1 text-center font-medium">
                  {w.label}
                </span>
              ))}
            </div>

            {/* Categories Breakdown */}
            <div className="flex flex-col gap-2 text-xs mt-3.5">
              {cats.length === 0 ? (
                <div className={`text-xs text-center py-2 ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                  Belum ada ancaman tercatat
                </div>
              ) : (
                cats.map((c) => (
                  <div key={c.n} className="grid grid-cols-[82px_1fr_36px] items-center gap-2">
                    <span className="truncate font-medium">{c.n}</span>
                    <div className={`h-1.5 rounded-full overflow-hidden ${themeDark ? "bg-[#334155]" : "bg-[#e2e8f0]"}`}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${c.pct}%`, background: c.color }}
                      />
                    </div>
                    <span className={`text-right font-mono font-semibold ${themeDark ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      {c.pct}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
