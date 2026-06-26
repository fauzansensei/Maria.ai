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

interface ChatAreaProps {
  messages: Message[];
  deepSearchActive?: boolean;
  onToggleDeepSearch?: () => void;
  webSearchActive?: boolean;
  onToggleWebSearch?: () => void;
  isLoading: boolean;
  onSendMessage: (text: string, images?: string[], audio?: string) => void;
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
const LinkOpenerCard = React.memo(function LinkOpenerCard({ 
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
});

// Helper to render formatting inside non-app-opener parts
const FormattedSubPart = React.memo(function FormattedSubPart({ 
  text, 
  isAi = true,
  uniqueChunks = []
}: { 
  text: string; 
  isAi?: boolean; 
  uniqueChunks?: Array<{ uri: string; title: string }>;
  key?: React.Key 
}) {
  const parseInline = (txt: string) => parseInlineStyles(txt, isAi, uniqueChunks);
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
            <div key={index} className="my-3 rounded-lg overflow-x-auto max-w-full border border-slate-200/80 shadow-2xs font-mono text-[12px]">
              <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 text-slate-400 text-[10px] font-bold tracking-wider uppercase select-none min-w-max">
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
                        {parseInline(item)}
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
                        {parseInline(item)}
                      </li>
                    ))}
                  </ol>
                );
              }
              if (block.type === 'blockquote') {
                return (
                  <blockquote key={bIdx} className={`border-l-4 border-blue-200 pl-3.5 py-1.5 my-2.5 rounded-r-md text-xs italic leading-relaxed ${isAi ? "bg-blue-50/20 text-slate-600" : "bg-white/10 text-white/90"}`}>
                    {parseInline(block.text || "")}
                  </blockquote>
                );
              }
              if (block.type === 'h4') {
                return (
                  <h4 key={bIdx} className={`font-display font-bold text-sm mt-3.5 mb-1.5 leading-snug ${isAi ? "text-slate-800" : "text-white"}`}>
                    {parseInline(block.text || "")}
                  </h4>
                );
              }
              if (block.type === 'h3') {
                return (
                  <h3 key={bIdx} className={`font-display font-bold text-base mt-4 mb-2 leading-snug ${isAi ? "text-slate-900" : "text-white"}`}>
                    {parseInline(block.text || "")}
                  </h3>
                );
              }
              if (block.type === 'h2') {
                return (
                  <h2 key={bIdx} className={`font-display font-bold text-lg mt-5 mb-2.5 leading-snug ${isAi ? "text-slate-900" : "text-white"}`}>
                    {parseInline(block.text || "")}
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
                              {parseInline(cell)}
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
                                    {parseInline(cellVal)}
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
                  {parseInline(block.text || "")}
                </p>
              );
            })}
          </div>
        );
      })}
    </>
  );
});

// A regex-based syntax formatting renderer for rendering Voxa's responses beautifully
const FormattedContent = React.memo(function FormattedContent({ 
  text, 
  messageId, 
  messageTimestamp,
  isAi = true,
  groundingMetadata = null
}: { 
  text: string; 
  messageId?: string; 
  messageTimestamp?: string; 
  isAi?: boolean;
  groundingMetadata?: any;
}) {
  // First intercept [OPEN_APP:AppName|URL] tags to split normal sections from action cards
  const parts = text.split(/(\[OPEN_APP:[^\]]+\])/g);

  // Parse unique chunks from groundingMetadata if any
  const uniqueChunks: Array<{ uri: string; title: string }> = [];
  const uris = new Set<string>();

  if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk?.web?.uri && chunk?.web?.title) {
        const uri = chunk.web.uri;
        if (!uris.has(uri)) {
          uris.add(uri);
          uniqueChunks.push({
            uri: chunk.web.uri,
            title: chunk.web.title
          });
        }
      }
    }
  }

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
        
        // Otherwise parse normal formatting structures with uniqueChunks
        return <FormattedSubPart key={index} text={part} isAi={isAi} uniqueChunks={uniqueChunks} />;
      })}
    </div>
  );
});

// Sub-helper parsing bold/italic/links/bare URLs inline markdown inside FormattedContent
function parseInlineStyles(
  text: string, 
  isAi: boolean = true,
  uniqueChunks: Array<{ uri: string; title: string }> = []
): React.ReactNode[] {
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
    const footnoteMatch = currentText.match(/\[([0-9]+)\]/);

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
          <code key={`code-${keyCount++}`} className={`px-1.5 py-0.5 border rounded text-xs select-all font-mono ${isAi ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-slate-950/25 border-white/10 text-amber-250 font-semibold"}`}>
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

    // Footnote index parser
    if (uniqueChunks && uniqueChunks.length > 0 && footnoteMatch && footnoteMatch.index !== undefined) {
      const idxStr = footnoteMatch[1];
      const chunkIdx = parseInt(idxStr, 10) - 1;
      if (chunkIdx >= 0 && chunkIdx < uniqueChunks.length) {
        const chunk = uniqueChunks[chunkIdx];
        candidates.push({
          index: footnoteMatch.index,
          length: footnoteMatch[0].length,
          render: () => {
            let domain = "";
            try {
              const urlObj = new URL(chunk.uri);
              domain = urlObj.hostname.replace("www.", "");
            } catch (pErr) {
              domain = "sumber";
            }
            return (
              <a
                key={`footnote-${keyCount++}`}
                href={chunk.uri}
                target="_blank"
                rel="noopener noreferrer"
                title={chunk.title}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 font-sans font-semibold transition-all hover:scale-105 active:scale-95 shadow-3xs"
              >
                <Globe className="w-2.5 h-2.5 text-emerald-600" />
                <span>{domain}</span>
                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-200/50 px-1 rounded-sm">{idxStr}</span>
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

interface ChatInputFormProps {
  isLoading: boolean;
  onSendMessage: (text: string, images?: string[], audio?: string) => void;
  onAddSystemNotification: (title: string, body: string, type: "info" | "success" | "reminder" | "message") => void;
  pendingPrompt?: string | null;
  onClearPendingPrompt?: () => void;
  themeStyle: any;
  deepSearchActive: boolean;
  onToggleDeepSearch?: () => void;
  webSearchActive: boolean;
  onToggleWebSearch?: () => void;
}

const ChatInputForm = React.memo(function ChatInputForm({
  isLoading,
  onSendMessage,
  onAddSystemNotification,
  pendingPrompt,
  onClearPendingPrompt,
  themeStyle,
  deepSearchActive,
  onToggleDeepSearch,
  webSearchActive,
  onToggleWebSearch,
}: ChatInputFormProps) {
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [, setVoiceBlob] = useState<Blob | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);



  // Clean recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Load a pending prompt stored in reactive states cleanly (used by Library / Discover redirection)
  useEffect(() => {
    if (pendingPrompt) {
      setInputText(pendingPrompt);
      if (textareaRef.current) {
        const el = textareaRef.current;
        requestAnimationFrame(() => {
          el.style.height = "44px";
          el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
        });
      }
      onClearPendingPrompt?.();
    }
  }, [pendingPrompt, onClearPendingPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Detect mobile or touch devices (roughly)
    const isMobileOrTouch = window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches;

    if (e.key === "Enter" && !e.shiftKey) {
      if (isMobileOrTouch) {
        // On mobile, Enter should create a newline. Don't prevent default.
        return;
      }

      e.preventDefault(); // Prevent standard newline behavior of textarea
      if (inputText.trim() || attachedImages.length > 0 || voiceBase64) {
        if (!isLoading) {
          const form = e.currentTarget.closest("form");
          if (form) {
            form.requestSubmit();
          }
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    
    // Validate number of files (optional, e.g. max 4 images to prevent overflow)
    if (attachedImages.length + files.length > 5) {
      onAddSystemNotification("Terlalu Banyak Gambar", "Maksimal hanya dapat melampirkan 5 gambar.", "info");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          try {
            const rawBase64 = event.target.result;
            const compressed = await compressImage(rawBase64);
            setAttachedImages(prev => [...prev, compressed]);
            onAddSystemNotification(
              "Gambar Terlampir",
              `Gambar "${file.name}" berhasil diunggah.`,
              "success"
            );
          } catch (compressionErr) {
            setAttachedImages(prev => [...prev, event.target.result as string]);
            onAddSystemNotification(
              "Gambar Terlampir",
              `Gambar "${file.name}" berhasil diunggah.`,
              "success"
            );
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

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
            const voiceData = reader.result;
            
            // Auto send directly
            const textToSend = inputText.trim() || "[Voice Note]";
            onSendMessage(textToSend, attachedImages.length > 0 ? attachedImages : undefined, voiceData);
            
            setInputText("");
            if (textareaRef.current) textareaRef.current.style.height = "44px";
            setAttachedImages([]);
            setVoiceBase64(null);
            setVoiceBlob(null);

            onAddSystemNotification(
              "Voice Note Terkirim",
              "Memo audio berhasil direkam dan otomatis dikirim ke Maria.",
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
      }, 1050);

    } catch (err: any) {
      console.warn("Media recording failed (this is expected under sandbox frame permissions):", err);
      setIsRecordingVoice(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1055);
      
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
      // Direct send fallback simulation
      const mockWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      
      const textToSend = inputText.trim() || "[Voice Note]";
      onSendMessage(textToSend, attachedImages.length > 0 ? attachedImages : undefined, mockWav);
      
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "44px";
      setAttachedImages([]);
      setVoiceBase64(null);
      setVoiceBlob(null);

      onAddSystemNotification(
        "Voice Note Terkirim",
        "Voice note simulasi otomatis terkirim ke Maria.",
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
    if (!cleanText && attachedImages.length === 0 && !voiceBase64 && !isLoading) return;

    let textToSend = cleanText;
    if (!textToSend) {
      if (attachedImages.length > 0 && voiceBase64) {
        textToSend = "[Melampirkan Gambar & Voice Note]";
      } else if (attachedImages.length > 0) {
        textToSend = "[Melampirkan Gambar]";
      } else if (voiceBase64) {
        textToSend = "[Melampirkan Voice Note]";
      }
    }

    onSendMessage(textToSend, attachedImages.length > 0 ? attachedImages : undefined, voiceBase64 || undefined);
    
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    setAttachedImages([]);
    setVoiceBase64(null);
    setVoiceBlob(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {(attachedImages.length > 0 || voiceBase64) && (
        <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl animate-fade-in text-[11px]">
          {attachedImages.map((imgBase64, idx) => (
            <div key={idx} className="relative group bg-white border border-slate-200 rounded-lg p-1 shadow-2xs shrink-0">
              <img src={imgBase64} alt={`Preview Lampiran ${idx + 1}`} className="w-12 h-12 object-cover rounded" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
              <button
                type="button"
                onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                aria-label="Hapus Lampiran Gambar"
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 shadow-sm transition-colors cursor-pointer"
                title="Hapus"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {voiceBase64 && (
            <div className="relative group bg-white border border-slate-200 rounded-lg py-1.5 px-3 flex items-center gap-2 shadow-2xs font-medium text-slate-700">
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

      <form onSubmit={handleSend} className="w-full">
        {isRecordingVoice ? (
          <div className="w-full bg-red-50 border border-red-100 rounded-2xl py-3.5 px-4 flex items-center justify-between text-xs animate-pulse-slow">
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
          <div className="w-full bg-slate-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-300 focus-within:border-slate-200 rounded-2xl border border-transparent transition-all duration-200 p-2 shadow-2xs">
            <textarea
              ref={textareaRef}
              placeholder={isLoading ? "Mohon tunggu, Maria sedang memproses..." : "Tanya Maria..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                const el = e.target;
                requestAnimationFrame(() => {
                  el.style.height = "44px";
                  el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
                });
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              aria-label="Input Chat Utama"
              rows={1}
              className="w-full bg-transparent border-none text-sm text-slate-800 font-medium outline-none resize-none leading-relaxed px-2.5 pt-1.5 pb-1 placeholder:text-slate-400 overflow-y-auto block min-h-[44px] max-h-[180px]"
            />
            
            <div className="flex items-center justify-between pt-1.5 px-1 bg-transparent border-none">
              {/* Left Actions: Upload, Voice Note, and Deep Search Toggle */}
              <div className="flex items-center gap-1 sm:gap-2">
                <label htmlFor="img-upload-chat" className="p-1.5 cursor-pointer text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all" title="Unggah Gambar">
                  <Image className="w-[15px] h-[15px]" />
                  <input
                    id="img-upload-chat"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                </label>

                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isLoading}
                  aria-label="Rekam Memo Suara"
                  className="p-1.5 cursor-pointer text-slate-400 hover:text-red-500 hover:bg-slate-200/60 rounded-lg transition-all"
                  title="Rekam Memo Suara"
                >
                  <Mic className="w-[15px] h-[15px]" />
                </button>

                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                {/* Web Search Toggle */}
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-sans font-bold transition-all cursor-pointer border ${
                    webSearchActive
                      ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 active:scale-95"
                      : "bg-white hover:bg-slate-50 text-slate-500 border-slate-200 active:scale-95"
                  }`}
                  title="Aktifkan pencarian website Google Search real-time"
                >
                  <Globe className={`w-3.5 h-3.5 ${webSearchActive ? "animate-pulse text-blue-600" : ""}`} />
                  <span>Pencarian Web</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${webSearchActive ? "bg-blue-600" : "bg-slate-300"}`}></span>
                </button>

                {/* Integrated Deep Search Toggle */}
                <button
                  type="button"
                  onClick={onToggleDeepSearch}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-sans font-bold transition-all cursor-pointer border ${
                    deepSearchActive
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 active:scale-95"
                      : "bg-white hover:bg-slate-50 text-slate-500 border-slate-200 active:scale-95"
                  }`}
                  title="Aktifkan pencarian Google Search real-time dan analisis mendalam"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${deepSearchActive ? "animate-pulse text-emerald-600" : ""}`} />
                  <span>Pencarian Mendalam</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${deepSearchActive ? "bg-emerald-600" : "bg-slate-300"}`}></span>
                </button>
              </div>

              {/* Right Action: Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && attachedImages.length === 0 && !voiceBase64) || isLoading}
                aria-label="Kirim Pesan"
                className={`p-2 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-205 text-white ${
                  (inputText.trim() || attachedImages.length > 0 || voiceBase64) && !isLoading
                    ? `${themeStyle.primary.split(" ")[0]} shadow-sm hover:scale-105 active:scale-95`
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send id="icon-send-b" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-450 px-2 mt-2 gap-2">
        <span className="text-center sm:text-left font-mono uppercase tracking-tight font-semibold">
          Maria adalah AI yang dapat melakukan kesalahan
        </span>
        <span className="hidden sm:flex items-center gap-1 font-sans text-[9px] uppercase font-bold text-slate-500 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
          Enter untuk kirim
        </span>
      </div>
    </div>
  );
});

export default function ChatArea({
  messages,
  deepSearchActive = false,
  onToggleDeepSearch,
  webSearchActive = false,
  onToggleWebSearch,
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollMount = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isInitialScrollMount.current) {
      isInitialScrollMount.current = false;
      container.scrollTop = container.scrollHeight;
      return;
    }
    
    const frameId = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [messages, isLoading]);

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
            {/* Hamburger Menu button that toggles open the Sidebar (placed beautifully on the left for standard mobile UX) */}
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={isSidebarCollapsed ? "Tampilkan Menu Samping" : "Sembunyikan Menu Samping"}
                className={`p-2 bg-slate-50 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all flex items-center justify-center shadow-3xs min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 ${
                  isSidebarCollapsed ? "block" : "block lg:hidden"
                }`}
                title={isSidebarCollapsed ? "Tampilkan Menu Samping" : "Sembunyikan Menu Samping"}
              >
                <Menu className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}

            <div className="relative">
              {/* Maria AI Geometric Logo */}
              <div className={`w-10 h-10 rounded-lg bg-[#171F36] flex items-center justify-center overflow-hidden shadow-sm border border-[#bcc6d4]/20 select-none`}>
                <svg className="w-full h-full" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="512" height="512" fill="#171f36"/>
                  <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="14"/>
                  <g stroke="#f6acad" strokeWidth="16" strokeLinecap="round">
                    <line x1="160" y1="390" x2="240" y2="278"/>
                    <line x1="286" y1="214" x2="352" y2="122"/>
                  </g>
                  <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
                  <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
                </svg>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white pointer-events-none translate-x-[2px] translate-y-[2px]"></span>
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



            <div className="hidden lg:block text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">
              {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div ref={scrollContainerRef} className={`flex-grow overflow-y-auto p-6 ${messages.length === 0 ? "flex flex-col items-center justify-center" : "space-y-6"}`}>
          {messages.length === 0 ? (
            
            // Clean stylized centered minimalist Maria welcome panel matching Screenshot 5 with beautiful center typography
            <div className="flex flex-col items-center justify-center select-none py-12 animate-fade-in animate-duration-300 max-w-xl mx-auto text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-md bg-[#171F36] flex items-center justify-center border border-[#bcc6d4]/20 duration-300 transition-all hover:scale-105 active:scale-95 mb-6">
                <svg
                  className="w-full h-full pointer-events-none"
                  viewBox="0 0 512 512"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="512" height="512" fill="#171f36"/>
                  <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="12"/>
                  <g stroke="#f6acad" strokeWidth="14" strokeLinecap="round">
                    <line x1="160" y1="390" x2="240" y2="278"/>
                    <line x1="286" y1="214" x2="352" y2="122"/>
                  </g>
                  <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
                  <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
                </svg>
              </div>
              <h2 className="font-sans font-bold text-slate-800 text-2xl sm:text-3xl tracking-tight leading-tight select-text mb-2">
                Dari mana kita harus mulai?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-sm mx-auto leading-relaxed mt-2 tracking-normal select-text">
                Aplikasi asisten cerdas buatan yang membantu Anda menjadwalkan tugas, mencari ide kreatif, dan merangkum konsep pemrograman secara presisi. Mulailah percakapan dengan Maria.ai.
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
                        {isAi ? "Maria-ai" : greetingName}
                      </span>
                      <span className="text-slate-300 font-extrabold">•</span>
                      <span>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      {isAi && (
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-display font-bold text-xs select-none bg-[#171F36] border border-[#bcc6d4]/20 overflow-hidden`}>
                          <svg className="w-full h-full" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="512" height="512" fill="#171f36"/>
                            <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="16"/>
                            <g stroke="#f6acad" strokeWidth="18" strokeLinecap="round">
                              <line x1="160" y1="390" x2="240" y2="278"/>
                              <line x1="286" y1="214" x2="352" y2="122"/>
                            </g>
                            <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
                            <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
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
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-zinc-400 hover:text-white font-bold cursor-pointer transition-all"
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
                          className={`p-3.5 border rounded-2xl relative min-w-0 break-words ${
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
                              {onRegenerateResponse && (
                                <button
                                  type="button"
                                  onClick={() => onRegenerateResponse(m.id)}
                                  disabled={isLoading}
                                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100/80 hover:bg-red-200/90 text-red-750 transition-colors cursor-pointer border border-red-200/50 disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                >
                                  <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                  <span>Coba Kirim Ulang</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {m.image && (
                                <div className="max-w-xs sm:max-w-md rounded-xl overflow-hidden border border-slate-200/50 shadow-3xs">
                                  <img src={m.image} className="w-full h-auto max-h-60 object-contain rounded-lg" alt="Lampiran" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                </div>
                              )}
                              {m.images && m.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 max-w-xs sm:max-w-md">
                                  {m.images.map((imgStr, idx) => (
                                    <div key={idx} className="rounded-xl overflow-hidden border border-slate-200/50 shadow-3xs max-w-[200px]">
                                      <img src={imgStr} className="w-full h-auto max-h-60 object-contain rounded-lg" alt={`Lampiran ${idx + 1}`} referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                    </div>
                                  ))}
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
                                  groundingMetadata={m.groundingMetadata}
                                />
                              )}
                              {isAi && m.groundingMetadata && (
                                <GroundingSources metadata={m.groundingMetadata} />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions feedback & options row below the bubble */}
                    {editingMessageId !== m.id && !m.isError && (
                      <div className={`flex items-center gap-3 pt-0.5 text-[10px] text-slate-450 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 ${isAi ? "pl-11" : "pr-1"}`}>
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
                                  : "hover:text-sky-600 hover:bg-sky-500/5 text-slate-400"
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
                    <span className="text-slate-600 flex items-center gap-1 font-semibold animate-pulse">
                      Sedang memproses...
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 px-1.5">
                      <div className={`relative w-9 h-9 flex-shrink-0 rounded-full bg-[#171F36] border border-[#f6acad]/40 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(246,172,173,0.6)]`}>
                        <svg className="w-full h-full animate-[spin_2s_linear_infinite] scale-110" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="512" height="512" fill="#171f36"/>
                          <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="16"/>
                          <g stroke="#f6acad" strokeWidth="18" strokeLinecap="round">
                            <line x1="160" y1="390" x2="240" y2="278"/>
                            <line x1="286" y1="214" x2="352" y2="122"/>
                          </g>
                          <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
                          <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
                        </svg>
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>

        {/* Dynamic Theme Controlled Input Desk Panel */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
          <ChatInputForm
            isLoading={isLoading}
            onSendMessage={onSendMessage}
            onAddSystemNotification={onAddSystemNotification}
            pendingPrompt={pendingPrompt}
            onClearPendingPrompt={onClearPendingPrompt}
            themeStyle={themeStyle}
            deepSearchActive={deepSearchActive}
            onToggleDeepSearch={onToggleDeepSearch}
            webSearchActive={webSearchActive}
            onToggleWebSearch={onToggleWebSearch}
          />
        </div>

      </div>

    </div>
  );
}

const GroundingSources = React.memo(function GroundingSources({
  metadata
}: {
  metadata: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
    }>;
  };
}) {
  if (!metadata) return null;

  const uniqueChunks: Array<{ uri: string; title: string }> = [];
  const uris = new Set<string>();

  if (metadata.groundingChunks && Array.isArray(metadata.groundingChunks)) {
    for (const chunk of metadata.groundingChunks) {
      if (chunk?.web?.uri && chunk?.web?.title) {
        const uri = chunk.web.uri;
        if (!uris.has(uri)) {
          uris.add(uri);
          uniqueChunks.push({
            uri: chunk.web.uri,
            title: chunk.web.title
          });
        }
      }
    }
  }

  const queries = metadata.webSearchQueries || [];

  if (uniqueChunks.length === 0 && queries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-2.5">
      {/* Search Queries Tag Header */}
      {queries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-bold flex items-center gap-1 font-sans text-slate-600 mr-1">
            <Globe className="w-3 h-3 text-emerald-600 animate-pulse" />
            Pencarian Google:
          </span>
          {queries.map((q, idx) => (
            <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[10.5px]">
              &ldquo;{q}&rdquo;
            </span>
          ))}
        </div>
      )}

      {/* Grid of Citations Cards */}
      {uniqueChunks.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 font-sans">
            Rujukan & Sumber Informasi ({uniqueChunks.length})
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {uniqueChunks.map((chunk, idx) => {
              // 1. Try to extract a clean domain name from chunk.title or other parameters
              let extractedDomain = "";
              
              // Matches patterns like "domain.com", "sub.domain.co.id", etc.
              const domainRegex = /(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}/;
              const match = chunk.title.match(domainRegex);
              if (match) {
                extractedDomain = match[0].toLowerCase();
              }

              // 2. Try to fall back to the URL's hostname if it's not the internal redirect proxy
              try {
                const p = new URL(chunk.uri);
                let host = p.hostname;
                if (host.startsWith("www.")) host = host.substring(4);
                if (host !== "vertexaisearch.cloud.google.com") {
                  if (!extractedDomain) {
                    extractedDomain = host;
                  }
                }
              } catch (_) {}

              // 3. Set standard fallback or friendly display
              const displayDomain = extractedDomain || "Sumber Web";
              const faviconUrl = extractedDomain 
                ? `https://www.google.com/s2/favicons?domain=${extractedDomain}&sz=32`
                : `https://www.google.com/s2/favicons?domain=vertexaisearch.cloud.google.com&sz=32`;

              return (
                <a
                  key={idx}
                  href={chunk.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 bg-white/70 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl hover:shadow-3xs active:scale-[0.98] transition-all group duration-150 text-left"
                >
                  {/* Web Favicon Fetched Dynamically */}
                  <img
                    src={faviconUrl}
                    alt={displayDomain}
                    className="w-4 h-4 rounded-sm object-contain shrink-0 mt-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
                    }}
                  />
                  
                  <div className="min-w-0 space-y-0.5 flex-1 select-none">
                    <p className="text-[10px] text-slate-500 font-bold tracking-tight uppercase truncate">
                      {displayDomain}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors" title={chunk.title}>
                      {chunk.title}
                    </p>
                  </div>
                  
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
