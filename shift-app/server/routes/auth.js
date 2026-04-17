import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getUserByEmail, getUserById, createUser, getAllUsers, updateUserRole, updateUserName, updateUserPassword, recordLogin, deleteUser, getUserCount } from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  recordLogin(user.id);
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

  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'このメールアドレスはすでに登録されています' });
  }

  const hash = await bcrypt.hash(password, 10);
  const isFirstUser = getUserCount() === 0;
  const user = createUser(name, email, hash, isFirstUser ? 'admin' : 'member');

  req.session.userId = user.id;
  req.session.role = user.role;
  recordLogin(user.id);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未ログイン' });
  }
  const user = getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: '未ログイン' });
  }
  res.json(user);
});

router.patch('/account', requireLogin, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = getUserById(req.session.userId);

  if (name) {
    updateUserName(req.session.userId, name);
    return res.json({ ok: true });
  }

  if (currentPassword && newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
    }
    const fullUser = getUserByEmail(user.email);
    const valid = await bcrypt.compare(currentPassword, fullUser.password);
    if (!valid) {
      return res.status(401).json({ error: '現在のパスワードが正しくありません' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    updateUserPassword(req.session.userId, hash);
    return res.json({ ok: true });
  }

  res.status(400).json({ error: '不正なリクエストです' });
});

router.get('/users', requireAdmin, (req, res) => {
  res.json(getAllUsers());
});

router.post('/users', requireAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: '名前・メールアドレス・パスワードを入力してください' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });
  }
  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'このメールアドレスはすでに登録されています' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = createUser(name, email, hash, 'member');
  res.json(user);
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) {
    return res.status(400).json({ error: '自分自身は削除できません' });
  }
  deleteUser(id);
  res.json({ ok: true });
});

router.patch('/users/:id/role', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: '無効なロールです' });
  }
  if (id === req.session.userId) {
    return res.status(400).json({ error: '自分のロールは変更できません' });
  }
  updateUserRole(id, role);
  res.json({ ok: true });
});

export default router;
