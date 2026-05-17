import { useEffect, useState } from 'react';
import { requestFullscreenAndLock } from '../utils/orientation';

export default function RotatePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const mobile = window.matchMedia('(max-width: 1024px)').matches;
      setIsPortrait(portrait && mobile);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      color: '#c9a84c',
      fontFamily: 'serif',
    }}>
      {/* Rotating phone icon */}
      <div style={{ fontSize: '64px', animation: 'rotateAnim 2s ease-in-out infinite' }}>
        📱
      </div>

      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
        Rotate Your Device
      </p>

      <p style={{
        fontSize: '14px',
        color: '#888',
        margin: 0,
        textAlign: 'center',
        padding: '0 2rem',
        lineHeight: 1.6
      }}>
        Cipher Quest requires landscape mode for the best experience
      </p>

      {/* Fullscreen button for browsers */}
      <button
        onClick={requestFullscreenAndLock}
        style={{
          marginTop: '0.5rem',
          padding: '10px 24px',
          background: 'transparent',
          border: '1px solid #c9a84c',
          color: '#c9a84c',
          fontFamily: 'serif',
          fontSize: '14px',
          cursor: 'pointer',
          letterSpacing: '0.1em',
        }}
      >
        ENTER FULLSCREEN
      </button>

      <style>{`
        @keyframes rotateAnim {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(90deg); }
          60%  { transform: rotate(90deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
