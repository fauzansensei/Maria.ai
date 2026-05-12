import { useState, useEffect } from 'react';
import { Clock, Battery as BatteryIcon, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types';

interface UtilitiesProps {
  currentLang: string;
  onLanguageChange: (lang: string) => void;
  isCompact?: boolean;
}

export default function Utilities({ currentLang, onLanguageChange, isCompact }: UtilitiesProps) {
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    if (isCompact) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const updateBattery = (batt: any) => {
      setBattery({ level: Math.round(batt.level * 100), charging: batt.charging });
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        updateBattery(batt);
        batt.addEventListener('levelchange', () => updateBattery(batt));
        batt.addEventListener('chargingchange', () => updateBattery(batt));
      });
    }

    return () => clearInterval(timer);
  }, [isCompact]);

  const getBatteryColor = (level: number) => {
    if (level <= 25) return 'text-red-500';
    if (level <= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const currentLevel = battery !== null ? battery.level : 80;

  if (isCompact) {
    return (
      <div className="px-4 py-3 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between gap-4 shadow-xl select-none">
        <div className="flex items-center gap-3">
          <Globe size={14} className="text-blue-400" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em]">Sistem</span>
        </div>
        <select 
          value={currentLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-blue-400 outline-none border-none cursor-pointer uppercase tracking-widest text-right"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-[#0d1117] text-white">
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-3xl border border-white/5 shadow-xl">
           <div className="flex items-center gap-2 text-slate-500">
             <Clock size={14} className="text-blue-400" />
             <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Waktu</span>
           </div>
           <span className="text-sm font-bold text-white tracking-widest">{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-3xl border border-white/5 shadow-xl">
           <div className="flex items-center gap-2 text-slate-500">
             <BatteryIcon size={14} className={getBatteryColor(currentLevel)} />
             <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Baterai</span>
           </div>
           <span className={`text-sm font-bold tracking-widest ${getBatteryColor(currentLevel)}`}>
             {currentLevel}%
           </span>
        </div>
      </div>

      <div className="p-4 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Globe size={16} className="text-blue-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Sistem</span>
        </div>
        <select 
          value={currentLang}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-blue-400 outline-none border-none cursor-pointer uppercase tracking-widest text-right"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-[#0d1117] text-white">
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
