import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0d0f14] text-slate-200 p-6 font-sans select-none">
          <div className="w-full max-w-md bg-[#131720] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-5 text-center animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-amber-500 to-rose-500" />
            
            {/* Warning Icon Badge */}
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[17px] font-bold text-white font-sans tracking-tight">
                Oops, Terjadi Penyimpangan Sistem
              </h1>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Asisten Maria mendeteksi kesalahan rendering atau data lokal yang korup di peramban Anda.
              </p>
            </div>

            {/* Error Detail Display */}
            {this.state.error?.message && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block mb-1">
                  Detail Sistem (Diagnostic)
                </span>
                <p className="text-[11px] font-mono text-red-350 break-words leading-normal max-h-[80px] overflow-y-auto pr-1">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Recovery Actions button row */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-slate-700/55"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                Segarkan Halaman
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-[#881337] hover:bg-[#9f1239] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                title="Menghapus semua daki penyimpanan lokal browser Anda"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-350" />
                Bersihkan Data Lokal
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-sans pt-1 leading-normal">
              Catatan: Tombol "Bersihkan Data" akan mereset pengaturan dan riwayat chat Anda kembali ke kondisi default yang prima.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
