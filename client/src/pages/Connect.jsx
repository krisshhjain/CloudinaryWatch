import { useState, useEffect } from 'react';
import { InlineGlitchLoader } from '../components/GlitchLoader';
import { API } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Link2,
  Link2Off,
  Cloud,
  Key,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Connect() {
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [connected, setConnected] = useState(false);
  const [savedCreds, setSavedCreds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const fetchCreds = async () => {
      try {
        const { data } = await API.get('/cloudinary/credentials');
        if (data.connected) {
          setConnected(true);
          setSavedCreds(data.credentials);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreds();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post('/cloudinary/credentials', {
        cloudName,
        apiKey,
        apiSecret,
      });
      setConnected(true);
      setSavedCreds(data.credentials);
      setApiSecret('');
      toast.success('Cloudinary account connected!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await API.delete('/cloudinary/credentials');
      setConnected(false);
      setSavedCreds(null);
      setCloudName('');
      setApiKey('');
      setApiSecret('');
      toast.success('Cloudinary account disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return <InlineGlitchLoader />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="page-header">Connect Cloudinary</h1>
        <p className="text-dark-400 mt-1">
          Link your Cloudinary account to start uploading and managing assets
        </p>
      </div>

      {/* Connection status */}
      {connected && savedCreds && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card !p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 border-emerald-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Connected</h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-dark-400" />
                  <span className="text-sm text-dark-300">Cloud: </span>
                  <span className="text-sm text-white font-medium">{savedCreds.cloudName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-dark-400" />
                  <span className="text-sm text-dark-300">API Key: </span>
                  <span className="text-sm text-white font-medium">{savedCreds.apiKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-dark-400" />
                  <span className="text-sm text-dark-300">API Secret: </span>
                  <span className="text-sm text-emerald-400 font-medium">•••••••• (encrypted)</span>
                </div>
              </div>
              <p className="text-xs text-dark-500 mt-3">
                Connected {new Date(savedCreds.connectedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setConnected(false);
                setCloudName(savedCreds.cloudName);
                setApiKey(savedCreds.apiKey);
              }}
              className="btn-secondary text-sm"
            >
              Update Credentials
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn-danger text-sm flex items-center gap-2"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2Off className="w-4 h-4" />
              )}
              Disconnect
            </button>
          </div>
        </motion.div>
      )}

      {/* Connect form */}
      {!connected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card !p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Enter Cloudinary Credentials</h3>
              <p className="text-xs text-dark-500">
                Find these in your Cloudinary Dashboard → Settings → Access Keys
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Cloud Name</label>
              <div className="relative">
                <Cloud className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="your-cloud-name"
                  required
                  className="input-field !pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">API Key</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="123456789012345"
                  required
                  className="input-field !pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">API Secret</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="input-field !pl-10 !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-dark-500 mt-1.5">
                🔐 Your API secret is encrypted with AES-256 before storage. It is never exposed to the frontend.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Connect Account
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Security note */}
      <div className="glass-card !p-4 bg-dark-900/50 border-dark-800/30">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-dark-200">Security Information</p>
            <ul className="text-xs text-dark-400 mt-2 space-y-1 list-disc list-inside">
              <li>API secrets are encrypted with AES-256-CBC before storage</li>
              <li>Secrets are never sent to the frontend</li>
              <li>Credentials are used only server-side for file uploads</li>
              <li>You can disconnect your account at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
