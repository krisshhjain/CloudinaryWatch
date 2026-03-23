import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Code2, Image as ImageIcon, Paintbrush } from 'lucide-react';

const tabs = [
  { id: 'html', label: 'HTML', icon: Code2, desc: '<picture> tag' },
  { id: 'nextjs', label: 'Next.js', icon: ImageIcon, desc: '<Image />' },
  { id: 'css', label: 'CSS', icon: Paintbrush, desc: 'background' },
];

export default function CodeSnippet({ snippets }) {
  const [activeTab, setActiveTab] = useState('html');
  const [copied, setCopied] = useState(false);

  if (!snippets) return null;

  const code = snippets[activeTab] || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-dark-800/50 bg-dark-900/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab.id
                ? 'text-primary-400'
                : 'text-dark-500 hover:text-dark-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-[10px] text-dark-600 hidden md:inline">({tab.desc})</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
              />
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-lg text-xs font-medium transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-700/50'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="p-4 overflow-x-auto"
        >
          <pre className="text-sm text-dark-200 font-mono leading-relaxed whitespace-pre-wrap break-all">
            <code>{code}</code>
          </pre>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
