# Transformasi Menu Lampiran Chat Menjadi Bottom Sheet Modern

Transformasi total antarmuka popover lampiran obrolan (*Image 1*) menjadi bottom sheet modal modern (*Image 2*) dengan desain dark mode elegan, aksi sirkular cepat (Photos & Videos, Camera, Voice, Files), sakelar toggle interaktif untuk Deep Research dan Web Search, serta panel modal interaktif untuk Music & Voice dan Canvas & Code.

> [!IMPORTANT]
> **Keputusan yang Dikonfirmasi oleh Pengguna**:
> 1. **Gaya Tampilan**: Bottom sheet meluncur dari bawah dengan latar redup (*backdrop blur overlay*).
> 2. **Tindakan Menu Tambahan**: Membuka panel khusus interaktif untuk masing-masing fitur *Music & Voice (Audio)* dan *Canvas & Code*.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**: Mengganti popover lampiran lama (*Image 1*) dengan bottom sheet drawer modern (*Image 2*) yang responsif, ergonomis satu tangan (*thumb-friendly*), dan berestetika tinggi.
- **Pengguna Target**: Seluruh pengguna Maria AI di perangkat mobile maupun desktop yang membutuhkan akses instan ke media, kamera, rekaman suara, berkas, alat visual AI, riset mendalam, pencarian web real-time, studio audio, dan kanvas kode.
- **Nilai Utama**: Akses instan dan visual yang jauh lebih rapi, terorganisir dengan jelas antara aksi cepat media (*quick circle buttons*) dan modul fitur cerdas (*feature list items* dengan status toggle aktif).

---

## 2. User Experience & Visual Design

### A. Komponen Visual Bottom Sheet (Sesuai Image 2)
1. **Latar Belakang & Animasi**:
   - Overlay redup: `fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center`
   - Sheet container: `w-full max-w-lg bg-[#14151b] text-white rounded-t-[32px] sm:rounded-3xl p-5 pb-6 border-t sm:border border-slate-800 shadow-2xl`
   - Animasi meluncur halus dari bawah (`slide-in-from-bottom duration-200`) dan tutup mulus saat latar luar atau tombol `X` diklik.
2. **Handle Drag & Header**:
   - Handle pill di bagian atas: `w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-3`
   - Header bar: Ikon bintang kilau (*sparkle*) di bagian tengah atas dan tombol tutup `X` bulat di sudut kanan atas.
3. **Baris Tombol Sirkular (Quick Actions)**:
   - 4 tombol lingkaran (`w-14 h-14 rounded-full bg-[#20222c] hover:bg-[#282a37] border border-slate-700/50 flex items-center justify-center text-slate-200`):
     - **Photos & Videos**: Membuka galeri pemilih foto & video.
     - **Camera**: Mengaktifkan kamera langsung untuk tangkapan instan.
     - **Voice**: Mengaktifkan perekaman suara / STT langsung ke kolom teks.
     - **Files**: Membuka dialog pemilih berkas universal (PDF, dokumen, kode, dll.).
4. **Daftar Modul Fitur Cerdas (Feature Action List)**:
   - **Images (Gambar AI)**:
     - Ikon: Magic Wand ungu dalam wadah persegi melengkung (`bg-purple-950/70 border border-purple-500/30 text-purple-400`).
     - Judul: "Images (Gambar AI)", Subtitle: "Buat dan edit gambar HD dengan model Gemini 3.1".
     - Sisi Kanan: Chevron `>` yang membuka modal *ImageStudioModal*.
   - **Deep Research (Pencarian Mendalam)**:
     - Ikon: Sparkle/Research hijau (`bg-emerald-950/70 border border-emerald-500/30 text-emerald-400`).
     - Judul: "Deep Research (Pencarian Mendalam)", Subtitle: "Laporan riset & analisis komprehensif".
     - Sisi Kanan: Toggle switch interaktif (hijau menyala jika aktif), mengaktifkan mode riset/penalaran mendalam model Gemini.
   - **Web Search (Pencarian Web)**:
     - Ikon: Bola dunia biru (`bg-blue-950/70 border border-blue-500/30 text-blue-400`).
     - Judul: "Web Search (Pencarian Web)", Subtitle: "Akses berita & info live Google Search".
     - Sisi Kanan: Toggle switch interaktif (biru menyala jika aktif), langsung tersinkronisasi dengan status grounding pencarian web Maria AI.
   - **Music & Voice (Audio)**:
     - Ikon: Not musik / mikrofon merah muda (`bg-rose-950/70 border border-rose-500/30 text-rose-400`).
     - Judul: "Music & Voice (Audio)", Subtitle: "Buat lirik lagu, trek audio, atau memo suara".
     - Sisi Kanan: Chevron `>` yang membuka panel interaktif kreasi musik & audio.
   - **Canvas & Code**:
     - Ikon: Jendela kanvas/kode kuning keemasan (`bg-amber-950/70 border border-amber-500/30 text-amber-400`).
     - Judul: "Canvas & Code", Subtitle: "Tulis kode, dokumen, atau buat presentasi".
     - Sisi Kanan: Chevron `>` yang membuka modal kanvas interaktif untuk menulis kode, markdown, dokumen, dan presentasi.

---

## 3. Key Product Decisions & Trade-Offs

- **Bottom Sheet Modal vs Floating Tooltip**:
  - *Pendekatan Terpilih*: Bottom sheet modal berlatar redup meluncur dari dasar layar.
  - *Alasan*: Sesuai preferensi pengguna dan tangkapan layar Image 2, memberikan ruang sentuh yang lebih nyaman pada layar sentuh ponsel tanpa terpotong batas kolom input.
- **Dua Panel Baru: Music & Audio serta Canvas & Code**:
  - *Pendekatan Terpilih*: Menyediakan komponen modal interaktif khusus untuk masing-masing fitur (`MusicVoiceModal` dan `CanvasCodeModal`).
  - *Alasan*: Memungkinkan pengguna bereksperimen langsung (membuat prompt musik/lirik audio serta live code editor dengan eksekusi/preview) dan langsung mengirim hasilnya ke ruang obrolan Maria AI.
- **Sinkronisasi Toggle Web Search & Deep Research**:
  - *Pendekatan Terpilih*: Sakelar toggle pada baris list secara reaktif memperbarui state `webSearchActive` dan `deepResearchActive` di `ChatInput` dan `ChatArea`.

---

## 4. Technical Architecture & Data Strategy

### Diagram Komponen & Alur Interaksi

```
┌──────────────────────────────────────────────────────────────┐
│                           App.tsx                            │
│ ┌───────────────────────┐         ┌────────────────────────┐ │
│ │   ImageStudioModal    │         │    DefconShieldModal   │ │
│ └───────────────────────┘         └────────────────────────┘ │
│ ┌───────────────────────┐         ┌────────────────────────┐ │
│ │    MusicVoiceModal    │         │    CanvasCodeModal     │ │
│ └───────────────────────┘         └────────────────────────┘ │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                         ChatArea.tsx                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                     ChatInput.tsx                      │  │
│  │                                                        │  │
│  │   [+] Tombol Tambah                                    │  │
│  │        │ (klik membuka)                                │  │
│  │        ▼                                               │  │
│  │   ┌──────────────────────────────────────────────────┐ │  │
│  │   │        ActionBottomSheet (Desain Image 2)        │ │  │
│  │   │  - Drag Handle & Header Sparkle + Close (X)      │ │  │
│  │   │  - 4 Tombol Bulat: Photos, Camera, Voice, Files  │ │  │
│  │   │  - List: Images (Gambar AI)  ──> Buka Studio     │ │  │
│  │   │  - List: Deep Research       ──> Toggle Hijau    │ │  │
│  │   │  - List: Web Search          ──> Toggle Biru     │ │  │
│  │   │  - List: Music & Voice       ──> Buka Modal Musik│ │  │
│  │   │  - List: Canvas & Code       ──> Buka Kanvas Kode│ │  │
│  │   └──────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Langkah Eksekusi (Setelah Persetujuan Rencana)
1. Buat komponen `ActionBottomSheet.tsx` dengan presisi visual 100% mengikuti *Image 2*.
2. Buat modal pelengkap interaktif `MusicVoiceModal.tsx` dan `CanvasCodeModal.tsx` agar semua tombol memiliki fungsi nyata.
3. Hubungkan `ActionBottomSheet` ke dalam `ChatInput.tsx` untuk menggantikan popover lama *Image 1*.
4. Uji kompilasi (`compile_applet` & `lint_applet`) untuk memastikan aplikasi berjalan tanpa error.
