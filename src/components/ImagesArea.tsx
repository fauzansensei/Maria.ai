import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Wand2,
  Download,
  Sparkles,
  Menu,
  MessageSquare,
  Loader2,
  Send,
  Layers,
} from 'lucide-react';
import { Message } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  createdAt: string;
}

interface ImagesAreaProps {
  messages: Message[];
  onBackToChat: () => void;
  onOpenSidebar: () => void;
  onOpenImageStudio: (baseImage?: string, prompt?: string) => void;
  onSendImageToChat: (imageUrl: string, prompt: string, model: string) => void;
}

export const ImagesArea: React.FC<ImagesAreaProps> = React.memo(
  ({ messages, onBackToChat, onOpenSidebar, onOpenImageStudio, onSendImageToChat }) => {
    const { isEn } = useLanguage();
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3'>('1:1');
    const [engine, setEngine] = useState<'free' | 'nano-banana-2' | 'nano-banana-2.1'>('free');
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [localGallery, setLocalGallery] = useState<GeneratedImageRecord[]>([]);

    const chatImages = useMemo<GeneratedImageRecord[]>(() => {
      const list: GeneratedImageRecord[] = [];
      for (const m of messages) {
        if (m.imageUri) {
          list.push({
            id: `chat-img-${m.id}`,
            imageUrl: m.imageUri,
            prompt: m.content.slice(0, 120),
            model: m.model || 'gemini-image',
            createdAt: '',
          });
        }
        if (Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            if (att.type === 'image' && (att.previewUrl || att.originalUrl)) {
              list.push({
                id: `att-${att.id}`,
                imageUrl: att.originalUrl || att.previewUrl,
                prompt: att.name,
                model: 'uploaded',
                createdAt: '',
              });
            }
          }
        }
      }
      return list.reverse();
    }, [messages]);

    const allImages = [...localGallery, ...chatImages];

    const handleQuickGenerate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim() || isGenerating) return;
      setIsGenerating(true);
      setErrorMsg(null);

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            aspectRatio,
            imageSize: '1K',
            engine,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.imageUrl) {
          throw new Error(data?.error || (isEn ? 'Failed to generate image.' : 'Gagal membuat gambar.'));
        }
        setLocalGallery((prev) => [
          {
            id: `gen-${Date.now()}`,
            imageUrl: data.imageUrl,
            prompt: prompt.trim(),
            model: data.model || engine,
            createdAt: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        setPrompt('');
      } catch (err: any) {
        setErrorMsg(err?.message || (isEn ? 'Image generation failed.' : 'Gagal memproses gambar.'));
      } finally {
        setIsGenerating(false);
      }
    };

    const handleDownload = (url: string, label: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `MariaAI_${label.replace(/[^a-z0-9]/gi, '_').slice(0, 24)}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0e0f12] dark:text-white">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1e2028] bg-white dark:bg-[#13141a] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label={isEn ? 'Open Menu' : 'Buka Menu'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1f212c] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEn ? 'Images & Visual Studio' : 'Gambar & Studio Visual AI'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Generate, edit, and browse all your AI illustrations'
                  : 'Buat, edit, dan kelola semua ilustrasi gambar AI Anda'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenImageStudio()}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'Full Image Studio' : 'Buka Editor Studio'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToChat}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-white dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232634] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Quick Generation Card */}
            <form
              onSubmit={handleQuickGenerate}
              className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 sm:p-5 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{isEn ? 'Quick Image Generator' : 'Pembuat Gambar Cepat'}</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['1:1', '16:9', '9:16', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        aspectRatio === ratio
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-slate-50 dark:bg-[#1a1c26] border-slate-200 dark:border-[#2a2e3e] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value as any)}
                    aria-label={isEn ? 'Image Engine' : 'Mesin Gambar'}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 dark:bg-[#1a1c26] border border-slate-200 dark:border-[#2a2e3e] text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="free">Free Flux Trial (Gratis)</option>
                    <option value="nano-banana-2">Nano Banana 2</option>
                    <option value="nano-banana-2.1">Nano Banana 2.1 (HD)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Describe the image you want to create (e.g., Futuristic library at sunset, anime art)...'
                      : 'Jelaskan gambar yang ingin dibuat (contoh: Kota futuristik saat senja, gaya sinematik)...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="min-h-[42px] px-5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEn ? 'Creating...' : 'Membuat...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>{isEn ? 'Generate' : 'Buat Gambar'}</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500">{errorMsg}</p>
              )}
            </form>

            {/* Gallery Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>{isEn ? 'Your Image Gallery' : 'Galeri Gambar Anda'}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({allImages.length})
                  </span>
                </h3>
              </div>

              {allImages.length === 0 ? (
                <div className="bg-white dark:bg-[#14161f] border border-dashed border-slate-200 dark:border-[#272a3a] rounded-2xl p-10 text-center space-y-2">
                  <ImageIcon className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {isEn
                      ? 'No generated or shared images yet. Type a prompt above or open the Image Studio to create your first visual.'
                      : 'Belum ada gambar yang dibuat. Ketik deskripsi di atas atau buka Editor Studio untuk membuat gambar pertama Anda.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allImages.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="aspect-square bg-slate-100 dark:bg-[#0d0e14] overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.prompt}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                        <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                          {item.prompt}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#202330]">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.model}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenImageStudio(item.imageUrl, item.prompt)}
                              title={isEn ? 'Edit in Studio' : 'Edit di Studio'}
                              className="p-2 rounded-lg border border-slate-200 dark:border-[#2b2e3e] text-slate-600 dark:text-slate-300 hover:text-purple-500 cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(item.imageUrl, item.prompt)}
                              title={isEn ? 'Download' : 'Unduh'}
                              className="p-2 rounded-lg border border-slate-200 dark:border-[#2b2e3e] text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSendImageToChat(item.imageUrl, item.prompt, item.model);
                                onBackToChat();
                              }}
                              title={isEn ? 'Send to Chat' : 'Kirim ke Chat'}
                              className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
