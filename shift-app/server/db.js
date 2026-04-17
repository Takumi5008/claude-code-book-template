import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'shifts.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    work_dates TEXT NOT NULL DEFAULT '[]',
    submitted INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month)
  );

  CREATE TABLE IF NOT EXISTS deadlines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    deadline_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
  );
`);

// マイグレーション（テーブル作成後に実行）
const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!cols.includes('push_subscription')) {
  db.exec('ALTER TABLE users ADD COLUMN push_subscription TEXT');
}
if (!cols.includes('last_login_at')) {
  db.exec('ALTER TABLE users ADD COLUMN last_login_at DATETIME');
  db.exec('UPDATE users SET last_login_at = created_at WHERE last_login_at IS NULL');
}

export const updateUserName = (id, name) =>
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);

export const updateUserPassword = (id, password) =>
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, id);

export const getAllUsers = () =>
  db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at').all();

export const updateUserRole = (id, role) =>
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

export const createUser = (name, email, password) => {
  const result = db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'member')"
  ).run(name, email, password);
  return db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
};

export const getUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(email);

export const getUserById = (id) =>
  db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);

export const recordLogin = (id) =>
  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

export const deleteUser = (id) => {
  db.prepare('DELETE FROM shifts WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
};

export const getAllMembers = () =>
  db.prepare('SELECT id, name FROM users WHERE last_login_at IS NOT NULL ORDER BY name').all();

export const getShift = (userId, year, month) =>
  db.prepare('SELECT * FROM shifts WHERE user_id = ? AND year = ? AND month = ?').get(userId, year, month);

export const upsertShift = (userId, year, month, workDates, submitted) => {
  db.prepare(`
    INSERT INTO shifts (user_id, year, month, work_dates, submitted, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, year, month) DO UPDATE SET
      work_dates = excluded.work_dates,
      submitted = excluded.submitted,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, year, month, JSON.stringify(workDates), submitted ? 1 : 0);
};

export const getAllShifts = (year, month) =>
  db.prepare(`
    SELECT s.*, u.name FROM shifts s
    JOIN users u ON s.user_id = u.id
    WHERE s.year = ? AND s.month = ?
  `).all(year, month);

export const savePushSubscription = (userId, subscription) =>
  db.prepare('UPDATE users SET push_subscription = ? WHERE id = ?')
    .run(subscription ? JSON.stringify(subscription) : null, userId);

export const getMembersWithSubscription = () =>
  db.prepare("SELECT id, name, push_subscription FROM users WHERE role = 'member' AND push_subscription IS NOT NULL").all();

export const getDeadline = (year, month) =>
  db.prepare('SELECT * FROM deadlines WHERE year = ? AND month = ?').get(year, month);

export const upsertDeadline = (year, month, deadlineAt) => {
  db.prepare(`
    INSERT INTO deadlines (year, month, deadline_at)
    VALUES (?, ?, ?)
    ON CONFLICT(year, month) DO UPDATE SET deadline_at = excluded.deadline_at
  `).run(year, month, deadlineAt);
};

export const getUnsubmittedMembers = (year, month) =>
  db.prepare(`
    SELECT u.id, u.name FROM users u
    WHERE u.last_login_at IS NOT NULL
    AND u.id NOT IN (
      SELECT user_id FROM shifts WHERE year = ? AND month = ? AND submitted = 1
    )
    ORDER BY u.name
  `).all(year, month);

export default db;
