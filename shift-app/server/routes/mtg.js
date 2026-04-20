import { Router } from 'express';
import { upsertMtgAttendance, getMyMtgAttendances, getAllMtgAttendances, getAllMembersForMtg } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 直近N週の金曜日を返す
const getFridays = (weeks = 8) => {
  const fridays = [];
  const d = new Date();
  // 今週の金曜日に移動
  const day = d.getDay();
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  for (let i = 0; i < weeks; i++) {
    const fd = new Date(d);
    fridays.push(fd.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return fridays;
};

router.get('/fridays', requireLogin, (req, res) => {
  res.json(getFridays(8));
});

router.get('/my', requireLogin, (req, res) => {
  const dates = getFridays(8);
  const rows = getMyMtgAttendances(req.session.userId, dates);
  const map = {};
  rows.forEach(r => { map[r.date] = r; });
  res.json(map);
});

router.post('/my', requireLogin, (req, res) => {
  const { date, status, reason } = req.body;
  if (!date || !['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: '不正なリクエストです' });
  }
  upsertMtgAttendance(req.session.userId, date, status, reason);
  res.json({ ok: true });
});

router.get('/all', requireAdmin, (req, res) => {
  const dates = getFridays(8);
  const members = getAllMembersForMtg();
  const rows = getAllMtgAttendances(dates);
  const map = {};
  rows.forEach(r => {
    if (!map[r.user_id]) map[r.user_id] = {};
    map[r.user_id][r.date] = r;
  });
  res.json({ dates, members, map });
});

export default router;
