import { Router } from 'express';
import { getShift, upsertShift, getAllShifts, getAllMembers, getDeadline } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/my', requireLogin, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year と month を指定してください' });
  }
  const shift = getShift(req.session.userId, year, month);
  res.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? shift.submitted === 1 : false,
  });
});

router.post('/my', requireLogin, (req, res) => {
  const { year, month, workDates, submitted } = req.body;
  if (!year || !month || !Array.isArray(workDates)) {
    return res.status(400).json({ error: '不正なリクエストです' });
  }

  // メンバーは締切後に変更不可（管理者は常に可）
  if (req.session.role !== 'admin') {
    const deadline = getDeadline(year, month);
    if (deadline?.deadline_at && new Date(deadline.deadline_at) < new Date()) {
      return res.status(403).json({ error: '提出期限が終了しています' });
    }
  }

  upsertShift(req.session.userId, year, month, workDates, submitted);
  res.json({ ok: true });
});

// 管理者がメンバーのシフトを取得・編集
router.get('/member/:userId', requireAdmin, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  const userId = parseInt(req.params.userId);
  const shift = getShift(userId, year, month);
  res.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? shift.submitted === 1 : false,
  });
});

router.post('/member/:userId', requireAdmin, (req, res) => {
  const { year, month, workDates, submitted } = req.body;
  const userId = parseInt(req.params.userId);
  if (!year || !month || !Array.isArray(workDates)) {
    return res.status(400).json({ error: '不正なリクエストです' });
  }
  upsertShift(userId, year, month, workDates, submitted);
  res.json({ ok: true });
});

router.get('/all', requireAdmin, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year と month を指定してください' });
  }
  const members = getAllMembers();
  const shifts = getAllShifts(year, month);
  const shiftMap = {};
  shifts.forEach((s) => {
    shiftMap[s.user_id] = {
      workDates: JSON.parse(s.work_dates),
      submitted: s.submitted === 1,
    };
  });
  const result = members.map((m) => ({
    id: m.id,
    name: m.name,
    workDates: shiftMap[m.id]?.workDates ?? [],
    submitted: shiftMap[m.id]?.submitted ?? false,
  }));
  res.json(result);
});

export default router;
