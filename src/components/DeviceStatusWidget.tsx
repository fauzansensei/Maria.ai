import { Clock, Battery as BatteryIcon } from 'lucide-react';
import { useDeviceContext } from '../hooks/useDeviceContext';

export default function DeviceStatusWidget({ isDark = false }: { isDark?: boolean }) {
  const deviceContext = useDeviceContext();
  const currentLevel = deviceContext.battery;

  return (
    <div className="px-1">
      <div className={`w-full flex items-center justify-between px-4 py-3 border rounded-2xl transition-all shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-slate-50 text-brand-blue'}`}>
            <Clock size={18} />
          </div>
          <div className="flex flex-col">
            <span className={`text-[13px] font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {deviceContext.time}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
               Waktu Lokal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className={`text-[13px] font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentLevel}%
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
               Baterai
            </span>
          </div>
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-slate-50 text-brand-blue'}`}>
            <BatteryIcon size={18} className={currentLevel <= 20 ? 'text-red-500' : ''} />
          </div>
        </div>
      </div>
    </div>
  );
}
