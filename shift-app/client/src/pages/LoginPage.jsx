import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';

const LoginPage = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'login' | 'forgot' | 'forgot-result'
  const [view, setView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const warmingRef = useRef(false);

  useEffect(() => {
    if (warmingRef.current) return;
    warmingRef.current = true;
    const ping = async () => {
      while (true) {
        try {
          await fetch('/api/health');
          setServerReady(true);
          return;
        } catch {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    };
    ping();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const data = await api.forgotPassword(forgotEmail);
      setTempPassword(data.tempPassword);
      setView('forgot-result');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const header = (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg mb-4">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-800">シフト管理</h1>
    </div>
  );

  if (view === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {header}
          <div className="bg-white rounded-2xl shadow-xl p-8 ring-1 ring-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-1">パスワードをお忘れの方</h2>
            <p className="text-sm text-gray-500 mb-5">
              登録済みのメールアドレスを入力すると、仮パスワードが発行されます。仮パスワードの有効期限は<span className="font-medium">1時間</span>です。
            </p>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
                  placeholder="example@company.com"
                  required
                />
              </div>
              {forgotError && (
                <div className="bg-rose-50 text-rose-600 text-sm rounded-xl px-4 py-2.5 ring-1 ring-rose-200">{forgotError}</div>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-md shadow-indigo-200 text-sm"
              >
                {forgotLoading ? '発行中...' : '仮パスワードを発行する'}
              </button>
            </form>
            <div className="mt-5 text-center">
              <button onClick={() => setView('login')} className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                ログインに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'forgot-result') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {header}
          <div className="bg-white rounded-2xl shadow-xl p-8 ring-1 ring-gray-100 space-y-5">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mx-auto">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">仮パスワードが発行されました</p>
              <p className="text-xs text-gray-400">有効期限: 1時間</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 ring-1 ring-gray-200">
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl font-mono font-bold tracking-widest text-gray-900">{tempPassword}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition shrink-0"
                >
                  {copied ? 'コピー済み ✓' : 'コピー'}
                </button>
              </div>
            </div>
            <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700">この仮パスワードでログイン後、すぐにパスワードを変更してください。</p>
            </div>
            <button
              onClick={() => setView('login')}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition shadow-md shadow-indigo-200 text-sm"
            >
              ログイン画面へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {header}
        <div className="bg-white rounded-2xl shadow-xl p-8 ring-1 ring-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
                placeholder="example@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-600 text-sm rounded-xl px-4 py-2.5 ring-1 ring-rose-200">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {!serverReady && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 ring-1 ring-amber-200">
                <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                サーバー起動中... 完了後すぐログインできます
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !serverReady}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-md shadow-indigo-200 text-sm"
            >
              {loading ? 'ログイン中...' : serverReady ? 'ログイン' : '起動待ち...'}
            </button>
          </form>
          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              アカウントをお持ちでない方は
              <button onClick={onRegister} className="text-indigo-600 hover:text-indigo-800 font-semibold ml-1 underline underline-offset-2">新規登録</button>
            </p>
            <button
              onClick={() => setView('forgot')}
              className="text-xs text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition"
            >
              パスワードを忘れた方へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
