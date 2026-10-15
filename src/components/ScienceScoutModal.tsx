import React, { useState } from 'react';
import { X, Search, Dna, ExternalLink, BookOpen, Layers, Sparkles, Loader2 } from 'lucide-react';

interface ScienceScoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export const ScienceScoutModal: React.FC<ScienceScoutModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'uniprot' | 'pdb' | 'pubmed'>('uniprot');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/science/lookup?query=${encodeURIComponent(searchQuery.trim())}&type=${activeTab}`
      );
      if (!res.ok) throw new Error('Gagal mengambil data dari server sains.');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mencari.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickInsert = (item: any) => {
    let prompt = '';
    if (activeTab === 'uniprot') {
      prompt = `Tolong analisis secara mendalam protein ${item.proteinName} (Gen: ${item.gene}, Accession: ${item.accession}, Organisme: ${item.organism}). Jelaskan fungsi biologis, domain fungsional, dan potensi implikasi terapeutiknya.`;
    } else if (activeTab === 'pdb') {
      prompt = `Tolong jelaskan struktur kristal 3D PDB ${item.pdbId} (${item.title || 'Struktur'}). Analisis metode penentuan (${item.method}), resolusi (${item.resolution} Å), dan konformasi rantai aktifnya.`;
    } else if (activeTab === 'pubmed') {
      prompt = `Tolong ringkas dan jelaskan temuan utama dari artikel jurnal PubMed PMID ${item.pmid}: "${item.title}". Apa signifikansi ilmiah dan kesimpulannya?`;
    }
    onSelectPrompt(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Eksplorasi Sains & Bioinformatika
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Google DeepMind Science
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cari langsung data biologis, struktur protein 3D, atau literatur medis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/50 gap-2 pt-2">
          <button
            onClick={() => {
              setActiveTab('uniprot');
              setResults([]);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'uniprot'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> UniProt (Protein & AlphaFold)
          </button>
          <button
            onClick={() => {
              setActiveTab('pdb');
              setResults([]);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'pdb'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dna className="w-4 h-4" /> RCSB PDB (Struktur 3D)
          </button>
          <button
            onClick={() => {
              setActiveTab('pubmed');
              setResults([]);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'pubmed'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> PubMed (Jurnal Medis)
          </button>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="p-6 pb-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'uniprot'
                  ? 'Contoh: TP53, Insulin, EGFR, BRCA1...'
                  : activeTab === 'pdb'
                  ? 'Contoh PDB ID: 1TUP, 4HHB, 6LU7...'
                  : 'Contoh: CRISPR cancer therapy, mRNA vaccine...'
              }
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="absolute right-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
            </button>
          </div>
        </form>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {error && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
              {error}
            </div>
          )}

          {results.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Ketik nama gen, ID protein, PDB ID, atau topik medis lalu tekan Cari.
            </div>
          )}

          {results.map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/50 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {activeTab === 'uniprot' && `${item.proteinName} (${item.gene})`}
                    {activeTab === 'pdb' && `PDB ${item.pdbId}: ${item.title || 'Struktur Makromolekul'}`}
                    {activeTab === 'pubmed' && item.title}
                  </h4>
                  {activeTab === 'uniprot' && item.alphaFoldUrl && (
                    <a
                      href={item.alphaFoldUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0"
                    >
                      AlphaFold <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {activeTab === 'pdb' && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0"
                    >
                      RCSB <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {activeTab === 'pubmed' && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0"
                    >
                      PMID {item.pmid} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'uniprot' &&
                    `Accession: ${item.accession} | Organisme: ${item.organism} | Panjang: ${item.length} aa`}
                  {activeTab === 'pdb' &&
                    `Metode: ${item.method || 'Eksperimental'} | Resolusi: ${item.resolution ? item.resolution + ' Å' : 'N/A'}`}
                  {activeTab === 'pubmed' && `Sumber: ${item.source || 'Jurnal Ilmiah'} (${item.pubdate || ''})`}
                </p>
              </div>

              <button
                onClick={() => handleQuickInsert(item)}
                className="self-end px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Analisis dengan AuraAI
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
