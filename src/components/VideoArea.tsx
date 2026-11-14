import React, { useState, useRef } from 'react';
import {
  Video,
  Menu,
  MessageSquare,
  Upload,
  Sparkles,
  Film,
  Loader2,
  Send,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { MediaAttachment } from '../types/index.ts';
import {
  readFileAsDataUrl,
  extractBase64,
  generateVideoThumbnail,
  storeMediaBase64,
  storeOriginalMedia,
  storeOriginalFile,
  storeMediaFileUri,
  uploadMediaToGemini,
} from '../lib/mediaUtils.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface StoryboardScene {
  sceneNumber: number;
  title: string;
  visualDescription: string;
  cameraAndAudio: string;
  imagePrompt: string;
  previewUrl?: string;
  isGeneratingFrame?: boolean;
}

interface VideoAreaProps {
  onBackToChat: () => void;
  onOpenSidebar: () => void;
  onAnalyzeVideoInChat: (prompt: string, attachment: MediaAttachment) => void;
  onSendPromptToChat: (prompt: string) => void;
}

export const VideoArea: React.FC<VideoAreaProps> = React.memo(
  ({ onBackToChat, onOpenSidebar, onAnalyzeVideoInChat, onSendPromptToChat }) => {
    const { isEn } = useLanguage();
    const [activeTab, setActiveTab] = useState<'analyze' | 'storyboard'>('analyze');

    // Video Analysis tab state
    const [selectedVideo, setSelectedVideo] = useState<MediaAttachment | null>(null);
    const [analysisPreset, setAnalysisPreset] = useState<string>(
      isEn
        ? 'Watch and analyze this video frame-by-frame: summarize the timeline, key visuals, spoken audio/dialogue, and on-screen text.'
        : 'Tonton dan analisis video ini bingkai demi bingkai: ringkas alur kejadian kronologis, visual utama, audio/dialog, serta teks yang muncul di layar.'
    );
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Storyboard & Video Script tab state
    const [concept, setConcept] = useState('');
    const [style, setStyle] = useState('Cinematic Realistic');
    const [scenes, setScenes] = useState<StoryboardScene[]>([]);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [scriptError, setScriptError] = useState<string | null>(null);

    const handlePickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileError(null);
      setIsReadingFile(true);
      try {
        const id = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const mimeType = file.type || 'video/mp4';
        const thumbUrl = await generateVideoThumbnail(file);
        const objectUrl = URL.createObjectURL(file);

        storeOriginalMedia(id, objectUrl);
        storeOriginalFile(id, file);
        storeOriginalFile(file.name, file);

        let base64Data = '';
        let fileUri: string | undefined;

        try {
          const uploaded = await uploadMediaToGemini(file, file.name, mimeType);
          fileUri = uploaded.fileUri;
          storeMediaFileUri(id, uploaded.fileUri);
          storeMediaFileUri(file.name, uploaded.fileUri);
        } catch (uploadErr) {
          if (file.size <= 10 * 1024 * 1024) {
            const dataUrl = await readFileAsDataUrl(file);
            base64Data = extractBase64(dataUrl);
            storeMediaBase64(id, base64Data);
            storeMediaBase64(file.name, base64Data);
          } else {
            throw uploadErr;
          }
        }

        const attachment: MediaAttachment = {
          id,
          name: file.name,
          size: file.size,
          mimeType,
          type: 'video',
          previewUrl: thumbUrl || objectUrl,
          originalUrl: objectUrl,
          base64Data,
          fileUri,
        };
        setSelectedVideo(attachment);
      } catch (err: any) {
        setFileError(err?.message || (isEn ? 'Failed to load video file.' : 'Gagal memuat berkas video.'));
      } finally {
        setIsReadingFile(false);
        e.target.value = '';
      }
    };

    const handleGenerateStoryboard = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!concept.trim() || isGeneratingScript) return;
      setIsGeneratingScript(true);
      setScriptError(null);

      const prompt = `Buat 4 adegan (scene) storyboard video AI untuk konsep: "${concept.trim()}" dengan gaya visual "${style}".
Balas HANYA dalam format JSON array valid tanpa teks tambahan:
[{"sceneNumber":1,"title":"Judul singkat adegan","visualDescription":"Deskripsi adegan detail","cameraAndAudio":"Sudut kamera, pencahayaan & narasi/audio","imagePrompt":"Detailed English visual prompt for generating this scene keyframe"}]`;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            mode: 'thinking',
            webSearch: false,
            allowEmojis: false,
          }),
        });
        const data = await res.json();
        const rawText: string = data?.text || '';
        const match = rawText.match(/\[[\s\S]*\]/);
        if (!match) {
          throw new Error(isEn ? 'Could not parse storyboard scenes.' : 'Format storyboard belum terbaca, silakan coba lagi.');
        }
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error(isEn ? 'Empty storyboard.' : 'Storyboard kosong.');
        }
        setScenes(
          parsed.slice(0, 6).map((s: any, idx: number) => ({
            sceneNumber: Number(s.sceneNumber || idx + 1),
            title: String(s.title || `Scene ${idx + 1}`),
            visualDescription: String(s.visualDescription || ''),
            cameraAndAudio: String(s.cameraAndAudio || ''),
            imagePrompt: String(s.imagePrompt || concept.trim()),
          }))
        );
      } catch (err: any) {
        setScriptError(err?.message || (isEn ? 'Failed to create storyboard.' : 'Gagal membuat storyboard video.'));
      } finally {
        setIsGeneratingScript(false);
      }
    };

    const handleRenderSceneKeyframe = async (index: number) => {
      const target = scenes[index];
      if (!target || target.isGeneratingFrame) return;

      setScenes((prev) =>
        prev.map((s, idx) => (idx === index ? { ...s, isGeneratingFrame: true } : s))
      );

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${target.imagePrompt}, ${style}, 16:9 widescreen film still`,
            aspectRatio: '16:9',
            imageSize: '1K',
            engine: 'free',
          }),
        });
        const data = await res.json();
        setScenes((prev) =>
          prev.map((s, idx) =>
            idx === index
              ? { ...s, isGeneratingFrame: false, previewUrl: data?.imageUrl || s.previewUrl }
              : s
          )
        );
      } catch {
        setScenes((prev) =>
          prev.map((s, idx) => (idx === index ? { ...s, isGeneratingFrame: false } : s))
        );
      }
    };

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0e0f12] dark:text-white">
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
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Video className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEn ? 'Video AI Studio & Analyzer' : 'Video AI Studio & Analisis'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isEn
                  ? 'Multimodal video inspection and AI scene storyboard generator'
                  : 'Analisis video multimodal Gemini & generator storyboard adegan'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToChat}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2a2d3a] bg-white dark:bg-[#191b24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232634] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isEn ? 'Back to Chat' : 'Kembali ke Chat'}</span>
          </button>
        </header>

        {/* Sub-Toolbar Tabs */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-[#1e2028] bg-white/80 dark:bg-[#111218] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('analyze')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'analyze'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-[#181a23] text-slate-600 dark:text-slate-300'
            }`}
          >
            {isEn ? 'Analyze Video (Vision)' : 'Analisis Video (Multimodal)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storyboard')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              activeTab === 'storyboard'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-[#181a23] text-slate-600 dark:text-slate-300'
            }`}
          >
            {isEn ? 'Script & Storyboard AI' : 'Studio Skrip & Storyboard'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-5">
            {activeTab === 'analyze' && (
              <div className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-5 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                  onChange={handlePickVideo}
                  className="hidden"
                />

                {!selectedVideo ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-10 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#2d3145] hover:border-rose-500 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer"
                  >
                    {isReadingFile ? (
                      <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-rose-500" />
                    )}
                    <div className="text-xs sm:text-sm font-bold">
                      {isEn ? 'Select a Video File (MP4, WebM, MOV)' : 'Pilih Berkas Video (MP4, WebM, MOV)'}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                      {isEn
                        ? 'Maria AI inspects video frames, audio dialogue, and on-screen events directly.'
                        : 'Maria AI membaca visual bingkai demi bingkai, audio percakapan, serta teks pada video.'}
                    </p>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-[#2a2e40]">
                      <video
                        src={selectedVideo.originalUrl || selectedVideo.previewUrl}
                        controls
                        className="w-full max-h-[300px] mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold truncate">{selectedVideo.name}</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-rose-500 hover:underline font-semibold cursor-pointer"
                      >
                        {isEn ? 'Change Video' : 'Ganti Video'}
                      </button>
                    </div>
                  </div>
                )}

                {fileError && <p className="text-xs text-rose-500">{fileError}</p>}

                <div className="space-y-2">
                  <label className="text-xs font-semibold block">
                    {isEn ? 'Analysis Instruction' : 'Instruksi Analisis Video'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: isEn ? 'Full Summary' : 'Ringkas Alur Lengkap',
                        text: isEn
                          ? 'Summarize this video chronologically including key actions, dialogue, and text shown.'
                          : 'Ringkas seluruh isi video ini secara kronologis mencakup kejadian, suara, dan teks di layar.',
                      },
                      {
                        label: isEn ? 'Transcribe Audio' : 'Transkrip Audio',
                        text: isEn
                          ? 'Transcribe all spoken dialogue and audio cues from this video accurately.'
                          : 'Transkrip seluruh ucapan/dialog serta keterangan suara penting di video ini secara akurat.',
                      },
                      {
                        label: isEn ? 'UI / Bug Inspection' : 'Inspeksi UI / Bug Rekaman',
                        text: isEn
                          ? 'Inspect this screen recording step by step and identify any UI/UX issues or technical errors shown.'
                          : 'Periksa rekaman layar ini langkah demi langkah dan jelaskan alur serta bug/kendala yang terlihat.',
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAnalysisPreset(preset.text)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a1d28] text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#242838] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={analysisPreset}
                    onChange={(e) => setAnalysisPreset(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedVideo}
                    onClick={() => {
                      if (selectedVideo) {
                        onAnalyzeVideoInChat(analysisPreset.trim(), selectedVideo);
                      }
                    }}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isEn ? 'Analyze in Chat' : 'Analisis di Chat'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'storyboard' && (
              <>
                <form
                  onSubmit={handleGenerateStoryboard}
                  className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <Film className="w-4 h-4" />
                      <span>{isEn ? 'AI Scene & Script Planner' : 'Perencana Adegan & Skrip Video AI'}</span>
                    </span>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      aria-label={isEn ? 'Visual Style' : 'Gaya Visual'}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1a1c26] border border-slate-200 dark:border-[#2a2e3e] text-xs font-medium focus:outline-none"
                    >
                      <option value="Cinematic Realistic">Cinematic Realistic</option>
                      <option value="Anime & Illustration">Anime & Illustration</option>
                      <option value="3D Pixar-Style">3D Stylized</option>
                      <option value="Product Commercial">Product Commercial</option>
                      <option value="Documentary">Documentary</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Video idea (e.g., 30s launch trailer for a futuristic coffee robot)...'
                          : 'Ide video (misal: Trailer pendek 30 detik aplikasi asisten AI masa depan)...'
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#101219] border border-slate-200 dark:border-[#262938] text-xs focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={isGeneratingScript || !concept.trim()}
                      className="min-h-[42px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isGeneratingScript ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{isEn ? 'Build Storyboard' : 'Buat Storyboard'}</span>
                    </button>
                  </div>
                  {scriptError && <p className="text-xs text-rose-500">{scriptError}</p>}
                </form>

                {scenes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenes.map((scene, idx) => (
                      <div
                        key={scene.sceneNumber}
                        className="bg-white dark:bg-[#14161f] border border-slate-200 dark:border-[#232635] rounded-2xl overflow-hidden flex flex-col"
                      >
                        <div className="aspect-video bg-slate-100 dark:bg-[#0d0e14] flex items-center justify-center relative">
                          {scene.previewUrl ? (
                            <img
                              src={scene.previewUrl}
                              alt={scene.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4 space-y-2">
                              <Film className="w-7 h-7 text-slate-400 mx-auto" />
                              <button
                                type="button"
                                disabled={scene.isGeneratingFrame}
                                onClick={() => handleRenderSceneKeyframe(idx)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {scene.isGeneratingFrame ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ImageIcon className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {scene.isGeneratingFrame
                                    ? isEn
                                      ? 'Rendering Frame...'
                                      : 'Membuat Frame...'
                                    : isEn
                                    ? 'Render Scene Preview'
                                    : 'Render Preview Adegan'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                Scene {scene.sceneNumber}
                              </span>
                              {scene.previewUrl && (
                                <a
                                  href={scene.previewUrl}
                                  download={`Scene_${scene.sceneNumber}.png`}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{isEn ? 'Save' : 'Unduh'}</span>
                                </a>
                              )}
                            </div>
                            <h4 className="text-sm font-bold">{scene.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {scene.visualDescription}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {scene.cameraAndAudio}
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-[#202330] flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                onSendPromptToChat(
                                  `${isEn ? 'Expand full voiceover script and production prompt for' : 'Kembangkan naskah dialog/voiceover dan prompt produksi lengkap untuk'} Scene ${scene.sceneNumber} (${scene.title}):\n${scene.visualDescription}\n${scene.cameraAndAudio}`
                                )
                              }
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {isEn ? 'Develop Full Script in Chat →' : 'Kembangkan Naskah di Chat →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
