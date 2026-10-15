import React, { useEffect, useRef } from 'react';
import {
  Share2,
  Archive,
  Pin,
  PinOff,
  Edit3,
  Trash2,
  Check,
} from 'lucide-react';

interface ChatPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  isPinned?: boolean;
  onShare: () => void;
  onArchive: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const ChatPopover: React.FC<ChatPopoverProps> = ({
  isOpen,
  onClose,
  position,
  isPinned = false,
  onShare,
  onArchive,
  onTogglePin,
  onRename,
  onDelete,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${Math.min(position.top, window.innerHeight - 240)}px`,
        left: `${Math.min(position.left, window.innerWidth - 210)}px`,
      }}
      className="fixed z-50 w-52 bg-[#171821] text-neutral-200 border border-[#2b2d3d] rounded-2xl shadow-2xl py-2 px-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => {
          onShare();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#222433] hover:text-white transition-colors text-left"
      >
        <Share2 className="w-4 h-4 text-neutral-400" />
        <span>Bagikan percakapan</span>
      </button>

      <button
        onClick={() => {
          onArchive();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#222433] hover:text-white transition-colors text-left"
      >
        <Archive className="w-4 h-4 text-neutral-400" />
        <span>Arsipkan ke Pustaka</span>
      </button>

      <button
        onClick={() => {
          onTogglePin();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#222433] hover:text-white transition-colors text-left"
      >
        {isPinned ? (
          <>
            <PinOff className="w-4 h-4 text-amber-400" />
            <span>Lepas sematan</span>
          </>
        ) : (
          <>
            <Pin className="w-4 h-4 text-neutral-400" />
            <span>Sematkan obrolan</span>
          </>
        )}
      </button>

      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#222433] hover:text-white transition-colors text-left"
      >
        <Edit3 className="w-4 h-4 text-neutral-400" />
        <span>Ganti nama</span>
      </button>

      <div className="h-px bg-[#262838] my-1 mx-2" />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors text-left"
      >
        <Trash2 className="w-4 h-4" />
        <span>Hapus</span>
      </button>
    </div>
  );
};
