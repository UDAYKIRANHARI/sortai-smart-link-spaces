import React, { useState, useEffect } from 'react';
import { Bell, Check, Zap, X } from 'lucide-react';

export interface NotificationPromptProps {
  getIdToken: () => Promise<string | null>;
  apiUrl: string;
}

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

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  getIdToken,
  apiUrl,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Push notifications are not supported by this browser.');
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setStatusMsg('Notification permission denied.');
        return;
      }

      // 1. Fetch public VAPID key from backend
      const res = await fetch(`${apiUrl}/api/notifications/vapid-key`);
      const { publicKey } = await res.json();

      // 2. Wait for service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe via pushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Send subscription to backend
      const token = await getIdToken();
      await fetch(`${apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      setStatusMsg('✓ Daily Commute Highlights enabled!');
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e) {
      console.error('[NotificationPrompt] Error:', e);
      setStatusMsg('Failed to enable push notifications.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerTestPush = async () => {
    setIsSubmitting(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${apiUrl}/api/notifications/trigger-daily`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('🔔 Test push notification sent to your device!');
      } else {
        setStatusMsg(data.message || 'Push test failed.');
      }
    } catch {
      setStatusMsg('Network error sending test push.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  if (dismissed || !('Notification' in window)) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-3 rounded-xl bg-sortai-jet/80 border border-sortai-slate/20 p-3 shadow-lg backdrop-blur-md transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-sortai-white">
                Daily Commute Highlights
              </h4>
              {permission === 'granted' && (
                <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-sortai-slate leading-tight mt-0.5">
              {permission === 'granted'
                ? 'Your phone receives daily morning highlights of your saved links.'
                : 'Get daily lockscreen notifications on your phone for morning commute reading.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {permission === 'granted' ? (
            <button
              onClick={triggerTestPush}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-sortai-black border border-sortai-slate/20 hover:border-emerald-500/40 text-xs font-medium text-sortai-silver hover:text-sortai-white transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              Test Push
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3 h-3" />
              {isSubmitting ? 'Enabling...' : 'Enable'}
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-sortai-slate hover:text-sortai-white p-1"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="mt-2 text-[11px] text-emerald-400 font-medium px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
