import { useState } from 'react';
import ShiftCalendar from '../components/ShiftCalendar.jsx';
import AccountSettings from '../components/AccountSettings.jsx';

const tabs = [
  { id: 'shift',   label: 'シフト入力', icon: '📝' },
  { id: 'account', label: 'アカウント設定', icon: '⚙️' },
];

const MemberPage = ({ user, onLogout }) => {
  const [tab, setTab] = useState('shift');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">シフト管理</h1>
              <p className="text-indigo-200 text-xs">{user.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>

        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-white text-white'
                    : 'border-transparent text-indigo-200 hover:text-white hover:border-white/40'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {tab === 'shift' && <ShiftCalendar user={user} />}
        {tab === 'account' && <AccountSettings user={user} />}
      </main>
    </div>
  );
};

export default MemberPage;
