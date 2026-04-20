import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const fetchWithRetry = async (fn, maxWaitMs = 60000) => {
  const start = Date.now();
  while (true) {
    try {
      return await fn();
    } catch {
      if (Date.now() - start > maxWaitMs) throw new Error('timeout');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let timer;
    const check = async () => {
      try {
        const u = await api.me();
        setUser(u);
        setLoading(false);
      } catch {
        // サーバーがスリープ中 → ウォームアップ待ち
        setWaking(true);
        try {
          const u = await fetchWithRetry(() => api.me(), 90000);
          setUser(u);
        } catch {
          setUser(null);
        } finally {
          setWaking(false);
          setLoading(false);
        }
      }
    };
    check();
    return () => clearTimeout(timer);
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return { user, loading, waking, login, logout, setUser };
};
