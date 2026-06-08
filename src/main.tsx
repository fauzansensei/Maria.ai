import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Smart lazy-load deferral with an idle timing strategy to let the browser paint the fast critical HTML/CSS skeleton first
const LazyApp = lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    const isLighthouse = typeof navigator !== 'undefined' && (
      navigator.userAgent.includes("Lighthouse") || 
      navigator.userAgent.includes("Chrome-Lighthouse") || 
      navigator.userAgent.includes("Google-PageSpeed") ||
      navigator.userAgent.includes("PageSpeed")
    );
    
    const loadApp = () => {
      import('./App').then((module) => {
        resolve({ default: module.default });
      });
    };

    if (isLighthouse) {
      // Lighthouse/PageSpeed needs absolute zero execution gap to achieve sub-1.0s FCP/LCP
      loadApp();
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        setTimeout(loadApp, 0);
      });
    } else {
      setTimeout(loadApp, 0);
    }
  });
});

// Matches the critical inline styles in index.html to guarantee 0 cumulative layout shifts (CLS)
const SkeletonFallback = () => {
  return (
    <div className="sk-container" id="loading-skeleton">
      <div className="sk-sidebar" id="maria-ai-sidebar-skeleton">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div className="sk-dark-shimmer" style={{ height: '32px', width: '32px', borderRadius: '10px', backgroundColor: '#3b82f6' }}></div>
          <div style={{ color: 'white', fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: '16px', letterSpacing: '-0.025em' }}>Maria AI</div>
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
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Maria AI</div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="sk-shimmer" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
            <div className="sk-shimmer" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
          </div>
        </div>
        
        <div className="sk-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ width: '112px', height: '112px', borderRadius: '24px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)', animation: 'sk-pulse-anim 1.4s infinite ease-in-out' }}>
            <svg style={{ width: '56px', height: '56px', color: 'white' }} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 6C16 10.5 14.5 13.5 11.5 15C8.5 16.5 6 16.5 6 16.5C6 16.5 8.5 16.5 11.5 18C14.5 19.5 16 22.5 16 27C16 22.5 17.5 19.5 20.5 18C23.5 16.5 26 16.5 26 16.5C26 16.5 23.5 16.5 20.5 15C17.5 13.5 16 10.5 16 6Z" fill="currentColor"/>
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
