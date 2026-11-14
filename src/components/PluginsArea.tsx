import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Menu,
  ArrowLeft,
  ChevronRight,
  Search,
  Plus,
  MoreHorizontal,
  Share2,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  ArrowUpRight,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Wrench,
  Link2,
} from 'lucide-react';
import { MARIA_PLUGINS } from '../constants.ts';
import { UserSettings } from '../types.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  loadEnabledConnectors,
  saveEnabledConnectors,
} from '../lib/workspaceStore.ts';
import {
  PLUGIN_CATEGORIES,
  PluginCategoryId,
  PluginEntry,
  PluginSamplePrompt,
  getAllPlugins,
  getPluginById,
  loadCustomConnectors,
  saveCustomConnectors,
  loadConnectorSuggestions,
  saveConnectorSuggestions,
} from '../lib/pluginsCatalog.ts';
import { PluginBrandIcon } from './PluginBrandIcon.tsx';

interface PluginsAreaProps {
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onBackToChat: () => void;
  onOpenSidebar: () => void;
  onLaunchConnectorPrompt: (prompt: string) => void;
  onOpenScienceScout: () => void;
  onOpenImageStudio: () => void;
  onOpenCanvasCode: () => void;
}

type DirectoryTab = 'discover' | 'connected';

type DirectoryView =
  | { type: 'main'; tab: DirectoryTab }
  | { type: 'category'; categoryId: PluginCategoryId | 'installed' }
  | {
      type: 'detail';
      pluginId: string;
      returnView:
        | { type: 'main'; tab: DirectoryTab }
        | { type: 'category'; categoryId: PluginCategoryId | 'installed' };
    };

const PROMPT_CARD_TONES: Record<PluginSamplePrompt['cardTone'], string> = {
  emerald:
    'bg-gradient-to-br from-emerald-50 to-teal-50/80 border-emerald-200/80 text-slate-900 dark:from-emerald-950/50 dark:to-teal-950/30 dark:border-emerald-800/50 dark:text-slate-100',
  blue:
    'bg-gradient-to-br from-blue-50 to-sky-50/80 border-blue-200/80 text-slate-900 dark:from-blue-950/50 dark:to-sky-950/30 dark:border-blue-800/50 dark:text-slate-100',
  violet:
    'bg-gradient-to-br from-violet-50 to-indigo-50/80 border-violet-200/80 text-slate-900 dark:from-violet-950/50 dark:to-indigo-950/30 dark:border-violet-800/50 dark:text-slate-100',
  amber:
    'bg-gradient-to-br from-amber-50 to-orange-50/80 border-amber-200/80 text-slate-900 dark:from-amber-950/45 dark:to-orange-950/30 dark:border-amber-800/50 dark:text-slate-100',
  rose:
    'bg-gradient-to-br from-rose-50 to-pink-50/80 border-rose-200/80 text-slate-900 dark:from-rose-950/50 dark:to-pink-950/30 dark:border-rose-800/50 dark:text-slate-100',
  cyan:
    'bg-gradient-to-br from-cyan-50 to-sky-50/80 border-cyan-200/80 text-slate-900 dark:from-cyan-950/50 dark:to-sky-950/30 dark:border-cyan-800/50 dark:text-slate-100',
  slate:
    'bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200 text-slate-900 dark:from-[#1b1e29] dark:to-[#151822] dark:border-[#2c3144] dark:text-slate-100',
};

export const PluginsArea: React.FC<PluginsAreaProps> = React.memo(
  ({
    settings,
    onUpdateSettings,
    onBackToChat,
    onOpenSidebar,
    onLaunchConnectorPrompt,
    onOpenScienceScout,
    onOpenImageStudio,
    onOpenCanvasCode,
  }) => {
    const { isEn } = useLanguage();
    const { user } = useAuth();

    const activeCorePlugins = settings.enabledPlugins || MARIA_PLUGINS.map((p) => p.id);
    const [enabledConnectors, setEnabledConnectors] = useState<string[]>(() =>
      loadEnabledConnectors()
    );
    const [customConnectors, setCustomConnectors] = useState<PluginEntry[]>(() =>
      loadCustomConnectors()
    );
    const [connectorSuggestions, setConnectorSuggestions] = useState<boolean>(() =>
      loadConnectorSuggestions()
    );

    const allPlugins = useMemo(
      () => getAllPlugins(customConnectors),
      [customConnectors]
    );

    const [view, setView] = useState<DirectoryView>({ type: 'main', tab: 'discover' });
    const [selectedCategoryChip, setSelectedCategoryChip] = useState<PluginCategoryId | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
    const [isHeaderPlusMenuOpen, setIsHeaderPlusMenuOpen] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [connectModalPlugin, setConnectModalPlugin] = useState<PluginEntry | null>(null);
    const [disconnectModalPlugin, setDisconnectModalPlugin] = useState<PluginEntry | null>(null);
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

    // Custom connector form state
    const [customName, setCustomName] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [customToolsText, setCustomToolsText] = useState('');
    const [customFormError, setCustomFormError] = useState<string | null>(null);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const plusMenuRef = useRef<HTMLDivElement>(null);
    const toastTimerRef = useRef<number | null>(null);

    const showToast = (msg: string) => {
      setToastMessage(msg);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2600);
    };

    useEffect(() => {
      return () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      };
    }, []);

    useEffect(() => {
      const handleOutside = (e: MouseEvent) => {
        if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
          setIsHeaderPlusMenuOpen(false);
        }
      };
      if (isHeaderPlusMenuOpen) {
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
      }
    }, [isHeaderPlusMenuOpen]);

    useEffect(() => {
      setOpenRowMenuId(null);
      setIsDescExpanded(false);
      scrollContainerRef.current?.scrollTo({ top: 0 });
    }, [view]);

    const isPluginInstalled = (plugin: PluginEntry): boolean => {
      if (plugin.source === 'core') {
        return activeCorePlugins.includes(plugin.id);
      }
      return enabledConnectors.includes(plugin.id);
    };

    const setPluginInstalledState = (plugin: PluginEntry, enable: boolean) => {
      if (plugin.source === 'core') {
        const exists = activeCorePlugins.includes(plugin.id);
        if (enable && !exists) {
          onUpdateSettings({ enabledPlugins: [...activeCorePlugins, plugin.id] });
        } else if (!enable && exists) {
          onUpdateSettings({
            enabledPlugins: activeCorePlugins.filter((id) => id !== plugin.id),
          });
        }
      } else {
        const exists = enabledConnectors.includes(plugin.id);
        let next = enabledConnectors;
        if (enable && !exists) {
          next = [...enabledConnectors, plugin.id];
        } else if (!enable && exists) {
          next = enabledConnectors.filter((id) => id !== plugin.id);
        }
        setEnabledConnectors(next);
        saveEnabledConnectors(next);
      }
    };

    const installedPlugins = useMemo(
      () => allPlugins.filter((p) => isPluginInstalled(p)),
      [allPlugins, activeCorePlugins, enabledConnectors]
    );

    const inactivePlugins = useMemo(
      () => allPlugins.filter((p) => !isPluginInstalled(p)),
      [allPlugins, activeCorePlugins, enabledConnectors]
    );

    const handleToggleSuggestions = () => {
      const next = !connectorSuggestions;
      setConnectorSuggestions(next);
      saveConnectorSuggestions(next);
    };

    const handleConnectClick = (plugin: PluginEntry, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isPluginInstalled(plugin)) {
        setOpenRowMenuId((prev) => (prev === plugin.id ? null : plugin.id));
        return;
      }

      if (plugin.source === 'core') {
        setInstallingId(plugin.id);
        window.setTimeout(() => {
          setPluginInstalledState(plugin, true);
          setInstallingId(null);
          showToast(
            isEn ? `Connected to ${plugin.name}` : `Terhubung ke ${plugin.name}`
          );
        }, 200);
      } else {
        setConnectModalPlugin(plugin);
      }
    };

    const handleConfirmAuthorize = () => {
      if (!connectModalPlugin || isAuthorizing) return;
      const target = connectModalPlugin;
      setIsAuthorizing(true);
      window.setTimeout(() => {
        setPluginInstalledState(target, true);
        setIsAuthorizing(false);
        setConnectModalPlugin(null);
        showToast(
          isEn ? `Connected to ${target.name}` : `Terhubung ke ${target.name}`
        );
      }, 380);
    };

    const handleConfirmDisconnect = () => {
      if (!disconnectModalPlugin) return;
      const target = disconnectModalPlugin;
      setPluginInstalledState(target, false);
      setDisconnectModalPlugin(null);
      setOpenRowMenuId(null);
      showToast(
        isEn ? `Disconnected ${target.name}` : `Koneksi ${target.name} diputuskan`
      );
    };

    const handleRemoveCustomConnector = (plugin: PluginEntry) => {
      const nextCustom = customConnectors.filter((c) => c.id !== plugin.id);
      setCustomConnectors(nextCustom);
      saveCustomConnectors(nextCustom);
      setPluginInstalledState(plugin, false);
      if (view.type === 'detail' && view.pluginId === plugin.id) {
        setView(view.returnView);
      }
      showToast(
        isEn ? `Removed ${plugin.name}` : `${plugin.name} dihapus`
      );
    };

    const handleCreateCustomConnector = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = customName.trim();
      const trimmedUrl = customUrl.trim();
      if (!trimmedName) {
        setCustomFormError(isEn ? 'Connector name is required' : 'Nama konektor wajib diisi');
        return;
      }
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
        setCustomFormError(
          isEn
            ? 'Enter a valid endpoint or MCP server URL starting with https://'
            : 'Masukkan URL endpoint / server MCP valid diawali https://'
        );
        return;
      }

      const id = `custom-${Date.now()}`;
      const cleanMention = `@${trimmedName.replace(/[^a-zA-Z0-9]/g, '') || 'CustomMCP'}`;
      let hostLabel = trimmedUrl.replace(/^https?:\/\//i, '').split('/')[0] || trimmedUrl;

      const parsedTools = customToolsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const toolsList =
        parsedTools.length > 0
          ? parsedTools
          : ['query_resource', 'list_items', 'execute_action'];

      const newEntry: PluginEntry = {
        id,
        source: 'custom',
        name: trimmedName,
        mentionTag: cleanMention,
        categories: ['developer', 'new'],
        isInteractive: true,
        shortDesc:
          customDesc.trim() ||
          `Konektor MCP kustom terhubung ke ${hostLabel}`,
        shortDescEn:
          customDesc.trim() ||
          `Custom MCP connector bridged to ${hostLabel}`,
        fullDesc:
          customDesc.trim() ||
          `Konektor kustom untuk ${trimmedName} melalui endpoint ${trimmedUrl}. Gunakan ${cleanMention} di percakapan untuk memanggil alat dari konektor ini.`,
        fullDescEn:
          customDesc.trim() ||
          `Custom connector for ${trimmedName} via endpoint ${trimmedUrl}. Mention ${cleanMention} in chat to invoke its tools.`,
        capabilities: 'Konektor MCP Kustom',
        capabilitiesEn: 'Custom MCP Endpoint',
        developer: isEn ? 'Custom Integration' : 'Integrasi Kustom',
        website: hostLabel,
        websiteUrl: trimmedUrl,
        mcpUrl: trimmedUrl,
        version: '1.0.0',
        privacyUrl: '/privacy.html',
        termsUrl: '/terms.html',
        scopes: [
          `Terhubung ke endpoint ${hostLabel}`,
          `${toolsList.length} alat tersedia untuk chat`,
        ],
        scopesEn: [
          `Connected to endpoint ${hostLabel}`,
          `${toolsList.length} callable tools enabled`,
        ],
        tools: toolsList,
        launchPrompt: `${cleanMention} Bantu saya menggunakan alat ${toolsList[0]} dari konektor ${trimmedName}`,
        launchPromptEn: `${cleanMention} Help me invoke the ${toolsList[0]} tool from ${trimmedName}`,
        samplePrompts: [
          {
            id: `${id}-s1`,
            title: isEn ? 'Run Primary Tool' : 'Jalankan Alat Utama',
            titleEn: 'Run Primary Tool',
            prompt: `${cleanMention} Jalankan pemeriksaan status dan daftar resource melalui ${toolsList[0]}.`,
            promptEn: `${cleanMention} Check resource status and list items via ${toolsList[0]}.`,
            cardTone: 'cyan',
          },
        ],
      };

      const nextCustom = [newEntry, ...customConnectors];
      setCustomConnectors(nextCustom);
      saveCustomConnectors(nextCustom);
      const nextEnabled = [...enabledConnectors, id];
      setEnabledConnectors(nextEnabled);
      saveEnabledConnectors(nextEnabled);

      setCustomName('');
      setCustomUrl('');
      setCustomDesc('');
      setCustomToolsText('');
      setCustomFormError(null);
      setIsCustomModalOpen(false);
      showToast(isEn ? `Connected to ${trimmedName}` : `Terhubung ke ${trimmedName}`);
    };

    const handleLaunchPrompt = (plugin: PluginEntry, customPrompt?: string) => {
      if (!isPluginInstalled(plugin)) {
        setPluginInstalledState(plugin, true);
      }
      if (!customPrompt) {
        if (plugin.id === 'science-scout') return onOpenScienceScout();
        if (plugin.id === 'image-studio') return onOpenImageStudio();
        if (plugin.id === 'canvas-code') return onOpenCanvasCode();
      }
      const finalPrompt =
        customPrompt || (isEn ? plugin.launchPromptEn : plugin.launchPrompt);
      onLaunchConnectorPrompt(finalPrompt);
    };

    const handleInvokeTool = (plugin: PluginEntry, toolName: string) => {
      const prompt = isEn
        ? `${plugin.mentionTag} Use tool \`${toolName}\` to inspect and assist with my workspace`
        : `${plugin.mentionTag} Gunakan alat \`${toolName}\` untuk memeriksa dan membantu tugas saya`;
      handleLaunchPrompt(plugin, prompt);
    };

    const handleSharePlugin = async (plugin: PluginEntry) => {
      const shareText = `${plugin.name} (${plugin.mentionTag}) — ${
        isEn ? plugin.shortDescEn : plugin.shortDesc
      } • ${plugin.mcpUrl || plugin.websiteUrl}`;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText);
        }
        showToast(isEn ? 'Connector link copied' : 'Tautan konektor disalin');
      } catch {
        showToast(isEn ? 'Ready to share' : 'Siap dibagikan');
      }
    };

    const openDetail = (plugin: PluginEntry) => {
      const returnView: DirectoryView['type'] extends never
        ? never
        : { type: 'main'; tab: DirectoryTab } | { type: 'category'; categoryId: PluginCategoryId | 'installed' } =
        view.type === 'category'
          ? { type: 'category', categoryId: view.categoryId }
          : view.type === 'main'
          ? { type: 'main', tab: view.tab }
          : { type: 'main', tab: 'discover' };

      setView({
        type: 'detail',
        pluginId: plugin.id,
        returnView,
      });
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const matchesQuery = (p: PluginEntry) => {
      if (!normalizedQuery) return true;
      return (
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.mentionTag.toLowerCase().includes(normalizedQuery) ||
        p.developer.toLowerCase().includes(normalizedQuery) ||
        p.shortDesc.toLowerCase().includes(normalizedQuery) ||
        p.shortDescEn.toLowerCase().includes(normalizedQuery) ||
        p.tools.some((t) => t.toLowerCase().includes(normalizedQuery))
      );
    };

    const filteredDiscover = useMemo(() => {
      return allPlugins.filter((p) => {
        if (!matchesQuery(p)) return false;
        if (selectedCategoryChip !== 'all') {
          return p.categories.includes(selectedCategoryChip);
        }
        return true;
      });
    }, [allPlugins, normalizedQuery, selectedCategoryChip]);

    const activeCategoryPlugins = useMemo(() => {
      if (view.type !== 'category') return [];
      const base =
        view.categoryId === 'installed'
          ? installedPlugins
          : allPlugins.filter((p) =>
              p.categories.includes(view.categoryId as PluginCategoryId)
            );
      return base.filter(matchesQuery);
    }, [view, allPlugins, installedPlugins, normalizedQuery]);

    const currentCategoryTitle = useMemo(() => {
      if (view.type !== 'category') return '';
      if (view.categoryId === 'installed') return isEn ? 'Installed' : 'Terpasang';
      const meta = PLUGIN_CATEGORIES.find((c) => c.id === view.categoryId);
      return meta ? (isEn ? meta.labelEn : meta.label) : '';
    }, [view, isEn]);

    const renderDirectoryRow = (plugin: PluginEntry, compactActions = false) => {
      const installed = isPluginInstalled(plugin);
      const isMenuOpen = openRowMenuId === plugin.id;
      const isBusy = installingId === plugin.id;

      // Quiet inline metadata with typographic separator (no pill clutter)
      const metaParts: string[] = [];
      if (plugin.isInteractive) {
        metaParts.push(isEn ? 'Interactive' : 'Interaktif');
      }
      if (plugin.popularityRank) {
        metaParts.push(isEn ? `#${plugin.popularityRank} popular` : `#${plugin.popularityRank} terpopuler`);
      } else if (plugin.tools.length > 0) {
        metaParts.push(
          isEn ? `${plugin.tools.length} tools` : `${plugin.tools.length} alat`
        );
      }

      return (
        <div key={plugin.id} className="relative">
          <div
            role="button"
            tabIndex={0}
            onClick={() => openDetail(plugin)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail(plugin);
              }
            }}
            className="w-full min-h-[68px] px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors duration-150 hover:bg-slate-100/80 dark:hover:bg-[#171923] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <PluginBrandIcon id={plugin.id} size="md" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {plugin.name}
                  </span>
                  {metaParts.length > 0 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                      {metaParts.join(' · ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {isEn ? plugin.shortDescEn : plugin.shortDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {installed ? (
                compactActions ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400 px-2">
                      {plugin.tools.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenRowMenuId((prev) =>
                          prev === plugin.id ? null : plugin.id
                        );
                      }}
                      aria-label={isEn ? `Options for ${plugin.name}` : `Opsi ${plugin.name}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-[#242838] cursor-pointer"
                    >
                      <MoreHorizontal className="w-4.5 h-4.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowMenuId((prev) =>
                        prev === plugin.id ? null : plugin.id
                      );
                    }}
                    className="min-h-[38px] px-3 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>{isEn ? 'Connected' : 'Terhubung'}</span>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleConnectClick(plugin, e)}
                  className="min-h-[38px] px-3.5 rounded-full border border-slate-200 dark:border-[#2c3040] bg-white dark:bg-[#161822] hover:bg-slate-100 dark:hover:bg-[#222636] text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                >
                  {isBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  ) : (
                    <span>{isEn ? 'Connect' : 'Hubungkan'}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-14 z-30 w-56 rounded-2xl border border-slate-200 dark:border-[#2a2e3e] bg-white dark:bg-[#191b24] shadow-xl py-1.5 text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setOpenRowMenuId(null);
                  handleLaunchPrompt(plugin);
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#242838] cursor-pointer font-medium"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>{isEn ? `Use ${plugin.mentionTag}` : `Pakai ${plugin.mentionTag}`}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenRowMenuId(null);
                  openDetail(plugin);
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242838] cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isEn
                    ? `Tools & details (${plugin.tools.length})`
                    : `Alat & detail (${plugin.tools.length})`}
                </span>
              </button>
              <a
                href={plugin.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenRowMenuId(null)}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#242838]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Open website' : 'Buka situs web'}</span>
              </a>
              <div className="my-1 border-t border-slate-100 dark:border-[#252938]" />
              <button
                type="button"
                onClick={() => {
                  setOpenRowMenuId(null);
                  setDisconnectModalPlugin(plugin);
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Disconnect' : 'Putuskan sambungan'}</span>
              </button>
            </div>
          )}
        </div>
      );
    };

    const renderModalsAndToast = () => (
      <>
        {/* Connect / Authorize Consent Sheet */}
        {connectModalPlugin && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => !isAuthorizing && setConnectModalPlugin(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#262a3a] p-5 sm:p-6 space-y-5 shadow-2xl"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center gap-3.5">
                <PluginBrandIcon id={connectModalPlugin.id} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {isEn
                      ? `Connect ${connectModalPlugin.name} to Maria AI?`
                      : `Hubungkan ${connectModalPlugin.name} ke Maria AI?`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {connectModalPlugin.developer} · {connectModalPlugin.website}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={() => setConnectModalPlugin(null)}
                  aria-label={isEn ? 'Close' : 'Tutup'}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-[#212432] cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Active User Identity Box */}
              <div className="rounded-2xl border border-slate-200 dark:border-[#252938] bg-slate-50 dark:bg-[#101219] p-3.5 flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {(user?.displayName || settings.username || 'M')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {user?.displayName || settings.username || 'User'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email ||
                      (isEn ? 'Active Maria AI Session' : 'Sesi Maria AI Aktif')}
                  </div>
                </div>
              </div>

              {/* Permissions & Tools Summary */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {isEn
                      ? 'Permissions & tools enabled:'
                      : 'Izin & kapabilitas yang diaktifkan:'}
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {(isEn ? connectModalPlugin.scopesEn : connectModalPlugin.scopes).map(
                    (sc, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{sc}</span>
                      </li>
                    )
                  )}
                </ul>
                {connectModalPlugin.tools.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    {isEn
                      ? `${connectModalPlugin.tools.length} tools available (${connectModalPlugin.tools
                          .slice(0, 3)
                          .join(', ')}${connectModalPlugin.tools.length > 3 ? '...' : ''})`
                      : `${connectModalPlugin.tools.length} alat tersedia (${connectModalPlugin.tools
                          .slice(0, 3)
                          .join(', ')}${connectModalPlugin.tools.length > 3 ? '...' : ''})`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={() => setConnectModalPlugin(null)}
                  className="flex-1 h-11 rounded-full border border-slate-200 dark:border-[#2b2f40] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202331] text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={handleConfirmAuthorize}
                  className="flex-1 h-11 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAuthorizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEn ? 'Connecting...' : 'Menghubungkan...'}</span>
                    </>
                  ) : (
                    <span>{isEn ? 'Connect' : 'Hubungkan'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disconnect Confirmation Modal */}
        {disconnectModalPlugin && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setDisconnectModalPlugin(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#262a3a] p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn
                  ? `Disconnect ${disconnectModalPlugin.name}?`
                  : `Putuskan koneksi ${disconnectModalPlugin.name}?`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {isEn
                  ? 'This removes Maria AI access to all tools and resources from this connector. Your chat history and personal preferences remain untouched.'
                  : 'Ini akan menghapus akses ke semua alat dan sumber daya dari konektor ini. Riwayat obrolan serta preferensi pribadi Anda tetap tersimpan.'}
              </p>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDisconnectModalPlugin(null)}
                  className="flex-1 h-11 rounded-full border border-slate-200 dark:border-[#2b2f40] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202331] text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisconnect}
                  className="flex-1 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Disconnect' : 'Putuskan sambungan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Connector Modal (MCP / Endpoint) */}
        {isCustomModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsCustomModalOpen(false)}
          >
            <form
              onSubmit={handleCreateCustomConnector}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#262a3a] p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Link2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {isEn ? 'Add custom connector' : 'Tambahkan konektor kustom'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isEn
                        ? 'Connect a remote MCP server or custom API endpoint'
                        : 'Hubungkan server MCP jarak jauh atau endpoint API kustom'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222534] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Name' : 'Nama Konektor'}
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setCustomFormError(null);
                    }}
                    placeholder="e.g. Company CRM, Postgres MCP"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2a2e3e] bg-slate-50 dark:bg-[#101219] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Remote MCP Server URL' : 'URL Konektor / Server MCP'}
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setCustomFormError(null);
                    }}
                    placeholder="https://mcp.example.com/sse"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2a2e3e] bg-slate-50 dark:bg-[#101219] text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Description (optional)' : 'Deskripsi singkat (opsional)'}
                  </label>
                  <input
                    type="text"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Search internal docs and run analytics queries'
                        : 'Cari dokumen internal dan jalankan kueri data'
                    }
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2a2e3e] bg-slate-50 dark:bg-[#101219] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'Tools (comma-separated, optional)'
                      : 'Daftar alat (pisahkan koma, opsional)'}
                  </label>
                  <input
                    type="text"
                    value={customToolsText}
                    onChange={(e) => setCustomToolsText(e.target.value)}
                    placeholder="list_records, search_docs, run_query"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#2a2e3e] bg-slate-50 dark:bg-[#101219] text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {customFormError && (
                  <p className="text-xs text-rose-500 font-medium">{customFormError}</p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 h-11 rounded-full border border-slate-200 dark:border-[#2b2f40] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202331] text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Batal'}
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  {isEn ? 'Add & Connect' : 'Tambah & Hubungkan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inline Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-[#1f222d] border border-slate-700 dark:border-[#34394d] text-white text-xs font-semibold shadow-xl flex items-center gap-2 pointer-events-none">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );

    // DETAIL VIEW
    if (view.type === 'detail') {
      const plugin = getPluginById(view.pluginId, customConnectors);
      if (!plugin) {
        setView({ type: 'main', tab: 'discover' });
        return null;
      }
      const installed = isPluginInstalled(plugin);
      const description = isEn ? plugin.fullDescEn : plugin.fullDesc;
      const scopes = isEn ? plugin.scopesEn : plugin.scopes;

      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-slate-900 dark:bg-[#0e0f12] dark:text-white relative">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-slate-200/80 dark:border-[#1e2028] bg-white/95 dark:bg-[#0e0f12]/95 backdrop-blur-md shrink-0 z-20">
            <button
              type="button"
              onClick={() => setView(view.returnView)}
              aria-label={isEn ? 'Back' : 'Kembali'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#232634] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSharePlugin(plugin)}
                aria-label={isEn ? 'Share connector' : 'Bagikan konektor'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#232634] transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {installed ? (
                <button
                  type="button"
                  onClick={() => setDisconnectModalPlugin(plugin)}
                  className="min-h-[40px] px-4 rounded-full border border-slate-200 dark:border-[#2c3042] bg-white dark:bg-[#171923] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isEn ? 'Disconnect' : 'Putuskan sambungan'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnectClick(plugin)}
                  className="min-h-[40px] px-4 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isEn ? 'Connect' : 'Hubungkan'}
                </button>
              )}
            </div>
          </header>

          {/* Body */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 pb-28">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Hero */}
              <div className="flex items-center gap-4">
                <PluginBrandIcon id={plugin.id} size="lg" />
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {plugin.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{isEn ? `By ${plugin.developer}` : `Oleh ${plugin.developer}`}</span>
                    {installed && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {isEn ? 'Connected' : 'Terhubung'}
                        </span>
                      </>
                    )}
                    {plugin.tools.length > 0 && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">
                          {isEn
                            ? `${plugin.tools.length} tools`
                            : `${plugin.tools.length} alat`}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Interactive Tools Section (Alat) */}
              {plugin.tools.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isEn ? 'Tools' : 'Alat'}
                    </h2>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {plugin.tools.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plugin.tools.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => handleInvokeTool(plugin, tool)}
                        title={
                          isEn
                            ? `Invoke ${tool} with ${plugin.mentionTag}`
                            : `Gunakan ${tool} dengan ${plugin.mentionTag}`
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#272b3a] bg-slate-50 dark:bg-[#151721] hover:bg-slate-100 dark:hover:bg-[#1f2331] text-xs font-mono text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Sample Prompts Carousel */}
              {plugin.samplePrompts.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isEn ? 'Try in conversation' : 'Coba di percakapan'}
                  </h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
                    {plugin.samplePrompts.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() =>
                          handleLaunchPrompt(
                            plugin,
                            isEn ? sample.promptEn : sample.prompt
                          )
                        }
                        className={`snap-start shrink-0 w-[85%] sm:w-[340px] rounded-2xl border p-4 text-left flex flex-col justify-between gap-4 transition-transform duration-150 active:scale-[0.98] cursor-pointer ${
                          PROMPT_CARD_TONES[sample.cardTone]
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold opacity-75">
                            {isEn ? sample.titleEn : sample.title}
                          </div>
                          <p className="text-xs sm:text-[13px] leading-relaxed font-medium">
                            <span className="font-bold">{plugin.mentionTag}</span>{' '}
                            {(isEn ? sample.promptEn : sample.prompt).replace(
                              `${plugin.mentionTag} `,
                              ''
                            )}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-semibold opacity-80 pt-1">
                          <span>{isEn ? 'Use prompt now' : 'Gunakan sekarang'}</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* About & Capabilities */}
              <div className="space-y-2">
                <p
                  className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${
                    isDescExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {description}
                </p>

                {isDescExpanded && (
                  <div className="pt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {isEn ? 'Permissions & capabilities:' : 'Izin & kemampuan:'}
                    </div>
                    <ul className="space-y-1 list-disc pl-4">
                      {scopes.map((sc, i) => (
                        <li key={i}>{sc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsDescExpanded((prev) => !prev)}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer py-1"
                >
                  {isDescExpanded
                    ? isEn
                      ? 'Show less'
                      : 'Lebih sedikit'
                    : isEn
                    ? 'More'
                    : 'Selengkapnya'}
                </button>
              </div>

              {/* App Mention Chip */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isEn ? 'Mention handle' : 'Tag pemicu'}
                </div>
                <button
                  type="button"
                  onClick={() => handleLaunchPrompt(plugin)}
                  className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#242836] bg-slate-50 dark:bg-[#151720] hover:bg-slate-100 dark:hover:bg-[#1d202c] transition-colors cursor-pointer"
                >
                  <PluginBrandIcon id={plugin.id} size="sm" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {plugin.mentionTag}
                  </span>
                </button>
              </div>

              {/* Information Table */}
              <div className="space-y-2 pt-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Detail' : 'Detail'}
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-[#1e212b] border-t border-b border-slate-100 dark:border-[#1e212b] text-xs sm:text-sm">
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Developer' : 'Pembuat'}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white text-right">
                      {plugin.developer}
                    </span>
                  </div>
                  {plugin.mcpUrl && (
                    <div className="py-3.5 flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-slate-400">
                        {isEn ? 'Connector URL' : 'URL konektor'}
                      </span>
                      <a
                        href={plugin.mcpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate max-w-[230px]"
                      >
                        <span className="truncate">{plugin.mcpUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Capabilities' : 'Kapabilitas'}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white text-right">
                      {isEn ? plugin.capabilitiesEn : plugin.capabilities}
                    </span>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Website' : 'Situs Web'}
                    </span>
                    <a
                      href={plugin.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{plugin.website}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Version' : 'Versi'}
                    </span>
                    <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                      {plugin.version}
                    </span>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Privacy Policy' : 'Kebijakan privasi'}
                    </span>
                    <a
                      href={plugin.privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-700 dark:text-slate-300 hover:underline truncate max-w-[220px]"
                    >
                      {plugin.privacyUrl.startsWith('/')
                        ? 'maria-ai.app/privacy'
                        : plugin.privacyUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isEn ? 'Terms of Service' : 'Ketentuan layanan'}
                    </span>
                    <a
                      href={plugin.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-700 dark:text-slate-300 hover:underline truncate max-w-[220px]"
                    >
                      {plugin.termsUrl.startsWith('/')
                        ? 'maria-ai.app/terms'
                        : plugin.termsUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>

                {plugin.source === 'custom' && (
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomConnector(plugin)}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {isEn
                          ? 'Delete custom connector'
                          : 'Hapus konektor kustom'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Sticky CTA */}
          <div className="sticky bottom-0 left-0 right-0 px-4 sm:px-6 py-3.5 bg-gradient-to-t from-white via-white to-white/80 dark:from-[#0e0f12] dark:via-[#0e0f12] dark:to-[#0e0f12]/80 border-t border-slate-100 dark:border-[#1c1f29] shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              {!installed ? (
                <button
                  type="button"
                  disabled={installingId === plugin.id}
                  onClick={() => handleConnectClick(plugin)}
                  className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {installingId === plugin.id ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <span>
                      {isEn ? 'Connect plugin' : 'Hubungkan konektor'}
                    </span>
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleLaunchPrompt(plugin)}
                    className="flex-1 h-12 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="truncate">
                      {isEn
                        ? `Use ${plugin.mentionTag} in Chat`
                        : `Pakai ${plugin.mentionTag} di Chat`}
                    </span>
                  </button>
                  <a
                    href={plugin.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 px-5 rounded-full border border-slate-200 dark:border-[#2a2e3e] bg-slate-50 dark:bg-[#171923] hover:bg-slate-100 dark:hover:bg-[#212432] text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <span>{isEn ? 'Open' : 'Buka'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>

          {renderModalsAndToast()}
        </div>
      );
    }

    const isCategoryView = view.type === 'category';
    const activeTab: DirectoryTab = view.type === 'main' ? view.tab : 'discover';

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-slate-900 dark:bg-[#0e0f12] dark:text-white relative">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-slate-200/80 dark:border-[#1e2028] bg-white/95 dark:bg-[#0e0f12]/95 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            {isCategoryView ? (
              <button
                type="button"
                onClick={() => setView({ type: 'main', tab: 'discover' })}
                aria-label={isEn ? 'Back' : 'Kembali'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#232634] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a1c25] transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Center Title or Segmented Tab Switcher */}
          {isCategoryView ? (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-bold tracking-tight truncate">
                {currentCategoryTitle}
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {activeCategoryPlugins.length}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-[#181a24] border border-slate-200/80 dark:border-[#252836]">
              <button
                type="button"
                onClick={() => setView({ type: 'main', tab: 'discover' })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'discover'
                    ? 'bg-white dark:bg-[#262a3a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isEn ? 'Directory' : 'Direktori'}
              </button>
              <button
                type="button"
                onClick={() => setView({ type: 'main', tab: 'connected' })}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'connected'
                    ? 'bg-white dark:bg-[#262a3a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{isEn ? 'Connected' : 'Terhubung'}</span>
                <span className="font-mono tabular-nums opacity-75">
                  {installedPlugins.length}
                </span>
              </button>
            </div>
          )}

          {/* Right Actions: + Add Custom / Menu & Chat */}
          <div className="flex items-center gap-1.5 shrink-0 relative" ref={plusMenuRef}>
            {!isCategoryView && (
              <button
                type="button"
                onClick={() => setIsHeaderPlusMenuOpen((prev) => !prev)}
                aria-label={isEn ? 'Add connector' : 'Tambah konektor'}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-slate-200 dark:border-[#272a38] bg-slate-50 dark:bg-[#171923] hover:bg-slate-100 dark:hover:bg-[#222533] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            )}

            {isHeaderPlusMenuOpen && (
              <div className="absolute right-0 top-12 z-40 w-60 rounded-2xl border border-slate-200 dark:border-[#2a2e3e] bg-white dark:bg-[#191b24] shadow-xl py-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderPlusMenuOpen(false);
                    setView({ type: 'main', tab: 'discover' });
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#242838] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isEn ? 'Browse connectors' : 'Jelajahi konektor'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderPlusMenuOpen(false);
                    setIsCustomModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#242838] cursor-pointer font-medium"
                >
                  <Link2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>
                    {isEn ? 'Add custom connector' : 'Tambahkan konektor kustom'}
                  </span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToChat}
              className="min-h-[40px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#272a38] bg-slate-50 dark:bg-[#171923] hover:bg-slate-100 dark:hover:bg-[#222533] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? 'Chat' : 'Chat'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div
          ref={scrollContainerRef}
          onClick={() => openRowMenuId && setOpenRowMenuId(null)}
          className="flex-1 overflow-y-auto px-3 sm:px-6 pt-4 pb-24"
        >
          <div className="max-w-5xl mx-auto space-y-6">
            {isCategoryView ? (
              activeCategoryPlugins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                  {activeCategoryPlugins.map((plugin) => renderDirectoryRow(plugin))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {normalizedQuery
                      ? isEn
                        ? `No connectors match "${searchQuery}" in this category.`
                        : `Tidak ada konektor cocok dengan "${searchQuery}" di kategori ini.`
                      : isEn
                      ? 'No connectors installed here yet.'
                      : 'Belum ada konektor terpasang di bagian ini.'}
                  </p>
                  {normalizedQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                    >
                      {isEn ? 'Reset search' : 'Reset pencarian'}
                    </button>
                  )}
                </div>
              )
            ) : activeTab === 'connected' ? (
              /* CONNECTED MANAGER TAB (Active + Connector Suggestions + Custom Connector + Inactive) */
              <div className="space-y-6">
                {/* Saran Konektor Toggle Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#242836] bg-slate-50/90 dark:bg-[#14161f] p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isEn ? 'Connector suggestions' : 'Saran konektor'}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {isEn
                        ? 'Maria AI will surface relevant connectors from your directory when needed.'
                        : 'Maria AI akan membantu Anda menemukan konektor yang relevan saat percakapan.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={connectorSuggestions}
                    onClick={handleToggleSuggestions}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer ${
                      connectorSuggestions
                        ? 'bg-blue-600'
                        : 'bg-slate-300 dark:bg-[#2c3142]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        connectorSuggestions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Add Custom Connector Action Bar */}
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="w-full min-h-[52px] px-4 py-3 rounded-2xl border border-dashed border-slate-300 dark:border-[#2d3244] hover:border-blue-500 dark:hover:border-blue-500/70 hover:bg-slate-50 dark:hover:bg-[#151822] flex items-center justify-between gap-3 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Plus className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {isEn ? 'Add custom connector' : 'Tambahkan konektor kustom'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {isEn
                          ? 'Bridge remote MCP servers or internal tool endpoints'
                          : 'Hubungkan server MCP jarak jauh atau endpoint alat internal'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Active Connected Section */}
                <section className="space-y-2.5">
                  <div className="px-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {isEn
                        ? `Active (${installedPlugins.filter(matchesQuery).length})`
                        : `Aktif (${installedPlugins.filter(matchesQuery).length})`}
                    </h3>
                  </div>

                  {installedPlugins.filter(matchesQuery).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5">
                      {installedPlugins
                        .filter(matchesQuery)
                        .map((plugin) => renderDirectoryRow(plugin, true))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 dark:border-[#222534] p-6 text-center space-y-2.5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {normalizedQuery
                          ? isEn
                            ? `No active connectors match "${searchQuery}".`
                            : `Tidak ada konektor aktif yang cocok dengan "${searchQuery}".`
                          : isEn
                          ? 'No connectors are currently active.'
                          : 'Belum ada konektor yang terhubung saat ini.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setView({ type: 'main', tab: 'discover' });
                        }}
                        className="px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                      >
                        {isEn ? 'Explore directory' : 'Jelajahi direktori'}
                      </button>
                    </div>
                  )}
                </section>

                {/* Available / Inactive Section */}
                {inactivePlugins.filter(matchesQuery).length > 0 && (
                  <section className="space-y-2.5">
                    <div className="px-2">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                        {isEn
                          ? `Available (${inactivePlugins.filter(matchesQuery).length})`
                          : `Belum Terhubung (${inactivePlugins.filter(matchesQuery).length})`}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5">
                      {inactivePlugins
                        .filter(matchesQuery)
                        .map((plugin) => renderDirectoryRow(plugin))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              /* DIRECTORY DISCOVER TAB */
              <>
                {/* Installed Horizontal Quick Strip */}
                {!normalizedQuery && selectedCategoryChip === 'all' && (
                  <section className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setView({ type: 'category', categoryId: 'installed' })
                      }
                      className="px-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white hover:opacity-80 cursor-pointer"
                    >
                      <span>{isEn ? 'Installed' : 'Terpasang'}</span>
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        {installedPlugins.length}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    {installedPlugins.length > 0 ? (
                      <div className="flex items-center gap-3 overflow-x-auto px-3 pb-1">
                        {installedPlugins.map((plugin) => (
                          <button
                            key={plugin.id}
                            type="button"
                            title={plugin.name}
                            onClick={() => openDetail(plugin)}
                            className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none"
                          >
                            <div className="transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
                              <PluginBrandIcon id={plugin.id} size="md" />
                            </div>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 max-w-[58px] truncate">
                              {plugin.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 text-xs text-slate-500 dark:text-slate-400">
                        {isEn
                          ? 'Tap Connect on any plugin below to activate it.'
                          : 'Tekan Hubungkan pada konektor di bawah untuk mengaktifkannya.'}
                      </p>
                    )}
                  </section>
                )}

                {/* Horizontal Category Filter Bar */}
                <div className="flex items-center gap-2 overflow-x-auto px-3 pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryChip('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedCategoryChip === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#171923] dark:text-slate-300 dark:hover:bg-[#222534]'
                    }`}
                  >
                    {isEn ? 'All' : 'Semua'}
                  </button>
                  {PLUGIN_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryChip(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        selectedCategoryChip === cat.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#171923] dark:text-slate-300 dark:hover:bg-[#222534]'
                      }`}
                    >
                      {isEn ? cat.labelEn : cat.label}
                    </button>
                  ))}
                </div>

                {/* Filtered or Categorized Listing */}
                {normalizedQuery || selectedCategoryChip !== 'all' ? (
                  <div className="space-y-2">
                    <div className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {filteredDiscover.length} {isEn ? 'connectors' : 'konektor'}
                    </div>
                    {filteredDiscover.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5">
                        {filteredDiscover.map((plugin) =>
                          renderDirectoryRow(plugin)
                        )}
                      </div>
                    ) : (
                      <div className="py-16 text-center space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {isEn
                            ? `No connectors found for "${searchQuery}".`
                            : `Konektor untuk "${searchQuery}" tidak ditemukan.`}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategoryChip('all');
                          }}
                          className="px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                        >
                          {isEn ? 'Reset filters' : 'Reset filter'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {PLUGIN_CATEGORIES.map((category) => {
                      const items = allPlugins.filter((p) =>
                        p.categories.includes(category.id)
                      );
                      if (items.length === 0) return null;

                      return (
                        <section key={category.id} className="space-y-2">
                          <button
                            type="button"
                            onClick={() =>
                              setView({ type: 'category', categoryId: category.id })
                            }
                            className="px-3 flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white hover:opacity-80 cursor-pointer"
                          >
                            <span>{isEn ? category.labelEn : category.label}</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0.5">
                            {items.slice(0, 4).map((plugin) =>
                              renderDirectoryRow(plugin)
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Floating Sticky Bottom Search Bar */}
        <div className="sticky bottom-0 left-0 right-0 px-4 sm:px-6 py-3 bg-gradient-to-t from-white via-white to-transparent dark:from-[#0e0f12] dark:via-[#0e0f12] dark:to-transparent shrink-0 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="h-12 px-4 rounded-full border border-slate-200 dark:border-[#2a2d3b] bg-white/95 dark:bg-[#191b24]/95 backdrop-blur-md shadow-lg flex items-center gap-2.5 focus-within:ring-2 focus-within:ring-blue-500">
              <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isCategoryView
                    ? isEn
                      ? 'Search this category'
                      : 'Cari di kategori ini'
                    : isEn
                    ? 'Search connectors & plugins'
                    : 'Cari konektor atau plugin'
                }
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={isEn ? 'Clear search' : 'Bersihkan pencarian'}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {renderModalsAndToast()}
      </div>
    );
  }
);
