import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Upload,
  HardDrive,
  Clock,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
  Mail,
  LogIn,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Format bytes
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Simple activity chart component
const ActivityChart = ({ data, title, color = 'red' }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const gradients = {
    red: 'from-red-500 to-orange-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
  };

  return (
    <div className="glass-card !p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className={`w-4 h-4 text-${color}-400`} />
        {title}
      </h3>
      <div className="flex items-end gap-0.5 h-20">
        {data.slice(-30).map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / maxCount) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.02 }}
              className={`w-full bg-gradient-to-t ${gradients[color]} rounded-t min-h-[2px] max-h-full`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-dark-500 text-center mt-2">Last 30 days</p>
    </div>
  );
};

// Delete confirmation modal
const DeleteModal = ({ isOpen, onClose, onConfirm, userName, loading }) => (
  <>
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
            </p>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </>
);

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(data);
      } catch (err) {
        console.error('Fetch user error:', err);
        toast.error('Failed to load user data');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, token, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('User deleted successfully');
      navigate('/admin/users');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-400">User not found</p>
      </div>
    );
  }

  const { user, stats, activity } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* User header */}
      <div className="glass-card !p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-dark-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
              <p className="text-dark-500 text-sm mt-1">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDeleteModal(true)}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete User
          </button>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card !p-4">
          <Upload className="w-5 h-5 text-primary-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalUploads}</p>
          <p className="text-xs text-dark-400">Total Uploads</p>
        </div>
        <div className="glass-card !p-4">
          <HardDrive className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{formatBytes(stats.storageUsed)}</p>
          <p className="text-xs text-dark-400">Storage Used</p>
        </div>
        <div className="glass-card !p-4">
          <LogIn className="w-5 h-5 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalLogins}</p>
          <p className="text-xs text-dark-400">Total Logins</p>
        </div>
        <div className="glass-card !p-4">
          <Clock className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-lg font-bold text-white">{new Date(stats.lastActive).toLocaleDateString()}</p>
          <p className="text-xs text-dark-400">Last Active</p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="glass-card !p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-400" />
          Account Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-dark-800/50 rounded-xl">
            <p className="text-dark-500 text-xs mb-1">First Login</p>
            <p className="text-white">{new Date(stats.firstLogin).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-dark-800/50 rounded-xl">
            <p className="text-dark-500 text-xs mb-1">Last Active</p>
            <p className="text-white">{new Date(stats.lastActive).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-dark-800/50 rounded-xl">
            <p className="text-dark-500 text-xs mb-1">Preferred Login Method</p>
            <p className="text-white capitalize">{stats.preferredLoginMethod}</p>
          </div>
          <div className="p-3 bg-dark-800/50 rounded-xl">
            <p className="text-dark-500 text-xs mb-1">Account Created</p>
            <p className="text-white">{new Date(user.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activity?.uploads?.length > 0 && (
          <ActivityChart data={activity.uploads} title="Upload Activity" color="green" />
        )}
        {activity?.logins?.length > 0 && (
          <ActivityChart data={activity.logins} title="Login Activity" color="blue" />
        )}
      </div>

      {/* No activity message */}
      {(!activity?.uploads?.length && !activity?.logins?.length) && (
        <div className="glass-card !p-8 text-center">
          <Calendar className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No recent activity in the last 30 days</p>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        userName={user.name}
        loading={deleting}
      />
    </motion.div>
  );
}
