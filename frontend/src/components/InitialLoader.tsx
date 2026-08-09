'use client';

import { useEffect, useState } from 'react';

export default function InitialLoader() {
  const [loaded, setLoaded] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      // Add a small delay after load to ensure GSAP and heavy components have hydrated
      setTimeout(() => {
        setLoaded(true);
        // Remove from DOM after fade out transition finishes to avoid intercepting clicks
        setTimeout(() => setRemoved(true), 800);
      }, 300);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      // Fallback in case load never fires
      const timeout = setTimeout(handleLoad, 4000);
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timeout);
      };
    }
  }, []);

  if (removed) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#09090f', // Matches the dark background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loaded ? 0 : 1,
        pointerEvents: loaded ? 'none' : 'all',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{
        position: 'relative',
        width: '64px',
        height: '64px',
        transform: loaded ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'var(--accent, #FF2E93)',
          borderRightColor: 'var(--accent-orange, #FF8A00)',
          animation: 'spin 1s linear infinite',
          boxShadow: '0 0 20px rgba(255, 46, 147, 0.2)'
        }} />
        
        {/* Inner pulse logo */}
        <div style={{
          position: 'absolute',
          inset: '12px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent, #FF2E93), var(--accent-orange, #FF8A00))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '1.25rem',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          C
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
