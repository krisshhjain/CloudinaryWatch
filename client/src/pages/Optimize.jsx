import { useState, useCallback } from 'react';
import { API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Download,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Zap,
  CloudUpload,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DropZone from '../components/DropZone';
import DiffSlider from '../components/DiffSlider';
import CodeSnippet from '../components/CodeSnippet';
import SavingsBar from '../components/SavingsBar';
import FolderSelector from '../components/FolderSelector';

const STRATEGIES = [
  { id: 'auto', label: 'Auto (recommended)', desc: 'Best format picked per image' },
  { id: 'avif', label: 'Force AVIF', desc: 'Maximum compression, slower encode' },
  { id: 'keep', label: 'Keep Original', desc: 'Only compress, no format change' },
];

export default function Optimize() {
  const [files, setFiles] = useState([]);
  const [strategy, setStrategy] = useState('auto');
  const [folder, setFolder] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showStrategy, setShowStrategy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, successful: 0, failed: 0 });

  const handleFilesAdded = useCallback((newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResults(null);
    setSummary(null);
    setSelectedResult(null);
    setUploadDone(null);
  }, []);

  const handleOptimize = async () => {
    if (files.length === 0) return toast.error('Add some images first');

    setOptimizing(true);
    setResults(null);
    setSummary(null);
    setUploadDone(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('strategy', strategy);
    formData.append('folder', folder || '');

    try {
      const { data } = await API.post('/optimize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setResults(data.results);
      setSummary(data.summary);
      if (data.results.length > 0) {
        setSelectedResult(data.results[0]);
      }

      toast.success(`${data.results.length} images optimized!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    setDownloading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('includeAllFormats', 'true');
    formData.append('folder', folder || '');

    try {
      const response = await API.post('/optimize/download', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
        timeout: 120000,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'optimized-images.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch (err) {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadToCloudinary = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const total = files.length;
    let successful = 0;
    let failed = 0;
    setUploadProgress({ current: 0, total, successful: 0, failed: 0 });

    // Upload files one at a time — avoids rate limits and gives progress
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total, successful, failed });

      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('folder', folder || '');

      try {
        await API.post('/optimize/upload-single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60s per file
        });
        successful++;
      } catch (err) {
        failed++;
        console.error(`Failed to upload ${files[i].name}:`, err.response?.data?.error || err.message);
      }
    }

    setUploadProgress({ current: total, total, successful, failed });
    setUploadDone({ summary: { total, successful, failed } });

    if (failed === 0) {
      toast.success(`All ${successful} optimized files uploaded to Cloudinary!`);
    } else {
      toast(`${successful} uploaded, ${failed} failed`, { icon: '⚠️' });
    }
    setUploading(false);
  };

  const handleClear = () => {
    setFiles([]);
    setResults(null);
    setSummary(null);
    setSelectedResult(null);
    setUploadDone(null);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary-400" />
            Smart Optimizer
          </h1>
          <p className="text-dark-400 mt-1">
            Auto-optimize images for production — best format, size & fallbacks
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!results && <DropZone onFilesAdded={handleFilesAdded} disabled={optimizing} />}

      {/* File count & controls */}
      {files.length > 0 && !results && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card !p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-primary-400" />
              <span className="text-dark-200 font-medium">
                {files.length} image{files.length !== 1 ? 's' : ''} ready
              </span>
              <span className="text-xs text-dark-500">
                ({formatBytes(files.reduce((sum, f) => sum + f.size, 0))} total)
              </span>
            </div>
            <button onClick={handleClear} className="text-xs text-dark-500 hover:text-red-400 transition-colors">
              Clear all
            </button>
          </div>

          {/* Strategy selector */}
          <div>
            <button
              onClick={() => setShowStrategy(!showStrategy)}
              className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition-colors"
            >
              {showStrategy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Format Strategy: <span className="text-primary-400 font-medium">{STRATEGIES.find((s) => s.id === strategy)?.label}</span>
            </button>

            <AnimatePresence>
              {showStrategy && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-3 mt-3">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStrategy(s.id)}
                        className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                          strategy === s.id
                            ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                            : 'border-dark-700 bg-dark-800/30 text-dark-400 hover:border-dark-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            strategy === s.id ? 'border-primary-400 bg-primary-400' : 'border-dark-600'
                          }`} />
                          <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-dark-500 mt-1 ml-5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Optimize button */}
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-4 text-base"
          >
            {optimizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Optimizing {files.length} images...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Optimize {files.length} Image{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Results */}
      {results && summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Top bar: savings + actions side by side */}
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <SavingsBar summary={summary} />
            </div>
            <div className="rounded-2xl p-6 border border-white/10 bg-dark-800/90 overflow-visible flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">What's next?</h3>
                <p className="text-xs text-dark-400">Download optimized files or upload directly to your Cloudinary account</p>
              </div>

              {/* Upload done status */}
              {uploadDone && (
                <div className="p-3 rounded-xl bg-dark-800/50 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">
                      {uploadDone.summary.successful} uploaded to Cloudinary
                    </span>
                  </div>
                  {uploadDone.summary.failed > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">{uploadDone.summary.failed} failed</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* Folder selector — pick folder before uploading */}
                <FolderSelector value={folder} onChange={setFolder} disabled={uploading} />

                {/* Upload to Cloudinary */}
                <button
                  onClick={handleUploadToCloudinary}
                  disabled={uploading || (uploadDone?.summary.successful > 0)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {uploadProgress.current}/{uploadProgress.total}...
                    </>
                  ) : uploadDone?.summary.successful > 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Uploaded to Cloudinary
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      Upload to Cloudinary
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button onClick={handleDownloadZip} disabled={downloading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download ZIP
                  </button>
                  <button onClick={handleClear} className="flex-1 btn-secondary flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    New Batch
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Image selector — wider grid */}
          <div className="relative z-0">
            <h3 className="text-lg font-semibold text-white mb-3">Results per image</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedResult(r)}
                  className={`glass-card !p-2 text-left transition-all ${
                    selectedResult === r
                      ? 'border-primary-500/50 shadow-glow'
                      : 'hover:border-dark-600'
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-dark-800 mb-2">
                    {r.originalBase64 ? (
                      <img src={r.originalBase64} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-dark-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-dark-300 truncate">{r.fileName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-dark-500">{formatBytes(r.originalSize)}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      -{r.best?.savingsPercent || 0}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected image detail — full width two-column layout */}
          {selectedResult && (
            <motion.div
              key={selectedResult.fileName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Left: diff slider */}
              <div className="space-y-4">
                {/* Strategy info */}
                <div className="glass-card !p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-dark-200">{selectedResult.fileName}</p>
                    <p className="text-xs text-dark-400 mt-1">{selectedResult.strategy?.reason}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(selectedResult.variants || []).map((v) => (
                        <span
                          key={v.format}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            v.format === selectedResult.best?.format
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-dark-800/50 text-dark-500 border border-dark-700'
                          }`}
                        >
                          .{v.format} — {formatBytes(v.size)}{' '}
                          {v.format === selectedResult.best?.format && '★'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Diff slider */}
                {selectedResult.originalBase64 && selectedResult.bestBase64 && (
                  <DiffSlider
                    originalSrc={selectedResult.originalBase64}
                    optimizedSrc={selectedResult.bestBase64}
                    originalSize={selectedResult.originalSize}
                    optimizedSize={selectedResult.best?.size}
                    originalFormat={selectedResult.analysis?.format}
                    optimizedFormat={selectedResult.best?.format}
                  />
                )}
              </div>

              {/* Right: code snippets */}
              <div>
                {selectedResult.snippets && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-300 mb-2">Copy-paste ready code</h3>
                    <CodeSnippet snippets={selectedResult.snippets} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
