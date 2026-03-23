import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Clock, RefreshCw, LogIn } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

export default function AdminLoginHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('adminToken');

  const fetchRecords = async (p = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/admin/login-history?page=${p}&limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Login history fetch error:', err);
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecords(page);
  }, [page]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords(page, false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Login Activity
          </h1>
          <p className="text-dark-400 mt-1">
            User login records ({pagination.total || 0} total)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-dark-300 hover:text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="glass-card text-center py-16">
          <ClipboardList className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 text-lg">No login records found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Method</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {record.userId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-dark-200 text-sm truncate">
                          {record.userId?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-dark-500 truncate">
                          {record.userId?.email || ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.method === 'google'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      <LogIn className="w-3 h-3" />
                      {record.method === 'google' ? 'Google' : 'Email'}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-dark-400 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(record.loginAt).toLocaleString()}
                    </span>
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
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 bg-dark-800 text-dark-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    pageNum === page
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(Math.min(pagination.pages, page + 1))}
            disabled={page === pagination.pages}
            className="px-3 py-2 bg-dark-800 text-dark-400 hover:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
