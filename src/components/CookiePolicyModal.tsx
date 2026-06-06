import React from "react";
import { X, Shield, Clock, BookOpen, ExternalLink, HelpCircle } from "lucide-react";

interface CookiePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentClass?: string; // e.g. "text-blue-400"
  accentBgClass?: string; // e.g. "bg-blue-600"
}

export default function CookiePolicyModal({
  isOpen,
  onClose,
  accentClass = "text-blue-400",
  accentBgClass = "bg-blue-600 hover:bg-blue-700"
}: CookiePolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay closely matching the aesthetic and color weights */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-[#0e0e11] text-zinc-300 rounded-2xl border border-zinc-900/90 shadow-2xl flex flex-col h-[85vh] max-h-[640px] overflow-hidden z-55 animate-scale-up">
        
        {/* Header banner */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-900/60 bg-[#121215] shrink-0">
          <div className="flex items-center gap-2">
            <Shield className={`w-4.5 h-4.5 ${accentClass}`} />
            <div>
              <h3 className="font-sans font-bold text-zinc-100 text-sm tracking-tight">
                Kebijakan Cookies (Cookies Policy)
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">MARIA AI PRIVACY STANDARDS</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Tutup Kebijakan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[11.5px] leading-relaxed select-text font-sans no-scrollbar">
          
          {/* Document Header Metadata */}
          <div className="bg-[#151518]/60 rounded-xl p-4 border border-zinc-900/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-zinc-450 font-semibold text-[10px] uppercase font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Pembaruan Terakhir: 7 Juni 2026</span>
            </div>
            <p className="text-zinc-300 leading-normal">
              Selamat datang di <strong>Maria AI</strong> (selanjutnya disebut "Kami"). Kami berkomitmen untuk melindungi privasi Anda dan bersikap transparan mengenai teknologi yang kami gunakan demi kenyamanan berselancar Kakak.
            </p>
            <p className="text-zinc-400">
              Kebijakan Cookies ini menjelaskan apa itu <em>cookies</em>, bagaimana Kami menggunakannya di situs web Kami <strong className="text-zinc-300">https://maria-ai-liart.vercel.app</strong> (selanjutnya disebut "Situs"), serta pilihan yang Anda miliki untuk mengelola penggunaannya.
            </p>
          </div>

          <div className="h-[1px] bg-zinc-950" />

          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              1. Apa itu Cookies?
            </h4>
            <p className="text-zinc-350 bg-[#121214]/30 p-3 rounded-xl border border-zinc-950">
              <strong>Cookies</strong> adalah file teks kecil yang disimpan di perangkat Anda (komputer, tablet, atau ponsel pintar) oleh browser web Anda saat Anda mengunjungi sebuah situs web. <em>Cookies</em> memungkinkan situs web mengenali perangkat Anda dan menyimpan informasi tertentu tentang preferensi Anda atau aktivitas masa lalu untuk meningkatkan pengalaman berselancar Anda.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              2. Bagaimana Kami Menggunakan Cookies?
            </h4>
            <p className="text-zinc-350">
              Kami menggunakan <em>cookies</em> untuk beberapa tujuan utama, antara lain:
            </p>
            <ul className="list-none space-y-1.5 pl-2 text-zinc-400">
              <li className="flex items-start gap-1.5">
                <span className={`${accentClass} font-mono mt-0.5`}>•</span>
                <span><strong>Fungsionalitas Esensial:</strong> Memastikan Situs dapat beroperasi dengan aman dan sebagaimana mestinya (misalnya, untuk proses masuk akun atau pengisian formulir secara instan).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className={`${accentClass} font-mono mt-0.5`}>•</span>
                <span><strong>Analisis dan Kinerja:</strong> Memahami bagaimana pengunjung berinteraksi dengan Situs Kami, mendeteksi kesalahan, dan meningkatkan kinerja Situs secara keseluruhan.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className={`${accentClass} font-mono mt-0.5`}>•</span>
                <span><strong>Preferensi Pengguna:</strong> Mengingat pilihan yang Anda buat (seperti preferensi bahasa atau wilayah) untuk memberikan pengalaman yang lebih personal.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className={`${accentClass} font-mono mt-0.5`}>•</span>
                <span><strong>Pemasaran dan Periklanan:</strong> Menyajikan iklan yang relevan dengan minat Anda dan mengukur efektivitas kampanye pemasaran Kami.</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              3. Jenis Cookies yang Kami Gunakan
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              
              <div className="p-3.5 bg-[#141416] rounded-xl border border-zinc-900/60">
                <p className="font-bold text-zinc-200 text-[10.5px] mb-1">a. Cookies Wajib (Strictly Necessary Cookies)</p>
                <p className="text-zinc-450 leading-relaxed text-[10.5px]">
                  <em>Cookies</em> ini mutlak diperlukan agar Situs dapat berfungsi dengan baik. Tanpa <em>cookies</em> ini, layanan yang Anda minta (seperti navigasi halaman, enkripsi pesan, atau akses ke area aman Situs) tidak dapat disediakan.
                </p>
              </div>

              <div className="p-3.5 bg-[#141416] rounded-xl border border-zinc-900/60">
                <p className="font-bold text-zinc-200 text-[10.5px] mb-1">b. Cookies Kinerja dan Analisis (Performance & Analytics Cookies)</p>
                <p className="text-zinc-450 leading-relaxed text-[10.5px]">
                  <em>Cookies</em> ini mengumpulkan informasi anonim tentang bagaimana pengunjung menggunakan Situs Kami. Kami menggunakan data ini untuk menganalisis lalu lintas web dan meningkatkan pengalaman pengguna. Kami mungkin menggunakan layanan pihak ketiga, seperti <em>Google Analytics</em>, untuk tujuan ini.
                </p>
              </div>

              <div className="p-3.5 bg-[#141416] rounded-xl border border-zinc-900/60">
                <p className="font-bold text-zinc-200 text-[10.5px] mb-1">c. Cookies Fungsionalitas (Functionality Cookies)</p>
                <p className="text-zinc-450 leading-relaxed text-[10.5px]">
                  <em>Cookies</em> ini memungkinkan Situs untuk mengingat pilihan yang Anda buat (seperti nama pengguna, tema warna terpilih, atau preferensi bahasa) dan menyediakan fitur yang lebih personal serta disempurnakan.
                </p>
              </div>

              <div className="p-3.5 bg-[#141416] rounded-xl border border-zinc-900/60">
                <p className="font-bold text-zinc-200 text-[10.5px] mb-1">d. Cookies Iklan dan Penargetan (Targeting & Advertising Cookies)</p>
                <p className="text-zinc-450 leading-relaxed text-[10.5px]">
                  <em>Cookies</em> ini digunakan untuk menyampaikan iklan yang lebih relevan bagi Anda dan minat Anda. Mereka juga digunakan untuk membatasi berapa kali Anda melihat iklan serta membantu mengukur efektivitas kampanye iklan.
                </p>
              </div>

            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              4. Pilihan dan Kendali Anda Terkait Cookies
            </h4>
            <p className="text-zinc-350">
              Kami menghormati hak privasi Anda Kakak. Anda dapat mengelola atau membatasi penggunaan <em>cookies</em> melalui beberapa cara berikut:
            </p>
            <ul className="space-y-2 pl-1.5">
              <li className="bg-[#121214]/50 border border-zinc-900/50 p-3 rounded-xl space-y-1">
                <p className="font-bold text-zinc-200">• Spanduk Persetujuan Cookies (Cookie Consent Banner)</p>
                <p className="text-zinc-450 text-[10.5px]">
                  Saat pertama kali mengunjungi Situs Kami, Anda akan melihat spanduk yang meminta persetujuan Anda untuk penggunaan <em>cookies</em> non-esensial. Anda dapat memilih untuk menerima semua, menolak, atau mengatur preferensi Anda.
                </p>
              </li>
              <li className="bg-[#121214]/50 border border-zinc-900/50 p-3 rounded-xl space-y-1">
                <p className="font-bold text-zinc-200">• Pengaturan Browser</p>
                <p className="text-zinc-450 text-[10.5px]">
                  Sebagian besar browser web memungkinkan Anda untuk memblokir atau menghapus <em>cookies</em> melalui pengaturan browser Anda. Harap diperhatikan bahwa jika Anda menonaktifkan <em>cookies</em> wajib, beberapa bagian dari Situs Kami mungkin tidak dapat berfungsi dengan optimal.
                </p>
                <div className="text-[10px] text-zinc-400 pl-3 leading-loose">
                  <div>- Untuk browser <strong className="text-zinc-300">Google Chrome</strong>, silakan buka: <em>Setelan &gt; Privasi dan Keamanan &gt; Cookies dan data situs lainnya</em>.</div>
                  <div>- Untuk browser <strong className="text-zinc-300">Safari</strong>, silakan buka: <em>Preferensi &gt; Privasi &gt; Cookies dan data situs web</em>.</div>
                  <div>- Untuk browser lainnya, silakan merujuk pada menu <em>"Bantuan"</em> di browser Anda.</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              5. Perubahan pada Kebijakan Cookies Ini
            </h4>
            <p className="text-zinc-350">
              Kami dapat memperbarui Kebijakan Cookies ini dari waktu ke waktu untuk mencerminkan perubahan dalam teknologi, hukum, atau operasional bisnis Kami. Setiap perubahan akan dipublikasikan di halaman ini dengan memperbarui tanggal "Pembaruan Terakhir" di bagian atas dokumen. Kami menyarankan Anda untuk memeriksa halaman ini secara berkala.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${accentBgClass.split(" ")[0]} inline-block`} />
              6. Hubungi Kami
            </h4>
            <p className="text-zinc-350">
              Jika Kakak memiliki pertanyaan, kekhawatiran, atau permintaan klarifikasi lebih lanjut mengenai penggunaan <em>cookies</em> di Situs Kami, silakan hubungi Kami melalui:
            </p>
            <div className="bg-[#121214] border border-zinc-900 rounded-xl p-3.5 space-y-1.5 text-zinc-400">
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span>Nama Platform:</span>
                <strong className="text-zinc-200">Maria AI Inc.</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span>E-mail Resmi:</span>
                <strong className="text-zinc-200 font-mono select-all">basitfauzan42@gmail.com</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span>Alamat Fisik:</span>
                <strong className="text-zinc-200">Jakarta, Indonesia</strong>
              </div>
              <div className="flex justify-between">
                <span>Nomor Layanan:</span>
                <strong className="text-zinc-200">+62 812-3456-7890</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-950 bg-[#121215] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold text-white shadow-md active:scale-97 transition-all cursor-pointer ${accentBgClass}`}
          >
            Saya Mengerti
          </button>
        </div>

      </div>
    </div>
  );
}
