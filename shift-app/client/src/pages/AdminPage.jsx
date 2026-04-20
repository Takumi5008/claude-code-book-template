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
  { id: 'myshift', label: 'シフト入力', icon: '📝' },
  { id: 'shift',   label: 'シフト一覧', icon: '📋' },
  { id: 'mtg',     label: 'MTG出欠', icon: '🤝' },
  { id: 'users',   label: 'ユーザー管理', icon: '👥' },
  { id: 'edit',    label: 'シフト編集', icon: '✏️' },
  { id: 'account', label: 'アカウント設定', icon: '⚙️' },
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">シフト管理</h1>
              <p className="text-indigo-200 text-xs">{user.name}（管理者）</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
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

        {tab === 'users' && <UserList currentUserId={user.id} />}
        {tab === 'edit' && <AdminShiftEditor />}
        {tab === 'account' && <AccountSettings user={user} />}
      </main>
    </div>
  );
};

export default AdminPage;
