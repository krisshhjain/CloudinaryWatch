import { motion } from 'framer-motion';

export default function ProgressBar({
  progress = 0,
  size = 'md',
  variant = 'primary',
  showLabel = true,
  label = '',
}) {
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const gradients = {
    primary: 'from-primary-500 to-accent-cyan',
    success: 'from-emerald-500 to-emerald-400',
    danger: 'from-red-500 to-red-400',
    warning: 'from-amber-500 to-amber-400',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-dark-400 font-medium">{label}</span>
          <span className="text-xs text-dark-300 font-semibold">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-dark-800 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradients[variant]} relative`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {progress > 0 && progress < 100 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
          )}
        </motion.div>
      </div>
    </div>
  );
}
