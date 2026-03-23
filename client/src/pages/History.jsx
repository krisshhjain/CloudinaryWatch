import { useState, useEffect } from 'react';
import { InlineGlitchLoader } from '../components/GlitchLoader';
import { API } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';

export default function History() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/upload/history?page=${page}&limit=30`);
        setUploads(data.uploads);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="page-header">Upload History</h1>
        <p className="text-dark-400 mt-1">
          A complete log of all your file uploads ({pagination.total || 0} total)
        </p>
      </div>

      {loading ? (
        <InlineGlitchLoader />
      ) : uploads.length === 0 ? (
        <div className="glass-card text-center py-16">
          <HistoryIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 text-lg">No upload history yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Preview</th>
                <th>File Name</th>
                <th>Folder</th>
                <th>Status</th>
                <th>Size</th>
                <th>Dimensions</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-800 flex items-center justify-center">
                      {u.secureUrl || u.url ? (
                        <img
                          src={u.secureUrl || u.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-dark-600" />
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-dark-200">{u.fileName}</p>
                      <p className="text-xs text-dark-500 mt-0.5">{u.publicId}</p>
                    </div>
                  </td>
                  <td>
                    {u.folder ? (
                      <span className="badge-info flex items-center gap-1 w-fit">
                        <FolderOpen className="w-3 h-3" />
                        {u.folder}
                      </span>
                    ) : (
                      <span className="text-dark-500">—</span>
                    )}
                  </td>
                  <td>
                    {u.status === 'success' ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="badge-danger flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td>{u.bytes ? `${(u.bytes / 1024).toFixed(1)} KB` : '—'}</td>
                  <td>
                    {u.width && u.height ? (
                      <span className="text-dark-400">{u.width}×{u.height}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-dark-400">
                      <Clock className="w-3 h-3" />
                      {new Date(u.createdAt).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </motion.div>
  );
}
