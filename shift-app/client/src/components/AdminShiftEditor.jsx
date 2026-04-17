import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import ShiftCalendar from './ShiftCalendar.jsx';

const AdminShiftEditor = () => {
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    api.getAllShifts(new Date().getFullYear(), new Date().getMonth() + 1)
      .then((shifts) => setMembers(shifts.map(s => ({ id: s.id, name: s.name }))));
  }, []);

  const selected = members.find(m => m.id === parseInt(selectedId));

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6 mb-4 max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">メンバーのシフトを編集</h3>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50 focus:bg-white"
        >
          <option value="">メンバーを選択してください</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {selected && (
        <ShiftCalendar
          targetUserId={selected.id}
          targetUserName={selected.name}
        />
      )}
    </div>
  );
};

export default AdminShiftEditor;
