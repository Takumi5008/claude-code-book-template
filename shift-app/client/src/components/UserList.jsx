import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const UserList = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);

  const load = () => {
    setLoading(true);
    api.getUsers().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin';
    setUpdating(user.id);
    try {
      await api.updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`「${user.name}」を削除しますか？この操作は元に戻せません。`)) return;
    setUpdating(user.id);
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-800">ユーザー管理</h3>
        {!loading && (
          <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{users.length}人</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-indigo-50/50 transition">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  user.role === 'admin' ? 'bg-violet-200 text-violet-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {user.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
                {user.id !== currentUserId && (
                  <>
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={updating === user.id}
                      className="text-xs text-indigo-600 hover:text-white hover:bg-indigo-600 disabled:opacity-50 border border-indigo-300 px-3 py-1.5 rounded-lg transition font-medium"
                    >
                      {updating === user.id ? '...' : user.role === 'admin' ? 'メンバーに変更' : '管理者に変更'}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={updating === user.id}
                      className="text-xs text-rose-500 hover:text-white hover:bg-rose-500 disabled:opacity-50 border border-rose-300 px-3 py-1.5 rounded-lg transition font-medium"
                    >
                      削除
                    </button>
                  </>
                )}
                {user.id === currentUserId && (
                  <span className="text-xs text-gray-400 italic">（自分）</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;
