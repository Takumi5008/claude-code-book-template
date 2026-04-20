import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const q = (text, params) => pool.query(text, params);

export const initDb = async () => {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      push_subscription TEXT,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      work_dates TEXT NOT NULL DEFAULT '[]',
      submitted BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, year, month)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS deadlines (
      id SERIAL PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      deadline_at TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS mtg_attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    )
  `);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password TEXT`);
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMP`);
  await q(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const getUserCount = async () => {
  const res = await q('SELECT COUNT(*) as count FROM users');
  return parseInt(res.rows[0].count);
};

export const createUser = async (name, email, password, role = 'member', phone = null) => {
  const res = await q(
    'INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
    [name, email, password, role, phone]
  );
  return res.rows[0];
};

export const updateUserPhone = async (id, phone) =>
  q('UPDATE users SET phone = $1 WHERE id = $2', [phone, id]);

export const setTempPassword = async (id, tempPassword, expiresAt) =>
  q('UPDATE users SET temp_password = $1, temp_password_expires_at = $2 WHERE id = $3', [tempPassword, expiresAt, id]);

export const clearTempPassword = async (id) =>
  q('UPDATE users SET temp_password = NULL, temp_password_expires_at = NULL WHERE id = $1', [id]);

export const getUserByEmail = async (email) => {
  const res = await q('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
};

export const getUserById = async (id) => {
  const res = await q('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
};

export const recordLogin = async (id) =>
  q('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

export const getAllUsers = async () => {
  const res = await q('SELECT id, name, email, role, created_at FROM users ORDER BY created_at');
  return res.rows;
};

export const updateUserRole = async (id, role) =>
  q('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

export const updateUserName = async (id, name) =>
  q('UPDATE users SET name = $1 WHERE id = $2', [name, id]);

export const updateUserPassword = async (id, password) =>
  q('UPDATE users SET password = $1 WHERE id = $2', [password, id]);

export const deleteUser = async (id) => {
  await q('DELETE FROM mtg_attendance WHERE user_id = $1', [id]);
  await q('DELETE FROM shifts WHERE user_id = $1', [id]);
  await q('DELETE FROM users WHERE id = $1', [id]);
};

export const getAllMembers = async () => {
  const res = await q('SELECT id, name FROM users WHERE last_login_at IS NOT NULL ORDER BY name');
  return res.rows;
};

export const getShift = async (userId, year, month) => {
  const res = await q(
    'SELECT * FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3',
    [userId, year, month]
  );
  return res.rows[0] || null;
};

export const upsertShift = async (userId, year, month, workDates, submitted) => {
  await q(`
    INSERT INTO shifts (user_id, year, month, work_dates, submitted, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, year, month) DO UPDATE SET
      work_dates = EXCLUDED.work_dates,
      submitted = EXCLUDED.submitted,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, year, month, JSON.stringify(workDates), submitted]);
};

export const getAllShifts = async (year, month) => {
  const res = await q(`
    SELECT s.*, u.name FROM shifts s
    JOIN users u ON s.user_id = u.id
    WHERE s.year = $1 AND s.month = $2
  `, [year, month]);
  return res.rows;
};

export const savePushSubscription = async (userId, subscription) =>
  q('UPDATE users SET push_subscription = $1 WHERE id = $2',
    [subscription ? JSON.stringify(subscription) : null, userId]);

export const getMembersWithSubscription = async () => {
  const res = await q(
    "SELECT id, name, push_subscription FROM users WHERE role = 'member' AND push_subscription IS NOT NULL"
  );
  return res.rows;
};

export const getDeadline = async (year, month) => {
  const res = await q('SELECT * FROM deadlines WHERE year = $1 AND month = $2', [year, month]);
  return res.rows[0] || null;
};

export const upsertDeadline = async (year, month, deadlineAt) => {
  await q(`
    INSERT INTO deadlines (year, month, deadline_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (year, month) DO UPDATE SET deadline_at = EXCLUDED.deadline_at
  `, [year, month, deadlineAt]);
};

export const getUnsubmittedMembers = async (year, month) => {
  const res = await q(`
    SELECT u.id, u.name FROM users u
    WHERE u.last_login_at IS NOT NULL
    AND u.id NOT IN (
      SELECT user_id FROM shifts WHERE year = $1 AND month = $2 AND submitted = TRUE
    )
    ORDER BY u.name
  `, [year, month]);
  return res.rows;
};

export const upsertMtgAttendance = async (userId, date, status, reason) => {
  await q(`
    INSERT INTO mtg_attendance (user_id, date, status, reason, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, date) DO UPDATE SET
      status = EXCLUDED.status,
      reason = EXCLUDED.reason,
      updated_at = CURRENT_TIMESTAMP
  `, [userId, date, status, reason || null]);
};

export const getMyMtgAttendances = async (userId, dates) => {
  const placeholders = dates.map((_, i) => `$${i + 2}`).join(',');
  const res = await q(
    `SELECT * FROM mtg_attendance WHERE user_id = $1 AND date IN (${placeholders})`,
    [userId, ...dates]
  );
  return res.rows;
};

export const getAllMtgAttendances = async (dates) => {
  const placeholders = dates.map((_, i) => `$${i + 1}`).join(',');
  const res = await q(`
    SELECT m.*, u.name FROM mtg_attendance m
    JOIN users u ON m.user_id = u.id
    WHERE m.date IN (${placeholders})
  `, dates);
  return res.rows;
};

export const getAllMembersForMtg = async () => {
  const res = await q('SELECT id, name FROM users WHERE last_login_at IS NOT NULL ORDER BY name');
  return res.rows;
};

export const createResetToken = async (userId, token, expiresAt) => {
  await q('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await q(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
};

export const getResetToken = async (token) => {
  const res = await q(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
    [token]
  );
  return res.rows[0] || null;
};

export const markResetTokenUsed = async (token) => {
  await q('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
};

export default pool;
