import { useState, useEffect, useRef } from 'react';
import { API } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  FolderPlus,
  ChevronDown,
  Loader2,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FolderSelector({ value, onChange, disabled }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/folders');
      setFolders(data.folders || []);
    } catch (err) {
      // Don't show error on initial load — user may not have Cloudinary connected
      if (err.response?.status !== 400) {
        console.error('Failed to fetch folders:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (folderPath) => {
    onChange(folderPath);
    setIsOpen(false);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const { data } = await API.post('/folders', { folderName: name });
      toast.success(`Folder "${data.folder.name}" created`);
      await fetchFolders();
      onChange(data.folder.path);
      setNewFolderName('');
      setShowCreate(false);
      setIsOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreateFolder();
    if (e.key === 'Escape') {
      setShowCreate(false);
      setNewFolderName('');
    }
  };

  const displayValue = value || 'Root (no folder)';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-dark-300">
        <FolderOpen className="w-4 h-4 inline mr-1.5" />
        Cloudinary Folder
      </label>

      <div className="flex gap-2">
        {/* Dropdown */}
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="input-field w-full text-left flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={value ? 'text-dark-200' : 'text-dark-500'}>
              {loading ? 'Loading folders...' : displayValue}
            </span>
            <div className="flex items-center gap-1.5">
              {loading ? (
                <Loader2 className="w-4 h-4 text-dark-500 animate-spin" />
              ) : (
                <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              )}
            </div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-[999] w-full mt-1 bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
              >
                {/* Create new folder — at the top */}
                <div className="border-b border-dark-700">
                  {showCreate ? (
                    <div className="p-2 flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name"
                        autoFocus
                        className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-dark-200 placeholder-dark-500 outline-none focus:border-primary-500"
                      />
                      <button
                        onClick={handleCreateFolder}
                        disabled={creating || !newFolderName.trim()}
                        className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                      >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setShowCreate(false); setNewFolderName(''); }}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowCreate(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 text-primary-400 hover:bg-primary-500/10 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Create new folder
                    </button>
                  )}
                </div>

                {/* Root option */}
                <button
                  onClick={() => handleSelect('')}
                  className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-dark-700/50 transition-colors ${
                    !value ? 'text-primary-400 bg-primary-500/10' : 'text-dark-300'
                  }`}
                >
                  {!value && <Check className="w-3.5 h-3.5" />}
                  <span className={!value ? '' : 'ml-5'}>Root (no folder)</span>
                </button>

                {/* Divider */}
                {folders.length > 0 && <div className="border-t border-dark-700" />}

                {/* Folder list */}
                {folders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => handleSelect(folder.path)}
                    className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-dark-700/50 transition-colors ${
                      value === folder.path ? 'text-primary-400 bg-primary-500/10' : 'text-dark-300'
                    }`}
                  >
                    {value === folder.path ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-dark-500" />
                    )}
                    {folder.name}
                  </button>
                ))}

                {folders.length === 0 && !loading && (
                  <div className="px-4 py-3 text-xs text-dark-500 text-center">
                    No folders found
                  </div>
                )}


              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchFolders}
          disabled={disabled || loading}
          title="Refresh folders"
          className="p-2.5 rounded-xl border border-dark-700 bg-dark-800/50 text-dark-400 hover:text-primary-400 hover:border-primary-500/30 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
