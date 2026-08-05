import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt if it's iOS and not already installed
    if (isIosDevice && !window.navigator.standalone) {
      // Check if we already showed it to avoid annoying the user every time
      const hasSeenIOSPrompt = localStorage.getItem('hasSeenIOSPrompt');
      if (!hasSeenIOSPrompt) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('hasSeenIOSPrompt', 'true');
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#ffffff',
      padding: '16px 20px',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 9999,
      width: '90%',
      maxWidth: '400px',
      border: '2px solid var(--accent-color)'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-heading)' }}>
          Install App
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isIOS 
            ? "To install, tap the Share icon at the bottom of Safari and select 'Add to Home Screen'."
            : "Add this web app to your home screen for quick and easy access."}
        </p>
      </div>
      
      {!isIOS && (
        <button 
          onClick={handleInstallClick}
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Download size={16} /> Install
        </button>
      )}

      <button 
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: isIOS ? '16px' : '0'
        }}
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
}
