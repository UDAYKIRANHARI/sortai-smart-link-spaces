import { X, Download, ShieldCheck, Database, RefreshCw, Bell, Zap, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  spaceSummary: Record<string, number>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsModal({ onClose, spaceSummary }: SettingsModalProps) {
  const { user, getIdToken } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Push Notifications State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      const perm = Notification.permission === 'granted';
      const userPref = localStorage.getItem('sortai_push_disabled') !== 'true';
      setPushEnabled(perm && userPref);
    }
  }, []);

  const handleTogglePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Push notifications are not supported by this browser.');
      return;
    }

    setIsTogglingPush(true);
    setPushStatusMsg(null);

    try {
      if (pushEnabled) {
        // Disable Push
        localStorage.setItem('sortai_push_disabled', 'true');
        setPushEnabled(false);
        setPushStatusMsg('Push notifications disabled.');
      } else {
        // Enable Push
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          alert('Notification permission was denied in browser settings.');
          setPushEnabled(false);
          return;
        }

        // Fetch public key & subscribe
        const res = await fetch(`${API_URL}/api/notifications/vapid-key`);
        const { publicKey } = await res.json();

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const token = await getIdToken();
        await fetch(`${API_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        });

        localStorage.removeItem('sortai_push_disabled');
        localStorage.setItem('sortai_push_enabled', 'true');
        setPushEnabled(true);
        setPushStatusMsg('✓ Daily Commute Highlights enabled!');
      }
    } catch (e) {
      console.error('[SettingsModal] Push toggle error:', e);
      setPushStatusMsg('Failed to update notification settings.');
    } finally {
      setIsTogglingPush(false);
      setTimeout(() => setPushStatusMsg(null), 3500);
    }
  };

  const handleTestPush = async () => {
    setIsTogglingPush(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_URL}/api/notifications/trigger-daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPushStatusMsg('🔔 Test push notification sent!');
      } else {
        setPushStatusMsg(data.message || 'Push test failed.');
      }
    } catch {
      setPushStatusMsg('Failed to send test push.');
    } finally {
      setIsTogglingPush(false);
      setTimeout(() => setPushStatusMsg(null), 3500);
    }
  };

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
      <div className="relative w-full max-w-md mx-4 glass-heavy rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
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

          {/* Section 2: Notifications Setting */}
          <div className="p-4 rounded-xl bg-sortai-black/40 border border-sortai-slate/10">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sortai-slate flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                Notifications
              </h4>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${pushEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sortai-slate/10 text-sortai-slate'}`}>
                {pushEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-medium text-sortai-white">Daily Commute Highlights</p>
                <p className="text-[11px] text-sortai-slate">Receive morning highlights of your saved links on mobile.</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleTogglePush}
                disabled={isTogglingPush}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${pushEnabled ? 'bg-emerald-500' : 'bg-sortai-slate/30'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {pushEnabled && (
              <div className="mt-3 pt-3 border-t border-sortai-slate/10 flex items-center justify-between">
                <span className="text-[11px] text-sortai-slate">Test lockscreen push delivery:</span>
                <button
                  onClick={handleTestPush}
                  disabled={isTogglingPush}
                  className="px-2.5 py-1 rounded-lg bg-sortai-jet border border-sortai-slate/20 hover:border-emerald-500/40 text-[11px] font-medium text-sortai-silver hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-emerald-400" /> Test Push
                </button>
              </div>
            )}

            {pushStatusMsg && (
              <p className="text-[11px] text-emerald-400 font-medium mt-2">{pushStatusMsg}</p>
            )}
          </div>

          {/* Section 3: Storage Statistics */}
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

          {/* Section 4: Data Actions */}
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
