# Integrasi Intelijen Live VirusTotal & Pembersihan Data Template DEFCON 5

## Masalah yang Ditemukan
Sebelumnya, tab **Statistics** di modal DEFCON 5 masih memuat angka template statis (mock baseline) saat sistem dalam kondisi bersih:
- Grafik 7 hari menggunakan data buatan (`sampleCounts = [2, 0, 1, 3, 0, 1, ...]`) sehingga hari Selasa terlihat melonjak tinggi secara artifisial.
- Distribusi kategori menggunakan persentase tiruan (`Adware: 63%`, `Phishing: 21%`, `Spyware: 11%`, `Malware: 5%`).
- Total hitungan scan memuat nilai template `1.432` dan `Removed: 5`.

## Perubahan yang Diterapkan

1. **Pembersihan Logika di Engine (`src/lib/guardian/guardianEngine.ts`)**:
   - Menghapus total `sampleCounts` dan kategori palsu (`byCategory["Adware"] = 12`, dsb).
   - Menghitung grafik 7 hari murni dari log aktivitas nyata (`this.log`).
   - Membersihkan nilai lama di `localStorage` agar tidak lagi menampilkan angka dummy 1.432 / Removed 5.
   - Menambahkan metode `checkHash(hash)` untuk kueri reputasi hash SHA-256 / MD5 langsung ke VirusTotal v3 API dan database lokal (14.287 signature).

2. **Pembaruan Tab Statistik (`src/components/DefconShieldModal.tsx`)**:
   - **Header Intelijen Live**: Menampilkan badge VirusTotal v3 Live aktif dengan 72+ vendor global (Kaspersky, Bitdefender, Microsoft Defender, ESET, CrowdStrike, SentinelOne, Sophos).
   - **Status Perangkat 100% Bersih**: Jika tidak ada ancaman aktif, status menampilkan banner hijau `100% Bersih & Terlindungi` (0 ancaman aktif).
   - **Distribusi Kategori Nyata**: Saat sistem bersih, seluruh kategori (Adware, Phishing, Spyware, Malware, CryptoMiner, Ransomware) secara jujur menampilkan `0% (Bebas Infeksi)` dengan indikator hijau tenang.
   - **Grafik 7 Hari Nyata**: Menampilkan garis baseline tenang (`0 Insiden / Sistem Bersih`) jika tidak ada ancaman yang tercatat dalam log aktivitas 7 hari terakhir.
   - **Metrik Nyata**: Angka dipindai, dicegah, dan signature mencerminkan aktivitas riil perangkat.

3. **Pemeriksa Reputasi Berkas & Hash Interaktif (`extra === 'check'`)**:
   - Pengguna dapat memilih berkas langsung dari perangkat.
   - Tombol **Uji EICAR** untuk pengujian langsung tanpa risiko.
   - Kolom **Input Hash SHA-256 / MD5** manual untuk memeriksa hash malware global (misal WannaCry, AgentTesla) atau hash file bersih secara live ke VirusTotal.
   - Menampilkan kartu hasil deteksi lengkap: nama ancaman, jumlah vendor pendeteksi (misal `68/72 Vendor`), dan tombol tautan langsung ke laporan resmi di `VirusTotal.com`.
