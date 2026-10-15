# Implementasi Desain & Tata Letak Lengkap Maria AI Sesuai Referensi

Transformasi komprehensif antarmuka Maria AI untuk mengadopsi 100% tata letak visual, penataan posisi fitur, serta alur kerja yang terdapat pada tangkapan layar acuan (`Screenshot_20261015-150322.jpg`) dan kode sumber referensi, dengan tetap menjaga persistensi data Firestore dan Google Gemini AI.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Dikonfirmasi oleh Pengguna (Phase 1):**
> 1. **Tata Letak & Warna**: Terapkan penuh sesuai tangkapan layar acuan (warna gelap `#0e0f12`, tombol *New Chat* hijau zamrud/emerald, tata letak laci responsif).
> 2. **Cakupan Fitur**: Mengaktifkan seluruh modul lengkap dari file acuan: *Library* (Pustaka Dokumen & Media), *Discover* (Katalog Agen AI Kustom), *Settings Dashboard* (Dasbor Pengaturan 7-Tab), dan *DEFCON 5 Shield Status*.
> 3. **Penyimpanan**: Mempertahankan integrasi Cloud Firestore aktif untuk profil akun, pengaturan pengguna, dan riwayat obrolan yang persisten.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**: Platform asisten AI cerdas "Maria AI" dengan antarmuka gelap modern, rapi, dan responsif untuk desktop dan mobile. Dilengkapi navigasi samping bertingkat, popover menu percakapan, hub eksplorasi agen AI (*Discover*), pustaka arsip berkas & bookmark (*Library*), dan dasbor pengaturan (*Settings*).
- **Target Pengguna**: Pengguna produktivitas, pelajar, developer, dan kreator konten yang membutuhkan asisten AI serbaguna dengan riwayat obrolan yang tersimpan rapi dan aman di cloud.
- **Nilai Utama**: Tampilan estetik konsisten dengan screenshot acuan pengguna, bebas bug, responsif di HP/tablet/PC, dengan integrasi database Firestore dan AI Gemini yang andal.

---

## 2. User Experience & Visual Design

### A. Tata Letak & Posisi Fitur (Persis Screenshot)
1. **Sidebar Laci Kiri (`#0e0f12` & `#14151b`)**:
   - **Header Atas**: Logo geometris "M" berbingkai gelap elegan + teks judul `Maria AI` + tombol panah `<-` untuk melipat/menutup sidebar di mobile.
   - **Tombol New Chat Utama**: Tombol penuh bergradien hijau emerald (`#20a66a`) dengan ikon obrolan dan teks `New Chat`.
   - **Navigasi Utama**:
     - `Library` (ikon Dokumen / Pustaka media & arsip)
     - `Discover` (ikon Kompas / Jelajah agen AI khusus)
     - `Pengaturan` (ikon Roda Gigi / Settings 7 tab)
   - **Bagian Riwayat Chat**:
     - Label header `RIWAYAT CHAT` dengan badge angka jumlah percakapan.
     - Kolom pencarian: `Cari riwayat percakapan...` dilengkapi ikon kaca pembesar dan tombol reset.
     - Daftar percakapan dengan indikator aktif dan tombol menu titik tiga `...`.
     - **Menu Popover Percakapan (Floating Popover)**:
       - `Bagikan percakapan` (Ikon Share)
       - `Arsipkan ke Pustaka` (Ikon Archive)
       - `Sematkan` (Ikon Pin)
       - `Ganti nama` (Ikon Pensil)
       - Garis pemisah (*divider*)
       - `Hapus` (Ikon Sampah merah)
   - **Bagian Bawah Sidebar (Sticky Footer)**:
     - Kartu `MARIA Plus Aktif ✨` (warna ungu gelap kontras: "Anda menikmati akses prioritas tinggi tanpa batas" / opsi upgrade).
     - Cell akun pengguna: Foto avatar/inisial + Nama akun (`basit fauzan`) + Email (`basitfauzan42@gmail.com`) + tombol dropdown chevron `↕`.
     - Tautan footer legal & keamanan: `Keamanan • Privasi • Ketentuan`.

2. **Area Chat Utama**:
   - **Top Bar**: Tombol hamburger menu (mobile) + Badge status `DEFCON 5` hijau + Lonceng notifikasi real-time + tanggal aktif.
   - **Empty State Hero**: Logo "M" geometris besar di tengah layar dengan tipografi tegas `Dari mana kita harus mulai?`.
   - **Aliran Pesan (Message Stream)**:
     - Pesan pengguna di kanan dengan warna tema dinamis.
     - Balasan Maria AI di kiri dengan avatar logo "M", badge model, dan accordion proses penalaran (*Thought for 2s*).
     - Dukungan formatting Markdown rapi, blok kode berpenyorot sintaks dengan tombol salin, grounding Google Search live, dan pratinjau gambar HD.
   - **Bilah Input Chat Bawah**:
     - Teks placeholder `Tanya Maria...`.
     - Tombol `+` di sebelah kiri untuk membuka lembar aksi lampiran (*Photos & Videos*, *Camera*, *Voice*, *Files*, *Images AI*, *Deep Research*, *Web Search*).
     - Tombol Mikrofon untuk memo suara audio.
     - Tombol kirim bergelombang dinamis (*soundwave/send*).
     - Sub-label bawah: `Maria adalah AI yang dapat melakukan kesalahan • Enter untuk kirim`.

3. **Tampilan View & Modal Lengkap**:
   - **Library View**: Tab kategori (`Semua`, `Gambar`, `Dokumen`, `Suara`, `Ditandai`, `Riwayat Chat`, `Arsip`, `Formula`).
   - **Discover View**: Katalog agen AI pintar dengan filter kategori (`Belajar & Edukasi`, `Kreatif`, `Koding`, `Produktivitas`, dll.) dan pembuat agen kustom.
   - **Settings Dashboard (7 Tab)**: `General`, `AI & Memory`, `Voice`, `Chat`, `Privacy & Data`, `Integrations`, `Account`.
   - **Modal Verifikasi Keamanan 2FA**: Validasi TOTP 6-digit / pola keamanan sebelum aksi penghapusan riwayat permanen.

---

## 3. Technical Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                               Maria AI                                 │
├──────────────────────────┬─────────────────────────────────────────────┤
│   Sidebar Navigation     │              Active Main View               │
│   (Mobile/Desktop Drawer)│  ┌───────────────────────────────────────┐  │
│                          │  │ Header: Menu | DEFCON 5 | Notifikasi  │  │
│  • Brand: [M] Maria AI   │  ├───────────────────────────────────────┤  │
│  • [New Chat] (Green)    │  │ • View: ChatArea (Hero / Messages)    │  │
│  • Library               │  │ • View: LibraryArea (Media & Files)   │  │
│  • Discover              │  │ • View: DiscoverArea (AI Agents Hub)  │  │
│  • Pengaturan            │  ├───────────────────────────────────────┤  │
│  • Riwayat Chat + Popover│  │ Input Dock: [+] | Tanya Maria... | Mic│  │
│  • Kartu MARIA Plus      │  └───────────────────────────────────────┘  │
│  • Cell Profil Pengguna  │                                             │
│  • Keamanan/Privasi Links│  Modals: Settings 7-Tab | 2FA | Lightbox    │
└────────────┬─────────────┴───────────────────────┬─────────────────────┘
             │                                     │
             ▼                                     ▼
 ┌───────────────────────┐             ┌───────────────────────┐
 │   Firestore Service   │             │   Backend Express     │
 │  • Users Profile/Sync │             │  • POST /api/chat     │
 │  • Threads & Messages │             │  • /api/generate-image│
 │  • ABAC Security Rule │             │  • /api/tts (Voice)   │
 └───────────────────────┘             └───────────────────────┘
```

---

## 4. Rencana Kerja Implementasi (Execution Plan)

1. **Sinkronisasi Konstanta & Tipe Data**:
   - Memastikan `src/types.ts` dan `src/constants.ts` mendukung konfigurasi tema, persona agen Discover, thread, dan memori.
2. **Pembaruan Komponen Sidebar (`src/components/Sidebar.tsx`)**:
   - Mengadopsi tata letak presisi sesuai tangkapan layar: tombol hijau *New Chat*, menu *Library*, *Discover*, *Pengaturan*, kolom pencarian riwayat, menu popover titik tiga per obrolan, kartu *MARIA Plus Aktif*, cell profil akun pengguna, dan footer legal.
3. **Pembaruan Komponen ChatArea (`src/components/ChatArea.tsx`)**:
   - Mengimplementasikan header dengan badge `DEFCON 5`, welcome hero `Dari mana kita harus mulai?`, dock input bawah dengan tombol `+` bottom sheet, rekam suara, dan soundwave button.
4. **Penyelarasan Area Pendukung**:
   - Memastikan `LibraryArea.tsx` dan `DiscoverArea.tsx` dapat dibuka secara mulus langsung dari sidebar.
   - Mengintegrasikan `SettingsDashboard.tsx` dengan 7 tab pengaturan.
5. **Penghubung State & Firestore (`src/App.tsx`)**:
   - Menghubungkan seluruh state view (`chat`, `library`, `discover`), dialog pengaturan, dan alur autentikasi Google/Email/Tamu agar tersinkronisasi ke Firestore.
6. **Verifikasi & Build Clean**:
   - Menjalankan `compile_applet` dan `lint_applet` untuk menjamin 0 error TypeScript dan tampilan berjalan mulus pada dev server.
