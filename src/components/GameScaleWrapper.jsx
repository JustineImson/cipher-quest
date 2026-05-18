import React, { useEffect, useState, useRef } from 'react';

export default function GameScaleWrapper({ children }) {
  const containerRef = useRef(null);
  const [dimensions, setScale] = useState({ scale: 1, logicalWidth: 1920, logicalHeight: 1080 });

  const TARGET_WIDTH = 1920;
  const TARGET_HEIGHT = 720;

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate scale to fit both dimensions while preserving minimum 1920x1080
      const scaleX = windowWidth / TARGET_WIDTH;
      const scaleY = windowHeight / TARGET_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);

      setScale({
        scale: newScale,
        logicalWidth: windowWidth / newScale,
        logicalHeight: windowHeight / newScale
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center pointer-events-none"
      ref={containerRef}
    >
      <div
        className="relative origin-center shrink-0 pointer-events-auto shadow-[0_0_50px_rgba(0,0,0,1)] bg-mystery-dark"
        style={{
          width: `${dimensions.logicalWidth}px`,
          height: `${dimensions.logicalHeight}px`,
          transform: `scale(${dimensions.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
