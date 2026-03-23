import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  GripVertical,
  Image as ImageIcon,
} from 'lucide-react';


const FilePreviewCard = forwardRef(function FilePreviewCard({
  file,
  index,
  onRename,
  onRemove,
  onRetry,
  status = 'pending',
  progress = 0,
  disabled = false,
}, ref) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.customName || file.name.replace(/\.[^/.]+$/, ''));

  const preview = file.preview || (file instanceof File ? URL.createObjectURL(file) : null);

  const handleRename = () => {
    if (editName.trim()) {
      onRename?.(index, editName.trim());
    }
    setIsEditing(false);
  };

  const statusConfig = {
    pending: { icon: null, color: 'text-dark-400', bg: 'bg-dark-700/50' },
    uploading: {
      icon: <Loader2 className="w-4 h-4 animate-spin text-primary-400" />,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    failed: {
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  };

  const cfg = statusConfig[status];

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`glass-card !p-3 flex items-center gap-3 ${cfg.bg} border ${
        status === 'uploading' ? 'border-primary-500/20' : 'border-dark-800/50'
      }`}
    >
      {/* Drag handle */}
      {status === 'pending' && !disabled && (
        <div className="cursor-grab active:cursor-grabbing text-dark-600 hover:text-dark-400">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark-800 flex-shrink-0 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-dark-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              className="input-field !py-1 !px-2 text-sm"
            />
          </div>
        ) : (
          <p className="text-sm font-medium text-dark-200 truncate">
            {file.customName || file.name}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-dark-500">
            {(file.size / 1024).toFixed(1)} KB
          </span>
          {cfg.icon && (
            <span className={`flex items-center gap-1 text-[11px] ${cfg.color}`}>
              {cfg.icon}
              {status}
            </span>
          )}
        </div>
        {status === 'uploading' && (
          <div className="mt-1.5">
            <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {status === 'pending' && !disabled && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-dark-500 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onRemove?.(index)}
              className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {status === 'failed' && (
          <button
            onClick={() => onRetry?.(index)}
            className="p-1.5 rounded-lg text-dark-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Retry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default FilePreviewCard;
