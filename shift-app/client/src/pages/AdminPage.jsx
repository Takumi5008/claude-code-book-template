import { useState } from 'react';
import AdminTable from '../components/AdminTable.jsx';
import DeadlineForm from '../components/DeadlineForm.jsx';
import UnsubmittedList from '../components/UnsubmittedList.jsx';
import UserList from '../components/UserList.jsx';
import AccountSettings from '../components/AccountSettings.jsx';
import AdminShiftEditor from '../components/AdminShiftEditor.jsx';
import ShiftCalendar from '../components/ShiftCalendar.jsx';
import MtgAttendance from '../components/MtgAttendance.jsx';
import MtgTable from '../components/MtgTable.jsx';

const tabs = [
  { id: 'myshift', label: 'シフト入力',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )},
  { id: 'shift',   label: 'シフト一覧',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { id: 'mtg',     label: 'MTG出欠',       icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { id: 'users',   label: 'ユーザー管理',  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )},
  { id: 'edit',    label: 'シフト編集',    icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { id: 'account', label: 'アカウント設定', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
];

const AdminPage = ({ user, onLogout }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState('shift');

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

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
              <p className="text-indigo-200 text-xs truncate">{user.name}（管理者）</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 md:px-3 space-y-1 overflow-y-auto">
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
        <div className="max-w-5xl mx-auto px-4 py-6">
          {tab === 'myshift' && (
            <div className="max-w-lg mx-auto">
              <ShiftCalendar user={user} />
            </div>
          )}

          {tab === 'shift' && (
            <>
              <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">◀</button>
                <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{year}年 {month}月</span>
                <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">▶</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="lg:col-span-2">
                  <DeadlineForm year={year} month={month} />
                </div>
                <div>
                  <UnsubmittedList year={year} month={month} />
                </div>
              </div>
              <AdminTable year={year} month={month} />
            </>
          )}

          {tab === 'mtg' && (
            <div className="space-y-6">
              <div className="max-w-lg mx-auto">
                <MtgAttendance />
              </div>
              <MtgTable />
            </div>
          )}

          {tab === 'users'   && <UserList currentUserId={user.id} />}
          {tab === 'edit'    && <AdminShiftEditor />}
          {tab === 'account' && <AccountSettings user={user} />}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
