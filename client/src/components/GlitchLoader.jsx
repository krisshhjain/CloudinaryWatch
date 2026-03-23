import { useEffect, useState } from 'react';
import './GlitchLoader.css';

/**
 * Full-page premium glitch loader
 */
export default function GlitchLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + Math.random() * 15 + 5));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gl-wrapper">
      {/* Animated background */}
      <div className="gl-bg-grid" />
      <div className="gl-bg-gradient" />
      <div className="gl-noise" />

      {/* Floating particles */}
      <div className="gl-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="gl-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="gl-center">
        {/* Orbiting ring */}
        <div className="gl-orbit">
          <div className="gl-orbit-dot" />
        </div>
        <div className="gl-orbit gl-orbit-2">
          <div className="gl-orbit-dot gl-orbit-dot-2" />
        </div>

        {/* Pulsing glow */}
        <div className="gl-pulse-ring" />
        <div className="gl-pulse-ring gl-pulse-ring-2" />

        {/* Cloud icon with glitch */}
        <div className="gl-icon-wrap">
          <div className="gl-glitch-layer gl-gl-r" aria-hidden><CloudIcon /></div>
          <div className="gl-glitch-layer gl-gl-b" aria-hidden><CloudIcon /></div>
          <div className="gl-glitch-layer gl-gl-main"><CloudIcon /></div>
        </div>
      </div>

      {/* Brand text */}
      <div className="gl-brand">
        <span className="gl-brand-text" data-text="CloudinaryWatch">CloudinaryWatch</span>
      </div>

      {/* Progress bar */}
      <div className="gl-progress-outer">
        <div className="gl-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        <div className="gl-progress-glow" style={{ left: `${Math.min(progress, 100)}%` }} />
      </div>

      {/* Status line */}
      <div className="gl-status-row">
        <span className="gl-status-text">Establishing connection</span>
        <span className="gl-status-pct">{Math.min(Math.round(progress), 100)}%</span>
      </div>
    </div>
  );
}

/**
 * Inline loader for in-page loading states
 */
export function InlineGlitchLoader() {
  return (
    <div className="gl-inline">
      <div className="gl-inline-icon">
        <div className="gl-glitch-layer gl-gl-r" aria-hidden><CloudIcon sm /></div>
        <div className="gl-glitch-layer gl-gl-b" aria-hidden><CloudIcon sm /></div>
        <div className="gl-glitch-layer gl-gl-main"><CloudIcon sm /></div>
      </div>
      <div className="gl-inline-bar">
        <div className="gl-inline-bar-fill" />
      </div>
      <span className="gl-inline-text">Loading<span className="gl-dots" /></span>
    </div>
  );
}

function CloudIcon({ sm }) {
  return (
    <svg viewBox="0 0 64 44" fill="none" className={sm ? 'gl-svg-sm' : 'gl-svg'}>
      <path
        d="M52 38H14.5C8 38 3 32.5 3 26.2c0-5.6 4-10.3 9.4-11.2C14.2 7.7 21 2 29.2 2c7.3 0 13.5 5 15.2 11.8A11.4 11.4 0 0 1 56 24.5c0 .5 0 1-.1 1.4A8.5 8.5 0 0 1 61 34c0 2.2-1.8 4-4 4h-5z"
        fill="currentColor"
      />
      <path
        d="M29.2 2c7.3 0 13.5 5 15.2 11.8"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="20" cy="26" r="1.2" fill="rgba(255,255,255,0.1)" />
      <circle cx="35" cy="22" r="0.8" fill="rgba(255,255,255,0.08)" />
      <circle cx="45" cy="30" r="1" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
}
