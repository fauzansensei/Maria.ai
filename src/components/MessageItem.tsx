import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Loader2,
  Lightbulb,
  ChevronDown,
  Globe,
  MapPin,
  ExternalLink,
  Download,
  Eye,
  Pencil,
  RotateCcw,
  Image as ImageIcon,
  Play,
  Wand2,
  RefreshCw,
  FileText,
  FileCode,
  Film,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreVertical,
  TextSelect,
  X,
} from 'lucide-react';
import { Message, MediaAttachment } from '../types/index.ts';
import { LaunchAction, detectLaunchAction } from '../lib/actionLauncher.ts';
import { MariaLogo } from './MariaLogo.tsx';
import { speechService, SpeechState } from '../lib/speechService.ts';
import { formatBytes, getOriginalMedia, getOriginalMediaBlob, getMediaBase64 } from '../lib/mediaUtils.ts';
import { MediaLightboxModal, LightboxMedia } from './MediaLightboxModal.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface MessageItemProps {
  message: Message;
  userPhoto?: string | null;
  userName?: string | null;
  speechSpeed?: string;
  onEditMessage?: (messageId: string, newContent: string, resend: boolean) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onLoadToInput?: (text: string) => void;
  onOpenImageStudio?: (baseImage?: string, prompt?: string) => void;
}

import { autoFormatMarkdown } from '../lib/formatUtils.ts';
export { autoFormatMarkdown };

// Subcomponent to resolve and display the 100% full original resolution image
const HighResImage: React.FC<{
  img: MediaAttachment;
  onOpenLightbox: (url: string) => void;
  className?: string;
}> = ({ img, onOpenLightbox, className = '' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    return (
      img.originalUrl ||
      getOriginalMedia(img.id) ||
      getOriginalMedia(img.name) ||
      (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '') ||
      img.previewUrl ||
      ''
    );
  });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const blobUrl = (await getOriginalMediaBlob(img.id)) || (await getOriginalMediaBlob(img.name));
      if (blobUrl && isMounted) {
        setResolvedUrl(blobUrl);
        setLoadError(false);
      } else if (!resolvedUrl && (img.previewUrl || img.base64Data) && isMounted) {
        setResolvedUrl(img.previewUrl || (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : ''));
        setLoadError(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [img.id, img.name, img.previewUrl, img.base64Data, resolvedUrl]);

  if (loadError || !resolvedUrl) {
    return (
      <div
        onClick={() => {
          const fallback = resolvedUrl || img.previewUrl || (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '');
          if (fallback) onOpenLightbox(fallback);
        }}
        className={`${className} flex flex-col items-center justify-center bg-blue-50/50 dark:bg-slate-800 text-slate-500 rounded-xl p-3 border border-blue-200/50 dark:border-slate-700 cursor-pointer`}
      >
        <ImageIcon className="w-6 h-6 mb-1 text-blue-400" />
        <span className="text-[11px] font-medium truncate max-w-full text-slate-700 dark:text-slate-300">
          {img.name || 'Gambar'}
        </span>
        {img.size ? (
          <span className="text-[9px] text-slate-400">{formatBytes(img.size)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={img.name}
      onError={() => {
        if (img.previewUrl && resolvedUrl !== img.previewUrl && img.previewUrl.length > 20) {
          setResolvedUrl(img.previewUrl);
        } else {
          setLoadError(true);
        }
      }}
      onClick={() => onOpenLightbox(resolvedUrl)}
      className={className}
      style={{ imageRendering: 'auto' }}
    />
  );
};

// Subcomponent to render live website favicon for Google Search grounding sources
const SourceFavicon: React.FC<{ uri: string; title?: string }> = ({ uri, title }) => {
  const [loadFailed, setLoadFailed] = useState(false);

  let hostname = '';
  try {
    hostname = new URL(uri).hostname;
  } catch {
    hostname = '';
  }

  if (uri.includes('google.com/maps')) {
    return <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
  }

  if (!hostname || loadFailed) {
    return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }

  // Google Favicon service with 32px resolution
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;

  return (
    <img
      src={faviconUrl}
      alt={title || hostname}
      onError={() => setLoadFailed(true)}
      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
      loading="lazy"
    />
  );
};

interface YouTubeInfo {
  videoId?: string;
  searchQuery?: string;
  fullUrl: string;
}

function extractYouTubeInfo(content: string): YouTubeInfo | null {
  if (!content) return null;

  // 1. YouTube watch or embed or youtu.be
  const watchMatch = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) {
    return {
      videoId: watchMatch[1],
      fullUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}`,
    };
  }

  // 2. YouTube search results query
  const searchMatch = content.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/results\?search_query=([^&\s\)"']+)/i);
  if (searchMatch) {
    const rawQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    return {
      searchQuery: rawQuery,
      fullUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}`,
    };
  }

  return null;
}

// Official Service Icon matching Video 1 and Video 2
const ServiceIcon: React.FC<{ icon: LaunchAction['icon']; className?: string }> = ({ icon, className = 'w-5 h-5' }) => {
  if (icon === 'discord') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'youtube' || icon === 'youtube_music') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#FF0000] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'spotify') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#1DB954] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'google') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'instagram') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'tiktok') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V9.41a6.33 6.33 0 0 0-5.74 2.06 6.34 6.34 0 0 0 5.09 10.35 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.57 1.4V7.02c-.34-.01-.67-.09-.98-.22-.01-.04-.01-.07-.02-.11z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'whatsapp') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.301-.15-1.781-.879-2.056-.979-.275-.1-.475-.15-.675.15-.2.301-.775.979-.95 1.179-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.893-.796-1.496-1.78-1.671-2.08-.175-.3-.019-.462.131-.611.136-.134.301-.35.451-.525.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.628-.925-2.228-.244-.585-.492-.505-.675-.515-.175-.008-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05 1.027-1.05 2.504s1.075 2.903 1.225 3.103c.15.2 2.115 3.23 5.124 4.53 3.01 1.3 3.01.867 3.56.812.55-.054 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.428-.075-.125-.275-.2-.575-.35zM12.04 21.785h-.002c-1.76 0-3.486-.473-5.003-1.368l-.359-.213-3.722.976.993-3.628-.233-.371a10.057 10.057 0 0 1-1.542-5.35c0-5.556 4.52-10.076 10.08-10.076 2.693 0 5.225 1.05 7.13 2.955a10.027 10.027 0 0 1 2.95 7.124c0 5.56-4.52 10.076-10.29 10.076zM12.04 0C5.402 0 0 5.402 0 12.04c0 2.12.553 4.187 1.603 6.01L0 24l6.147-1.611A12.012 12.012 0 0 0 12.04 24c6.638 0 12.04-5.402 12.04-12.04S18.678 0 12.04 0z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'github') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-[#24292e] flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </div>
    );
  }

  if (icon === 'twitter') {
    return (
      <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-xs shrink-0">
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
      <Globe className="w-5 h-5" />
    </div>
  );
};

// Sleek Gemini Action Card (Windows Open Engine)
const GeminiActionCard: React.FC<{ action: LaunchAction }> = ({ action }) => {
  return (
    <div className="mt-3 p-3 sm:p-3.5 rounded-2xl bg-[#1e2330] border border-slate-700/60 shadow-md flex items-center justify-between gap-3 text-white animate-in fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <ServiceIcon icon={action.icon} />
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-white truncate">
            {action.title}
          </div>
          {action.subtitle && (
            <div className="text-[11px] text-slate-400 truncate">
              {action.subtitle}
            </div>
          )}
        </div>
      </div>

      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-xs tracking-tight border border-white/20 transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 no-underline"
      >
        <span>Buka</span>
        <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
      </a>
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = React.memo(({
  message,
  speechSpeed = '1x',
  onEditMessage,
  onRegenerateMessage,
  onLoadToInput,
  onOpenImageStudio,
}) => {
  const { isEn } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSelectTextModal, setShowSelectTextModal] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showThoughtDetails, setShowThoughtDetails] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechState>(() => speechService.getState());
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [resendAfterEdit, setResendAfterEdit] = useState(true);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamStartRef = useRef<number | null>(message.isStreaming ? Date.now() : null);
  const [thoughtSeconds, setThoughtSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (message.isStreaming && streamStartRef.current === null) {
      streamStartRef.current = Date.now();
    } else if (!message.isStreaming && streamStartRef.current !== null && thoughtSeconds === null) {
      const elapsed = Math.max(1, Math.round((Date.now() - streamStartRef.current) / 1000));
      setThoughtSeconds(elapsed);
    }
  }, [message.isStreaming, thoughtSeconds]);

  useEffect(() => {
    if (!showContextMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showContextMenu]);

  // Resilient Image Loading & Recovery State
  const [imageError, setImageError] = useState(false);
  const [isRetryingImage, setIsRetryingImage] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | undefined>(message.imageUri);

  useEffect(() => {
    setCurrentImageUri(message.imageUri);
    // Auto-detect if imageUri was corrupted/truncated at 5000 characters by the old Firestore bug
    if (message.imageUri?.startsWith('data:image/') && message.imageUri.length <= 5000) {
      setImageError(true);
    } else {
      setImageError(false);
    }
  }, [message.imageUri]);

  const handleRetryGenerate = async () => {
    setIsRetryingImage(true);
    try {
      const match = message.content.match(/"([^"]+)"/);
      const promptToUse = match ? match[1] : 'anak kucing bermain';
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setCurrentImageUri(data.imageUrl);
          setImageError(false);
        }
      }
    } catch {
      setImageError(true);
    } finally {
      setIsRetryingImage(false);
    }
  };

  // Smooth Typewriter Streaming Animation
  const [displayedContent, setDisplayedContent] = useState<string>(() => message.content);

  useEffect(() => {
    if (!message.isStreaming) {
      setDisplayedContent(message.content);
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateTypewriter = (time: number) => {
      // Step roughly every 30ms (~33Hz) to slash Markdown AST re-parsing CPU overhead while streaming
      if (time - lastTime >= 30) {
        lastTime = time;
        setDisplayedContent((current) => {
          const target = message.content;
          if (current.length >= target.length) {
            return current;
          }

          const delta = target.length - current.length;
          let advance = 2;
          if (delta > 120) advance = 14;
          else if (delta > 60) advance = 9;
          else if (delta > 25) advance = 6;
          else if (delta > 6) advance = 3;
          else advance = 2;

          return target.slice(0, current.length + advance);
        });
      }

      animationFrameId = requestAnimationFrame(updateTypewriter);
    };

    animationFrameId = requestAnimationFrame(updateTypewriter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [message.content, message.isStreaming]);

  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  useEffect(() => {
    return speechService.subscribe((state) => {
      setSpeechState((prev) =>
        prev.activeMessageId === message.id || state.activeMessageId === message.id ? state : prev
      );
    });
  }, [message.id]);

  const isModel = message.role === 'model';
  const isThisSpeaking =
    speechState.isSpeaking && speechState.activeMessageId === message.id;
  const isThisLoading =
    speechState.isLoading && speechState.activeMessageId === message.id;

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareText = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Maria AI',
          text: message.content,
        });
      } else {
        await navigator.clipboard.writeText(message.content);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {}
  };

  const formattedTimestamp = useMemo(() => {
    try {
      const raw = message.createdAt;
      const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : new Date();
      if (isNaN(date.getTime())) return isEn ? 'Just now' : 'Baru saja';
      return date.toLocaleString(isEn ? 'en-US' : 'id-ID', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isEn ? 'Just now' : 'Baru saja';
    }
  }, [message.createdAt, isEn]);

  const formattedUserContent = useMemo(
    () => (message.role === 'user' ? autoFormatMarkdown(message.content) : ''),
    [message.role, message.content]
  );

  const formattedModelContent = useMemo(
    () => (message.role === 'model' ? autoFormatMarkdown(displayedContent) : ''),
    [message.role, displayedContent]
  );

  const userMarkdownComponents = useMemo(
    () => ({
      p({ children }: any) {
        return <div className="mb-1.5 last:mb-0 leading-relaxed">{children}</div>;
      },
      pre({ children }: any) {
        return <>{children}</>;
      },
      strong({ children }: any) {
        return <strong className="font-bold text-white">{children}</strong>;
      },
      em({ children }: any) {
        return <em className="italic">{children}</em>;
      },
      del({ children }: any) {
        return <del className="line-through opacity-80">{children}</del>;
      },
      code({ inline, children, ...props }: any) {
        return (
          <code
            className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-white/15 text-white"
            {...props}
          >
            {children}
          </code>
        );
      },
    }),
    []
  );

  const modelMarkdownComponents = useMemo(
    () => ({
      h1({ children }: any) {
        return (
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800 tracking-tight">
            {children}
          </h1>
        );
      },
      h2({ children }: any) {
        return (
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3.5 mb-1.5 tracking-tight">
            {children}
          </h2>
        );
      },
      h3({ children }: any) {
        return (
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
            {children}
          </h3>
        );
      },
      p({ children }: any) {
        return (
          <div className="mb-3 last:mb-0 text-slate-800 dark:text-slate-100 font-normal leading-[1.7]">
            {children}
          </div>
        );
      },
      pre({ children }: any) {
        return <>{children}</>;
      },
      strong({ children }: any) {
        return <strong className="font-bold text-slate-950 dark:text-white">{children}</strong>;
      },
      em({ children }: any) {
        return <em className="italic">{children}</em>;
      },
      del({ children }: any) {
        return <del className="line-through opacity-75">{children}</del>;
      },
      ul({ children }: any) {
        return <ul className="my-2.5 pl-5 list-disc space-y-1.5 marker:text-slate-400 dark:marker:text-slate-500">{children}</ul>;
      },
      ol({ children }: any) {
        return <ol className="my-2.5 pl-5 list-decimal space-y-1.5 marker:font-semibold marker:text-slate-500 dark:marker:text-slate-400">{children}</ol>;
      },
      li({ children }: any) {
        return <li className="pl-1 text-slate-800 dark:text-slate-100">{children}</li>;
      },
      blockquote({ children }: any) {
        return (
          <blockquote className="my-3 px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171920] rounded-xl text-slate-700 dark:text-slate-300 italic">
            {children}
          </blockquote>
        );
      },
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline ? (
          <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-[#272a36] bg-[#0d1117] text-slate-100 shadow-xs">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="text-blue-400 font-semibold">{match ? match[1] : 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                className="hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{isEn ? 'Copy Code' : 'Salin Kode'}</span>
              </button>
            </div>
            <pre className="p-3.5 text-xs font-mono overflow-x-auto m-0 bg-[#0d1117]">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        ) : (
          <code
            className="px-1.5 py-0.5 rounded-md font-mono text-[12px] bg-slate-100 dark:bg-[#1f222c] text-blue-700 dark:text-blue-300 border border-slate-200/70 dark:border-slate-700/70"
            {...props}
          >
            {children}
          </code>
        );
      },
      table({ children }: any) {
        return (
          <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {children}
            </table>
          </div>
        );
      },
      th({ children }: any) {
        return (
          <th className="px-3 py-2 bg-slate-100 dark:bg-[#181a22] text-left font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
            {children}
          </th>
        );
      },
      td({ children }: any) {
        return (
          <td className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300">
            {children}
          </td>
        );
      },
      a({ href, children }: any) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 font-medium px-0.5 rounded-sm transition-colors group/link"
          >
            <SourceFavicon uri={href || ''} />
            <span>{children}</span>
            <ExternalLink className="w-3 h-3 opacity-70 group-hover/link:opacity-100 shrink-0" />
          </a>
        );
      },
    }),
    [isEn]
  );

  const startLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(true);
    }, 480);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePlayTTS = () => {
    speechService.unlockAudio();

    if (isThisSpeaking || isThisLoading) {
      speechService.stopSpeaking();
    } else {
      let voiceName = 'Aoede';
      let personaId = 'wanita';
      try {
        const saved = localStorage.getItem('maria_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.geminiVoice) voiceName = parsed.geminiVoice;
          if (parsed.voicePersona) personaId = parsed.voicePersona;
        }
      } catch {}

      speechService.speak(message.content, {
        messageId: message.id,
        speed: speechSpeed,
        voiceName,
        personaId,
        preloadedAudioUrl: message.audioUri,
      });
    }
  };

  const images = message.attachments?.filter((a) => a.type === 'image') || [];
  const videos = message.attachments?.filter((a) => a.type === 'video') || [];
  const files =
    message.attachments?.filter(
      (a) => a.type === 'file' || (!images.includes(a) && !videos.includes(a))
    ) || [];
  const hasGrounding = message.groundingLinks && message.groundingLinks.length > 0;

  const lightboxModal = lightboxMedia ? (
    <MediaLightboxModal
      media={lightboxMedia}
      onClose={() => setLightboxMedia(null)}
    />
  ) : null;

  // Select Text Modal (matching "Select text" context action in reference)
  const selectTextModal = showSelectTextModal ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-100"
      onClick={() => setShowSelectTextModal(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1c23] border border-slate-200 dark:border-[#2d303d] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#2a2d3a]">
          <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <TextSelect className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {isEn ? 'Select & Copy Text' : 'Pilih & Salin Teks'}
          </span>
          <button
            type="button"
            onClick={() => setShowSelectTextModal(false)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto select-text text-sm leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[#2a2d3a] flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              handleCopyText();
              setShowSelectTextModal(false);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            {isEn ? 'Copy All' : 'Salin Semua'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ----------------------------------------------------
  // USER MESSAGE BUBBLE (Compact Right-Aligned Capsule + Floating Media Above)
  // ----------------------------------------------------
  if (!isModel) {
    return (
      <div className="group/msg flex justify-end my-3 sm:my-4 px-3 sm:px-6">
        {lightboxModal}
        {selectTextModal}

        <div className="relative flex flex-col items-end max-w-[88%] sm:max-w-[74%] gap-2">
          {/* Floating Media Attachments ABOVE Bubble (Images, Videos, Documents) */}
          {images.length > 0 && (
            <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1 max-w-[260px] sm:max-w-[300px]' : 'grid-cols-2 max-w-[320px]'}`}>
              {images.map((img) => (
                <div
                  key={img.id}
                  role="button"
                  tabIndex={0}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const bestUrl =
                      img.originalUrl ||
                      getOriginalMedia(img.id) ||
                      getOriginalMedia(img.name) ||
                      (await getOriginalMediaBlob(img.id)) ||
                      (await getOriginalMediaBlob(img.name)) ||
                      (img.base64Data ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}` : '') ||
                      img.previewUrl ||
                      '';
                    if (bestUrl) {
                      setLightboxMedia({
                        url: bestUrl,
                        type: 'image',
                        name: img.name || 'Gambar Lampiran',
                        size: img.size,
                      });
                    }
                  }}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group/img border border-slate-200/80 dark:border-slate-700/70 bg-black/5 hover:opacity-95 active:scale-[0.98] transition-all shadow-sm"
                >
                  <HighResImage
                    img={img}
                    onOpenLightbox={(url) =>
                      setLightboxMedia({
                        url,
                        type: 'image',
                        name: img.name || 'Gambar Lampiran',
                        size: img.size,
                      })
                    }
                    className="w-full max-h-64 object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-[11px] font-semibold">
                    <Eye className="w-4 h-4" />
                    <span>Lihat</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className={`grid gap-1.5 ${videos.length === 1 ? 'grid-cols-1 w-64 sm:w-72' : 'grid-cols-2 max-w-[320px]'}`}>
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  role="button"
                  tabIndex={0}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const cachedB64 = vid.base64Data || getMediaBase64(vid.id) || getMediaBase64(vid.name);
                    const bestUrl =
                      vid.originalUrl ||
                      getOriginalMedia(vid.id) ||
                      getOriginalMedia(vid.name) ||
                      (await getOriginalMediaBlob(vid.id)) ||
                      (await getOriginalMediaBlob(vid.name)) ||
                      (cachedB64 ? `data:${vid.mimeType || 'video/mp4'};base64,${cachedB64}` : '') ||
                      vid.previewUrl ||
                      '';
                    if (bestUrl) {
                      setLightboxMedia({
                        url: bestUrl,
                        type: 'video',
                        name: vid.name || 'Video Lampiran',
                        size: vid.size,
                      });
                    }
                  }}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group/vid border border-slate-200/80 dark:border-slate-700/70 aspect-video bg-slate-900 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center"
                >
                  {vid.previewUrl && vid.previewUrl.startsWith('data:image/') ? (
                    <img
                      src={vid.previewUrl}
                      alt={vid.name}
                      className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white">
                      <Film className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/25 group-hover/vid:bg-black/35 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-white text-[10px] font-medium bg-black/75 px-2 py-0.5 rounded-md truncate">
                    <span className="truncate">{vid.name}</span>
                    {vid.size ? <span className="shrink-0 ml-1.5 opacity-90">{formatBytes(vid.size)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col gap-1.5 w-full max-w-[300px]">
              {files.map((file) => {
                const isCodeOrMd =
                  file.name.endsWith('.md') ||
                  file.name.endsWith('.json') ||
                  file.name.endsWith('.csv') ||
                  file.name.endsWith('.txt') ||
                  file.name.endsWith('.js') ||
                  file.name.endsWith('.ts') ||
                  file.name.endsWith('.py');

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-[#1e2028] border border-slate-200 dark:border-[#2c2f3b] shadow-2xs text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                        {isCodeOrMd ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[170px]">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatBytes(file.size)} · {file.name.split('.').pop()?.toUpperCase() || 'Berkas'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const bestUrl =
                          file.originalUrl ||
                          getOriginalMedia(file.id) ||
                          getOriginalMedia(file.name) ||
                          (await getOriginalMediaBlob(file.id)) ||
                          (await getOriginalMediaBlob(file.name)) ||
                          (file.base64Data ? `data:${file.mimeType || 'application/octet-stream'};base64,${file.base64Data}` : '') ||
                          file.previewUrl;
                        if (!bestUrl) return;
                        const a = document.createElement('a');
                        a.href = bestUrl;
                        a.download = file.name || 'berkas';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      title="Unduh berkas"
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sleek Compact Text Bubble (No noisy inner header) */}
          {(message.content.trim() || isEditing) && (
            <div
              onContextMenu={(e) => {
                e.preventDefault();
                setShowContextMenu(true);
              }}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              className={`rounded-3xl rounded-br-md px-4 py-2.5 shadow-2xs ${
                isEditing
                  ? 'w-full min-w-[260px] sm:min-w-[360px] bg-slate-100 border border-blue-400 text-slate-900 dark:bg-[#1e2028] dark:text-white'
                  : 'bg-[#1d4ed8] dark:bg-[#1e3a8a] text-white'
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={Math.min(6, Math.max(2, editContent.split('\n').length))}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-[#13141a] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={resendAfterEdit}
                        onChange={(e) => setResendAfterEdit(e.target.checked)}
                        className="accent-blue-600 rounded"
                      />
                      <span>{isEn ? 'Resend to Maria' : 'Kirim ulang ke Maria'}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-[11px]"
                      >
                        {isEn ? 'Cancel' : 'Batal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = editContent.trim();
                          if (trimmed) {
                            onEditMessage?.(message.id, trimmed, resendAfterEdit);
                            setIsEditing(false);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-[11px]"
                      >
                        {isEn ? 'Save' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white font-normal text-[14.5px] leading-relaxed select-text break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={userMarkdownComponents}
                  >
                    {formattedUserContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Subtle User Bubble Quick Actions Beneath Bubble (Copy, Edit, Context Menu) */}
          {!isEditing && (
            <div className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={handleCopyText}
                title={isEn ? 'Copy message' : 'Salin pesan'}
                className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onEditMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                  }}
                  title={isEn ? 'Edit message' : 'Edit pesan'}
                  className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowContextMenu((prev) => !prev)}
                title={isEn ? 'More options' : 'Opsi lainnya'}
                className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Context Menu Popover */}
          {showContextMenu && (
            <div
              ref={contextMenuRef}
              className="absolute right-0 top-full mt-1 z-40 w-52 border rounded-2xl shadow-2xl py-1.5 text-xs bg-white border-slate-200 text-slate-800 dark:bg-[#232429] dark:border-[#34363f] dark:text-slate-100"
            >
              <div className="px-3.5 py-2 text-[11px] text-slate-400 border-b border-slate-100 dark:border-[#32343d] capitalize">
                {formattedTimestamp}
              </div>

              <button
                type="button"
                onClick={() => {
                  handleCopyText();
                  setShowContextMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{isEn ? 'Copy' : 'Salin'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSelectTextModal(true);
                  setShowContextMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
              >
                <TextSelect className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{isEn ? 'Select text' : 'Pilih teks'}</span>
              </button>

              {onEditMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{isEn ? 'Edit message' : 'Edit pesan'}</span>
                </button>
              )}

              {onLoadToInput && (
                <button
                  type="button"
                  onClick={() => {
                    onLoadToInput(message.content);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{isEn ? 'Load to input' : 'Muat ke input'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleShareText();
                  setShowContextMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>{isEn ? 'Share prompt' : 'Bagikan prompt'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MARIA AI RESPONSE STREAM (Open Borderless Editorial Canvas — Gemini + ChatGPT Style)
  // ----------------------------------------------------
  return (
    <div className="flex justify-start my-3 sm:my-4 px-3 sm:px-6">
      {lightboxModal}
      {selectTextModal}

      <div className="w-full max-w-3xl space-y-2.5">
        {/* Minimal Identity & Collapsible Thought Status Row (Zero Pill Clutter) */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={message.isStreaming ? 'animate-gentle-pulse' : ''}>
              <MariaLogo size="sm" withOnlineDot={false} />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              Maria AI
            </span>
            {message.model && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {message.model.replace('-preview', '')}
                </span>
              </>
            )}
            {(thoughtSeconds || message.thinkingProcess) && !message.isStreaming && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setShowThoughtDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{isEn ? `Thought for ${thoughtSeconds || 1} s` : `Diproses dalam ${thoughtSeconds || 1} dtk`}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showThoughtDetails ? 'rotate-180' : ''}`} />
                </button>
              </>
            )}
            {message.isStreaming && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span>{isEn ? 'Responding...' : 'Sedang menjawab...'}</span>
                </span>
              </>
            )}
            {isThisLoading && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{isEn ? 'Preparing voice' : 'Menyiapkan suara'}</span>
                </span>
              </>
            )}
            {isThisSpeaking && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  <span>{isEn ? 'Speaking' : 'Berbicara'}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Collapsible Thought Details */}
        {showThoughtDetails && (
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#17181d] border border-slate-200/80 dark:border-[#272932] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {message.thinkingProcess || (isEn ? `Response generated using ${message.model || 'Gemini'} in ${thoughtSeconds || 1} seconds.` : `Respons disusun menggunakan model ${message.model || 'Gemini'} dalam ${thoughtSeconds || 1} detik.`)}
          </div>
        )}

        {/* Open Borderless Response Prose */}
        <div className="text-[15px] leading-[1.7] select-text break-words text-slate-800 dark:text-slate-100">
          {!displayedContent.trim() && message.isStreaming && (
            <div className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-medium">{isEn ? 'Maria is formulating a response...' : 'Maria sedang merumuskan jawaban...'}</span>
            </div>
          )}

          {Boolean(displayedContent.trim()) && (
            <div className="relative">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={modelMarkdownComponents}
              >
                {formattedModelContent}
              </ReactMarkdown>

              {message.isStreaming && (
                <span
                  className="inline-block w-2 h-4 ml-1 bg-blue-500 rounded-xs animate-cursor-blink align-middle"
                  title="Sedang mengetik..."
                />
              )}
            </div>
          )}
        </div>

        {/* AI Generated Image Output Directly Under Text (Clean Rounded Frame Matching Reference Video) */}
        {currentImageUri && (
          <div className="my-2.5 max-w-md sm:max-w-lg space-y-2">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a2d3a] bg-slate-100 dark:bg-[#171920] flex items-center justify-center min-h-[200px] relative shadow-sm">
              {imageError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sinkronisasi Ulang Gambar
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
                      Data gambar sesi sebelumnya perlu dimuat ulang dalam resolusi penuh.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isRetryingImage}
                    onClick={handleRetryGenerate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isRetryingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isRetryingImage ? 'Memuat Ulang...' : 'Muat Gambar Sekarang'}</span>
                  </button>
                </div>
              ) : (
                <img
                  src={currentImageUri}
                  alt="Hasil generasi gambar"
                  onError={() => setImageError(true)}
                  onClick={() =>
                    setLightboxMedia({
                      url: currentImageUri,
                      type: 'image',
                      name: 'Maria_AI_Generated.png',
                    })
                  }
                  className="w-full max-h-[480px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                />
              )}
            </div>

            {!imageError && (
              <div className="flex items-center justify-between gap-2 px-0.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenImageStudio?.(currentImageUri, 'Modifikasi gambar ini: ')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                  <span>{isEn ? 'Edit Image' : 'Edit Gambar'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = currentImageUri;
                      a.download = `MariaAI_${Date.now()}.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1c1e26] hover:bg-slate-200 dark:hover:bg-[#252833] text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                    title={isEn ? 'Download Image' : 'Unduh Gambar'}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isEn ? 'Download' : 'Unduh'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxMedia({
                        url: currentImageUri,
                        type: 'image',
                        name: 'Maria_AI_Generated.png',
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1c1e26] hover:bg-slate-200 dark:hover:bg-[#252833] text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                    title={isEn ? 'Zoom View' : 'Perbesar Tampilan'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isEn ? 'Zoom' : 'Perbesar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Windows Open Interactive Action Card */}
        {(() => {
          if (message.launchAction) {
            return <GeminiActionCard action={message.launchAction} />;
          }

          const detected = detectLaunchAction(message.content);
          if (detected) {
            return <GeminiActionCard action={detected} />;
          }

          const ytInfo = extractYouTubeInfo(message.content);
          if (ytInfo) {
            const action: LaunchAction = {
              type: 'youtube_music',
              title: ytInfo.searchQuery ? `Putar: ${ytInfo.searchQuery}` : 'YouTube',
              subtitle: 'YouTube Music',
              url: ytInfo.fullUrl,
              statusText: 'Connecting to YouTube Music',
              icon: 'youtube_music',
            };
            return <GeminiActionCard action={action} />;
          }

          return null;
        })()}

        {/* Bottom Action Toolbar (Copy, Thumb Up, Thumb Down, Voice, Share, Regenerate, More + Sources) */}
        {!message.isStreaming && (
          <div className="relative pt-1 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={handleCopyText}
                title={isEn ? 'Copy response' : 'Salin jawaban'}
                className="p-2 rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setFeedback((prev) => (prev === 'like' ? null : 'like'))}
                title={isEn ? 'Good response' : 'Respon bagus'}
                className={`p-2 rounded-xl cursor-pointer ${
                  feedback === 'like'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setFeedback((prev) => (prev === 'dislike' ? null : 'dislike'))}
                title={isEn ? 'Needs improvement' : 'Kurang tepat'}
                className={`p-2 rounded-xl cursor-pointer ${
                  feedback === 'dislike'
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handlePlayTTS}
                disabled={isThisLoading}
                title={isThisSpeaking ? (isEn ? 'Stop audio' : 'Hentikan suara') : (isEn ? 'Read aloud' : 'Dengarkan suara')}
                className={`p-2 rounded-xl cursor-pointer ${
                  isThisSpeaking
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {isThisSpeaking ? (
                  <VolumeX className="w-4 h-4 animate-pulse" />
                ) : isThisLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleShareText}
                title={isEn ? 'Share response' : 'Bagikan jawaban'}
                className="p-2 rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                {shared ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>

              {onRegenerateMessage && (
                <button
                  type="button"
                  onClick={() => onRegenerateMessage(message.id)}
                  title={isEn ? 'Regenerate response' : 'Buat ulang jawaban'}
                  className="p-2 rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowContextMenu((prev) => !prev)}
                title={isEn ? 'More options' : 'Opsi lainnya'}
                className="p-2 rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Sources Button with stacked favicons */}
            {hasGrounding && (
              <button
                type="button"
                onClick={() => setShowSources((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#1c1e26] hover:bg-slate-200 dark:hover:bg-[#252834] border border-slate-200/80 dark:border-[#2e313d] text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span className="flex items-center -space-x-1.5">
                  {message.groundingLinks!.slice(0, 3).map((l, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full bg-white dark:bg-[#111318] border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden"
                    >
                      <SourceFavicon uri={l.uri} title={l.title} />
                    </span>
                  ))}
                </span>
                <span>Sources ({message.groundingLinks!.length})</span>
              </button>
            )}

            {/* AI Context Menu Popover */}
            {showContextMenu && (
              <div
                ref={contextMenuRef}
                className="absolute left-0 bottom-full mb-1 z-40 w-52 border rounded-2xl shadow-2xl py-1.5 text-xs bg-white border-slate-200 text-slate-800 dark:bg-[#232429] dark:border-[#34363f] dark:text-slate-100"
              >
                <div className="px-3.5 py-2 text-[11px] text-slate-400 border-b border-slate-100 dark:border-[#32343d] capitalize">
                  {formattedTimestamp}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCopyText();
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{isEn ? 'Copy' : 'Salin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSelectTextModal(true);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                >
                  <TextSelect className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{isEn ? 'Select text' : 'Pilih teks'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePlayTTS();
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>{isThisSpeaking ? (isEn ? 'Stop speaking' : 'Hentikan suara') : (isEn ? 'Read aloud' : 'Bacakan respons')}</span>
                </button>
                {onRegenerateMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      onRegenerateMessage(message.id);
                      setShowContextMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>{isEn ? 'Regenerate response' : 'Buat ulang respons'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expandable Google Search Grounding Sources Drawer */}
        {hasGrounding && showSources && (
          <div className="pt-2 animate-in fade-in duration-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.groundingLinks!.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#171920] hover:bg-blue-50/70 dark:hover:bg-[#1f222c] border border-slate-200 dark:border-[#2a2d3a] transition-colors group/link"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SourceFavicon uri={link.uri} title={link.title} />
                    <span className="truncate text-slate-800 dark:text-slate-200 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 font-medium">
                      {link.title || link.uri}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/link:text-blue-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
