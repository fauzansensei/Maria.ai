import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Navigation } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MapWidgetProps {
  location?: { lat: number; lng: number };
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

function MapUpdater({ center }: { center?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
      map.setZoom(15);
    }
  }, [map, center]);
  return null;
}

export default function MapWidget({ location, title, isOpen, onClose }: MapWidgetProps) {
  if (!isOpen) return null;

  const defaultCenter = { lat: -6.2088, lng: 106.8456 }; // Jakarta
  const center = location || defaultCenter;

  if (!hasValidKey) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <MapPin size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Google Maps API Key Diperlukan</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Untuk menampilkan peta interaktif Maria, Anda perlu menambahkan API Key Google Maps Platform di panel Secrets AI Studio.
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-slate-950/60 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="w-full h-full max-w-5xl glass-panel rounded-4xl overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Navigation size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{title || 'Eksplorasi Lokasi'}</h3>
                <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-widest mt-0.5">Integrasi Google Maps Platform</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative bg-slate-900">
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={center}
                defaultZoom={12}
                mapId="MARIA_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
              >
                <AdvancedMarker position={center} title={title}>
                  <Pin background="#3b82f6" glyphColor="#fff" borderColor="#1e40af" />
                </AdvancedMarker>
                <MapUpdater center={center} />
              </Map>
            </APIProvider>
          </div>

          {/* Footer Info */}
          <div className="px-8 py-4 bg-slate-950/80 border-t border-white/5 flex items-center gap-6 overflow-x-auto custom-scrollbar">
             <div className="text-xs shrink-0">
               <span className="text-slate-500 font-bold uppercase mr-2">Latitude:</span>
               <span className="text-slate-300 font-mono">{center.lat.toFixed(4)}</span>
             </div>
             <div className="text-xs shrink-0">
               <span className="text-slate-500 font-bold uppercase mr-2">Longitude:</span>
               <span className="text-slate-300 font-mono">{center.lng.toFixed(4)}</span>
             </div>
             <div className="ml-auto text-[10px] text-slate-500 font-medium">
               Maria Intelligence Location Services v1.0
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
