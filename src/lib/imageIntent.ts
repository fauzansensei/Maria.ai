/**
 * Helper to detect natural language image generation and editing requests in Indonesian and English
 */

export function isImageIntent(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().trim();

  // Pattern 1: Explicit creation phrases ("buatkan saya gambar...", "bikin gambar...", "generate gambar...")
  const createMatch = /\b(buatkan|buat|bikin|bikinin|bikinlah|ciptakan|generate|hasilkan|lukiskan|lukis|gambarin|gambarkan)\s+(saya\s+|kami\s+)?(sebuah\s+|suatu\s+|beberapa\s+)?(gambar|foto|lukisan|ilustrasi|visual|fanart|wallpaper|poster|vektor|artwork)\b/i.test(clean);
  if (createMatch) return true;

  // Pattern 2: Verb-first shorthand ("gambarin kucing", "gambarkan pemandangan", "lukiskan istana")
  const verbMatch = /^(gambarin|gambarkan|lukiskan|ilustrasikan)\s+\S+/i.test(clean);
  if (verbMatch) return true;

  // Pattern 3: Editing phrases ("edit gambar...", "ubah gambar ini...", "ganti latar foto...")
  const editMatch = /\b(edit|ubah|ganti|modifikasi|tambahkan|hilangkan|hapus|revisi)\s+(gambar|foto|visual|latar|background)\b/i.test(clean);
  if (editMatch) return true;

  // Pattern 4: English creation phrases
  const englishMatch = /^(draw|paint|illustrate|generate\s+an?\s+image|create\s+an?\s+image|make\s+an?\s+image|picture\s+of)\b/i.test(clean);
  if (englishMatch) return true;

  // Pattern 5: Suffix request ("...dalam bentuk gambar", "...jadikan gambar")
  const suffixMatch = /\b(jadikan\s+gambar|dalam\s+bentuk\s+gambar|versi\s+gambar)\b/i.test(clean);
  if (suffixMatch) return true;

  return false;
}

export function extractImagePrompt(text: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/^(tolong|mohon|bisakah\s+kamu|bisa\s+kamu|coba)?\s*/i, '')
    .replace(/^(buatkan|buat|bikin|bikinin|bikinlah|gambarin|gambarkan|lukiskan|lukis|ciptakan|generate|hasilkan)\s+(saya\s+|kami\s+)?(sebuah\s+|suatu\s+|beberapa\s+)?(gambar|foto|lukisan|ilustrasi|visual|wallpaper|poster)?\s*(tentang|dari|berupa|yaitu)?\s*/i, '')
    .trim();

  // If cleaning emptied the string, fallback to original text
  return cleaned || text;
}
