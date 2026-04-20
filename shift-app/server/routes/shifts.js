import { Router } from 'express';
import { getShift, upsertShift, getAllShifts, getAllMembers, getDeadline } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/my', requireLogin, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) return res.status(400).json({ error: 'year と month を指定してください' });
  const shift = await getShift(req.session.userId, year, month);
  res.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? !!shift.submitted : false,
  });
});

router.post('/my', requireLogin, async (req, res) => {
  const { year, month, workDates, submitted } = req.body;
  if (!year || !month || !Array.isArray(workDates)) return res.status(400).json({ error: '不正なリクエストです' });
  if (req.session.role !== 'admin') {
    const deadline = await getDeadline(year, month);
    if (deadline?.deadline_at && new Date(deadline.deadline_at) < new Date()) {
      return res.status(403).json({ error: '提出期限が終了しています' });
    }
  }
  await upsertShift(req.session.userId, year, month, workDates, submitted);
  res.json({ ok: true });
});

router.get('/member/:userId', requireAdmin, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  const userId = parseInt(req.params.userId);
  const shift = await getShift(userId, year, month);
  res.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? !!shift.submitted : false,
  });
});

router.post('/member/:userId', requireAdmin, async (req, res) => {
  const { year, month, workDates, submitted } = req.body;
  const userId = parseInt(req.params.userId);
  if (!year || !month || !Array.isArray(workDates)) return res.status(400).json({ error: '不正なリクエストです' });
  await upsertShift(userId, year, month, workDates, submitted);
  res.json({ ok: true });
});

router.get('/all', requireAdmin, async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) return res.status(400).json({ error: 'year と month を指定してください' });
  const members = await getAllMembers();
  const shifts = await getAllShifts(year, month);
  const shiftMap = {};
  shifts.forEach((s) => {
    shiftMap[s.user_id] = { workDates: JSON.parse(s.work_dates), submitted: !!s.submitted };
  });
  res.json(members.map((m) => ({
    id: m.id,
    name: m.name,
    workDates: shiftMap[m.id]?.workDates ?? [],
    submitted: shiftMap[m.id]?.submitted ?? false,
  })));
});

export default router;
