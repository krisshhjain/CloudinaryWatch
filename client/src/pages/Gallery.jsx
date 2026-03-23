import { useState, useEffect } from 'react';
import { InlineGlitchLoader } from '../components/GlitchLoader';
import { API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Images,
  Trash2,
  ExternalLink,
  Search,
  Grid3x3,
  List,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Gallery() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchUploads = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await API.get(`/upload/history?page=${p}&limit=24`);
      setUploads(data.uploads);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads(page);
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset? This will also remove it from Cloudinary.')) return;
    setDeleting(id);
    try {
      await API.delete(`/upload/${id}`);
      setUploads((prev) => prev.filter((u) => u._id !== id));
      toast.success('Asset deleted');
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = search
    ? uploads.filter(
        (u) =>
          u.fileName.toLowerCase().includes(search.toLowerCase()) ||
          u.folder?.toLowerCase().includes(search.toLowerCase())
      )
    : uploads;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Gallery</h1>
          <p className="text-dark-400 mt-1">
            View and manage your uploaded assets ({pagination.total || 0} total)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="input-field !pl-9 !py-2 !text-sm w-64"
            />
          </div>
          <div className="flex rounded-xl border border-dark-700 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600/20 text-primary-400' : 'text-dark-500 hover:text-dark-300'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-600/20 text-primary-400' : 'text-dark-500 hover:text-dark-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <InlineGlitchLoader />
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-16">
          <Images className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 text-lg">No images found</p>
          <p className="text-dark-500 text-sm mt-1">
            {search ? 'Try a different search term' : 'Upload some files to see them here'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnimatePresence>
            {filtered.map((upload) => (
              <motion.div
                key={upload._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card !p-2 group"
              >
                <div
                  className="aspect-square rounded-lg overflow-hidden bg-dark-800 cursor-pointer relative"
                  onClick={() => setSelectedImage(upload)}
                >
                  <img
                    src={upload.secureUrl || upload.url}
                    alt={upload.fileName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-dark-300 truncate flex-1">{upload.fileName}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(upload._id); }}
                    disabled={deleting === upload._id}
                    className="p-1 rounded-md text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {deleting === upload._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Preview</th>
                <th>File Name</th>
                <th>Folder</th>
                <th>Size</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((upload) => (
                <tr key={upload._id}>
                  <td>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-800">
                      <img
                        src={upload.secureUrl || upload.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="font-medium">{upload.fileName}</td>
                  <td>
                    {upload.folder ? (
                      <span className="badge-info">{upload.folder}</span>
                    ) : (
                      <span className="text-dark-500">—</span>
                    )}
                  </td>
                  <td>{upload.bytes ? `${(upload.bytes / 1024).toFixed(1)} KB` : '—'}</td>
                  <td>{new Date(upload.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <a
                        href={upload.secureUrl || upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(upload._id)}
                        disabled={deleting === upload._id}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        {deleting === upload._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-dark-800 rounded-full flex items-center justify-center text-white hover:bg-dark-700 z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={selectedImage.secureUrl || selectedImage.url}
                alt={selectedImage.fileName}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
              <div className="mt-3 text-center">
                <p className="text-sm text-dark-200">{selectedImage.fileName}</p>
                {selectedImage.width && selectedImage.height && (
                  <p className="text-xs text-dark-500 mt-1">
                    {selectedImage.width} × {selectedImage.height}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
