import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Standard instant lazy-load to guarantee reliable execution in all browser frame contexts
const LazyApp = lazy(() => import('./App'));

// Matches the critical inline styles in index.html to guarantee 0 cumulative layout shifts (CLS)
const SkeletonFallback = () => {
  return (
    <div className="sk-container" id="loading-skeleton">
      <div className="sk-sidebar" id="maria-ai-sidebar-skeleton">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div className="sk-dark-shimmer" style={{ height: '32px', width: '32px', borderRadius: '10px', backgroundColor: '#171f36', border: '1px solid rgba(188, 198, 212, 0.2)' }}></div>
          <div style={{ color: 'white', fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: '16px', letterSpacing: '-0.025em' }}>Maria-ai</div>
        </div>
        <div className="sk-dark-shimmer" style={{ height: '48px', marginBottom: '20px', borderRadius: '12px', opacity: 0.8 }}></div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px', paddingLeft: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
            <span>Library</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <span>Discover</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></div>
            <span>Pengaturan</span>
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="sk-dark-shimmer" style={{ height: '48px', borderRadius: '12px', opacity: 0.7 }}></div>
      </div>
      
      <div className="sk-main">
        <div className="sk-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="sk-shimmer" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Maria-ai</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="sk-shimmer" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
            <div className="sk-shimmer" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
          </div>
        </div>
        
        <div className="sk-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ width: '112px', height: '112px', borderRadius: '24px', background: '#171f36', border: '1px solid rgba(188, 198, 212, 0.2)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(23, 31, 54, 0.15)', animation: 'sk-pulse-anim 1.4s infinite ease-in-out' }}>
            <svg style={{ width: '56px', height: '56px' }} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" fill="#171f36"/>
              <circle cx="256" cy="256" r="160" stroke="#bcc6d4" strokeWidth="12"/>
              <g stroke="#f6acad" strokeWidth="14" strokeLinecap="round">
                <line x1="160" y1="390" x2="240" y2="278"/>
                <line x1="286" y1="214" x2="352" y2="122"/>
              </g>
              <text x="256" y="325" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="220" fill="white" textAnchor="middle">M</text>
              <path d="M400 120 C 400 132, 408 140, 420 140 C 408 140, 400 148, 400 160 C 400 148, 392 140, 380 140 C 392 140, 400 132, 400 120 Z" fill="#f6acad"/>
            </svg>
          </div>
        </div>
        
        <div className="sk-bottom-bar">
          <div className="sk-bottom-input">
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#94a3b8', opacity: 0.6 }}></div>
              <span>Tanya Maria...</span>
            </div>
            <div className="sk-shimmer" style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#cbd5e1', opacity: 0.6 }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<SkeletonFallback />}>
        <LazyApp />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
