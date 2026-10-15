import React, { useEffect } from 'react';
import { X, Download, ZoomIn, Film, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { formatBytes } from '../lib/mediaUtils.ts';

export interface LightboxMedia {
  url: string;
  type: 'image' | 'video';
  name?: string;
  size?: number;
}

interface MediaLightboxModalProps {
  media: LightboxMedia | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ media, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (media) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [media, onClose]);

  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            {media.type === 'video' ? (
              <Film className="w-4 h-4 text-emerald-400" />
            ) : (
              <ImageIcon className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold truncate max-w-xs sm:max-w-md">
              {media.name || (media.type === 'video' ? 'Pratinjau Video' : 'Pratinjau Gambar')}
            </div>
            {media.size ? (
              <div className="text-xs text-neutral-400">{formatBytes(media.size)}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={media.url}
            download={media.name || (media.type === 'video' ? 'video.mp4' : 'image.png')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Unduh berkas"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Unduh</span>
          </a>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 hover:text-rose-300 text-white transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main media container */}
      <div
        className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-neutral-800 bg-black"
          />
        ) : (
          <img
            src={media.url}
            alt={media.name || 'Pratinjau media'}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl select-none"
          />
        )}
      </div>
    </div>
  );
};
