import { useState } from 'react';

const LoginPage = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">シフト管理</h1>
          <p className="text-gray-500 mt-1 text-sm">アカウントにログインしてください</p>
        </div>

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
              onClick={() => setShowForgot(f => !f)}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              パスワードを忘れた方へ
            </button>
            {showForgot && (
              <div className="bg-amber-50 ring-1 ring-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 text-left">
                管理者にパスワードのリセットを依頼してください。管理者がユーザー管理画面からリセットできます。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
