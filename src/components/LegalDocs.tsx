import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Scale, HelpCircle, Cookie } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms' | 'help' | 'cookies' | null;

interface LegalDocsProps {
  type: LegalDocType;
  onClose: () => void;
  isDark?: boolean;
}

export default function LegalDocs({ type, onClose, isDark = false }: LegalDocsProps) {
  if (!type) return null;

  const content = {
    privacy: {
      title: 'Kebijakan Privasi',
      icon: <Shield className="text-emerald-500" />,
      body: `
        ### Kebijakan Privasi Maria AI
        
        Privasi Anda sangat penting bagi kami. Kami berkomitmen untuk melindungi data pribadi yang Anda bagikan kepada Maria.
        
        **Data yang Kami Kumpulkan:**
        - Riwayat percakapan untuk meningkatkan respons AI.
        - Preferensi akun untuk menyesuaikan pengalaman pengguna.
        - Data perangkat dasar untuk optimalisasi kinerja aplikasi.
        
        **Keamanan Data:**
        Kami menggunakan enkripsi protokol keamanan tinggi untuk memastikan data Anda tidak dapat diakses oleh pihak ketiga yang tidak berwenang.
      `
    },
    terms: {
      title: 'Ketentuan Layanan',
      icon: <Scale className="text-blue-500" />,
      body: `
        ### Ketentuan Layanan Penggunaan Maria AI
        
        Dengan menggunakan Maria AI, Anda menyetujui persyaratan berikut:
        
        **Penggunaan yang Adil:**
        Layanan ini disediakan untuk membantu produktivitas. Dilarang menggunakan AI untuk tujuan ilegal atau merugikan orang lain.
        
        **Kepemilikan Konten:**
        Anda tetap memiliki hak atas konten yang Anda buat, namun Maria AI memerlukan lisensi terbatas untuk memproses data tersebut agar dapat memberikan respons.
        
        **Batasan Tanggung Jawab:**
        Meskipun kami berusaha memberikan informasi yang akurat, Maria AI dapat sesekali menghasilkan informasi yang tidak tepat. Selalu verifikasi informasi penting secara mandiri.
      `
    },
    help: {
      title: 'Pusat Bantuan',
      icon: <HelpCircle className="text-amber-500" />,
      body: `
        ### Bagaimana Kami Bisa Membantu?
        
        Temukan jawaban untuk pertanyaan umum mengenai penggunaan Maria AI.
        
        **Cara Menggunakan Fokus Mode:**
        Klik tombol "Focus Mode" di header untuk menghilangkan gangguan dan berkonsentrasi pada percakapan Anda.
        
        **Menghapus Riwayat Percakapan:**
        Anda dapat menghapus chat individu di sidebar atau menghapus seluruh riwayat di pengaturan profil.
        
        **Masalah Koneksi:**
        Pastikan koneksi internet Anda stabil. Jika masalah berlanjut, hubungi tim dukungan kami di support@maria.ai.
      `
    },
    cookies: {
      title: 'Kebijakan Cookie',
      icon: <Cookie className="text-orange-500" />,
      body: `
        ### Kebijakan Cookie
        
        Kami menggunakan cookie untuk meningkatkan pengalaman navigasi Anda di platform Maria AI.
        
        **Fungsi Cookie Kami:**
        - Mengingat preferensi tema Anda (Dark/Light mode).
        - Tetap masuk ke akun Anda selama sesi berlangsung.
        - Memahami fitur mana yang paling sering digunakan untuk pengembangan aplikasi di masa depan.
        
        Anda dapat mengelola preferensi cookie Anda melalui pengaturan browser kapan saja.
      `
    }
  };

  const doc = content[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col p-8 rounded-[40px] border shadow-2xl overflow-hidden shadow-brand-blue/5 ${
            isDark ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  {doc.icon}
               </div>
               <h2 className="text-2xl font-black tracking-tight">{doc.title}</h2>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-900 text-slate-500' : 'hover:bg-slate-50 text-slate-400'}`}
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
             <div className={`prose prose-sm font-medium leading-relaxed ${isDark ? 'prose-invert text-slate-400' : 'text-slate-500'}`}>
                {doc.body.split('\n').map((line, i) => {
                  if (line.trim().startsWith('###')) {
                    return <h3 key={i} className={`text-lg font-black mt-6 mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{line.replace('###', '').trim()}</h3>;
                  }
                  if (line.trim().startsWith('**')) {
                    return <p key={i} className={`font-black mt-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{line.replace(/\*\*/g, '').trim()}</p>;
                  }
                  if (line.trim().startsWith('-')) {
                    return <li key={i} className="ml-4 list-disc">{line.replace('-', '').trim()}</li>;
                  }
                  return <p key={i}>{line.trim()}</p>;
                })}
             </div>
          </div>

          <div className="pt-8 mt-4 border-t border-slate-200/5 shrink-0 flex justify-end">
             <button 
               onClick={onClose}
               className="px-8 py-3 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20"
             >
               Selesai
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
