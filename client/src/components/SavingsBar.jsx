import { motion } from 'framer-motion';
import { TrendingDown, Zap, HardDrive } from 'lucide-react';

export default function SavingsBar({ summary }) {
  if (!summary) return null;

  const {
    totalFiles,
    totalOriginalFormatted,
    totalOptimizedFormatted,
    totalSavingsFormatted,
    savingsPercent,
    totalOriginalSize = 0,
    totalOptimizedSize = 0,
  } = summary;

  const barWidth = totalOriginalSize > 0
    ? Math.max(5, Math.round((totalOptimizedSize / totalOriginalSize) * 100))
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card !p-6 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/20"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Optimization Results</h3>
          <p className="text-xs text-dark-400">{totalFiles} file{totalFiles !== 1 ? 's' : ''} optimized</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-dark-800/40 text-center">
          <HardDrive className="w-4 h-4 text-dark-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-white">{totalOriginalFormatted}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-widest">Original</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-800/40 text-center">
          <Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-emerald-400">{totalOptimizedFormatted}</p>
          <p className="text-[10px] text-dark-500 uppercase tracking-widest">Optimized</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <TrendingDown className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-emerald-400">{totalSavingsFormatted}</p>
          <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest">Saved</p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-dark-400">
          <span>Size comparison</span>
          <span className="font-bold text-emerald-400">{savingsPercent}% smaller</span>
        </div>

        <div className="relative h-8 bg-dark-800/50 rounded-xl overflow-hidden">
          {/* Original (full bar) */}
          <div className="absolute inset-0 bg-dark-700/30 rounded-xl flex items-center px-3">
            <span className="text-[10px] text-dark-500">Original: {totalOriginalFormatted}</span>
          </div>

          {/* Optimized (smaller bar) */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 rounded-xl flex items-center px-3"
            initial={{ width: '100%' }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[10px] text-emerald-300 font-medium whitespace-nowrap">
              {totalOptimizedFormatted}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Percentage ring */}
      <div className="flex items-center justify-center mt-6">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="50" fill="none"
              stroke="url(#savings-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - savingsPercent / 100) }}
              transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="savings-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {savingsPercent}%
            </motion.span>
            <span className="text-[10px] text-dark-400 uppercase">saved</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
