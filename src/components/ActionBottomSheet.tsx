import React from 'react';
import {
  X,
  Image as ImageIcon,
  Camera,
  Mic,
  Folder,
  Wand2,
  Sparkles,
  Globe,
  Music2,
  Layout,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

export interface ActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Circular quick actions
  onSelectPhotosVideos: () => void;
  onSelectCamera: () => void;
  onSelectVoice: () => void;
  onSelectFiles: () => void;
  // Feature list actions
  onOpenImageStudio: () => void;
  onOpenMusicVoice: () => void;
  onOpenCanvasCode: () => void;
  // Toggles
  deepResearchActive: boolean;
  onToggleDeepResearch: () => void;
  webSearchActive: boolean;
  onToggleWebSearch: () => void;
  isPlus?: boolean;
  onOpenPlusModal?: () => void;
}

export const ActionBottomSheet: React.FC<ActionBottomSheetProps> = ({
  isOpen,
  onClose,
  onSelectPhotosVideos,
  onSelectCamera,
  onSelectVoice,
  onSelectFiles,
  onOpenImageStudio,
  onOpenMusicVoice,
  onOpenCanvasCode,
  deepResearchActive,
  onToggleDeepResearch,
  webSearchActive,
  onToggleWebSearch,
  isPlus = false,
  onOpenPlusModal,
}) => {
  const { isEn } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Actions and Attachments Menu' : 'Menu Aksi dan Lampiran'}
      className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center animate-in fade-in duration-100 select-none p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-[#14151b] border-t sm:border border-slate-800/80 rounded-t-[32px] sm:rounded-3xl p-5 pb-6 text-white shadow-2xl animate-in slide-in-from-bottom-4 duration-150 ease-out">
        {/* Top Drag Indicator Pill */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-3 cursor-grab" />

        {/* Header Bar with Centered 4-point Sparkle and Top-Right Close Button */}
        <div className="relative flex items-center justify-between mb-5 px-1">
          <div className="w-8" /> {/* Balance spacer */}
          
          {/* Centered Sparkle Star */}
          <div className="flex items-center justify-center">
            <svg
              className="w-7 h-7 text-white fill-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0L14.7 9.3L24 12L14.7 14.7L12 24L9.3 14.7L0 12L9.3 9.3L12 0Z" />
            </svg>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close Menu' : 'Tutup Menu'}
            className="w-8 h-8 rounded-full bg-[#1f212a] hover:bg-[#282a36] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Row of 4 Circular Action Buttons */}
        <div className="grid grid-cols-4 gap-2 px-1 mb-6">
          {/* Photos & Videos */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectPhotosVideos();
            }}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#20222c] group-hover:bg-[#2b2d3b] border border-slate-700/40 flex items-center justify-center text-slate-200 group-hover:text-white transition-all shadow-sm active:scale-95">
              <ImageIcon className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2 text-center leading-tight">
              Photos & Videos
            </span>
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectCamera();
            }}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#20222c] group-hover:bg-[#2b2d3b] border border-slate-700/40 flex items-center justify-center text-slate-200 group-hover:text-white transition-all shadow-sm active:scale-95">
              <Camera className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2 text-center leading-tight">
              Camera
            </span>
          </button>

          {/* Voice */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectVoice();
            }}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#20222c] group-hover:bg-[#2b2d3b] border border-slate-700/40 flex items-center justify-center text-slate-200 group-hover:text-white transition-all shadow-sm active:scale-95">
              <Mic className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2 text-center leading-tight">
              Voice
            </span>
          </button>

          {/* Files */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectFiles();
            }}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-[#20222c] group-hover:bg-[#2b2d3b] border border-slate-700/40 flex items-center justify-center text-slate-200 group-hover:text-white transition-all shadow-sm active:scale-95">
              <Folder className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs text-slate-300 font-medium mt-2 text-center leading-tight">
              Files
            </span>
          </button>
        </div>

        {/* Feature Action List Items */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          {!isPlus && (
            <div
              onClick={() => {
                onClose();
                onOpenPlusModal?.();
              }}
              className="mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:border-indigo-500/60 transition group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-indigo-200">
                  {isEn ? 'Unlock all smart features with Maria PLUS' : 'Buka Semua Fitur Cerdas dengan Maria PLUS'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-xs">
                Upgrade
              </span>
            </div>
          )}

          {/* 1. Images (Gambar AI) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenImageStudio();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1c1e28] active:bg-[#222432] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-purple-950/60 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 group-hover:text-white truncate flex items-center gap-1.5">
                  <span>{isEn ? 'Images (AI Image)' : 'Images (Gambar AI)'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                    Free / 4K
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {isEn ? 'Create and edit HD images with Gemini 3.1' : 'Buat dan edit gambar HD dengan model Gemini 3.1'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0 ml-2" />
          </button>

          {/* 2. Deep Research (Pencarian Mendalam) - With Toggle Switch */}
          <div
            onClick={() => {
              if (!isPlus) {
                onClose();
                onOpenPlusModal?.();
                return;
              }
              onToggleDeepResearch();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1c1e28] active:bg-[#222432] transition-colors text-left cursor-pointer select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate flex items-center gap-1.5">
                  <span>{isEn ? 'Deep Research' : 'Deep Research (Pencarian Mendalam)'}</span>
                  {!isPlus && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      PLUS
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {isEn ? 'Comprehensive research & analysis reports' : 'Laporan riset & analisis komprehensif'}
                </div>
              </div>
            </div>
            {/* Emerald Green Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={deepResearchActive}
              onClick={(e) => {
                e.stopPropagation();
                if (!isPlus) {
                  onClose();
                  onOpenPlusModal?.();
                  return;
                }
                onToggleDeepResearch();
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ml-2 focus:outline-none cursor-pointer ${
                deepResearchActive ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                  deepResearchActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3. Web Search (Pencarian Web) - With Toggle Switch */}
          <div
            onClick={onToggleWebSearch}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1c1e28] active:bg-[#222432] transition-colors text-left cursor-pointer select-none"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {isEn ? 'Web Search' : 'Web Search (Pencarian Web)'}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {isEn ? 'Access live news & Google Search results' : 'Akses berita & info live Google Search'}
                </div>
              </div>
            </div>
            {/* Blue Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={webSearchActive}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWebSearch();
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ml-2 focus:outline-none cursor-pointer ${
                webSearchActive ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                  webSearchActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 4. Music & Voice (Audio) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenMusicVoice();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1c1e28] active:bg-[#222432] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
                <Music2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 group-hover:text-white truncate flex items-center gap-1.5">
                  <span>Music & Voice (Audio)</span>
                  {!isPlus && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      PLUS
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {isEn ? 'Create song lyrics, audio tracks, or voice memos' : 'Buat lirik lagu, trek audio, atau memo suara'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0 ml-2" />
          </button>

          {/* 5. Canvas & Code */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCanvasCode();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1c1e28] active:bg-[#222432] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                <Layout className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 group-hover:text-white truncate flex items-center gap-1.5">
                  <span>Canvas & Code</span>
                  {!isPlus && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      PLUS
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {isEn ? 'Write code, documents, or build presentations' : 'Tulis kode, dokumen, atau buat presentasi'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};
