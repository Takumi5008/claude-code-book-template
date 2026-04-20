import { Router } from 'express';
import { upsertMtgAttendance, getMyMtgAttendances, getAllMtgAttendances, getAllMembersForMtg, getMtgDeadlines, upsertMtgDeadline } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

const getFridays = (weeks = 8) => {
  const fridays = [];
  const d = new Date();
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  for (let i = 0; i < weeks; i++) {
    fridays.push(new Date(d).toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return fridays;
};

router.get('/fridays', requireLogin, (req, res) => {
  res.json(getFridays(8));
});

router.get('/my', requireLogin, async (req, res) => {
  const dates = getFridays(8);
  const rows = await getMyMtgAttendances(req.session.userId, dates);
  const map = {};
  rows.forEach(r => { map[r.date] = r; });
  res.json(map);
});

router.post('/my', requireLogin, async (req, res) => {
  const { date, status, reason } = req.body;
  if (!date || !['present', 'absent'].includes(status)) return res.status(400).json({ error: '不正なリクエストです' });
  const deadlines = await getMtgDeadlines([date]);
  if (deadlines[0]?.deadline_at && new Date(deadlines[0].deadline_at) < new Date()) {
    return res.status(403).json({ error: '入力期限が終了しています' });
  }
  await upsertMtgAttendance(req.session.userId, date, status, reason);
  res.json({ ok: true });
});

router.get('/deadlines', requireLogin, async (req, res) => {
  const dates = getFridays(8);
  const rows = await getMtgDeadlines(dates);
  const map = Object.fromEntries(rows.map(r => [r.date, r.deadline_at]));
  res.json(map);
});

router.post('/deadline', requireAdmin, async (req, res) => {
  const { date, deadlineAt } = req.body;
  if (!date || !deadlineAt) return res.status(400).json({ error: '不正なリクエストです' });
  await upsertMtgDeadline(date, deadlineAt);
  res.json({ ok: true });
});

router.get('/all', requireAdmin, async (req, res) => {
  const dates = getFridays(8);
  const members = await getAllMembersForMtg();
  const rows = await getAllMtgAttendances(dates);
  const map = {};
  rows.forEach(r => {
    if (!map[r.user_id]) map[r.user_id] = {};
    map[r.user_id][r.date] = r;
  });
  res.json({ dates, members, map });
});

export default router;
