import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const ShiftCalendar = ({ user, targetUserId = null, targetUserName = null }) => {
  const isAdminEdit = !!targetUserId;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [workDates, setWorkDates] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const shiftData = isAdminEdit
        ? await api.getMemberShift(targetUserId, year, month)
        : await api.getMyShift(year, month);
      setWorkDates(shiftData.workDates);
      setSubmitted(shiftData.submitted);

      if (!isAdminEdit) {
        const dl = await api.getDeadline(year, month);
        setDeadlinePassed(dl.deadlineAt && new Date(dl.deadlineAt) < new Date());
      } else {
        setDeadlinePassed(false);
      }
    };
    fetchData();
  }, [year, month, targetUserId]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const toggleDate = (day) => {
    if (deadlinePassed) return;
    setWorkDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
    setSubmitted(false);
    setMessage('');
  };

  const handleSave = async (isSubmit) => {
    setSaving(true);
    setMessage('');
    try {
      if (isAdminEdit) {
        await api.saveMemberShift(targetUserId, year, month, workDates, isSubmit);
      } else {
        await api.saveMyShift(year, month, workDates, isSubmit);
      }
      setSubmitted(isSubmit);
      setMessage(isSubmit ? '提出しました！' : '保存しました');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const weeks = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6 w-full max-w-lg mx-auto">
      {targetUserName && (
        <div className="flex items-center gap-2 mb-4 bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm font-semibold">{targetUserName} のシフト</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">◀</button>
        <h2 className="text-lg font-bold text-gray-800">{year}年 {month}月</h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">▶</button>
      </div>

      {deadlinePassed && (
        <div className="mb-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 ring-1 ring-rose-200">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          提出期限が終了しています。変更はできません。
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weeks.map((w, i) => (
          <div key={w} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-gray-500'}`}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const isWork = workDates.includes(day);
          const dow = (firstDay + day - 1) % 7;
          const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
          return (
            <button
              key={day}
              onClick={() => toggleDate(day)}
              disabled={deadlinePassed}
              className={`aspect-square rounded-xl text-sm font-semibold transition-all
                ${isWork
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200'
                  : deadlinePassed
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-gray-50 hover:bg-indigo-50 active:scale-95'}
                ${!isWork && dow === 0 ? 'text-rose-400' : ''}
                ${!isWork && dow === 6 ? 'text-indigo-400' : ''}
                ${!isWork && dow !== 0 && dow !== 6 ? 'text-gray-700' : ''}
                ${isToday && !isWork ? 'ring-2 ring-indigo-400' : ''}
                ${deadlinePassed ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          出勤日：<span className="font-bold text-indigo-600">{workDates.length}日</span>
        </span>
        {submitted && (
          <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full text-xs">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            提出済み
          </span>
        )}
      </div>

      {message && (
        <div className={`mt-3 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 ${
          message.includes('！') || message === '保存しました'
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
        }`}>
          {message}
        </div>
      )}

      {!deadlinePassed && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition"
          >
            一時保存
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-md shadow-indigo-200"
          >
            提出する
          </button>
        </div>
      )}
    </div>
  );
};

export default ShiftCalendar;
