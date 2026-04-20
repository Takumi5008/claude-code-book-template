import { useState } from 'react';
import ShiftCalendar from '../components/ShiftCalendar.jsx';
import AccountSettings from '../components/AccountSettings.jsx';
import MtgAttendance from '../components/MtgAttendance.jsx';

const tabs = [
  { id: 'shift',   label: 'シフト入力',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { id: 'mtg',     label: 'MTG出欠',       icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { id: 'account', label: 'アカウント設定', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];

const MemberPage = ({ user, onLogout }) => {
  const [tab, setTab] = useState('shift');

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 bg-gradient-to-b from-indigo-600 to-violet-700 flex flex-col flex-shrink-0 shadow-xl">
        {/* Logo */}
        <div className="px-3 md:px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight truncate">シフト管理</p>
              <p className="text-indigo-200 text-xs truncate">{user.name}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 md:px-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{t.icon}</span>
              <span className="hidden md:block">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 md:px-3 py-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-200 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:block">ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {tab === 'shift'   && <ShiftCalendar user={user} />}
          {tab === 'mtg'     && <MtgAttendance />}
          {tab === 'account' && <AccountSettings user={user} />}
        </div>
      </main>
    </div>
  );
};

export default MemberPage;
