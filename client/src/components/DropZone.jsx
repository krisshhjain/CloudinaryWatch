import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DropZone({ onFilesAdded, disabled = false }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles);
      }
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
    maxFiles: 100,
    disabled,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.005 }}
      whileTap={{ scale: disabled ? 1 : 0.995 }}
    >
      <div
        {...getRootProps()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 group ${
          isDragActive && !isDragReject
            ? 'drop-zone-active border-primary-400'
            : isDragReject
            ? 'border-red-500 bg-red-500/10'
            : disabled
            ? 'border-dark-700 bg-dark-800/30 cursor-not-allowed opacity-50'
            : 'border-dark-700 hover:border-primary-500/50 hover:bg-dark-800/30'
        }`}
      >
        <input {...getInputProps()} />

        {/* Background orb */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl group-hover:bg-primary-500/10 transition-all duration-500" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragActive
                ? 'bg-primary-500/20 text-primary-400 scale-110'
                : 'bg-dark-800/50 text-dark-400 group-hover:bg-primary-500/10 group-hover:text-primary-400'
            }`}
          >
            {isDragActive ? (
              <ImagePlus className="w-10 h-10 animate-pulse" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>

          {isDragActive && !isDragReject ? (
            <div>
              <p className="text-xl font-semibold text-primary-400">Drop your files here</p>
              <p className="text-sm text-dark-400 mt-1">Release to add files</p>
            </div>
          ) : isDragReject ? (
            <div>
              <p className="text-xl font-semibold text-red-400">Invalid file type</p>
              <p className="text-sm text-dark-400 mt-1">Only images and videos are accepted</p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-semibold text-dark-200">
                Drag & drop files here
              </p>
              <p className="text-sm text-dark-400 mt-1">
                or <span className="text-primary-400 font-medium">click to browse</span>
              </p>
              <p className="text-xs text-dark-500 mt-3">
                Supports JPG, PNG, GIF, WebP, SVG, MP4 • Up to 100 files • 50MB max each
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
