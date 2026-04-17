import { Router } from 'express';
import { getDeadline, upsertDeadline, getUnsubmittedMembers } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireLogin, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year と month を指定してください' });
  }
  const deadline = getDeadline(year, month);
  res.json(deadline ? { deadlineAt: deadline.deadline_at } : { deadlineAt: null });
});

router.post('/', requireAdmin, (req, res) => {
  const { year, month, deadlineAt } = req.body;
  if (!year || !month || !deadlineAt) {
    return res.status(400).json({ error: '不正なリクエストです' });
  }
  upsertDeadline(year, month, deadlineAt);
  res.json({ ok: true });
});

router.get('/unsubmitted', requireAdmin, (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month) {
    return res.status(400).json({ error: 'year と month を指定してください' });
  }
  const members = getUnsubmittedMembers(year, month);
  res.json(members);
});

export default router;
