import { Router } from 'express';
import { savePushSubscription } from '../db.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

router.post('/subscribe', requireLogin, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'subscription が必要です' });
  await savePushSubscription(req.session.userId, subscription);
  res.json({ ok: true });
});

router.post('/unsubscribe', requireLogin, async (req, res) => {
  await savePushSubscription(req.session.userId, null);
  res.json({ ok: true });
});

export default router;
