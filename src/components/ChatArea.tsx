import React, { useRef, useEffect, useState } from "react";
import { Message, PromptStarter, UserSettings, AppNotification } from "../types";
import { PROMPT_STARTERS, THEME_OPTIONS } from "../constants";
import { compressImage } from "../utils";
import { 
  Send, 
  Sparkles, 
  User, 
  Clock, 
  Copy, 
  Check, 
  RefreshCcw, 
  AlertTriangle,
  Bell,
  Trash2,
  LayoutDashboard,
  X,
  Volume2,
  VolumeX,
  Sliders,
  BellRing,
  Award,
  BookOpen,
  Settings,
  Menu,
  Image,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Bookmark,
  // External app opener icons
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Globe,
  ExternalLink,
  Laptop
} from "lucide-react";
import GeminiLiveCall from "./GeminiLiveCall";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string, image?: string, audio?: string) => void;
  settings: UserSettings;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotifications: () => void;
  onAddSystemNotification: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
  onRegenerateResponse?: (messageId: string) => void;
  onSetFeedback?: (messageId: string, feedback: "like" | "dislike") => void;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
  onToggleBookmark?: (message: Message) => void;
  bookmarkedMessages?: Message[];
  isLoggedIn?: boolean;
  profileDisplayNameProp?: string;
  onOpenLogin?: () => void;
  pendingPrompt?: string | null;
  onClearPendingPrompt?: () => void;
  isPlus?: boolean;
  speakMessage?: (text: string) => void;
  isPlayingAudio?: boolean;
  stopSpeech?: () => void;
}

// Config lists for resolving color schema & icons for requested external web apps
function getAppSpecs(name: string) {
  const normalized = name.toLowerCase().trim();
  if (normalized.includes("youtube") || normalized.includes("yt")) {
    return {
      icon: <Youtube className="w-5 h-5 text-red-600" />,
      colorClass: "bg-red-50/50 hover:bg-red-50 border-red-200 text-red-700",
      btnClass: "bg-red-600 hover:bg-red-750 text-white shadow-xs hover:shadow-sm",
      bgSubtle: "bg-red-500/5",
      accentLine: "bg-red-600"
    };
  }
  if (normalized.includes("instagram") || normalized.includes("ig")) {
    return {
      icon: <Instagram className="w-5 h-5 text-pink-600" />,
      colorClass: "bg-pink-50/50 hover:bg-pink-50 border-pink-200 text-pink-700",
      btnClass: "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white shadow-xs hover:shadow-sm",
      bgSubtle: "bg-pink-500/5",
      accentLine: "bg-pink-600"
    };
  }
  if (normalized.includes("facebook") || normalized.includes("fb")) {
    return {
      icon: <Facebook className="w-5 h-5 text-blue-600" />,
      colorClass: "bg-blue-50/50 hover:bg-blue-55 border-blue-200 text-blue-800",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-sm",
      bgSubtle: "bg-blue-500/5",
      accentLine: "bg-blue-600"
    };
  }
  if (normalized.includes("twitter") || normalized.includes("x.com") || normalized.includes(" x ")) {
    return {
      icon: <Twitter className="w-5 h-5 text-sky-500" />,
      colorClass: "bg-sky-50/50 hover:bg-sky-50 border-sky-100 text-sky-850",
      btnClass: "bg-sky-500 hover:bg-sky-600 text-white shadow-xs hover:shadow-sm",
      bgSubtle: "bg-sky-500/5",
      accentLine: "bg-sky-500"
    };
  }
  if (normalized.includes("google") || normalized.includes("gmail") || normalized.includes("drive")) {
    return {
      icon: <Globe className="w-5 h-5 text-emerald-600" />,
      colorClass: "bg-emerald-50/50 hover:bg-emerald-55 border-emerald-200 text-emerald-800",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm",
      bgSubtle: "bg-emerald-500/5",
      accentLine: "bg-emerald-600"
    };
  }
  // Default fallback style
  return {
    icon: <ExternalLink className="w-5 h-5 text-slate-600" />,
    colorClass: "bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-800",
    btnClass: "bg-slate-800 hover:bg-slate-900 text-white shadow-xs hover:shadow-sm",
    bgSubtle: "bg-slate-500/5",
    accentLine: "bg-slate-700"
  };
}

// Interactive component representing a link preview to open an external website
function LinkOpenerCard({ 
  name, 
  url, 
  messageId, 
  messageTimestamp 
}: { 
  name: string; 
  url: string; 
  key?: React.Key;
  messageId?: string;
  messageTimestamp?: string;
}) {
  const specs = getAppSpecs(name);
  const [popupBlocked, setPopupBlocked] = useState(false);
  
  // Format user-friendly displayed URL hostname
  let displayUrl = url;
  try {
    const cleanUrl = url.trim();
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    displayUrl = parsed.hostname + parsed.pathname;
    if (displayUrl.endsWith("/")) displayUrl = displayUrl.slice(0, -1);
  } catch (e) {
    // fallback
  }

  // Ensure absolute protocol link target
  const targetHref = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

  // Automatically trigger link opening if the message is brand new and hasn't been opened yet
  useEffect(() => {
    if (!messageId) return;
    const sessionKey = `autolink_opened_${messageId}_${url}`;
    const alreadyOpened = sessionStorage.getItem(sessionKey);
    if (alreadyOpened) return;

    // Check if the message is fresh (less than 15 seconds old)
    const timestampMs = messageTimestamp ? new Date(messageTimestamp).getTime() : Date.now();
    const ageSeconds = (Date.now() - timestampMs) / 1000;

    if (ageSeconds < 15) {
      sessionStorage.setItem(sessionKey, "true");
      
      // Attempt: Try window.open targetHref in new tab
      try {
        const openedWindow = window.open(targetHref, "_blank");
        if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === "undefined") {
          setPopupBlocked(true);
        }
      } catch (err) {
        console.error("Auto redirection failed inside sandbox:", err);
        setPopupBlocked(true);
      }
    }
  }, [messageId, messageTimestamp, targetHref, url]);

  // Determine if this is a YouTube link and extract details for direct embedding
  let ytEmbedUrl: string | null = null;
  const isYoutube = url.toLowerCase().includes("youtube.com") || url.toLowerCase().includes("youtu.be");
  if (isYoutube) {
    try {
      const cleanUrl = url.trim();
      // Case 1: Search results
      if (cleanUrl.includes("results?search_query=") || cleanUrl.includes("search_query=")) {
        const queryParam = cleanUrl.split("search_query=")[1]?.split("&")[0];
        if (queryParam) {
          ytEmbedUrl = `https://www.youtube.com/embed?listType=search&list=${queryParam}`;
        }
      } 
      // Case 2: watch?v=VIDEO_ID
      else if (cleanUrl.includes("watch?v=")) {
        const videoId = cleanUrl.split("watch?v=")[1]?.split("&")[0];
        if (videoId) {
          ytEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }
      // Case 3: youtu.be/VIDEO_ID
      else if (cleanUrl.includes("youtu.be/")) {
        const urlParts = cleanUrl.split("youtu.be/");
        const lastPart = urlParts[urlParts.length - 1];
        const videoId = lastPart?.split("?")[0]?.split("&")[0];
        if (videoId) {
          ytEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
      }
    } catch (e) {
      console.error("Error parsing YouTube URL for embed:", e);
    }
  }

  return (
    <div className={`my-3.5 relative overflow-hidden rounded-xl border p-4 shadow-2xs transition-all duration-200 hover:shadow-xs ${specs.colorClass} flex flex-col gap-3 select-none animate-fade-in`}>
      {/* Visual background subtle effects */}
      <div className={`absolute inset-0 -z-10 opacity-30 ${specs.bgSubtle}`} />
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${specs.accentLine}`} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-lg shadow-3xs border border-slate-150 flex items-center justify-center shrink-0">
            {specs.icon}
          </div>
          <div className="min-w-0">
            <div className="font-display font-medium text-slate-900 text-xs sm:text-[13px] tracking-tight flex items-center gap-1.5 leading-snug">
              {ytEmbedUrl ? "Pemutar Musik Maria (YouTube)" : `Buka ${name}`}
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-[10px] font-normal text-slate-400">
                {ytEmbedUrl ? "Putar Langsung" : "Tautan Aplikasi"}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[200px] sm:max-w-[280px]">
              {displayUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a
            href={targetHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-lg text-[11px] font-bold shadow-xs whitespace-nowrap transition-transform active:scale-95 duration-250 cursor-pointer flex items-center gap-1.5 shrink-0 ${specs.btnClass}`}
          >
            <span>{ytEmbedUrl ? "Buka di YouTube" : "Luncurkan Aplikasi"}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Direct YouTube Stream Embed Player */}
      {ytEmbedUrl && (
        <div className="mt-2 w-full rounded-xl overflow-hidden border border-slate-200/80 shadow-xs bg-black aspect-video relative">
          <iframe 
            src={ytEmbedUrl}
            title="Maria Youtube Player"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
          />
        </div>
      )}

      {popupBlocked && !ytEmbedUrl && (
        <div className="mt-1 text-[11px] bg-amber-50/80 border border-amber-200 text-amber-900 rounded-lg p-2.5 flex items-start gap-1.5 animate-fade-in shadow-2xs">
          <div className="font-bold text-amber-700 shrink-0 mt-0.5">⚠️ INFO HP:</div>
          <p className="leading-relaxed font-sans">
            Membuka otomatis terhalang oleh pemblokir pop-up browser HP Anda atau batasan sandbox. Silakan klik tombol <strong>Luncurkan Aplikasi</strong> di atas untuk langsung membukanya di tab baru secara aman!
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to render formatting inside non-app-opener parts
function FormattedSubPart({ text, isAi = true }: { text: string; isAi?: boolean; key?: React.Key }) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Code Block
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          let language = "text";
          let code = lines.join("\n");
          
          if (lines[0] && !lines[0].includes(" ") && lines[0].length < 15) {
            language = lines[0];
            code = lines.slice(1).join("\n");
          }

          return (
            <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-200/80 shadow-2xs font-mono text-[12px]">
              <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 text-slate-400 text-[10px] font-bold tracking-wider uppercase select-none">
                <span>{language}</span>
                <span className="text-[9px] text-slate-500">KODE RESPONS</span>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 overflow-x-auto selection:bg-blue-600/35 leading-tight">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Standard text formatting parsing (Inline bold text, quotes, bullet points, and tables)
        const subLines = part.split("\n");
        interface Block {
          type: 'paragraph' | 'ul' | 'ol' | 'blockquote' | 'h2' | 'h3' | 'h4' | 'table';
          items?: string[];
          text?: string;
          tableRows?: Array<{ isHeaderDivider: boolean; cells: string[] }>;
        }
        
        const blocks: Block[] = [];
        let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
        let currentQuote: { items: string[] } | null = null;
        let currentTable: Array<{ isHeaderDivider: boolean; cells: string[] }> | null = null;

        const flushList = () => {
          if (currentList) {
            blocks.push({ type: currentList.type, items: currentList.items });
            currentList = null;
          }
        };
        const flushQuote = () => {
          if (currentQuote) {
            blocks.push({ type: 'blockquote', text: currentQuote.items.join("\n") });
            currentQuote = null;
          }
        };
        const flushTable = () => {
          if (currentTable) {
            blocks.push({ type: 'table', tableRows: currentTable });
            currentTable = null;
          }
        };
        const flushAll = () => {
          flushList();
          flushQuote();
          flushTable();
        };

        for (let i = 0; i < subLines.length; i++) {
          const line = subLines[i];
          const trimmed = line.trim();

          if (trimmed === "") {
            flushAll();
            continue;
          }

          // Table checking (lines starting with pipe "|")
          if (trimmed.startsWith("|")) {
            flushList();
            flushQuote();

            const isDivider = trimmed.replace(/[\s|:-]/g, '') === '' && trimmed.includes('-');
            const rawCells = trimmed.split("|");
            let cells = rawCells.map(c => c.trim());
            if (trimmed.startsWith("|")) cells.shift();
            if (trimmed.endsWith("|") && cells.length > 0) cells.pop();

            if (!currentTable) {
              currentTable = [];
            }
            currentTable.push({ isHeaderDivider: isDivider, cells });
            continue;
          }

          // Headers
          if (trimmed.startsWith("### ")) {
            flushAll();
            blocks.push({ type: 'h4', text: trimmed.slice(4) });
            continue;
          }
          if (trimmed.startsWith("## ")) {
            flushAll();
            blocks.push({ type: 'h3', text: trimmed.slice(3) });
            continue;
          }
          if (trimmed.startsWith("# ")) {
            flushAll();
            blocks.push({ type: 'h2', text: trimmed.slice(2) });
            continue;
          }

          // Blockquotes
          if (trimmed.startsWith("> ")) {
            flushList();
            flushTable();
            const quoteContent = line.slice(line.indexOf(">") + 1).trim();
            if (currentQuote) {
              currentQuote.items.push(quoteContent);
            } else {
              currentQuote = { items: [quoteContent] };
            }
            continue;
          }

          // Bullet lists
          const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ");
          if (isBullet) {
            flushQuote();
            flushTable();
            const bulletContent = trimmed.slice(2).trim();
            if (currentList && currentList.type === 'ul') {
              currentList.items.push(bulletContent);
            } else {
              flushList();
              currentList = { type: 'ul', items: [bulletContent] };
            }
            continue;
          }

          // Numbered lists
          const numberMatch = trimmed.match(/^(\d+)\.\s(.*)/);
          if (numberMatch) {
            flushQuote();
            flushTable();
            const numberContent = numberMatch[2].trim();
            if (currentList && currentList.type === 'ol') {
              currentList.items.push(numberContent);
            } else {
              flushList();
              currentList = { type: 'ol', items: [numberContent] };
            }
            continue;
          }

          // Regular paragraph
          flushAll();
          blocks.push({ type: 'paragraph', text: line });
        }

        flushAll();

        return (
          <div key={index} className="space-y-2 select-text">
            {blocks.map((block, bIdx) => {
              if (block.type === 'ul') {
                return (
                  <ul key={bIdx} className={`list-disc pl-5 my-2 space-y-1 text-[13px] ${isAi ? "text-slate-700" : "text-white"}`}>
                    {block.items?.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {parseInlineStyles(item, isAi)}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (block.type === 'ol') {
                return (
                  <ol key={bIdx} className={`list-decimal pl-5 my-2 space-y-1 text-[13px] ${isAi ? "text-slate-700" : "text-white"}`}>
                    {block.items?.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {parseInlineStyles(item, isAi)}
                      </li>
                    ))}
                  </ol>
                );
              }
              if (block.type === 'blockquote') {
                return (
                  <blockquote key={bIdx} className={`border-l-4 border-blue-200 pl-3.5 py-1.5 my-2.5 rounded-r-md text-xs italic leading-relaxed ${isAi ? "bg-blue-50/20 text-slate-600" : "bg-white/10 text-white/90"}`}>
                    {parseInlineStyles(block.text || "", isAi)}
                  </blockquote>
                );
              }
              if (block.type === 'h4') {
                return (
                  <h4 key={bIdx} className={`font-display font-bold text-sm mt-3.5 mb-1.5 leading-snug ${isAi ? "text-slate-800" : "text-white"}`}>
                    {parseInlineStyles(block.text || "", isAi)}
                  </h4>
                );
              }
              if (block.type === 'h3') {
                return (
                  <h3 key={bIdx} className={`font-display font-bold text-base mt-4 mb-2 leading-snug ${isAi ? "text-slate-900" : "text-white"}`}>
                    {parseInlineStyles(block.text || "", isAi)}
                  </h3>
                );
              }
              if (block.type === 'h2') {
                return (
                  <h2 key={bIdx} className={`font-display font-bold text-lg mt-5 mb-2.5 leading-snug ${isAi ? "text-slate-900" : "text-white"}`}>
                    {parseInlineStyles(block.text || "", isAi)}
                  </h2>
                );
              }
              if (block.type === 'table' && block.tableRows) {
                const activeRows = block.tableRows.filter(r => !r.isHeaderDivider);
                if (activeRows.length === 0) return null;

                const headerRow = activeRows[0];
                const bodyRows = activeRows.slice(1);

                return (
                  <div key={bIdx} className="my-4 w-full overflow-x-auto rounded-xl border border-slate-200/85 bg-white/90 shadow-2xs max-w-full">
                    <table className="min-w-full divide-y divide-slate-200 text-[12.5px] text-slate-700">
                      <thead className="bg-slate-100/80">
                        <tr>
                          {headerRow.cells.map((cell, cellIdx) => (
                            <th 
                              key={cellIdx} 
                              className="px-4 py-2.5 text-left font-display font-semibold text-slate-800 tracking-tight"
                            >
                              {parseInlineStyles(cell, isAi)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {bodyRows.length === 0 ? (
                          <tr>
                            <td colSpan={headerRow.cells.length} className="px-4 py-4 text-center text-slate-400 italic">
                              Tidak ada data rincian.
                            </td>
                          </tr>
                        ) : (
                          bodyRows.map((row, rowIdx) => (
                            <tr 
                              key={rowIdx} 
                              className={`transition-colors hover:bg-slate-50/50 ${
                                rowIdx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                              }`}
                            >
                              {Array.from({ length: headerRow.cells.length }).map((_, cellIdx) => {
                                const cellVal = row.cells[cellIdx] || "";
                                return (
                                  <td key={cellIdx} className="px-4 py-2.5 align-middle leading-normal">
                                    {parseInlineStyles(cellVal, isAi)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return (
                <p key={`p-${bIdx}`} className={`min-h-[1.25rem] text-[13px] leading-relaxed ${isAi ? "text-slate-700" : "text-white"}`}>
                  {parseInlineStyles(block.text || "", isAi)}
                </p>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// A regex-based syntax formatting renderer for rendering Voxa's responses beautifully
function FormattedContent({ 
  text, 
  messageId, 
  messageTimestamp,
  isAi = true,
}: { 
  text: string; 
  messageId?: string; 
  messageTimestamp?: string; 
  isAi?: boolean;
}) {
  // First intercept [OPEN_APP:AppName|URL] tags to split normal sections from action cards
  const parts = text.split(/(\[OPEN_APP:[^\]]+\])/g);

  return (
    <div className={`space-y-2 text-sm leading-relaxed font-sans ${isAi ? "text-slate-700" : "text-white"}`}>
      {parts.map((part, index) => {
        if (part.startsWith("[OPEN_APP:") && part.endsWith("]")) {
          const match = part.match(/\[OPEN_APP:(.*?)\|(.*?)\]/);
          if (match) {
            const [, appName, appUrl] = match;
            return (
              <LinkOpenerCard 
                key={index} 
                name={appName.trim()} 
                url={appUrl.trim()} 
                messageId={messageId} 
                messageTimestamp={messageTimestamp} 
              />
            );
          }
        }
        
        // Otherwise parse normal formatting structures
        return <FormattedSubPart key={index} text={part} isAi={isAi} />;
      })}
    </div>
  );
}

// Sub-helper parsing bold/italic/links/bare URLs inline markdown inside FormattedContent
function parseInlineStyles(text: string, isAi: boolean = true): React.ReactNode[] {
  if (!text) return [];

  let currentText = text;
  const result: React.ReactNode[] = [];
  let keyCount = 0;

  const pushPart = (txt: string) => {
    if (!txt) return;
    result.push(<React.Fragment key={`text-${keyCount++}`}>{txt}</React.Fragment>);
  };

  while (currentText) {
    // Find earliest occurrences of various formats
    const boldMatch = currentText.match(/\*\*([\s\S]*?)\*\*/);
    const italicMatch = currentText.match(/\*([\s\S]*?)\*/);
    const codeMatch = currentText.match(/`([\s\S]*?)`/);
    const linkMatch = currentText.match(/\[([^\]]*?)\]\(([^)]*?)\)/);
    const bareUrlMatch = currentText.match(/(https?:\/\/[^\s()<>]+|www\.[^\s()<>]+)/);
    const strikethroughMatch = currentText.match(/~~([\s\S]*?)~~/);

    const candidates: Array<{ index: number; length: number; render: () => React.ReactNode }> = [];

    if (boldMatch && boldMatch.index !== undefined) {
      candidates.push({
        index: boldMatch.index,
        length: boldMatch[0].length,
        render: () => (
          <strong key={`bold-${keyCount++}`} className={`font-bold ${isAi ? "text-slate-900" : "text-white font-extrabold"}`}>
            {boldMatch[1]}
          </strong>
        )
      });
    }

    if (strikethroughMatch && strikethroughMatch.index !== undefined) {
      candidates.push({
        index: strikethroughMatch.index,
        length: strikethroughMatch[0].length,
        render: () => (
          <span key={`strike-${keyCount++}`} className="line-through opacity-80">
            {strikethroughMatch[1]}
          </span>
        )
      });
    }

    if (italicMatch && italicMatch.index !== undefined) {
      candidates.push({
        index: italicMatch.index,
        length: italicMatch[0].length,
        render: () => (
          <em key={`italic-${keyCount++}`} className="italic">
            {italicMatch[1]}
          </em>
        )
      });
    }

    if (codeMatch && codeMatch.index !== undefined) {
      candidates.push({
        index: codeMatch.index,
        length: codeMatch[0].length,
        render: () => (
          <code key={`code-${keyCount++}`} className={`px-1.5 py-0.5 border rounded text-xs select-all font-mono ${isAi ? "bg-slate-150 border-slate-200 text-slate-800" : "bg-slate-950/25 border-white/10 text-amber-250 font-semibold"}`}>
            {codeMatch[1]}
          </code>
        )
      });
    }

    if (linkMatch && linkMatch.index !== undefined) {
      candidates.push({
        index: linkMatch.index,
        length: linkMatch[0].length,
        render: () => {
          const label = linkMatch[1] || linkMatch[2];
          let href = linkMatch[2].trim();
          if (href.startsWith("www.")) {
            href = "https://" + href;
          }
          return (
            <a
              key={`link-${keyCount++}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline font-bold transition-all decoration-2 hover:opacity-85 ${
                isAi 
                  ? "text-blue-650 hover:text-blue-800 decoration-blue-200" 
                  : "text-amber-250 hover:text-white decoration-white/30"
              }`}
            >
              {label}
            </a>
          );
        }
      });
    }

    if (bareUrlMatch && bareUrlMatch.index !== undefined) {
      let isPartOfMarkdownLink = false;
      if (linkMatch && linkMatch.index !== undefined) {
        const urlPartStart = linkMatch.index + linkMatch[1].length + 3;
        const urlPartEnd = urlPartStart + linkMatch[2].length;
        if (bareUrlMatch.index >= urlPartStart && bareUrlMatch.index <= urlPartEnd) {
          isPartOfMarkdownLink = true;
        }
      }

      if (!isPartOfMarkdownLink) {
        candidates.push({
          index: bareUrlMatch.index,
          length: bareUrlMatch[0].length,
          render: () => {
            let href = bareUrlMatch[1].trim();
            if (href.startsWith("www.")) {
              href = "https://" + href;
            }
            return (
              <a
                key={`bare-${keyCount++}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline font-bold transition-all decoration-2 hover:opacity-85 ${
                  isAi 
                    ? "text-blue-650 hover:text-blue-850 decoration-blue-200" 
                    : "text-amber-250 hover:text-white decoration-white/30"
                }`}
              >
                {bareUrlMatch[1]}
              </a>
            );
          }
        });
      }
    }

    if (candidates.length === 0) {
      pushPart(currentText);
      break;
    }

    // Sort by index first (earliest match wins)
    candidates.sort((a, b) => {
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return b.length - a.length;
    });

    const earliest = candidates[0];

    // Push text before the match
    if (earliest.index > 0) {
      pushPart(currentText.slice(0, earliest.index));
    }

    // Push match render
    result.push(earliest.render());

    // Slice off processed text
    currentText = currentText.slice(earliest.index + earliest.length);
  }

  return result;
}

export default function ChatArea({
  messages,
  isLoading,
  onSendMessage,
  settings,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  onAddSystemNotification,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleSettings,
  onRegenerateResponse,
  onSetFeedback,
  onEditUserMessage,
  onToggleBookmark,
  bookmarkedMessages = [],
  isLoggedIn = false,
  profileDisplayNameProp,
  onOpenLogin,
  pendingPrompt,
  onClearPendingPrompt,
  isPlus = false,
  speakMessage,
  isPlayingAudio,
  stopSpeech,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent standard newline behavior of textarea
      if (inputText.trim() || attachedImage || voiceBase64) {
        if (!isLoading) {
          const form = e.currentTarget.closest("form");
          if (form) {
            form.requestSubmit();
          }
        }
      }
    }
  };

  // Load a pending prompt stored in reactive states cleanly (used by Library / Discover redirection)
  useEffect(() => {
    if (pendingPrompt) {
      setInputText(pendingPrompt);
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt, onClearPendingPrompt]);
  const [isCopiedId, setIsCopiedId] = useState<string | null>(null);
  const [isWidgetPanelExpanded, setIsWidgetPanelExpanded] = useState(true);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);

  // States for in-chat editing of user messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const startEditing = (id: string, currentContent: string) => {
    setEditingMessageId(id);
    setEditingText(currentContent);
  };

  const handleSaveMessageEdit = (id: string) => {
    if (onEditUserMessage && editingText.trim()) {
      onEditUserMessage(id, editingText);
    }
    setEditingMessageId(null);
  };

  // Attachment / Voice Note states for absolute multimodal support
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [, setVoiceBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Clean recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // File Upload Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        try {
          const rawBase64 = event.target.result;
          // Dynamically scale/compress image to lightweight JPEG format (~20-50KB)
          const compressed = await compressImage(rawBase64);
          setAttachedImage(compressed);
          onAddSystemNotification(
            "Gambar Terlampir",
            `Gambar "${file.name}" berhasil diunggah dan siap dikirim ke Maria.`,
            "success"
          );
        } catch (compressionErr) {
          // Robust fallback
          setAttachedImage(event.target.result);
          onAddSystemNotification(
            "Gambar Terlampir",
            `Gambar "${file.name}" berhasil diunggah.`,
            "success"
          );
        }
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same image can be reselected
    e.target.value = "";
  };

  // Start Media Recording with robust sandbox fallback
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setVoiceBase64(null);
    setVoiceBlob(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perekaman tidak didukung oleh browser Anda.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setVoiceBlob(audioBlob);

        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === "string") {
            setVoiceBase64(reader.result);
            onAddSystemNotification(
              "Voice Note Direkam",
              "Memo audio berhasil direkam dan siap dikirim ke Maria.",
              "success"
            );
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn("Media recording failed (this is expected under sandbox frame permissions):", err);
      // Fallback: Enable full sandbox simulation
      setIsRecordingVoice(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      onAddSystemNotification(
        "Akses Mikrofon Terhalang",
        "Perekoman mikrofon dilarang oleh sandbox iframe. Maria telah mengaktifkan audio simulasi HQ untuk pengetesan Anda.",
        "info"
      );
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback wav builder so the simulation gives correct feedback
      const mockWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      setVoiceBase64(mockWav);
      onAddSystemNotification(
        "Voice Note Disimpan",
        "Voice note simulasi berhasil dibuat untuk Anda.",
        "success"
      );
    }

    setIsRecordingVoice(false);
  };

  const cancelRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    setIsRecordingVoice(false);
    setRecordingDuration(0);
    setVoiceBase64(null);
    setVoiceBlob(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecordingVoice) return;
    
    const cleanText = inputText.trim();
    if (!cleanText && !attachedImage && !voiceBase64 && !isLoading) return;

    let textToSend = cleanText;
    if (!textToSend) {
      if (attachedImage && voiceBase64) {
        textToSend = "[Melampirkan Gambar & Voice Note]";
      } else if (attachedImage) {
        textToSend = "[Melampirkan Gambar]";
      } else if (voiceBase64) {
        textToSend = "[Melampirkan Voice Note]";
      }
    }

    onSendMessage(textToSend, attachedImage || undefined, voiceBase64 || undefined);
    
    setInputText("");
    setAttachedImage(null);
    setVoiceBase64(null);
    setVoiceBlob(null);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedId(id);
    setTimeout(() => setIsCopiedId(null), 1500);
  };

  const greetingName = isLoggedIn ? (profileDisplayNameProp || settings.username || "User") : "User";

  // Resolve active theme style
  const themeStyle = THEME_OPTIONS.find(t => t.value === settings.theme) || THEME_OPTIONS[0];

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden select-none font-sans">
      
      {/* 2. MAIN CHAT AREA AREA viewport */}
      <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        
        {/* Dynamic Theme Banner Header */}
        <div className="sticky top-0 z-30 w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shadow-xs shrink-0">
          <div className="flex items-center gap-3">

            <div className="relative">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-display font-bold shadow-sm select-none bg-gradient-to-tr ${themeStyle.bgGradient}`}>
                <svg className="w-5 h-5 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 6C16 10.5 14.5 13.5 11.5 15C8.5 16.5 6 16.5 6 16.5C6 16.5 8.5 16.5 11.5 18C14.5 19.5 16 22.5 16 27C16 22.5 17.5 19.5 20.5 18C23.5 16.5 26 16.5 26 16.5C26 16.5 23.5 16.5 20.5 15C17.5 13.5 16 10.5 16 6Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1">
                  Maria AI
                </h1>
                {isPlus ? (
                  <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 font-bold" /> Plus
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold rounded uppercase tracking-wider border border-slate-200">
                    Free
                  </span>
                )}
              </div>
              
              {isLoading && (
                <p className="text-[11px] text-slate-650 font-medium leading-none mt-1">
                  <span className="text-blue-650 animate-pulse font-bold">Sedang memproses instruksi cerdas...</span>
                </p>
              )}
            </div>
          </div>

          {/* Action buttons (Notification Bell Drawer trigger) */}
          <div className="flex items-center gap-2">

            {/* Gemini Live calling button */}
            <button
              type="button"
              onClick={() => setIsLiveCallOpen(true)}
              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-950/10 hover:border-purple-500/30 active:scale-95 transition-all rounded-lg border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
              title="Panggilan Suara Maria Live (Gemini API)"
            >
              <Mic className="w-4 h-4 text-purple-500 animate-pulse" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Live Call</span>
            </button>
            
            {/* Real-time Notification Bell Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationTrayOpen(!isNotificationTrayOpen)}
                aria-label="Daftar Pemberitahuan"
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all flex items-center justify-center"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Box popover */}
              {isNotificationTrayOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg w-[300px] z-50">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <BellRing className="w-3.5 h-3.5 text-blue-600" />
                      Pemberitahuan ({notifications.length})
                    </span>
                    <button
                      type="button"
                      disabled={notifications.length === 0}
                      onClick={() => {
                        onClearNotifications();
                        setIsNotificationTrayOpen(false);
                      }}
                      className="text-[9px] font-bold text-red-650 disabled:opacity-50 hover:underline cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-[11px] italic">
                        Tidak ada catatan pemberitahuan saat ini.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${!n.read ? "bg-blue-50/20" : ""}`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className={`text-[11px] font-bold ${!n.read ? "text-slate-800" : "text-slate-600"}`}>
                              {n.title}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 shrink-0">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger Menu button that toggles open the Sidebar */}
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={isSidebarCollapsed ? "Tampilkan Menu Samping" : "Sembunyikan Menu Samping"}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all flex items-center justify-center shadow-3xs"
                title={isSidebarCollapsed ? "Tampilkan Menu Samping" : "Sembunyikan Menu Samping"}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div className="hidden lg:block text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">
              {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className={`flex-grow overflow-y-auto p-6 ${messages.length === 0 ? "flex flex-col items-center justify-center" : "space-y-6"}`}>
          {messages.length === 0 ? (
            
            // Clean stylized centered minimalist Maria welcome panel matching Screenshot 5 with beautiful center typography
            <div className="flex flex-col items-center justify-center select-none py-12 animate-fade-in animate-duration-300 max-w-xl mx-auto text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-md bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center duration-300 transition-all hover:scale-105 active:scale-95 mb-6">
                <svg
                  className="w-11 h-11 text-white pointer-events-none"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 6C16 10.5 14.5 13.5 11.5 15C8.5 16.5 6 16.5 6 16.5C6 16.5 8.5 16.5 11.5 18C14.5 19.5 16 22.5 16 27C16 22.5 17.5 19.5 20.5 18C23.5 16.5 26 16.5 26 16.5C26 16.5 23.5 16.5 20.5 15C17.5 13.5 16 10.5 16 6Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <h2 className="font-sans font-bold text-slate-800 text-2xl sm:text-3xl tracking-tight leading-tight select-text mb-2">
                Dari mana kita harus mulai?
              </h2>
              <p className="text-xs sm:text-[12.5px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed mt-1">
                Tanyakan apa saja untuk mulai mendapat ide bisnis atau penjelasan interaktif tepercaya dari Maria AI.
              </p>
            </div>
          ) : (
            
            // Conversation active logs rendering
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m) => {
                const isAi = m.role === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col space-y-1 group ${isAi ? "items-start" : "items-end"}`}
                  >
                    {/* Role Header label */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="font-bold text-slate-700">
                        {isAi ? "Maria AI" : greetingName}
                      </span>
                      <span className="text-slate-300 font-extrabold">•</span>
                      <span>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      {isAi && (
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-display font-bold text-xs select-none text-white ${themeStyle.primary}`}>
                          <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 6C16 10.5 14.5 13.5 11.5 15C8.5 16.5 6 16.5 6 16.5C6 16.5 8.5 16.5 11.5 18C14.5 19.5 16 22.5 16 27C16 22.5 17.5 19.5 20.5 18C23.5 16.5 26 16.5 26 16.5C26 16.5 23.5 16.5 20.5 15C17.5 13.5 16 10.5 16 6Z" fill="currentColor"/>
                          </svg>
                        </div>
                      )}

                      {editingMessageId === m.id ? (
                        <div className="w-full min-w-[260px] md:min-w-[340px] bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-left shadow-lg">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full min-h-[60px] max-h-[140px] bg-slate-950 border border-slate-800/80 focus:border-slate-700 rounded-xl p-2.5 text-xs outline-none resize-none text-zinc-100 placeholder:text-zinc-500"
                            placeholder="Sesuaikan pesan Anda..."
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 rounded-lg text-zinc-400 hover:text-white font-bold cursor-pointer transition-all"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveMessageEdit(m.id)}
                              className={`px-3 py-1 text-white font-bold rounded-lg cursor-pointer transition-all ${themeStyle.primary.split(" ")[0]}`}
                            >
                              Simpan & Kirim
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-3.5 border rounded-2xl relative ${
                            m.isError
                              ? "bg-red-50/50 border-red-100"
                              : isAi
                              ? "bg-slate-100 border-slate-200 text-slate-800 rounded-tl-none text-[13px] shadow-2xs"
                              : `${themeStyle.primary.split(" ")[0]} text-white border-transparent rounded-tr-none text-[13px] shadow-xs`
                          }`}
                        >
                          {m.isError ? (
                            <div className="space-y-2 col-span-full">
                              <div className="flex items-center gap-1.5 text-red-750 font-semibold text-[12px]">
                                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                                {m.content.toLowerCase().includes("offline") || m.content.toLowerCase().includes("jaringan") || m.content.toLowerCase().includes("network")
                                  ? "Koneksi Jaringan Terputus / Kondisi Offline"
                                  : (m.content.toLowerCase().includes("quota") || m.content.toLowerCase().includes("exhausted") || m.content.toLowerCase().includes("429") || m.content.toLowerCase().includes("rate limit") || m.content.toLowerCase().includes("limit exceeded"))
                                  ? "Batas Kuota Pemakaian Terlampaui (Error 429)"
                                  : m.content.toLowerCase().includes("overloaded") || m.content.toLowerCase().includes("overload") || m.content.toLowerCase().includes("503") || m.content.toLowerCase().includes("unavailable")
                                  ? "Layanan Server AI Sedang Sangat Padat (Error 503)"
                                  : (m.content.toLowerCase().includes("invalid-api-key") || m.content.toLowerCase().includes("api_key") || m.content.toLowerCase().includes("key not valid") || m.content.toLowerCase().includes("belum dikonfigurasi"))
                                  ? "Konfigurasi Kunci API Belum Terpasang / Salah"
                                  : "Kesalahan Sistem Asisten AI"
                                }
                              </div>
                              <p className="text-xs text-red-650 leading-relaxed">
                                {m.content}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {m.image && (
                                <div className="max-w-xs sm:max-w-md rounded-xl overflow-hidden border border-slate-200/50 shadow-3xs">
                                  <img src={m.image} className="w-full h-auto max-h-60 object-contain rounded-lg" alt="Lampiran" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                </div>
                              )}
                              {m.audio && (
                                <div className={`p-2.5 rounded-xl flex flex-col gap-1 w-56 max-w-full ${isAi ? 'bg-slate-200/70 text-slate-800 border border-slate-300' : 'bg-slate-900/40 text-white border border-slate-800/60'}`}>
                                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Voice Memo
                                  </span>
                                  <audio src={m.audio} controls className="w-full h-7 rounded outline-none" />
                                </div>
                              )}
                              {m.content && m.content !== "[Melampirkan Gambar]" && m.content !== "[Melampirkan Voice Note]" && m.content !== "[Melampirkan Gambar & Voice Note]" && (
                                <FormattedContent 
                                  text={m.content} 
                                  messageId={m.id} 
                                  messageTimestamp={m.timestamp} 
                                  isAi={isAi}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions feedback & options row below the bubble */}
                    {editingMessageId !== m.id && !m.isError && (
                      <div className={`flex items-center gap-3 pt-0.5 text-[10px] text-slate-450 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ${isAi ? "pl-11" : "pr-1"}`}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(m.id, m.content)}
                          className="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-slate-400 select-none"
                        >
                          {isCopiedId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        {!isAi && (
                          <button
                            type="button"
                            onClick={() => startEditing(m.id, m.content)}
                            className="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-slate-400 select-none"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isAi && onRegenerateResponse && (
                          <button
                            type="button"
                            onClick={() => onRegenerateResponse(m.id)}
                            className="hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer text-slate-400 select-none"
                            title="Respon Ulang"
                          >
                            <RefreshCcw className="w-3 h-3" />
                            <span>Respon Ulang</span>
                          </button>
                        )}

                        {isAi && onSetFeedback && (
                          <div className="flex items-center gap-1.5 border-l border-slate-300 pl-2 text-slate-400">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSetFeedback) onSetFeedback(m.id, m.feedback === "like" ? null as any : "like");
                              }}
                              aria-label="Tanggapan Membantu"
                              className={`transition-all cursor-pointer p-0.5 rounded ${
                                m.feedback === "like" ? "text-emerald-600 bg-emerald-100/60" : "hover:text-slate-700"
                              }`}
                              title="Tanggapan Membantu"
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onSetFeedback) onSetFeedback(m.id, m.feedback === "dislike" ? null as any : "dislike");
                              }}
                              aria-label="Tanggapan Tidak Membantu"
                              className={`transition-all cursor-pointer p-0.5 rounded ${
                                m.feedback === "dislike" ? "text-red-500 bg-red-100/60" : "hover:text-slate-700"
                              }`}
                              title="Tanggapan Tidak Membantu"
                            >
                              <ThumbsDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {isAi && onToggleBookmark && (
                          <div className="flex items-center gap-1 border-l border-slate-300 pl-2 text-slate-400">
                            <button
                              type="button"
                              onClick={() => onToggleBookmark(m)}
                              aria-label={bookmarkedMessages?.some(b => b.id === m.id) ? "Hapus dari Library" : "Simpan ke Library"}
                              className={`transition-all cursor-pointer px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] ${
                                bookmarkedMessages?.some(b => b.id === m.id)
                                  ? "text-amber-500 bg-amber-500/10 border border-amber-500/15 font-bold"
                                  : "hover:text-amber-600"
                              }`}
                              title={bookmarkedMessages?.some(b => b.id === m.id) ? "Hapus dari Library" : "Simpan ke Library"}
                            >
                              <Bookmark className="w-2.5 h-2.5" />
                              <span>{bookmarkedMessages?.some(b => b.id === m.id) ? "Disimpan" : "Tandai"}</span>
                            </button>
                          </div>
                        )}

                        {isAi && speakMessage && settings?.voiceEnabled && (
                          <div className="flex items-center gap-1 border-l border-slate-300 pl-2 text-slate-400">
                            <button
                              type="button"
                              onClick={() => {
                                if (isPlayingAudio && stopSpeech) {
                                  stopSpeech();
                                } else if (speakMessage) {
                                  speakMessage(m.content);
                                }
                              }}
                              className={`transition-all cursor-pointer px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] ${
                                isPlayingAudio 
                                  ? "text-sky-500 bg-sky-500/10 border border-sky-500/15 font-bold animate-pulse" 
                                  : "hover:text-sky-600 hover:bg-sky-500/5 text-slate-450"
                              }`}
                              title={isPlayingAudio ? "Berhenti memutar suara" : "Dengarkan suara Maria"}
                            >
                              {isPlayingAudio ? (
                                <>
                                  <VolumeX className="w-2.5 h-2.5" />
                                  <span>Berhenti</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-2.5 h-2.5" />
                                  <span>Dengarkan</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {m.isEdited && (
                          <span className="text-[9px] text-slate-400/80 font-medium italic select-none">
                            (diedit)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loader Wave panel */}
              {isLoading && (
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                    <span className="font-bold text-slate-650">Maria AI</span>
                    <span className="text-slate-400 font-extrabold">•</span>
                    <span className="text-slate-600 flex items-center gap-1 font-semibold">
                      Sedang bernalar secara interaktif...
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded text-white font-display font-bold text-xs flex items-center justify-center ${themeStyle.primary.split(" ")[0]}`}>
                      <svg className="w-4.5 h-4.5 text-white animate-spin animate-duration-[2s]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 6C16 10.5 14.5 13.5 11.5 15C8.5 16.5 6 16.5 6 16.5C6 16.5 8.5 16.5 11.5 18C14.5 19.5 16 22.5 16 27C16 22.5 17.5 19.5 20.5 18C23.5 16.5 26 16.5 26 16.5C26 16.5 23.5 16.5 20.5 15C17.5 13.5 16 10.5 16 6Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-none flex items-center gap-1.5 py-2.5 shadow-2xs">
                      <span className="w-2 h-2 bg-blue-500 rounded-full dot-wave" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-indigo-505 rounded-full dot-wave" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full dot-wave" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Dynamic Theme Controlled Input Desk Panel */}
        <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Attached media items previews before sending */}
            {(attachedImage || voiceBase64) && (
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl animate-fade-in text-[11px]">
                {attachedImage && (
                  <div className="relative group bg-white border border-slate-250 rounded-lg p-1 shadow-2xs shrink-0">
                    <img src={attachedImage} className="w-12 h-12 object-cover rounded" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      aria-label="Hapus Lampiran Gambar"
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-650 shadow-sm transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
                {voiceBase64 && (
                  <div className="relative group bg-white border border-slate-250 rounded-lg py-1.5 px-3 flex items-center gap-2 shadow-2xs font-medium text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    <span>Voice Memo Terkam ({recordingDuration > 0 ? `${recordingDuration}s` : "Simulasi"})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceBase64(null);
                        setVoiceBlob(null);
                      }}
                      aria-label="Hapus Memo Suara"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-0.5 rounded hover:text-slate-850 cursor-pointer transition-colors"
                      title="Hapus Memo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSend} className="relative flex items-center">
              {isRecordingVoice ? (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl py-3 px-4 flex items-center justify-between text-xs animate-pulse-slow">
                  <div className="flex items-center gap-2 text-red-700 font-bold">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-ping shrink-0" style={{ animationDuration: "1s" }}></span>
                    <span>Merekam memo suara...</span>
                    <span className="font-mono bg-red-600/15 text-red-700 px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0">
                      {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                      {(recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      aria-label="Batalkan Merekam Memo Suara"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-[#eaeaea] text-slate-600 rounded-lg font-bold text-[10.5px] cursor-pointer active:scale-95 transition-all"
                    >
                      Batalkan
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      aria-label="Selesai Merekam Memo Suara"
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Attachment Triggers */}
                  <div className="absolute left-3 flex items-center gap-0.5 z-10 bg-transparent border-none">
                    {/* Image Attachment Trigger */}
                    <label htmlFor="img-upload-chat" className="p-1.5 cursor-pointer text-slate-450 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all" title="Unggah Gambar">
                      <Image className="w-[15px] h-[15px]" />
                      <input
                        id="img-upload-chat"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isLoading}
                      />
                    </label>

                    {/* Voice Memo Trigger */}
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isLoading}
                      aria-label="Rekam Memo Suara"
                      className="p-1.5 cursor-pointer text-slate-455 hover:text-red-500 hover:bg-slate-200/60 rounded-lg transition-all"
                      title="Rekam Memo Suara"
                    >
                      <Mic className="w-[15px] h-[15px]" />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    placeholder={isLoading ? "Mohon tunggu, Maria sedang memproses..." : "Tanya Maria..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    aria-label="Input Chat Utama"
                    rows={1}
                    className="w-full bg-slate-100 border-none rounded-xl py-3 pl-[62px] pr-14 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-slate-300 hover:bg-slate-200/50 focus:bg-white outline-none transition-all duration-200 placeholder:text-slate-500 overflow-y-auto resize-none leading-relaxed align-middle block min-h-[44px] max-h-[180px]"
                    style={{ height: "auto" }}
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedImage && !voiceBase64) || isLoading}
                    aria-label="Kirim Pesan"
                    className={`absolute right-2.5 p-2 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 text-white ${
                      (inputText.trim() || attachedImage || voiceBase64) && !isLoading
                        ? `${themeStyle.primary.split(" ")[0]} shadow-sm`
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Send id="icon-send-b" className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-2 mt-2 font-mono uppercase tracking-tight font-medium">
              <span>Maria adalah AI dapat melakukan kesalahan</span>
              <span className="flex items-center gap-1 font-sans text-[9px] uppercase font-bold text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Enter untuk kirim
              </span>
            </div>
          </div>
        </div>

      </div>

      <GeminiLiveCall
        isOpen={isLiveCallOpen}
        onClose={() => setIsLiveCallOpen(false)}
        username={settings?.username || "Pengguna"}
      />

    </div>
  );
}
