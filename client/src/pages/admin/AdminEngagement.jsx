import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  TrendingUp,
  Upload,
  BarChart3,
  Calendar,
  Target,
  Award,
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

// Simple bar chart component
const BarChart = ({ data, title, icon: Icon, color = 'red' }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const gradients = {
    red: 'from-red-500 to-orange-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-violet-500 to-purple-500',
  };

  return (
    <div className="glass-card !p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Icon className={`w-5 h-5 text-${color}-400`} />
        {title}
      </h3>
      <div className="flex items-end gap-1 h-32">
        {data.slice(-14).map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / maxCount) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              className={`w-full bg-gradient-to-t ${gradients[color]} rounded-t min-h-[2px] max-h-full`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-dark-500">{data[0]?._id?.slice(5) || ''}</span>
        <span className="text-xs text-dark-500">{data[data.length - 1]?._id?.slice(5) || ''}</span>
      </div>
    </div>
  );
};

export default function AdminEngagement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get(`${API_URL}/admin/engagement`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(data);
      } catch (err) {
        console.error('Engagement fetch error:', err);
        toast.error('Failed to load engagement data');
      } finally {
        setLoading(false);
      }
    };
    fetchEngagement();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Stat cards - only aggregate metrics
  const engagementCards = [
    {
      label: 'Daily Active Users',
      value: data?.dau || 0,
      icon: Users,
      color: 'from-red-500 to-orange-500',
      description: 'Today',
    },
    {
      label: 'Weekly Active Users',
      value: data?.wau || 0,
      icon: Activity,
      color: 'from-blue-500 to-cyan-500',
      description: 'Last 7 days',
    },
    {
      label: 'Monthly Active Users',
      value: data?.mau || 0,
      icon: Calendar,
      color: 'from-violet-500 to-purple-500',
      description: 'Last 30 days',
    },
    {
      label: 'Avg Uploads/User',
      value: data?.avgUploadsPerUser || 0,
      icon: Upload,
      color: 'from-emerald-500 to-teal-500',
      description: 'All time',
    },
    {
      label: 'Retention Rate',
      value: `${data?.retentionRate || 0}%`,
      icon: Target,
      color: 'from-amber-500 to-yellow-500',
      description: 'Returning users',
      isText: true,
    },
    {
      label: 'Total Users',
      value: data?.totalUsers || 0,
      icon: TrendingUp,
      color: 'from-pink-500 to-rose-500',
      description: 'Platform wide',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Engagement Analytics
        </h1>
        <p className="text-dark-400 mt-1">Track platform usage and engagement metrics</p>
      </motion.div>

      {/* Engagement cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {engagementCards.map((card) => (
          <motion.div key={card.label} variants={item} className="glass-card !p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-2xl font-bold text-white ${card.isText ? 'text-xl' : ''}`}>{card.value}</p>
            <p className="text-xs text-dark-400 mt-1">{card.label}</p>
            <p className="text-xs text-dark-500">{card.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Chart */}
        {data?.dailyActiveUsers?.length > 0 && (
          <BarChart
            data={data.dailyActiveUsers}
            title="Daily Active Users (30 days)"
            icon={Users}
            color="blue"
          />
        )}

        {/* Daily Uploads Chart */}
        {data?.dailyUploads?.length > 0 && (
          <BarChart
            data={data.dailyUploads}
            title="Daily Uploads (30 days)"
            icon={Upload}
            color="green"
          />
        )}
      </motion.div>

      {/* User Growth & Top Users */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        {data?.userGrowth?.length > 0 && (
          <BarChart
            data={data.userGrowth}
            title="New User Signups (30 days)"
            icon={TrendingUp}
            color="purple"
          />
        )}

        {/* Top Active Users - only shows name and upload count */}
        <div className="glass-card !p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Most Active Users
          </h3>
          <div className="space-y-3">
            {(data?.topActiveUsers || []).slice(0, 5).map((user, i) => (
              <div key={user._id} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-amber-500 text-dark-950' :
                  i === 1 ? 'bg-dark-300 text-dark-950' :
                  i === 2 ? 'bg-amber-700 text-white' :
                  'bg-dark-700 text-dark-300'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                </div>
                <div className="flex items-center gap-1.5 text-dark-400">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{user.uploadCount}</span>
                </div>
              </div>
            ))}
            {(!data?.topActiveUsers || data.topActiveUsers.length === 0) && (
              <p className="text-dark-500 text-sm text-center py-4">No activity data yet</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={item}>
        <div className="glass-card !p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-400" />
            Platform Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-dark-800/50 text-center">
              <p className="text-2xl font-bold text-white">{data?.totalUsers || 0}</p>
              <p className="text-xs text-dark-400 mt-1">Total Users</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/50 text-center">
              <p className="text-2xl font-bold text-emerald-400">{data?.mau || 0}</p>
              <p className="text-xs text-dark-400 mt-1">Monthly Active</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/50 text-center">
              <p className="text-2xl font-bold text-amber-400">{data?.retentionRate || 0}%</p>
              <p className="text-xs text-dark-400 mt-1">Retention</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/50 text-center">
              <p className="text-2xl font-bold text-cyan-400">{data?.avgUploadsPerUser || 0}</p>
              <p className="text-xs text-dark-400 mt-1">Avg Uploads/User</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
