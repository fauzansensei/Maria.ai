import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Download, X } from 'lucide-react';
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
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Swipe-to-dismiss displacement when zoom is 1
  const [dismissY, setDismissY] = useState<number>(0);

  // Touch gesture refs
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef<number>(0);

  // Reset state when new media opens
  useEffect(() => {
    if (media) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setDismissY(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [media]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    if (!media) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose]);

  // Touch Handlers for Pinch-to-Zoom ("swist") & Swipe-to-Dismiss / 1-finger Pan
  const handleTouchStart = (e: React.TouchEvent) => {
    // 2-finger pinch gesture
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoom;
      setIsDragging(false);
      return;
    }

    // 1-finger gesture
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;
      lastTapRef.current = now;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };

      // Double-tap gesture: toggle between 1x and 2.5x zoom
      if (timeDiff < 280 && timeDiff > 0) {
        e.preventDefault();
        if (zoom > 1.05) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setDismissY(0);
        } else {
          setZoom(2.5);
          setPan({ x: 0, y: 0 });
        }
        return;
      }

      // 1-finger pan if zoomed in
      if (zoom > 1.05) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // 2-finger pinch gesture (smooth fluid zoom from 1x to 6x)
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleMultiplier = currentDist / initialPinchDistRef.current;
      const newZoom = Math.min(6.0, Math.max(1.0, +(initialZoomRef.current * scaleMultiplier).toFixed(2)));
      setZoom(newZoom);
      if (newZoom <= 1.05) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    // 1-finger touch move
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      // If zoomed in: pan around image
      if (zoom > 1.05 && isDragging) {
        e.preventDefault();
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        });
        return;
      }

      // If at 1x zoom: swipe down/up to dismiss ("swist")
      if (zoom <= 1.05) {
        const deltaY = touch.clientY - touchStartRef.current.y;
        // Track dismiss displacement
        setDismissY(deltaY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);

      // If at 1x zoom and swiped up or down significantly (> 90px), dismiss!
      if (zoom <= 1.05) {
        if (Math.abs(dismissY) > 90) {
          onClose();
          return;
        } else {
          // Snap back
          setDismissY(0);
        }
      }

      if (zoom <= 1.05) {
        setPan({ x: 0, y: 0 });
      }
    }
  };

  // Mouse wheel & drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1.05) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1.05) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (media?.type !== 'image') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(6.0, +(prev + 0.25).toFixed(2)));
    } else {
      setZoom((prev) => {
        const next = Math.max(1.0, +(prev - 0.25).toFixed(2));
        if (next <= 1.05) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }, [media]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1.05) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
      setPan({ x: 0, y: 0 });
    }
  };

  if (!media) return null;

  // Background opacity fades as user swipes down/up to dismiss
  const bgOpacity = Math.max(0.2, 1 - Math.abs(dismissY) / 300);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black select-none overflow-hidden animate-in fade-in duration-150"
      style={{ backgroundColor: `rgba(10, 15, 29, ${bgOpacity})` }}
      onClick={onClose}
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Top minimal action bar - No zoom buttons, clean header */}
      <div
        className="w-full p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-[#0a0f1d]/95 via-[#0a0f1d]/60 to-transparent z-30 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 text-white min-w-0">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full bg-slate-800/60 hover:bg-slate-700 text-white transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-md text-white">
              {media.name || (media.type === 'video' ? 'Pratinjau Video' : 'Pratinjau Gambar')}
            </div>
            {media.size ? (
              <div className="text-[10px] text-blue-300/80 font-medium">{formatBytes(media.size)}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={media.url}
            download={media.name || (media.type === 'video' ? 'video.mp4' : 'image.png')}
            className="p-2 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white transition-colors shadow-sm"
            title="Unduh resolusi asli"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 text-white transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Media Viewport - Edge-to-Edge with fluid pinch/swipe ("swist") */}
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center transition-transform ${
              isDragging ? 'cursor-grabbing duration-0' : 'duration-100 ease-out'
            } ${zoom > 1.05 ? 'cursor-grab' : 'cursor-zoom-in'}`}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y + dismissY}px, 0px) scale3d(${zoom}, ${zoom}, 1)`,
              transformOrigin: 'center center',
            }}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={media.url}
              alt={media.name || 'Pratinjau media'}
              draggable={false}
              className="w-full h-full max-w-full max-h-full object-contain select-none"
              style={{
                imageRendering: 'auto',
                filter: 'none',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
