// Action Launcher & Windows Open Engine for Maria AI
// Auto-launches apps & external sites (YouTube Music, Discord, Spotify, YouTube, etc.) matching user intent

export interface LaunchAction {
  type: 'youtube_music' | 'youtube' | 'discord' | 'spotify' | 'web';
  title: string;
  subtitle?: string;
  url: string;
  statusText: string;
  icon:
    | 'youtube'
    | 'youtube_music'
    | 'discord'
    | 'spotify'
    | 'google'
    | 'instagram'
    | 'tiktok'
    | 'whatsapp'
    | 'github'
    | 'twitter'
    | 'web';
}

/**
 * Remove conversational prefixes so user intent is cleanly extracted
 * e.g., "Hey Maria buka youtube" -> "buka youtube"
 * "Tolong bukain discord" -> "bukain discord"
 * "Maria, tolong putar lagu dj amnesia dong" -> "putar lagu dj amnesia"
 */
function cleanPrefix(text: string): string {
  let cleaned = text.trim();
  // Strip common Indonesian / English conversational prefixes
  cleaned = cleaned.replace(
    /^(?:hey|hai|halo|hei|oi|permisi|assalamu['a]?laikum|p|maria|tolong|coba|mohon|bisakah\s+(?:kamu|anda)?|bisa\s+(?:kamu|anda)?|tolong\s+dong|dong)?\s*(?:maria)?[\s,!?:.-]*/i,
    ''
  );
  // Strip trailing polite particles
  cleaned = cleaned.replace(/[\s,!?:.-]*(?:ya|dong|tolong|plis|please|sekarang)$/i, '');
  return cleaned.trim();
}

/**
 * Detect launch action intent directly from user prompt or AI response
 */
export function detectLaunchAction(text: string): LaunchAction | null {
  if (!text || typeof text !== 'string') return null;
  const rawLower = text.trim().toLowerCase();
  const lower = cleanPrefix(text).toLowerCase();

  // 1. Literal "windows open" test or inquiry
  if (
    /^(?:fitur\s+)?windows\s+open\b/i.test(lower) ||
    /^(?:fitur\s+)?windows\s+open\b/i.test(rawLower) ||
    /^(?:buka\s+)?windows\s+open\b/i.test(lower) ||
    /^(?:tes|test)\s+windows\s+open\b/i.test(lower)
  ) {
    return {
      type: 'youtube',
      title: 'Windows Open: YouTube',
      subtitle: 'youtube.com • Fitur Windows Open Aktif',
      url: 'https://www.youtube.com',
      statusText: 'Meluncurkan Fitur Windows Open',
      icon: 'youtube',
    };
  }

  // 2. Music / Song play intent:
  // e.g. "putar lagu dj amnesia", "puterin lagu ...", "dengerin lagu ...", "play song ...", "play ..."
  const musicPatterns = [
    /(?:putar(?:kan)?|puterin|dengarkan|dengerin|play|mainkan|stelkan|setel)\s+(?:lagu|musik)?\s*(.+)/i,
    /(?:buka|open|bukain)\s+(?:youtube\s+music|yt\s+music)\s*(?:dan\s+putar\s+)?(.+)?/i,
  ];

  for (const pattern of musicPatterns) {
    const match = lower.match(pattern) || rawLower.match(pattern);
    if (match && match[1]) {
      let songQuery = match[1]
        .replace(/\b(?:di\s+)?youtube(?:\s+music)?\b/gi, '')
        .replace(/\b(?:sekarang|dong|ya|tolong|plis|please)\b/gi, '')
        .trim();

      if (songQuery) {
        const formattedTitle = songQuery.toUpperCase().startsWith('DJ')
          ? songQuery.toUpperCase()
          : songQuery
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');

        return {
          type: 'youtube_music',
          title: formattedTitle,
          subtitle: 'YouTube Music',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`,
          statusText: 'Menghubungkan ke YouTube Music',
          icon: 'youtube_music',
        };
      }
    }
  }

  // 3. YouTube Music explicit
  if (/(?:buka|open|bukain|launch)\s+(?:youtube\s+music|yt\s+music)\b/i.test(rawLower) || /(?:music\.youtube\.com)/i.test(rawLower)) {
    return {
      type: 'youtube_music',
      title: 'YouTube Music',
      subtitle: 'music.youtube.com',
      url: 'https://music.youtube.com',
      statusText: 'Membuka YouTube Music',
      icon: 'youtube_music',
    };
  }

  // 4. Specific App / Website open intent:
  // "open discord", "buka discord", "bukain discord"
  if (/(?:buka|open|bukain|launch|membukakan)\s+discord\b/i.test(rawLower) || /discord\.(?:com|gg)/i.test(rawLower)) {
    return {
      type: 'discord',
      title: 'Discord',
      subtitle: 'discord.com',
      url: 'https://discord.com/app',
      statusText: 'Membuka Discord',
      icon: 'discord',
    };
  }

  // "open youtube", "buka youtube", "bukain youtube", "buka yt"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:you\s*tube|yt)\b/i.test(rawLower) || /(?:youtube\.com|youtu\.be)/i.test(rawLower)) {
    return {
      type: 'youtube',
      title: 'YouTube',
      subtitle: 'youtube.com',
      url: 'https://www.youtube.com',
      statusText: 'Membuka YouTube',
      icon: 'youtube',
    };
  }

  // "open spotify", "buka spotify", "bukain spotify"
  if (/(?:buka|open|bukain|launch|membukakan)\s+spotify\b/i.test(rawLower) || /spotify\.com/i.test(rawLower)) {
    return {
      type: 'spotify',
      title: 'Spotify',
      subtitle: 'open.spotify.com',
      url: 'https://open.spotify.com',
      statusText: 'Membuka Spotify',
      icon: 'spotify',
    };
  }

  // "open google", "buka google", "bukain google"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:google|mesin\s+pencari)\b/i.test(rawLower) || /google\.com/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'Google',
      subtitle: 'google.com',
      url: 'https://www.google.com',
      statusText: 'Membuka Google',
      icon: 'google',
    };
  }

  // "open instagram", "buka instagram", "buka ig"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:instagram|ig)\b/i.test(rawLower) || /instagram\.com/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'Instagram',
      subtitle: 'instagram.com',
      url: 'https://www.instagram.com',
      statusText: 'Membuka Instagram',
      icon: 'instagram',
    };
  }

  // "open tiktok", "buka tiktok"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:tiktok|tik\s*tok)\b/i.test(rawLower) || /tiktok\.com/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'TikTok',
      subtitle: 'tiktok.com',
      url: 'https://www.tiktok.com',
      statusText: 'Membuka TikTok',
      icon: 'tiktok',
    };
  }

  // "open whatsapp", "buka whatsapp", "buka wa"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:whatsapp|wa)\b/i.test(rawLower) || /web\.whatsapp\.com/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'WhatsApp Web',
      subtitle: 'web.whatsapp.com',
      url: 'https://web.whatsapp.com',
      statusText: 'Membuka WhatsApp Web',
      icon: 'whatsapp',
    };
  }

  // "open github", "buka github"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:github|git\s*hub)\b/i.test(rawLower) || /github\.com/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'GitHub',
      subtitle: 'github.com',
      url: 'https://github.com',
      statusText: 'Membuka GitHub',
      icon: 'github',
    };
  }

  // "open twitter / x", "buka twitter"
  if (/(?:buka|open|bukain|launch|membukakan)\s+(?:twitter|x\.com)\b/i.test(rawLower) || /(?:twitter\.com|x\.com)/i.test(rawLower)) {
    return {
      type: 'web',
      title: 'X (Twitter)',
      subtitle: 'x.com',
      url: 'https://x.com',
      statusText: 'Membuka X',
      icon: 'twitter',
    };
  }

  // 5. Generic "buka [website / URL / domain]"
  const urlMatch = rawLower.match(
    /(?:buka|open|bukain|kunjungi|launch|akses)\s+(?:website\s+|situs\s+|web\s+|link\s+)?(https?:\/\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i
  );
  if (urlMatch && urlMatch[1]) {
    const rawUrl = urlMatch[1];
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    let domain = '';
    try {
      domain = new URL(fullUrl).hostname;
    } catch {
      domain = rawUrl;
    }
    return {
      type: 'web',
      title: domain,
      subtitle: domain,
      url: fullUrl,
      statusText: `Membuka ${domain}`,
      icon: 'web',
    };
  }

  // 6. Direct URL pasted
  const directUrlMatch = text.match(/(https?:\/\/[^\s\)]+)/i);
  if (directUrlMatch && directUrlMatch[1]) {
    const fullUrl = directUrlMatch[1];
    let domain = fullUrl;
    try {
      domain = new URL(fullUrl).hostname;
    } catch {}
    return {
      type: 'web',
      title: domain,
      subtitle: domain,
      url: fullUrl,
      statusText: `Membuka ${domain}`,
      icon: 'web',
    };
  }

  return null;
}

/**
 * Execute window/app launch cleanly without redirecting away or getting blocked
 */
export function executeLaunch(action: LaunchAction): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. First attempt: standard window.open in new tab
    const win = window.open(action.url, '_blank', 'noopener,noreferrer');
    if (win && !win.closed) {
      return true;
    }

    // 2. Second attempt (especially for mobile browsers): trigger simulated user anchor click
    const link = document.createElement('a');
    link.href = action.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 100);
    return true;
  } catch (err) {
    console.warn('Windows Open execution error:', err);
    return false;
  }
}
