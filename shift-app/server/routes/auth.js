import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getUserByEmail, getUserById, createUser, getAllUsers, updateUserRole, updateUserName, updateUserPassword, recordLogin, deleteUser, getUserCount, createResetToken, getResetToken, markResetTokenUsed } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../mailer.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
  }
  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
  req.session.userId = user.id;
  req.session.role = user.role;
  await recordLogin(user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: '名前・メールアドレス・パスワードを入力してください' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
  }
  const existing = await getUserByEmail(email);
  if (existing) return res.status(400).json({ error: 'このメールアドレスはすでに登録されています' });
  const hash = await bcrypt.hash(password, 10);
  const isFirstUser = (await getUserCount()) === 0;
  const user = await createUser(name, email, hash, isFirstUser ? 'admin' : 'member');
  req.session.userId = user.id;
  req.session.role = user.role;
  await recordLogin(user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'メールアドレスを入力してください' });
  const user = await getUserByEmail(email);
  if (!user) return res.json({ ok: true }); // セキュリティのため存在しない場合も成功を返す
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間
  await createResetToken(user.id, token, expiresAt);
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  try {
    await sendPasswordResetEmail(email, resetUrl);
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail send error:', err);
    res.status(500).json({ error: 'メール送信に失敗しました。管理者にお問い合わせください。' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: '不正なリクエストです' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
  const record = await getResetToken(token);
  if (!record) return res.status(400).json({ error: 'リンクが無効または期限切れです' });
  const hash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(record.user_id, hash);
  await markResetTokenUsed(token);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未ログイン' });
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: '未ログイン' });
  res.json(user);
});

router.patch('/account', requireLogin, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = await getUserById(req.session.userId);
  if (name) {
    await updateUserName(req.session.userId, name);
    return res.json({ ok: true });
  }
  if (currentPassword && newPassword) {
    if (newPassword.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
    const fullUser = await getUserByEmail(user.email);
    const valid = await bcrypt.compare(currentPassword, fullUser.password);
    if (!valid) return res.status(401).json({ error: '現在のパスワードが正しくありません' });
    const hash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(req.session.userId, hash);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: '不正なリクエストです' });
});

router.get('/users', requireAdmin, async (req, res) => {
  res.json(await getAllUsers());
});

router.post('/users', requireAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: '名前・メールアドレス・パスワードを入力してください' });
  if (password.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
  const existing = await getUserByEmail(email);
  if (existing) return res.status(400).json({ error: 'このメールアドレスはすでに登録されています' });
  const hash = await bcrypt.hash(password, 10);
  const user = await createUser(name, email, hash, 'member');
  res.json(user);
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: '自分自身は削除できません' });
  await deleteUser(id);
  res.json({ ok: true });
});

router.patch('/users/:id/password', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
  const hash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(id, hash);
  res.json({ ok: true });
});

router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: '無効なロールです' });
  if (id === req.session.userId) return res.status(400).json({ error: '自分のロールは変更できません' });
  await updateUserRole(id, role);
  res.json({ ok: true });
});

export default router;
