import { useState, useCallback, useRef } from 'react';
import { API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload as UploadIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DropZone from '../components/DropZone';
import FilePreviewCard from '../components/FilePreviewCard';
import ProgressBar from '../components/ProgressBar';
import FolderSelector from '../components/FolderSelector';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState({});
  const [fileProgress, setFileProgress] = useState({}); // per-file progress 0-100
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const abortControllerRef = useRef(null);

  const handleFilesAdded = useCallback((newFiles) => {
    const enriched = newFiles.map((f) => {
      f.customName = f.name.replace(/\.[^/.]+$/, '');
      f.preview = URL.createObjectURL(f);
      return f;
    });
    setFiles((prev) => [...prev, ...enriched]);
    setUploadResults(null);
  }, []);

  const handleRename = (index, newName) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index].customName = newName;
      return updated;
    });
  };

  const handleRemove = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadStatuses({});
    setUploadResults(null);
    setOverallProgress(0);
  };

  const handleUpload = async () => {
    if (files.length === 0) return toast.error('No files to upload');

    setUploading(true);
    setUploadResults(null);
    setOverallProgress(0);
    setFileProgress({});
    abortControllerRef.current = new AbortController();

    const statuses = {};
    files.forEach((_, i) => { statuses[i] = 'pending'; });
    setUploadStatuses(statuses);

    let successful = 0;
    let failed = 0;
    const results = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      if (abortControllerRef.current.signal.aborted) break;

      setUploadStatuses((prev) => ({ ...prev, [i]: 'uploading' }));
      setFileProgress((prev) => ({ ...prev, [i]: 0 }));

      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('folder', folder || '');
      if (files[i].customName) formData.append('customName', files[i].customName);

      try {
        const { data } = await API.post('/upload/single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: abortControllerRef.current.signal,
          timeout: 120000,
          onUploadProgress: (evt) => {
            // Track real byte-level transfer for THIS file
            const pct = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
            setFileProgress((prev) => ({ ...prev, [i]: pct }));
            // Smooth overall: (completed files + fraction of current) / total
            const overallPct = Math.round(((i + pct / 100) / total) * 100);
            setOverallProgress(overallPct);
          },
        });
        setFileProgress((prev) => ({ ...prev, [i]: 100 }));
        setUploadStatuses((prev) => ({ ...prev, [i]: 'success' }));
        successful++;
        results.push(data);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          for (let j = i; j < total; j++) {
            setUploadStatuses((prev) => ({ ...prev, [j]: 'pending' }));
          }
          toast('Upload cancelled', { icon: '🚫' });
          break;
        }
        setFileProgress((prev) => ({ ...prev, [i]: 100 }));
        setUploadStatuses((prev) => ({ ...prev, [i]: 'failed' }));
        failed++;
        results.push({ fileName: files[i].name, status: 'failed', error: err.message });
      }

      setOverallProgress(Math.round(((i + 1) / total) * 100));
    }

    if (!abortControllerRef.current.signal.aborted) {
      setUploadResults({ results, summary: { total, successful, failed } });
      if (failed === 0 && successful > 0) {
        toast.success(`All ${successful} files uploaded successfully!`);
      } else if (successful > 0) {
        toast(`${successful} uploaded, ${failed} failed`, { icon: '⚠️' });
      }
    }

    setUploading(false);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleRetry = async (index) => {
    // Retry single file
    const file = files[index];
    setUploadStatuses((prev) => ({ ...prev, [index]: 'uploading' }));

    const formData = new FormData();
    formData.append('files', file);
    formData.append('folder', folder || '');
    formData.append('customNames', JSON.stringify({ 0: file.customName }));

    try {
      const { data } = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatuses((prev) => ({
        ...prev,
        [index]: data.results[0]?.status || 'failed',
      }));
      if (data.results[0]?.status === 'success') {
        toast.success(`${file.name} uploaded!`);
      }
    } catch (err) {
      setUploadStatuses((prev) => ({ ...prev, [index]: 'failed' }));
      toast.error(`Failed to retry ${file.name}`);
    }
  };

  const totalFiles = files.length;
  const successCount = Object.values(uploadStatuses).filter((s) => s === 'success').length;
  const failCount = Object.values(uploadStatuses).filter((s) => s === 'failed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="page-header">Upload Files</h1>
        <p className="text-dark-400 mt-1">
          Drag and drop or browse to select files for upload to your Cloudinary account
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFilesAdded={handleFilesAdded} disabled={uploading} />

      {/* Controls */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 rounded-2xl p-5 border border-white/10 bg-dark-800/90 space-y-4"
        >
          {/* Folder selector */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <FolderSelector value={folder} onChange={setFolder} disabled={uploading} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-sm text-dark-400 mb-3">
                {totalFiles} file{totalFiles !== 1 ? 's' : ''} selected
              </span>
            </div>
          </div>

          {/* Overall progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-dark-400">Uploading {successCount + failCount + 1}/{totalFiles}</span>
                <span className="text-xs font-medium text-primary-400">{overallProgress}%</span>
              </div>
              <ProgressBar
                progress={overallProgress}
                label=""
                variant="primary"
                size="md"
              />
            </div>
          )}

          {/* Upload result summary */}
          {uploadResults && (
            <div className="flex items-center gap-4 p-3 rounded-xl bg-dark-800/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">{successCount} uploaded</span>
              </div>
              {failCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">{failCount} failed</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!uploading ? (
              <>
                <button onClick={handleUpload} className="btn-primary flex items-center gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Upload {totalFiles} File{totalFiles !== 1 ? 's' : ''}
                </button>
                <button onClick={handleClearAll} className="btn-secondary flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </>
            ) : (
              <button onClick={handleCancel} className="btn-danger flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel Upload
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="relative z-0 space-y-2">
          <h3 className="text-sm font-semibold text-dark-300 mb-3">
            Files ({totalFiles})
          </h3>
          <AnimatePresence mode="popLayout">
            {files.map((file, index) => (
              <FilePreviewCard
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRename={handleRename}
                onRemove={handleRemove}
                onRetry={handleRetry}
                status={uploadStatuses[index] || 'pending'}
                progress={fileProgress[index] || 0}
                disabled={uploading}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
