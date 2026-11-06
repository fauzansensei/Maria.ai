import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Upload,
  Download,
  Share2,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Send,
  Loader2,
  Zap,
  Info,
} from 'lucide-react';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (imageUrl: string, prompt: string, model: string) => void;
  initialBaseImage?: string | null;
  initialPrompt?: string;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
  initialBaseImage = null,
  initialPrompt = '',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>(initialBaseImage ? 'edit' : 'create');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [engine, setEngine] = useState<'nano-banana-2' | 'nano-banana-2.1' | 'free'>('free'); // Default to free trial (zero quota friction)
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [baseImage, setBaseImage] = useState<string | null>(initialBaseImage);
  const [baseImageName, setBaseImageName] = useState<string>('Gambar Referensi');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    imageUrl: string;
    model: string;
    notice?: string;
    prompt: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<
    Array<{ imageUrl: string; model: string; prompt: string; timestamp: Date }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial props if changed
  React.useEffect(() => {
    if (initialBaseImage) {
      setBaseImage(initialBaseImage);
      setActiveTab('edit');
    }
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialBaseImage, initialPrompt]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (PNG, JPG, WebP).');
      return;
    }

    setBaseImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setBaseImage(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Harap masukkan prompt atau deskripsi gambar terlebih dahulu.');
      return;
    }

    if (activeTab === 'edit' && !baseImage) {
      setErrorMsg('Harap unggah gambar dasar yang ingin Anda modifikasi/edit.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const endpoint = activeTab === 'edit' ? '/api/edit-image' : '/api/generate-image';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          imageSize,
          engine,
          baseImage: activeTab === 'edit' ? baseImage : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal memproses gambar dari server.');
      }

      const data = await res.json();
      const resultObj = {
        imageUrl: data.imageUrl,
        model: data.model || (engine === 'free' ? 'flux-free-trial' : engine === 'nano-banana-2' ? 'gemini-3.1-flash-lite-image' : 'gemini-nano-banana-2.1'),
        notice: data.notice,
        prompt: prompt.trim(),
      };

      setCurrentResult(resultObj);
      setHistory((prev) => [
        {
          imageUrl: resultObj.imageUrl,
          model: resultObj.model,
          prompt: resultObj.prompt,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Image Studio Generation Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentResult?.imageUrl) return;
    const a = document.createElement('a');
    a.href = currentResult.imageUrl;
    a.download = `MariaAI_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    if (!currentResult?.imageUrl) return;
    navigator.clipboard.writeText(currentResult.imageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemixAsEdit = (imgUrl: string) => {
    setBaseImage(imgUrl);
    setBaseImageName('Hasil Generasi Sebelumnya');
    setActiveTab('edit');
    setPrompt('');
    setErrorMsg(null);
  };

  const quickStyles = [
    'Fotorealistik 8K Tajam',
    'Anime Style Makoto Shinkai',
    'Cyberpunk Neon Cinematic',
    '3D Pixar Animasi',
    'Lukisan Cat Air Halus',
    'Minimalist Flat Art',
    'Fantasy Landscape RPG',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c1222] border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Studio Gambar AI Maria
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                  DEFCON 5
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Buat ilustrasi baru atau edit gambar bertenaga Gemini Nano Banana 2.1 & Free Trial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 columns on desktop */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (Left, 7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Tabs: Buat vs Edit */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  setErrorMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Gambar Baru</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit');
                  setErrorMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Edit / Modifikasi Gambar</span>
              </button>
            </div>

            {/* Engine / Tier Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Pilih Engine Model AI:</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  {engine === 'nano-banana-2' ? 'Gemini 3.1 Flash Image (Aktif)' : engine === 'nano-banana-2.1' ? 'Nano Banana 2.1 4K' : 'Free Trial'}
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEngine('nano-banana-2')}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    engine === 'nano-banana-2'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      Nano Banana 2
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      engine === 'nano-banana-2'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {engine === 'nano-banana-2' ? 'Terpilih' : 'Google'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Gemini 3.1 Flash Image resmi Google. Generasi gambar ultra cepat & presisi.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEngine('nano-banana-2.1')}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    engine === 'nano-banana-2.1'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Nano Banana 2.1
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      Pro 4K
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Resolusi gambar tinggi hingga 4K bertenaga Google AI Studio.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEngine('free')}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    engine === 'free'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Free Trial (Flux)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      Gratis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Cadangan 100% bebas kuota jika kuota API habis.
                  </p>
                </button>
              </div>
            </div>

            {/* Base Image Upload Area (Only for Edit Mode) */}
            {activeTab === 'edit' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Gambar Dasar yang Ingin Diedit:
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {baseImage ? (
                  <div className="relative p-2 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 flex items-center gap-3">
                    <img
                      src={baseImage}
                      alt="Base preview"
                      className="w-16 h-16 rounded-xl object-cover border border-blue-200 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {baseImageName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Siap diedit dengan instruksi prompt di bawah
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBaseImage(null)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors"
                      title="Hapus gambar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-[#0f172a] flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                  >
                    <Upload className="w-7 h-7 text-blue-500 mb-2" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Klik untuk Unggah Gambar yang Ingin Diedit
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Mendukung PNG, JPG, WebP
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {activeTab === 'edit' ? 'Instruksi Edit / Perubahan:' : 'Deskripsi / Prompt Gambar:'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'edit'
                    ? 'Contoh: Ubah latar belakang menjadi pemandangan kota futuristik cyberpunk malam hari dengan lampu neon ungu dan biru...'
                    : 'Contoh: Sebuah robot kecil lucu duduk di atas bunga teratai di tengah danau mistis bercahaya, gaya 3D sinematik...'
                }
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none shadow-xs leading-relaxed"
              />

              {/* Quick style inspiration chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-semibold text-slate-400 mr-1">Inspirasi Gaya:</span>
                {quickStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      if (!prompt.includes(style)) {
                        setPrompt((prev) => (prev ? `${prev}, ${style}` : style));
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-slate-200/60 dark:border-slate-700"
                  >
                    + {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Rasio Aspek (Aspect Ratio):
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all ${
                        aspectRatio === ratio
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {engine === 'nano-banana-2.1' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Resolusi Gambar (Nano Banana 2.1 Pro):
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['1K', '2K', '4K'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImageSize(sz)}
                        className={`py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                          imageSize === sz
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {activeTab === 'edit' ? 'Sedang Memodifikasi Gambar...' : 'Sedang Menggambar AI...'}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-white" />
                  <span>
                    {activeTab === 'edit'
                      ? 'Terapkan Modifikasi & Edit Gambar'
                      : 'Hasilkan Gambar Sekarang'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Result Column (Right, 5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 min-h-[360px]">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" />
                  <Sparkles className="w-7 h-7 text-blue-600 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Memproses Kanvas Visual...
                  </div>
                  <div className="text-xs text-slate-400 max-w-xs">
                    Model AI sedang merender piksel gambar dengan detail artistik tinggi.
                  </div>
                </div>
              </div>
            ) : currentResult ? (
              <div className="w-full h-full flex flex-col space-y-3">
                {/* Image Output Card */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center max-h-[380px] shadow-md group">
                  <img
                    src={currentResult.imageUrl}
                    alt="Generated output"
                    className="w-full h-full object-contain max-h-[380px]"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md text-white hover:bg-blue-600 transition-colors shadow-sm"
                      title="Download Gambar"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-md text-white hover:bg-blue-600 transition-colors shadow-sm"
                      title="Salin Data"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Model & Notice Info */}
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      Engine: {currentResult.model}
                    </span>
                    <span className="text-[10px]">{aspectRatio}</span>
                  </div>
                  {currentResult.notice && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      {currentResult.notice}
                    </p>
                  )}
                </div>

                {/* Action Buttons: Kirim ke Chat & Remix */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSendToChat?.(
                        currentResult.imageUrl,
                        currentResult.prompt,
                        currentResult.model
                      );
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim ke Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemixAsEdit(currentResult.imageUrl)}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    <span>Edit Gambar Ini</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-500">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    Belum Ada Gambar yang Dihasilkan
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-xs">
                    Tuliskan prompt di sebelah kiri dan klik tombol hasilkan untuk melihat mahakarya visual Anda.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Session History Tray */}
        {history.length > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c1222]/50 flex items-center gap-3 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Riwayat Sesi:
            </span>
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setCurrentResult({
                    imageUrl: h.imageUrl,
                    model: h.model,
                    prompt: h.prompt,
                  })
                }
                className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-all shadow-2xs"
                title={h.prompt}
              >
                <img src={h.imageUrl} alt={h.prompt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
