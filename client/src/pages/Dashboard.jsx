import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { InlineGlitchLoader } from '../components/GlitchLoader';
import { motion } from 'framer-motion';
import {
  Upload,
  Images,
  Link2,
  TrendingUp,
  ArrowUpRight,
  CloudCog,
  Clock,
  CheckCircle2,
  XCircle,
  HardDrive,
  Wifi,
  Sparkles,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  FolderOpen,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const CHART_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function UsageGauge({ label, icon: Icon, used, limit, color }) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-xs font-medium text-dark-300">{label}</span>
      </div>
      <div className="text-center">
        <span className="text-[10px] text-dark-500">{formatBytes(used)} / {formatBytes(limit)}</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name.includes('Bytes') ? formatBytes(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [internalStats, setInternalStats] = useState(null);
  const [impressions, setImpressions] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [credRes, historyRes, usageRes, statsRes, impressionsRes] = await Promise.all([
          API.get('/cloudinary/credentials').catch(() => ({ data: { connected: false } })),
          API.get('/upload/history?limit=6').catch(() => ({ data: { uploads: [], pagination: {} } })),
          API.get('/cloudinary/usage').catch(() => ({ data: { connected: false } })),
          API.get('/cloudinary/stats').catch(() => ({ data: null })),
          API.get('/cloudinary/impressions').catch(() => ({ data: { data: [] } })),
        ]);

        const uploads = historyRes.data.uploads || [];
        setStats({
          totalUploads: historyRes.data.pagination?.total || 0,
          connected: credRes.data.connected,
          cloudName: credRes.data.credentials?.cloudName,
        });
        setRecentUploads(uploads);
        setUsage(usageRes.data.connected ? usageRes.data : null);
        setInternalStats(statsRes.data);
        setImpressions(impressionsRes.data.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return <InlineGlitchLoader />;
  }

  const overall = internalStats?.overall || {};

  const statCards = [
    {
      label: 'Total Uploads',
      value: overall.totalUploads || 0,
      icon: Upload,
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      label: 'Success Rate',
      value: `${overall.successRate || 0}%`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Total Storage',
      value: formatBytes(overall.totalBytes || 0),
      icon: HardDrive,
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      label: 'Avg File Size',
      value: formatBytes(overall.avgFileSize || 0),
      icon: BarChart3,
      gradient: 'from-violet-500 to-violet-600',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Dashboard</h1>
          <p className="text-dark-400 mt-1">
            Overview of your CloudinaryWatch activity
            {usage && <span className="text-primary-400 ml-1">· {usage.plan} plan</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/optimize" className="btn-secondary flex items-center gap-2 self-start">
            <Zap className="w-4 h-4" />
            Optimize
          </Link>
          <Link to="/upload" className="btn-primary flex items-center gap-2 self-start">
            <Upload className="w-4 h-4" />
            Upload
          </Link>
        </div>
      </motion.div>

      {/* Connect CTA */}
      {stats && !stats.connected && (
        <motion.div variants={item} className="rounded-2xl p-6 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Connect Your Cloudinary Account</h3>
              <p className="text-sm text-dark-400 mt-1">
                Enter your Cloudinary credentials to start uploading and managing assets.
              </p>
            </div>
            <Link to="/connect" className="btn-primary !bg-gradient-to-r !from-amber-500 !to-amber-600 flex items-center gap-2">
              Connect Now
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-sm text-dark-400">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Cloudinary Usage Gauges */}
      {usage && (
        <motion.div variants={item} className="rounded-2xl p-6 border border-white/10 bg-dark-800/90">
          <div className="flex items-center gap-2 mb-4">
            <CloudCog className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-bold text-white">Cloudinary Usage</h2>
            <span className="text-xs text-dark-500 ml-auto">
              {usage.resources} resources 
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <UsageGauge label="Storage" icon={HardDrive} used={usage.storage.used} limit={usage.storage.limit} color="#06b6d4" />
            <UsageGauge label="Bandwidth" icon={Wifi} used={usage.bandwidth.used} limit={usage.bandwidth.limit} color="#8b5cf6" />
            <UsageGauge label="Transforms" icon={Sparkles} used={usage.transformations.used} limit={usage.transformations.limit} color="#f59e0b" />
            <UsageGauge label="Credits" icon={CreditCard} used={usage.credits.used} limit={usage.credits.limit} color="#10b981" />
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Image Impressions Chart */}
        <motion.div variants={item} className="xl:col-span-2 rounded-2xl p-6 border border-white/10 bg-dark-800/90">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-bold text-white">Image Impressions</h2>
            <span className="text-xs text-dark-500 ml-auto">Last 7 days · Cloudinary</span>
          </div>
          {impressions.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={impressions}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTransforms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-dark-400">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorRequests)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#1e1b4b', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="transformations"
                  name="Transformations"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#colorTransforms)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#083344', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-dark-500 text-sm">
              Connect your Cloudinary account to see impressions
            </div>
          )}
        </motion.div>

        {/* Format Breakdown Donut */}
        <motion.div variants={item} className="rounded-2xl p-6 border border-white/10 bg-dark-800/90">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Formats</h2>
          </div>
          {internalStats?.formatBreakdown?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={internalStats.formatBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="format"
                    stroke="none"
                  >
                    {internalStats.formatBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                          <p className="font-semibold text-white">{d.format?.toUpperCase()}</p>
                          <p className="text-dark-400">{d.count} files · {formatBytes(d.bytes)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {internalStats.formatBreakdown.slice(0, 6).map((f, i) => (
                  <div key={f.format} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[10px] text-dark-400">{f.format?.toUpperCase()} ({f.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-dark-500 text-sm">
              No format data yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Folder Breakdown Bar Chart */}
      {internalStats?.folderBreakdown?.length > 0 && (
        <motion.div variants={item} className="rounded-2xl p-6 border border-white/10 bg-dark-800/90">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Storage by Folder</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={internalStats.folderBreakdown} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => formatBytes(v)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="folder"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={90}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                      <p className="font-semibold text-white">{d.folder}</p>
                      <p className="text-dark-400">{d.count} files · {formatBytes(d.bytes)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="bytes" name="Storage" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {internalStats.folderBreakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Uploads */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Uploads</h2>
          <Link to="/history" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {recentUploads.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-dark-800/90 text-center py-12">
            <Images className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">No uploads yet. Start by uploading some files!</p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Upload className="w-4 h-4" />
              Upload Files
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentUploads.map((upload) => (
              <div key={upload._id} className="rounded-2xl border border-white/10 bg-dark-800/90 p-2 group">
                <div className="aspect-square rounded-lg overflow-hidden bg-dark-900 mb-2">
                  <img
                    src={upload.secureUrl || upload.url}
                    alt={upload.fileName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <p className="text-xs text-dark-300 truncate px-1">{upload.fileName}</p>
                <div className="flex items-center gap-1 px-1 mt-1">
                  <Clock className="w-3 h-3 text-dark-500" />
                  <span className="text-[10px] text-dark-500">
                    {new Date(upload.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
