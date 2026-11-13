import React, { useState, useRef } from 'react';
import {
  X,
  Music2,
  Mic,
  Disc,
  Play,
  Square,
  Sparkles,
  Send,
  Copy,
  Check,
  Volume2,
  FileText,
} from 'lucide-react';

interface MusicVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat: (promptText: string) => void;
}

export const MusicVoiceModal: React.FC<MusicVoiceModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'track' | 'lyrics' | 'memo'>('track');
  const [copied, setCopied] = useState(false);

  // Track generator states
  const [genre, setGenre] = useState('Lo-Fi Relaxing');
  const [mood, setMood] = useState('Tenang & Damai');
  const [bpm, setBpm] = useState('85 BPM');
  const [trackPrompt, setTrackPrompt] = useState('Beat Lo-Fi santai dengan instrumen piano elektrik, suara hujan lembut di latar belakang, dan melodi hangat untuk fokus belajar atau membaca.');

  // Lyrics generator states
  const [lyricsTopic, setLyricsTopic] = useState('Perjalanan meraih mimpi di malam hari');
  const [lyricsStyle, setLyricsStyle] = useState('Indie Pop / Akustik');
  const [generatedLyrics, setGeneratedLyrics] = useState(
`[Verse 1]
Lampu kota berkedip perlahan di ujung jalan
Langkah kaki ini masih mencari jawaban
Meski angin malam berbisik pelan
Ku simpan asa dalam genggaman

[Chorus]
Biar malam memeluk dinginnya waktu
Bintang-bintang kan tetap menuntunku
Setiap detik yang ku lalui bersamamu
Adalah melodi terindah dalam laguku`
  );

  // Voice memo recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Izin mikrofon diperlukan untuk merekam memo suara.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendCurrentContent = () => {
    if (activeTab === 'track') {
      const msg = `Tolong buatkan konsep trek musik instrumental: Genre ${genre}, Mood: ${mood}, Tempo: ${bpm}. Deskripsi: "${trackPrompt}". Berikan struktur aransemen, akord (chord progression), dan panduan instrumennya secara lengkap.`;
      onSendToChat(msg);
    } else if (activeTab === 'lyrics') {
      const msg = `Tolong kembangkan dan sempurnakan lirik lagu gaya ${lyricsStyle} bertema "${lyricsTopic}" berikut:\n\n${generatedLyrics}`;
      onSendToChat(msg);
    } else {
      const msg = `Saya telah merekam memo suara berdurasi ${recordDuration} detik. Tolong bantu saya merangkum intisari dan memberikan analisis ide dari rekaman suara saya.`;
      onSendToChat(msg);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio Musik & Audio Maria"
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100 select-none"
    >
      <div className="w-full max-w-xl bg-[#14151b] border border-slate-800 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-xs">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Music & Voice (Audio)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                  Audio Studio
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Buat lirik lagu, rancang trek audio, atau rekam memo suara
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e202a] hover:bg-[#282a36] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-3 gap-1 bg-[#1c1e28] p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Trek Musik</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lyrics')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'lyrics'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lirik Lagu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('memo')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'memo'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Memo Suara</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'track' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Genre / Aliran
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Lo-Fi Chill">Lo-Fi Chill</option>
                    <option value="Akustik Pop">Akustik Pop</option>
                    <option value="Synthwave 80s">Synthwave 80s</option>
                    <option value="Cinematic Ambient">Cinematic Ambient</option>
                    <option value="Jazz Cafe">Jazz Cafe</option>
                    <option value="EDM Uplifting">EDM Uplifting</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Mood / Suasana
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Tenang & Damai">Tenang & Damai</option>
                    <option value="Penuh Semangat">Penuh Semangat</option>
                    <option value="Melankolis">Melankolis</option>
                    <option value="Misterius / Epik">Misterius / Epik</option>
                    <option value="Romantis">Romantis</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Tempo
                  </label>
                  <select
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="70 BPM (Lambat)">70 BPM (Lambat)</option>
                    <option value="85 BPM (Sedang)">85 BPM (Sedang)</option>
                    <option value="115 BPM (Cepat)">115 BPM (Cepat)</option>
                    <option value="130 BPM (Tinggi)">130 BPM (Tinggi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Deskripsi & Komposisi Instrumen
                </label>
                <textarea
                  rows={4}
                  value={trackPrompt}
                  onChange={(e) => setTrackPrompt(e.target.value)}
                  placeholder="Deskripsikan instrumen atau nuansa suara yang diinginkan..."
                  className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 leading-relaxed select-text"
                />
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Inspirasi Cepat:</span>
                {[
                  'Hujan Malam Lo-Fi',
                  'Akustik Senja di Pantai',
                  'Synthwave Retro Drive',
                  'Piano Meditasi',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTrackPrompt(`Musik bernuansa ${preset} dengan aransemen yang rapi dan memikat.`)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[#20222d] hover:bg-[#2b2e3e] text-slate-300 border border-slate-700/60 cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Tema Lirik
                  </label>
                  <input
                    type="text"
                    value={lyricsTopic}
                    onChange={(e) => setLyricsTopic(e.target.value)}
                    placeholder="Contoh: Cinta, Perjuangan, Persahabatan..."
                    className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Gaya / Genre Lagu
                  </label>
                  <input
                    type="text"
                    value={lyricsStyle}
                    onChange={(e) => setLyricsStyle(e.target.value)}
                    placeholder="Contoh: Pop Akustik, Rock Balada, Hip-hop..."
                    className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Draf Lirik (Bait & Refrain)
                  </label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLyrics)}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin' : 'Salin Lirik'}</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={generatedLyrics}
                  onChange={(e) => setGeneratedLyrics(e.target.value)}
                  className="w-full bg-[#1c1e28] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500 leading-relaxed select-text"
                />
              </div>
            </div>
          )}

          {activeTab === 'memo' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 transition-all shadow-lg ${
                isRecording
                  ? 'bg-rose-600/20 border-rose-500 text-rose-400 animate-pulse'
                  : 'bg-[#1c1e28] border-slate-700 text-slate-300'
              }">
                {isRecording ? (
                  <Mic className="w-8 h-8 text-rose-500 animate-bounce" />
                ) : (
                  <Volume2 className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-200">
                  {isRecording ? 'Sedang Merekam Suara...' : 'Perekam Memo Suara'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRecording
                    ? `Durasi rekaman: ${recordDuration} detik`
                    : 'Rekam ide lagu, melodi vokal, atau catatan suara langsung'}
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai Rekam</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all border border-rose-500/40"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Selesai & Simpan</span>
                  </button>
                )}
              </div>

              {audioBlobUrl && (
                <div className="p-3 bg-[#1c1e28] rounded-2xl border border-slate-700/60 max-w-sm mx-auto text-left">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                    Hasil Rekaman Terakhir:
                  </span>
                  <audio controls src={audioBlobUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#101116] border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Didukung Gemini Audio Engine</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#1e202a] hover:bg-[#282a36] text-slate-300 text-xs font-medium cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSendCurrentContent}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Obrolan Maria AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
