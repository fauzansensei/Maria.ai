import React from 'react';
import {
  Globe,
  MapPin,
  Image as ImageIcon,
  Atom,
  Volume2,
  Code2,
  Mail,
  HardDrive,
  GitBranch,
  AudioLines,
  FileText,
  Calendar,
  Box,
  Inbox,
  Hash,
  Users,
  MessageCircle,
  Palette,
  PenTool,
  Clapperboard,
  Triangle,
  Search,
  Sparkles,
  Play,
  Music,
  Headphones,
  BookOpen,
  GraduationCap,
  CreditCard,
  Coins,
  ShoppingBag,
  BedDouble,
  Plane,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Database,
  Layers,
  Kanban,
  Briefcase,
  Plug,
} from 'lucide-react';

interface PluginBrandIconProps {
  id: string;
  size?: 'sm' | 'md' | 'lg';
}

const BRAND_STYLES: Record<string, { bg: string; fg: string }> = {
  'google-search': {
    bg: 'bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60',
    fg: 'text-blue-600 dark:text-blue-400',
  },
  'google-maps': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60',
    fg: 'text-emerald-600 dark:text-emerald-400',
  },
  'image-studio': {
    bg: 'bg-purple-50 dark:bg-purple-950/70 border border-purple-200/80 dark:border-purple-800/60',
    fg: 'text-purple-600 dark:text-purple-400',
  },
  'science-scout': {
    bg: 'bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200/80 dark:border-cyan-800/60',
    fg: 'text-cyan-600 dark:text-cyan-400',
  },
  'voice-engine': {
    bg: 'bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60',
    fg: 'text-amber-600 dark:text-amber-400',
  },
  'canvas-code': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60',
    fg: 'text-indigo-600 dark:text-indigo-400',
  },
  'conn-gmail': {
    bg: 'bg-rose-50 dark:bg-rose-950/70 border border-rose-200/80 dark:border-rose-800/60',
    fg: 'text-rose-600 dark:text-rose-400',
  },
  'conn-drive': {
    bg: 'bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60',
    fg: 'text-amber-600 dark:text-amber-400',
  },
  'conn-calendar': {
    bg: 'bg-sky-50 dark:bg-sky-950/70 border border-sky-200/80 dark:border-sky-800/60',
    fg: 'text-sky-600 dark:text-sky-400',
  },
  'conn-supabase': {
    bg: 'bg-[#171c19] border border-emerald-500/40',
    fg: 'text-[#3ECF8E]',
  },
  'conn-vercel': {
    bg: 'bg-slate-950 border border-slate-800',
    fg: 'text-white',
  },
  'conn-mongodb': {
    bg: 'bg-[#001E2B] border border-emerald-500/40',
    fg: 'text-[#00ED64]',
  },
  'conn-github': {
    bg: 'bg-slate-900 dark:bg-[#1e222d] border border-slate-800 dark:border-[#32374a]',
    fg: 'text-white',
  },
  'conn-m365': {
    bg: 'bg-indigo-600 border border-indigo-700',
    fg: 'text-white',
  },
  'conn-atlassian': {
    bg: 'bg-[#0052CC] border border-[#0747A6]',
    fg: 'text-white',
  },
  'conn-linear': {
    bg: 'bg-[#1a1c29] border border-indigo-500/40',
    fg: 'text-indigo-300',
  },
  'conn-adobe': {
    bg: 'bg-[#FF0000] border border-red-700',
    fg: 'text-white',
  },
  'conn-elevenlabs': {
    bg: 'bg-slate-900 dark:bg-[#1c1f29] border border-slate-800 dark:border-[#303547]',
    fg: 'text-white',
  },
  'conn-notion': {
    bg: 'bg-slate-100 dark:bg-[#1e212b] border border-slate-200 dark:border-[#303547]',
    fg: 'text-slate-900 dark:text-white',
  },
  'conn-dropbox': {
    bg: 'bg-blue-600 border border-blue-700',
    fg: 'text-white',
  },
  'conn-outlook': {
    bg: 'bg-sky-600 border border-sky-700',
    fg: 'text-white',
  },
  'conn-slack': {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/70 border border-fuchsia-200/80 dark:border-fuchsia-800/60',
    fg: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  'conn-teams': {
    bg: 'bg-indigo-600 border border-indigo-700',
    fg: 'text-white',
  },
  'conn-discord': {
    bg: 'bg-[#5865F2] border border-[#4752C4]',
    fg: 'text-white',
  },
  'conn-canva': {
    bg: 'bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] border border-cyan-500/40',
    fg: 'text-white',
  },
  'conn-figma': {
    bg: 'bg-slate-900 dark:bg-[#1e202b] border border-slate-800 dark:border-[#33384a]',
    fg: 'text-rose-400',
  },
  'conn-runway': {
    bg: 'bg-slate-900 dark:bg-[#1c1f29] border border-slate-800 dark:border-[#303547]',
    fg: 'text-cyan-400',
  },
  'conn-exa': {
    bg: 'bg-blue-700 border border-blue-800',
    fg: 'text-white',
  },
  'conn-lovable': {
    bg: 'bg-gradient-to-br from-rose-500 via-orange-500 to-indigo-600 border border-rose-400/40',
    fg: 'text-white',
  },
  'conn-youtube': {
    bg: 'bg-red-600 border border-red-700',
    fg: 'text-white',
  },
  'conn-spotify': {
    bg: 'bg-[#1DB954] border border-[#199e48]',
    fg: 'text-slate-950',
  },
  'conn-apple-music': {
    bg: 'bg-gradient-to-br from-rose-500 to-pink-600 border border-rose-500/40',
    fg: 'text-white',
  },
  'conn-consensus': {
    bg: 'bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60',
    fg: 'text-blue-600 dark:text-blue-400',
  },
  'conn-zotero': {
    bg: 'bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800/60',
    fg: 'text-red-600 dark:text-red-400',
  },
  'conn-stripe': {
    bg: 'bg-[#635BFF] border border-[#5249f5]',
    fg: 'text-white',
  },
  'conn-binance': {
    bg: 'bg-amber-400 border border-amber-500',
    fg: 'text-slate-950',
  },
  'conn-shopify': {
    bg: 'bg-emerald-600 border border-emerald-700',
    fg: 'text-white',
  },
  'conn-booking': {
    bg: 'bg-[#003580] border border-[#002863]',
    fg: 'text-white',
  },
  'conn-skyscanner': {
    bg: 'bg-[#0770E3] border border-[#055ec0]',
    fg: 'text-white',
  },
  'conn-codex-sec': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60',
    fg: 'text-emerald-600 dark:text-emerald-400',
  },
  'conn-malwarebytes': {
    bg: 'bg-blue-600 border border-blue-700',
    fg: 'text-white',
  },
};

export const PluginBrandIcon: React.FC<PluginBrandIconProps> = ({ id, size = 'md' }) => {
  const isCustom = id.startsWith('custom-');
  const style = isCustom
    ? {
        bg: 'bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60',
        fg: 'text-cyan-600 dark:text-cyan-400',
      }
    : BRAND_STYLES[id] || {
        bg: 'bg-slate-100 dark:bg-[#1e212c] border border-slate-200 dark:border-[#2e3242]',
        fg: 'text-slate-700 dark:text-slate-200',
      };

  const containerCls =
    size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : size === 'lg'
      ? 'w-16 h-16 rounded-2xl'
      : 'w-11 h-11 rounded-xl';

  const iconCls =
    size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  const renderGlyph = () => {
    if (isCustom) return <Plug className={iconCls} />;
    switch (id) {
      case 'google-search':
        return <Globe className={iconCls} />;
      case 'google-maps':
        return <MapPin className={iconCls} />;
      case 'image-studio':
        return <ImageIcon className={iconCls} />;
      case 'science-scout':
        return <Atom className={iconCls} />;
      case 'voice-engine':
        return <Volume2 className={iconCls} />;
      case 'canvas-code':
        return <Code2 className={iconCls} />;
      case 'conn-gmail':
        return <Mail className={iconCls} />;
      case 'conn-drive':
        return <HardDrive className={iconCls} />;
      case 'conn-calendar':
        return <Calendar className={iconCls} />;
      case 'conn-supabase':
        return <Zap className={`${iconCls} fill-current`} />;
      case 'conn-vercel':
        return <Triangle className={`${iconCls} fill-current`} />;
      case 'conn-mongodb':
        return <Database className={iconCls} />;
      case 'conn-github':
        return <GitBranch className={iconCls} />;
      case 'conn-m365':
        return <Briefcase className={iconCls} />;
      case 'conn-atlassian':
        return <Kanban className={iconCls} />;
      case 'conn-linear':
        return <Layers className={iconCls} />;
      case 'conn-adobe':
        return <Palette className={iconCls} />;
      case 'conn-elevenlabs':
        return <AudioLines className={iconCls} />;
      case 'conn-notion':
        return <FileText className={iconCls} />;
      case 'conn-dropbox':
        return <Box className={iconCls} />;
      case 'conn-outlook':
        return <Inbox className={iconCls} />;
      case 'conn-slack':
        return <Hash className={iconCls} />;
      case 'conn-teams':
        return <Users className={iconCls} />;
      case 'conn-discord':
        return <MessageCircle className={iconCls} />;
      case 'conn-canva':
        return <Palette className={iconCls} />;
      case 'conn-figma':
        return <PenTool className={iconCls} />;
      case 'conn-runway':
        return <Clapperboard className={iconCls} />;
      case 'conn-exa':
        return <Search className={iconCls} />;
      case 'conn-lovable':
        return <Sparkles className={iconCls} />;
      case 'conn-youtube':
        return <Play className={`${iconCls} fill-current`} />;
      case 'conn-spotify':
        return <Headphones className={iconCls} />;
      case 'conn-apple-music':
        return <Music className={iconCls} />;
      case 'conn-consensus':
        return <BookOpen className={iconCls} />;
      case 'conn-zotero':
        return <GraduationCap className={iconCls} />;
      case 'conn-stripe':
        return <CreditCard className={iconCls} />;
      case 'conn-binance':
        return <Coins className={iconCls} />;
      case 'conn-shopify':
        return <ShoppingBag className={iconCls} />;
      case 'conn-booking':
        return <BedDouble className={iconCls} />;
      case 'conn-skyscanner':
        return <Plane className={iconCls} />;
      case 'conn-codex-sec':
        return <ShieldCheck className={iconCls} />;
      case 'conn-malwarebytes':
        return <ShieldAlert className={iconCls} />;
      default:
        return <Globe className={iconCls} />;
    }
  };

  return (
    <div
      className={`${containerCls} ${style.bg} ${style.fg} flex items-center justify-center shrink-0 select-none`}
    >
      {renderGlyph()}
    </div>
  );
};
