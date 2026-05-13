import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

const NoirToast = ({ title, body, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation shortly after mount
    const mountTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Trigger fade-out and close
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for CSS transition to finish before unmounting
    }, duration);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] max-w-sm w-full bg-[#121212] border border-gray-800 border-l-4 border-l-red-800 shadow-2xl transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div className="p-4 flex items-start space-x-3">
        <div className="flex-shrink-0 text-red-700 pt-1">
          <Bell size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-300 uppercase tracking-widest font-mono border-b border-gray-800 pb-1 mb-2">
            {title || 'Transmission'}
          </p>
          <p className="text-sm text-gray-400 font-serif leading-relaxed">
            "{body}"
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-600 hover:text-red-500 transition-colors bg-transparent border-none p-1 cursor-pointer"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoirToast;
