import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const UnsubmittedList = ({ year, month }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getUnsubmitted(year, month)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [year, month]);

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">未提出者</h3>
        </div>
        {!loading && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            members.length === 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}>
            {members.length === 0 ? '全員完了' : `${members.length}人`}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読み込み中...</p>
      ) : members.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          全員提出済みです！
        </div>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2.5 text-sm text-gray-700 bg-rose-50 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></span>
              {m.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UnsubmittedList;
