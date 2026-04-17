import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const VAPID_PUBLIC_KEY = 'BJ6oOX42z4_9lB1uOQrxolhNzC0iXAqeNJfoQPvW6vVNsRSSxqhkIgbX6GFsc5lz2Uzgz2HmuFQGCy_r9hz9ueQ';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const usePush = (user) => {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setStatus('subscribed');
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await api.saveSubscription(subscription.toJSON());
        setStatus('subscribed');
      } catch (err) {
        console.error('Push registration failed:', err);
        setStatus('error');
      }
    };

    register();
  }, [user]);

  return { status };
};
