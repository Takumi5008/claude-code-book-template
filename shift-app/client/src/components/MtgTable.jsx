import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const MtgTable = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [deadlines, setDeadlines] = useState({});
  const [editingDeadline, setEditingDeadline] = useState(null); // date being edited
  const [deadlineInput, setDeadlineInput] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);

  useEffect(() => {
    Promise.all([api.getAllMtg(), api.getMtgDeadlines()])
      .then(([d, dl]) => { setData(d); setDeadlines(dl); })
      .finally(() => setLoading(false));
  }, []);

  const handleDeadlineSave = async (date) => {
    setSavingDeadline(true);
    try {
      await api.setMtgDeadline(date, deadlineInput);
      setDeadlines(prev => ({ ...prev, [date]: deadlineInput }));
      setEditingDeadline(null);
    } finally {
      setSavingDeadline(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 p-4">読み込み中...</p>;
  if (!data) return null;

  const { dates, members, map } = data;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const countPresent = (date) =>
    members.filter(m => map[m.id]?.[date]?.status === 'present').length;

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800">MTG出欠一覧</h2>
      </div>

      {/* 締切設定 */}
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">入力締切設定</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {dates.map(date => {
            const dl = deadlines[date];
            const passed = dl && new Date(dl) < now;
            const isEditing = editingDeadline === date;
            return (
              <div key={date} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">
                  {formatDate(date)}（金）
                </span>
                {isEditing ? (
                  <>
                    <input
                      type="datetime-local"
                      value={deadlineInput}
                      onChange={e => setDeadlineInput(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => handleDeadlineSave(date)}
                      disabled={savingDeadline || !deadlineInput}
                      className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                    >保存</button>
                    <button
                      onClick={() => setEditingDeadline(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >✕</button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-xs ${passed ? 'text-rose-500' : dl ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {dl
                        ? new Date(dl).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (passed ? '（終了）' : '')
                        : '未設定'}
                    </span>
                    <button
                      onClick={() => { setEditingDeadline(date); setDeadlineInput(dl || ''); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                    >設定</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 出欠テーブル */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-left min-w-24 sticky left-0 text-gray-600 font-semibold">名前</th>
              {dates.map(date => {
                const passed = deadlines[date] && new Date(deadlines[date]) < now;
                return (
                  <th key={date} className={`border border-gray-100 px-2 py-2.5 text-center min-w-16 font-semibold ${
                    date === today ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {formatDate(date)}
                    {date === today && <div className="text-indigo-200 text-xs font-normal">今週</div>}
                    {passed && <div className="text-rose-400 text-xs font-normal">締切済</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => (
              <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="border border-gray-100 px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit">{member.name}</td>
                {dates.map(date => {
                  const rec = map[member.id]?.[date];
                  return (
                    <td key={date} className="border border-gray-100 px-2 py-2 text-center relative">
                      {rec?.status === 'present' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">○</span>
                      )}
                      {rec?.status === 'absent' && (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-500 font-bold text-sm cursor-pointer"
                          onMouseEnter={() => rec.reason && setTooltip({ date, id: member.id, reason: rec.reason })}
                          onMouseLeave={() => setTooltip(null)}
                        >✗</span>
                      )}
                      {!rec?.status && <span className="text-gray-200">–</span>}
                      {tooltip?.date === date && tooltip?.id === member.id && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          {tooltip.reason}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-100 px-3 py-2 text-gray-500 sticky left-0 bg-gray-50 text-xs">出席数</td>
              {dates.map(date => (
                <td key={date} className="border border-gray-100 px-2 py-2 text-center text-xs text-emerald-600">
                  {countPresent(date)}/{members.length}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">欠席の✗にカーソルを合わせると理由が表示されます</p>
    </div>
  );
};

export default MtgTable;
