const request = async (path, options = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
};

export const api = {
  register: (name, email, password) =>
    request('/api/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  getMyShift: (year, month) =>
    request(`/api/shifts/my?year=${year}&month=${month}`),
  saveMyShift: (year, month, workDates, submitted) =>
    request('/api/shifts/my', { method: 'POST', body: { year, month, workDates, submitted } }),
  getAllShifts: (year, month) =>
    request(`/api/shifts/all?year=${year}&month=${month}`),
  getMemberShift: (userId, year, month) =>
    request(`/api/shifts/member/${userId}?year=${year}&month=${month}`),
  saveMemberShift: (userId, year, month, workDates, submitted) =>
    request(`/api/shifts/member/${userId}`, { method: 'POST', body: { year, month, workDates, submitted } }),
  getDeadline: (year, month) =>
    request(`/api/deadlines?year=${year}&month=${month}`),
  setDeadline: (year, month, deadlineAt) =>
    request('/api/deadlines', { method: 'POST', body: { year, month, deadlineAt } }),
  getUnsubmitted: (year, month) =>
    request(`/api/deadlines/unsubmitted?year=${year}&month=${month}`),
  saveSubscription: (subscription) =>
    request('/api/push/subscribe', { method: 'POST', body: { subscription } }),
  updateAccount: (body) =>
    request('/api/auth/account', { method: 'PATCH', body }),
  getUsers: () => request('/api/auth/users'),
  updateUserRole: (id, role) =>
    request(`/api/auth/users/${id}/role`, { method: 'PATCH', body: { role } }),
  deleteUser: (id) =>
    request(`/api/auth/users/${id}`, { method: 'DELETE' }),
  createUser: (name, email, password) =>
    request('/api/auth/users', { method: 'POST', body: { name, email, password } }),
};
