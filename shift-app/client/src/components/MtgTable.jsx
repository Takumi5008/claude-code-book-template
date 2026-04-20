import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const STATUS_CYCLE = { present: 'late', late: 'absent', absent: null, null: 'present' };

const MtgTable = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [deadlines, setDeadlines] = useState({});
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [savingDeadline, setSavingDeadline] = useState(false);
  // 編集中のセル: { userId, date }
  const [editCell, setEditCell] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', lateTime: '', reason: '' });
  const [saving, setSaving] = useState(false);

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

  const openEdit = (member, date) => {
    const rec = data.map[member.id]?.[date] || {};
    setEditCell({ userId: member.id, userName: member.name, date });
    setEditForm({
      status: rec.status || 'present',
      lateTime: rec.late_time || '',
      reason: rec.reason || '',
    });
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await api.adminSaveMtg(editCell.userId, editCell.date, editForm.status, editForm.reason, editForm.lateTime);
      setData(prev => {
        const newMap = { ...prev.map };
        if (!newMap[editCell.userId]) newMap[editCell.userId] = {};
        newMap[editCell.userId] = {
          ...newMap[editCell.userId],
          [editCell.date]: {
            ...newMap[editCell.userId][editCell.date],
            status: editForm.status,
            reason: editForm.reason,
            late_time: editForm.lateTime,
          },
        };
        return { ...prev, map: newMap };
      });
      setEditCell(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 p-4">読み込み中...</p>;
  if (!data) return null;

  const { dates, members, map } = data;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const countPresent = (date) =>
    members.filter(m => ['present', 'late'].includes(map[m.id]?.[date]?.status)).length;

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800">MTG出欠一覧</h2>
        <span className="text-xs text-gray-400 ml-1">（セルをクリックで編集）</span>
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
                <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">{formatDate(date)}（金）</span>
                {isEditing ? (
                  <>
                    <input type="datetime-local" value={deadlineInput} onChange={e => setDeadlineInput(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={() => handleDeadlineSave(date)} disabled={savingDeadline || !deadlineInput}
                      className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">保存</button>
                    <button onClick={() => setEditingDeadline(null)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">✕</button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-xs ${passed ? 'text-rose-500' : dl ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {dl ? new Date(dl).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + (passed ? '（終了）' : '') : '未設定'}
                    </span>
                    <button onClick={() => { setEditingDeadline(date); setDeadlineInput(dl || ''); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex-shrink-0">設定</button>
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
                    date === today ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
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
                    <td key={date}
                      className="border border-gray-100 px-2 py-2 text-center relative cursor-pointer hover:bg-indigo-50/60 transition-colors"
                      onClick={() => openEdit(member, date)}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {rec?.status === 'present' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">○</span>
                      )}
                      {rec?.status === 'late' && (
                        <span className="inline-flex flex-col items-center justify-center rounded-lg bg-amber-100 text-amber-600 font-bold text-xs px-1 py-0.5 leading-tight"
                          onMouseEnter={() => setTooltip({ date, id: member.id, text: [rec.late_time && `${rec.late_time}遅刻`, rec.reason].filter(Boolean).join('・') })}
                        >
                          <span>遅</span>
                          {rec.late_time && <span className="text-[9px]">{rec.late_time}</span>}
                        </span>
                      )}
                      {rec?.status === 'absent' && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-500 font-bold text-sm"
                          onMouseEnter={() => rec.reason && setTooltip({ date, id: member.id, text: rec.reason })}
                        >✗</span>
                      )}
                      {!rec?.status && <span className="text-gray-300">–</span>}
                      {tooltip?.date === date && tooltip?.id === member.id && tooltip.text && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg pointer-events-none">
                          {tooltip.text}
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

      {/* 編集モーダル */}
      {editCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditCell(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-1">{editCell.userName}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(editCell.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} MTG
            </p>

            {/* ステータス選択 */}
            <div className="flex gap-2 mb-4">
              {[
                { value: 'present', label: '✓ 出席', active: 'bg-emerald-500 text-white', inactive: 'bg-gray-50 text-gray-600 border border-gray-200' },
                { value: 'late',    label: '⏰ 遅れる', active: 'bg-amber-400 text-white', inactive: 'bg-gray-50 text-gray-600 border border-gray-200' },
                { value: 'absent',  label: '✗ 欠席', active: 'bg-rose-500 text-white', inactive: 'bg-gray-50 text-gray-600 border border-gray-200' },
              ].map(s => (
                <button key={s.value} onClick={() => setEditForm(f => ({ ...f, status: s.value }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${editForm.status === s.value ? s.active : s.inactive}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* 遅れる時間 */}
            {editForm.status === 'late' && (
              <input type="text" placeholder="遅れる時間（例: 30分）" value={editForm.lateTime}
                onChange={e => setEditForm(f => ({ ...f, lateTime: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-300" />
            )}

            {/* 理由 */}
            {(editForm.status === 'late' || editForm.status === 'absent') && (
              <input type="text" placeholder="理由（任意）" value={editForm.reason}
                onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-rose-300" />
            )}

            <div className="flex gap-2">
              <button onClick={() => setEditCell(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 transition">
                キャンセル
              </button>
              <button onClick={handleEditSave} disabled={saving}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition shadow-md shadow-indigo-200">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MtgTable;
