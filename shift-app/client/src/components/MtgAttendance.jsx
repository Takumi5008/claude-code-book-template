import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}（金）`;
};

const MtgAttendance = () => {
  const [fridays, setFridays] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.getMtgFridays(), api.getMyMtg()]).then(([dates, map]) => {
      setFridays(dates);
      setAttendance(map);
    });
  }, []);

  const handleStatus = async (date, status) => {
    setSaving(date);
    setMessage('');
    const current = attendance[date] || {};
    try {
      await api.saveMyMtg(date, status, current.reason || '');
      setAttendance(prev => ({
        ...prev,
        [date]: { ...current, date, status },
      }));
      setMessage('保存しました');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleReason = async (date, reason) => {
    setAttendance(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), reason },
    }));
  };

  const handleReasonBlur = async (date) => {
    const current = attendance[date];
    if (!current || current.status !== 'absent') return;
    setSaving(date);
    try {
      await api.saveMyMtg(date, 'absent', current.reason || '');
    } finally {
      setSaving(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-800">MTG出欠（毎週金曜日）</h3>
      </div>

      {message && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 ring-1 ring-emerald-200">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {fridays.map((date) => {
          const rec = attendance[date] || {};
          const isPast = date < today;
          return (
            <div key={date} className={`rounded-xl p-4 ${isPast ? 'bg-gray-50 opacity-70' : 'bg-indigo-50/50 ring-1 ring-indigo-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${isPast ? 'text-gray-500' : 'text-gray-800'}`}>
                  {formatDate(date)}
                  {date === today && <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">今週</span>}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatus(date, 'present')}
                    disabled={saving === date || isPast}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      rec.status === 'present'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                    } disabled:opacity-50`}
                  >
                    ✓ 出席
                  </button>
                  <button
                    onClick={() => handleStatus(date, 'absent')}
                    disabled={saving === date || isPast}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      rec.status === 'absent'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-400 hover:text-rose-600'
                    } disabled:opacity-50`}
                  >
                    ✗ 欠席
                  </button>
                </div>
              </div>
              {rec.status === 'absent' && !isPast && (
                <input
                  type="text"
                  placeholder="欠席理由を入力（任意）"
                  value={rec.reason || ''}
                  onChange={(e) => handleReason(date, e.target.value)}
                  onBlur={() => handleReasonBlur(date)}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                />
              )}
              {rec.status === 'absent' && rec.reason && isPast && (
                <p className="text-xs text-gray-500 mt-1">理由: {rec.reason}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MtgAttendance;
