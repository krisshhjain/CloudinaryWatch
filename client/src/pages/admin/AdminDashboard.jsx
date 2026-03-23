import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Upload,
  Database,
  TrendingUp,
  UserPlus,
  Clock,
  Activity,
  HardDrive,
  Calendar,
  BarChart3,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Format bytes to human readable
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Simple bar chart component
const SimpleBarChart = ({ data, title }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="glass-card !p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-red-400" />
        {title}
      </h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col justify-end h-32">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="w-full bg-gradient-to-t from-red-500 to-orange-500 rounded-t-lg min-h-[4px]"
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-dark-500">{d.date?.slice(5) || d.label}</p>
              <p className="text-xs font-medium text-dark-300">{d.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Stats cards configuration
  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      gradient: 'from-primary-500 to-primary-600',
      description: `+${stats?.newUsersThisWeek || 0} this week`,
    },
    {
      label: 'Total Uploads',
      value: stats?.totalUploads || 0,
      icon: Upload,
      gradient: 'from-emerald-500 to-emerald-600',
      description: `${stats?.uploadsToday || 0} today`,
    },
    {
      label: 'Storage Used',
      value: formatBytes(stats?.totalStorageUsed || 0),
      icon: HardDrive,
      gradient: 'from-violet-500 to-violet-600',
      description: 'Across all users',
      isText: true,
    },
    {
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: Activity,
      gradient: 'from-amber-500 to-amber-600',
      description: 'Last 7 days',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-dark-400 mt-1">Platform overview and analytics</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            className="glass-card !p-5 hover:border-red-500/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-3xl font-bold text-white ${card.isText ? 'text-2xl' : ''}`}>
                  {card.value}
                </p>
                <p className="text-sm text-dark-400 mt-1">{card.label}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-dark-500 mt-3 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {card.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploads Chart */}
        {stats?.last7DaysUploads && stats.last7DaysUploads.length > 0 && (
          <SimpleBarChart data={stats.last7DaysUploads} title="Uploads (Last 7 Days)" />
        )}

        {/* Quick Stats */}
        <div className="glass-card !p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-red-400" />
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
              <span className="text-dark-400">Total Login Records</span>
              <span className="text-white font-semibold">{stats?.totalLoginRecords || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
              <span className="text-dark-400">New Users This Week</span>
              <span className="text-emerald-400 font-semibold">+{stats?.newUsersThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
              <span className="text-dark-400">Uploads Today</span>
              <span className="text-amber-400 font-semibold">{stats?.uploadsToday || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
              <span className="text-dark-400">Active Users (7d)</span>
              <span className="text-primary-400 font-semibold">{stats?.activeUsers || 0}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Users */}
      <motion.div variants={item}>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-red-400" />
          Recent Signups
        </h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentUsers || []).map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold">
                        {user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-dark-200">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-dark-300">{user.email}</td>
                  <td>
                    <span className="flex items-center gap-1.5 text-dark-400 text-sm">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <tr>
                  <td colSpan={3} className="text-center text-dark-500 py-8">
                    No users registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
