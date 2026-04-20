import { useState } from 'react';
import { api } from '../api/client.js';

const LoginPage = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // 'login' | 'forgot-email' | 'forgot-otp'
  const [view, setView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setView('forgot-otp');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (newPassword !== confirmPassword) return setForgotError('パスワードが一致しません');
    setForgotLoading(true);
    try {
      await api.resetPassword(otp, newPassword);
      setResetDone(true);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
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

  if (view === 'forgot-email') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {header}
          <div className="bg-white rounded-2xl shadow-xl p-8 ring-1 ring-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-1">パスワードをリセット</h2>
            <p className="text-sm text-gray-500 mb-5">登録済みのメールアドレスを入力してください。登録された電話番号にSMSでコードを送ります。</p>
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                {forgotLoading ? '送信中...' : 'SMSコードを送信'}
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

  if (view === 'forgot-otp') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {header}
          <div className="bg-white rounded-2xl shadow-xl p-8 ring-1 ring-gray-100">
            {resetDone ? (
              <div className="text-center space-y-4">
                <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl px-4 py-4 text-sm text-emerald-700">
                  <p className="font-semibold mb-1">パスワードを変更しました</p>
                  <p>新しいパスワードでログインしてください。</p>
                </div>
                <button
                  onClick={() => { setView('login'); setResetDone(false); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition shadow-md shadow-indigo-200 text-sm"
                >
                  ログイン画面へ
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-1">認証コードを入力</h2>
                <p className="text-sm text-gray-500 mb-5">SMSに届いた6桁のコードと新しいパスワードを入力してください。</p>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMSコード（6桁）</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white tracking-widest text-center text-lg"
                      placeholder="123456"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">新しいパスワード</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
                      placeholder="6文字以上"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">パスワード（確認）</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
                      placeholder="もう一度入力"
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
                    {forgotLoading ? '更新中...' : 'パスワードを変更する'}
                  </button>
                </form>
                <div className="mt-5 text-center space-y-2">
                  <button onClick={() => setView('forgot-email')} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 block w-full">
                    コードを再送する
                  </button>
                  <button onClick={() => setView('login')} className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                    ログインに戻る
                  </button>
                </div>
              </>
            )}
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-md shadow-indigo-200 text-sm"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              アカウントをお持ちでない方は
              <button onClick={onRegister} className="text-indigo-600 hover:text-indigo-800 font-semibold ml-1 underline underline-offset-2">新規登録</button>
            </p>
            <button
              onClick={() => setView('forgot-email')}
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
