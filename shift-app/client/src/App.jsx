import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { usePush } from './hooks/usePush.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { api } from './api/client.js';

const App = () => {
  const { user, loading, waking, login, logout, setUser } = useAuth();
  const [page, setPage] = useState('login');
  usePush(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg mb-2">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex justify-center mb-3">
              <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            {waking ? (
              <>
                <p className="text-gray-700 font-medium">サーバーを起動中...</p>
                <p className="text-gray-400 text-sm mt-1">初回アクセス時は少しお待ちください</p>
              </>
            ) : (
              <p className="text-gray-500">読み込み中...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (page === 'register') {
      return (
        <RegisterPage
          onRegister={async (name, email, password) => {
            const u = await api.register(name, email, password);
            setUser(u);
          }}
          onBack={() => setPage('login')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={login}
        onRegister={() => setPage('register')}
      />
    );
  }

  if (user.role === 'admin') return <AdminPage user={user} onLogout={logout} />;
  return <MemberPage user={user} onLogout={logout} />;
};

export default App;
