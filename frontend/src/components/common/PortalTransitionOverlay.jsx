import React, { useEffect, useRef, useState } from 'react';
import transparentShield from '../../assets/transparent.png';

/**
 * PortalTransitionOverlay:
 * Provides the chromatic flash glow and expanding shield pulse transmission animation
 * inspired by the original homepage portal transition logic.
 */
export default function PortalTransitionOverlay({ isTransitioning, targetPortal }) {
  const [isVisible, setIsVisible] = useState(isTransitioning);
  const hideTimeoutRef = useRef(null);

  const config = {
    faculty: { color: 'portal-glow-blue', text: 'Faculty Console' },
    student: { color: 'portal-glow-green', text: 'Student Hub' },
    scanner: { color: 'portal-glow-red', text: 'Camera Edge Kiosk' },
    reports: { color: 'portal-glow-blue', text: 'Audit & Telemetry' },
    admin: { color: 'portal-glow-black', text: 'Administrative Control' },
  };

  const currentConfig = config[targetPortal] || { color: 'portal-glow-blue', text: 'Loading Portal...' };

  useEffect(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }

    if (isTransitioning) {
      setIsVisible(true);
      return undefined;
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 300);

    return () => window.clearTimeout(hideTimeoutRef.current);
  }, [isTransitioning]);

  if (!isVisible) return null;

  return (
    <div 
      id="transition-overlay"
      className={`portal-transition-overlay ${isTransitioning ? 'is-active' : ''}`}
      aria-live="polite"
      aria-label="Routing to destination portal"
    >
      {/* Radiant Chromatic Glow Flash */}
      <div 
        id="transition-glow"
        className={`portal-transition-glow ${isTransitioning ? 'animate-flash-glow' : ''} ${currentConfig.color}`}
      />

      <div className={`portal-transition-ring portal-transition-ring-one ${isTransitioning ? 'is-active' : ''}`} />
      <div className={`portal-transition-ring portal-transition-ring-two ${isTransitioning ? 'is-active' : ''}`} />

      {/* Expanding Shield Pulse */}
      <div
        key={`transition-shield-${targetPortal}`}
        className={`portal-transition-shield-shell relative z-10 ${isTransitioning ? 'animate-shield-pulse' : ''}`}
      >
        <img
          id="transition-shield"
          src={transparentShield}
          alt="Loading Portal"
          className="portal-transition-shield"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
      </div>

      {/* Target Routing Text */}
      <div className="relative z-20 mt-6 text-center font-mono">
        <span className="text-xs uppercase tracking-widest text-[#94a3b8] block">Initiating Secure Gateway</span>
        <span className="text-sm font-bold text-white mt-1 block tracking-wider">{currentConfig.text}</span>
      </div>
    </div>
  );
}
