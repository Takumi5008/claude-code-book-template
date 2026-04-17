export const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }
  next();
};
