import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Upload,
  Images,
  History,
  Link2,
  ShieldCheck,
  Users,
  ClipboardList,
  LogOut,
  CloudCog,
  X,
  Sparkles,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/optimize', icon: Sparkles, label: 'Optimize' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/gallery', icon: Images, label: 'Gallery' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/connect', icon: Link2, label: 'Connect' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { to: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/login-history', icon: ClipboardList, label: 'Login History' },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
      isActive
        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20 shadow-inner-glow'
        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3 border-b border-dark-800/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
          <CloudCog className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">CloudinaryWatch</h1>
          <p className="text-[10px] text-dark-500 uppercase tracking-widest">Asset Manager</p>
        </div>
        {/* Mobile close */}
        <button onClick={onClose} className="ml-auto lg:hidden text-dark-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4">
        <div className="glass-card !p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark-100 truncate">{user?.name}</p>
            <p className="text-[11px] text-dark-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-[10px] font-semibold text-dark-500 uppercase tracking-widest">
          Main
        </p>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onClose}>
            <item.icon className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-dark-800/50" />
            <p className="px-4 py-2 text-[10px] font-semibold text-dark-500 uppercase tracking-widest">
              Admin
            </p>
            {adminItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onClose} end={item.to === '/admin'}>
                <item.icon className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-dark-800/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-dark-900/80 backdrop-blur-xl border-r border-dark-800/50 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-dark-900/95 backdrop-blur-xl border-r border-dark-800/50 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
