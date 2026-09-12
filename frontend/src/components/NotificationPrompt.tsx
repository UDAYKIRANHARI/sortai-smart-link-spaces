import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';

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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      const currentPerm = Notification.permission;
      setPermission(currentPerm);
      const isDismissed = localStorage.getItem('sortai_push_dismissed') === 'true';
      if (currentPerm === 'granted' || isDismissed) {
        setDismissed(true);
      }
    }
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Push notifications are not supported by this browser.');
      return;
    }

    setIsSubmitting(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        // 1. Fetch public VAPID key
        const res = await fetch(`${apiUrl}/api/notifications/vapid-key`);
        const { publicKey } = await res.json();

        // 2. Register push subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 3. Send subscription to backend
        const token = await getIdToken();
        await fetch(`${apiUrl}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        });

        localStorage.setItem('sortai_push_enabled', 'true');
        // Auto-dismiss popup immediately after enabled
        setTimeout(() => setDismissed(true), 1200);
      }
    } catch (e) {
      console.error('[NotificationPrompt] Error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('sortai_push_dismissed', 'true');
    setDismissed(true);
  };

  // Hide popup banner if granted, dismissed, or unsupported
  if (dismissed || permission === 'granted' || !('Notification' in window)) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-3 rounded-xl bg-sortai-jet/90 border border-sortai-slate/20 p-3.5 shadow-lg backdrop-blur-md transition-all animate-slide-up relative z-20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-sortai-white">
              Enable Daily Commute Highlights?
            </h4>
            <p className="text-[11px] text-sortai-slate leading-tight mt-0.5">
              Get lockscreen notifications on your phone for morning commute reading.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={enableNotifications}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isSubmitting ? 'Enabling...' : 'Enable'}
          </button>

          <button
            onClick={handleDismiss}
            className="text-sortai-slate hover:text-sortai-white p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
