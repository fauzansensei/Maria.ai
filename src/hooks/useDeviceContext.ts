import { useState, useEffect } from 'react';

export interface DeviceContext {
  time: string;
  battery: number;
  charging: boolean;
}

export function useDeviceContext(): DeviceContext {
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<{ level: number; charging: boolean }>({ level: 100, charging: false });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000); // Update time every 10 seconds for relative accuracy

    let batteryManager: any = null;

    const updateBattery = (batt: any) => {
      setBattery({ level: Math.round(batt.level * 100), charging: batt.charging });
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        batteryManager = batt;
        updateBattery(batt);
        batt.addEventListener('levelchange', () => updateBattery(batt));
        batt.addEventListener('chargingchange', () => updateBattery(batt));
      });
    }

    return () => {
      clearInterval(timer);
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', () => updateBattery(batteryManager));
        batteryManager.removeEventListener('chargingchange', () => updateBattery(batteryManager));
      }
    };
  }, []);

  return {
    time: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    battery: battery.level,
    charging: battery.charging
  };
}
