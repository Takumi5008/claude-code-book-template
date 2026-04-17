import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const DeadlineForm = ({ year, month }) => {
  const [deadlineAt, setDeadlineAt] = useState('');
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
    api.getDeadline(year, month).then((data) => {
      setCurrent(data.deadlineAt);
      if (data.deadlineAt) {
        setDeadlineAt(data.deadlineAt.slice(0, 16));
      } else {
        setDeadlineAt('');
      }
    });
  }, [year, month]);

  const handleSave = async () => {
    if (!deadlineAt) return;
    setSaving(true);
    setMessage('');
    try {
      await api.setDeadline(year, month, deadlineAt);
      setCurrent(deadlineAt);
      setMessage('締切を設定しました');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDeadline = (dt) => {
    if (!dt) return null;
    const d = new Date(dt);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isPast = current && new Date(current) < new Date();

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-800">締切設定</h3>
      </div>

      {current && (
        <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 mb-4 ${
          isPast ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          現在の締切：<span className="font-bold">{formatDeadline(current)}</span>
          {isPast && <span className="ml-auto text-xs font-medium bg-rose-100 px-2 py-0.5 rounded-full">期限切れ</span>}
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">締切日時</label>
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !deadlineAt}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-md shadow-amber-200 whitespace-nowrap"
        >
          {saving ? '保存中...' : '設定する'}
        </button>
      </div>
      {message && (
        <p className="mt-3 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 ring-1 ring-emerald-200">{message}</p>
      )}
    </div>
  );
};

export default DeadlineForm;
