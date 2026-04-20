import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const getWorkType = (workDates, day) => {
  if (!workDates || workDates.length === 0) return null;
  if (typeof workDates[0] === 'number') return workDates.includes(day) ? 'full' : null;
  const entry = workDates.find(w => w.day === day);
  return entry ? entry.type : null;
};

const WorkCell = ({ type }) => {
  if (!type) return <span className="text-gray-200">·</span>;
  if (type === 'full') return <span className="text-indigo-600 font-bold text-sm">●</span>;
  if (type === 'am')   return <span className="text-sky-500 font-bold text-xs">前</span>;
  if (type === 'pm')   return <span className="text-amber-500 font-bold text-xs">後</span>;
  return null;
};

const AdminTable = ({ year, month }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getAllShifts(year, month)
      .then(setShifts)
      .finally(() => setLoading(false));
  }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();

  // 個人ごとの出勤日数
  const memberTotal = (member) =>
    days.filter(d => getWorkType(member.workDates, d)).length;

  // 日ごとの出勤人数
  const dayTotal = (d) =>
    shifts.filter(m => getWorkType(m.workDates, d)).length;

  // 全体総計
  const grandTotal = shifts.reduce((sum, m) => sum + memberTotal(m), 0);

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-800">シフト一覧</h2>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
          提出済み {shifts.filter(s => s.submitted).length} / {shifts.length} 人
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-4">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-left min-w-24 sticky left-0 z-10 text-gray-600 font-semibold">名前</th>
                <th className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center min-w-10 text-gray-600 font-semibold">提出</th>
                {days.map((d) => {
                  const dow = new Date(year, month - 1, d).getDay();
                  const isToday = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
                  return (
                    <th
                      key={d}
                      className={`border border-gray-100 px-1 py-2.5 text-center w-8 font-semibold
                        ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-50'}
                        ${!isToday && dow === 0 ? 'text-rose-500' : ''}
                        ${!isToday && dow === 6 ? 'text-indigo-500' : ''}
                        ${!isToday && dow !== 0 && dow !== 6 ? 'text-gray-600' : ''}`}
                    >
                      {d}
                    </th>
                  );
                })}
                <th className="border border-gray-100 px-2 py-2.5 bg-indigo-50 text-center min-w-12 text-indigo-600 font-bold">計</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((member, idx) => (
                <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="border border-gray-100 px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit">{member.name}</td>
                  <td className="border border-gray-100 px-2 py-2 text-center">
                    {member.submitted
                      ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-bold">✓</span>
                      : <span className="text-gray-300 font-bold">–</span>}
                  </td>
                  {days.map((d) => {
                    const dow = new Date(year, month - 1, d).getDay();
                    const type = getWorkType(member.workDates, d);
                    return (
                      <td key={d} className={`border border-gray-100 px-1 py-2 text-center
                        ${dow === 0 ? 'bg-rose-50/40' : ''}
                        ${dow === 6 ? 'bg-indigo-50/40' : ''}`}>
                        <WorkCell type={type} />
                      </td>
                    );
                  })}
                  <td className="border border-gray-100 px-2 py-2 text-center bg-indigo-50 font-bold text-indigo-600">
                    {memberTotal(member)}
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 3} className="text-center text-gray-400 py-8">メンバーのシフトがありません</td>
                </tr>
              )}
              {/* 日ごとの総計行 */}
              {shifts.length > 0 && (
                <tr className="bg-indigo-50/60">
                  <td className="border border-gray-100 px-3 py-2 font-bold text-indigo-600 sticky left-0 bg-indigo-50/60">合計</td>
                  <td className="border border-gray-100 px-2 py-2" />
                  {days.map((d) => {
                    const dow = new Date(year, month - 1, d).getDay();
                    const total = dayTotal(d);
                    return (
                      <td key={d} className={`border border-gray-100 px-1 py-2 text-center font-bold
                        ${total > 0 ? 'text-indigo-600' : 'text-gray-300'}
                        ${dow === 0 ? 'bg-rose-50/40' : ''}
                        ${dow === 6 ? 'bg-indigo-50/40' : ''}`}>
                        {total > 0 ? total : '·'}
                      </td>
                    );
                  })}
                  <td className="border border-gray-100 px-2 py-2 text-center bg-indigo-100 font-bold text-indigo-700 text-sm">
                    {grandTotal}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTable;
