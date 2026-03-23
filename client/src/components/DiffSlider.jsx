import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function DiffSlider({
  originalSrc,
  optimizedSrc,
  originalSize,
  optimizedSize,
  originalFormat,
  optimizedFormat,
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = () => { dragging.current = true; };
  const handleMouseUp = () => { dragging.current = false; };
  const handleMouseMove = (e) => { if (dragging.current) handleMove(e.clientX); };
  const handleTouchMove = (e) => { handleMove(e.touches[0].clientX); };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card !p-0 overflow-hidden"
    >
      {/* Labels */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800/50">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="text-xs text-dark-400">
            Original ({originalFormat?.toUpperCase()}) — {formatBytes(originalSize)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-400">
            Optimized ({optimizedFormat?.toUpperCase()}) — {formatBytes(optimizedSize)}
          </span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
      </div>

      {/* Slider */}
      <div
        ref={containerRef}
        className="relative select-none cursor-col-resize aspect-video bg-dark-800"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={(e) => handleMove(e.clientX)}
      >
        {/* Optimized image (full) */}
        <img
          src={optimizedSrc}
          alt="Optimized"
          className="absolute inset-0 w-full h-full object-contain"
          draggable="false"
        />

        {/* Original image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={originalSrc}
            alt="Original"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ width: `${containerRef.current ? containerRef.current.offsetWidth : 100}px`, maxWidth: 'none' }}
            draggable="false"
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          {/* Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center backdrop-blur">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3L2 8L5 13" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 3L14 8L11 13" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Side labels */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-red-500/80 text-white text-[10px] font-bold z-20">
          ORIGINAL
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-emerald-500/80 text-white text-[10px] font-bold z-20">
          OPTIMIZED
        </div>
      </div>

      {/* Savings bar */}
      {originalSize && optimizedSize && (
        <div className="px-4 py-3 border-t border-dark-800/50 bg-dark-900/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-400">Size reduction</span>
            <span className="text-sm font-bold text-emerald-400">
              {Math.round(((originalSize - optimizedSize) / originalSize) * 100)}% smaller
            </span>
          </div>
          <div className="mt-2 h-2 bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(((originalSize - optimizedSize) / originalSize) * 100)}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
