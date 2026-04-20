import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { usePush } from './hooks/usePush.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MemberPage from './pages/MemberPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { api } from './api/client.js';

const App = () => {
  const { user, loading, login, logout, setUser } = useAuth();
  const [page, setPage] = useState('login');
  usePush(user);


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
