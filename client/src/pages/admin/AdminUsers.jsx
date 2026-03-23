import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Trash2,
  Eye,
  Loader2,
  Upload,
  HardDrive,
  Clock,
  AlertTriangle,
  LogIn,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Format bytes to human readable
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Delete confirmation modal
const DeleteModal = ({ isOpen, onClose, onConfirm, userName, loading }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
        >
          <div className="glass-card !border-red-500/30 !p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete User</h3>
                <p className="text-sm text-dark-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-dark-300 mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{userName}</span>?
              This will permanently remove their account and all usage records.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  const fetchUsers = async (p = 1, s = '') => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/admin/users?page=${p}&limit=20&search=${s}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Fetch users error:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const viewUser = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const openDeleteModal = (user) => {
    setDeleteModal({ open: true, user });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, user: null });
  };

  const deleteUser = async () => {
    if (!deleteModal.user) return;
    const userId = deleteModal.user._id;
    setDeleting(userId);
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('User deleted successfully');
      closeDeleteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
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
            User Management
          </h1>
          <p className="text-dark-400 mt-1">
            View user usage statistics ({pagination.total || 0} total users)
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="input-field !pl-9 !py-2 !text-sm w-64"
          />
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card !p-12 text-center">
          <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No users found</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Uploads</th>
                <th>Storage</th>
                <th>Logins</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-dark-200 truncate">{user.name}</p>
                        <p className="text-xs text-dark-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-dark-500" />
                      <span>{user.totalUploads || 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-dark-500" />
                      <span>{formatBytes(user.storageUsed)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5 text-dark-500" />
                      <span>{user.totalLogins || 0}</span>
                    </div>
                  </td>
                  <td>
                    {user.lastActive ? (
                      <div className="flex items-center gap-1.5 text-sm text-dark-400">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(user.lastActive).toLocaleDateString()}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewUser(user._id)}
                        className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                        title="View Usage Stats"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
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
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={deleteUser}
        userName={deleteModal.user?.name}
        loading={deleting === deleteModal.user?._id}
      />
    </motion.div>
  );
}
