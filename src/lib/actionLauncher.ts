// Action Launcher & Windows Open Engine for Maria AI
// Auto-launches apps & external sites (YouTube Music, Discord, Spotify, etc.) matching user intent

export interface LaunchAction {
  type: 'youtube_music' | 'youtube' | 'discord' | 'spotify' | 'web';
  title: string;
  subtitle?: string;
  url: string;
  statusText: string;
  icon: 'youtube' | 'youtube_music' | 'discord' | 'spotify' | 'google' | 'instagram' | 'tiktok' | 'whatsapp' | 'github' | 'web';
}

/**
 * Detect launch action intent directly from user prompt
 */
export function detectLaunchAction(text: string): LaunchAction | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Music / Song play intent:
  // e.g. "putar lagu dj amnesia", "puterin lagu ...", "dengerin lagu ...", "play song ...", "play ..."
  const musicPatterns = [
    /^(?:tolong\s+)?(?:putar(?:kan)?|puterin|dengarkan|dengerin|play|mainkan|stelkan|setel)\s+(?:lagu|musik)?\s*(.+)$/i,
    /^(?:buka|open)\s+(?:youtube\s+music|yt\s+music)\s*(?:dan\s+putar\s+)?(.+)?$/i,
  ];

  for (const pattern of musicPatterns) {
    const match = lower.match(pattern);
    if (match && match[1]) {
      let songQuery = match[1]
        .replace(/\b(?:di\s+)?youtube(?:\s+music)?\b/gi, '')
        .replace(/\b(?:sekarang|dong|ya|tolong)\b/gi, '')
        .trim();

      if (songQuery) {
        return {
          type: 'youtube_music',
          title: songQuery.toUpperCase().startsWith('DJ') ? songQuery.toUpperCase() : songQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          subtitle: 'YouTube Music',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}`,
          statusText: 'Connecting to YouTube Music',
          icon: 'youtube_music',
        };
      }
    }
  }

  // 2. Specific App / Website open intent:
  // "open discord", "buka discord"
  if (/^(?:buka|open)\s+discord\b/i.test(lower)) {
    return {
      type: 'discord',
      title: 'Discord',
      subtitle: 'discord.com',
      url: 'https://discord.com/app',
      statusText: 'Connecting to Device Assistance',
      icon: 'discord',
    };
  }

  // "open youtube", "open you tube", "buka youtube"
  if (/^(?:buka|open)\s+(?:you\s*tube|yt)\b/i.test(lower)) {
    return {
      type: 'youtube',
      title: 'YouTube',
      subtitle: 'youtube.com',
      url: 'https://www.youtube.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'youtube',
    };
  }

  // "open spotify", "buka spotify"
  if (/^(?:buka|open)\s+spotify\b/i.test(lower)) {
    return {
      type: 'spotify',
      title: 'Spotify',
      subtitle: 'open.spotify.com',
      url: 'https://open.spotify.com',
      statusText: 'Connecting to Spotify',
      icon: 'spotify',
    };
  }

  // "open google", "buka google"
  if (/^(?:buka|open)\s+(?:google|mesin\s+pencari)\b/i.test(lower)) {
    return {
      type: 'web',
      title: 'Google',
      subtitle: 'google.com',
      url: 'https://www.google.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'google',
    };
  }

  // "open instagram", "buka instagram", "buka ig"
  if (/^(?:buka|open)\s+(?:instagram|ig)\b/i.test(lower)) {
    return {
      type: 'web',
      title: 'Instagram',
      subtitle: 'instagram.com',
      url: 'https://www.instagram.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'instagram',
    };
  }

  // "open tiktok", "buka tiktok"
  if (/^(?:buka|open)\s+(?:tiktok|tik\s*tok)\b/i.test(lower)) {
    return {
      type: 'web',
      title: 'TikTok',
      subtitle: 'tiktok.com',
      url: 'https://www.tiktok.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'tiktok',
    };
  }

  // "open whatsapp", "buka whatsapp", "buka wa"
  if (/^(?:buka|open)\s+(?:whatsapp|wa)\b/i.test(lower)) {
    return {
      type: 'web',
      title: 'WhatsApp',
      subtitle: 'web.whatsapp.com',
      url: 'https://web.whatsapp.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'whatsapp',
    };
  }

  // "open github", "buka github"
  if (/^(?:buka|open)\s+(?:github|git\s*hub)\b/i.test(lower)) {
    return {
      type: 'web',
      title: 'GitHub',
      subtitle: 'github.com',
      url: 'https://github.com',
      statusText: 'Connecting to Device Assistance',
      icon: 'github',
    };
  }

  // 3. Generic "buka [website / URL]"
  const urlMatch = lower.match(/^(?:buka|open)\s+(?:website\s+|situs\s+|web\s+)?(https?:\/\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i);
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
      statusText: 'Connecting to Device Assistance',
      icon: 'web',
    };
  }

  return null;
}

/**
 * Execute window/app launch cleanly
 */
export function executeLaunch(action: LaunchAction): void {
  if (typeof window === 'undefined') return;

  try {
    // Open in new tab / native application handler
    const win = window.open(action.url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // If popup blocker intervened, redirect top or inform user
      window.location.assign(action.url);
    }
  } catch (err) {
    console.warn('Direct launch error, fallback to location:', err);
    try {
      window.location.assign(action.url);
    } catch {}
  }
}
