import { X, Download, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  spaceSummary: Record<string, number>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function SettingsModal({ onClose, spaceSummary }: SettingsModalProps) {
  const { user, getIdToken, logout } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_URL}/api/links?userId=${encodeURIComponent(user.uid)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch links');
      const data = await response.json();
      
      // Trigger JSON download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sortai-links-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export links. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (confirm('Are you sure you want to clear your local chat history? This cannot be undone.')) {
      setIsClearing(true);
      localStorage.removeItem(`sortai_chat_${user.uid}`);
      setTimeout(() => {
        setIsClearing(false);
        alert('Local chat history cleared successfully.');
        window.location.reload();
      }, 500);
    }
  };

  const totalLinks = Object.values(spaceSummary).reduce((sum, n) => sum + n, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md mx-4 glass-heavy rounded-2xl p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-md font-semibold text-sortai-white">User Settings</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-sortai-slate hover:text-sortai-white hover:bg-sortai-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Section 1: User Account */}
          <div className="p-4 rounded-xl bg-sortai-black/40 border border-sortai-slate/10">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sortai-slate mb-3">Account</h4>
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sortai-jet border border-sortai-slate/20 flex items-center justify-center text-sortai-silver">
                  ?
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-sortai-white">{user?.displayName || 'SortAi Member'}</p>
                <p className="text-xs text-sortai-slate">{user?.email || 'authenticated user'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Storage Statistics */}
          <div className="p-4 rounded-xl bg-sortai-black/40 border border-sortai-slate/10">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sortai-slate mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Space Stats
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-sortai-jet rounded-lg border border-sortai-slate/5">
                <span className="text-[11px] text-sortai-slate block">Saved Links</span>
                <span className="text-xl font-heading font-semibold text-sortai-white mt-1 block">{totalLinks}</span>
              </div>
              <div className="p-3 bg-sortai-jet rounded-lg border border-sortai-slate/5">
                <span className="text-[11px] text-sortai-slate block">Integration</span>
                <span className="text-xs font-semibold text-emerald-400 mt-2 block flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Data Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sortai-slate px-1">Actions</h4>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-sortai-white/[0.04] border border-sortai-slate/15
                         text-sm text-sortai-silver hover:text-sortai-white hover:border-sortai-slate/30 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export saved links (JSON)
              </span>
              {isExporting && <div className="w-4 h-4 border-2 border-sortai-slate border-t-sortai-white rounded-full animate-spin" />}
            </button>

            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-sortai-white/[0.04] border border-sortai-slate/15
                         text-sm text-sortai-silver hover:text-red-400 hover:border-red-500/25 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reset chat history cache
              </span>
              {isClearing && <div className="w-4 h-4 border-2 border-sortai-slate border-t-red-400 rounded-full animate-spin" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-sortai-slate/10 text-center">
          <p className="text-[10px] text-sortai-slate font-heading tracking-widest uppercase">
            SortAi v1.0.0 (BETA)
          </p>
        </div>
      </div>
    </div>
  );
}
