import bcrypt from 'bcrypt';
import db from './db.js';

const users = [
  { name: '管理者', email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { name: '田中太郎', email: 'tanaka@example.com', password: 'pass123', role: 'member' },
  { name: '佐藤花子', email: 'sato@example.com', password: 'pass123', role: 'member' },
  { name: '鈴木一郎', email: 'suzuki@example.com', password: 'pass123', role: 'member' },
];

const insert = db.prepare(
  'INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
);

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  insert.run(u.name, u.email, hash, u.role);
  console.log(`Created: ${u.email}`);
}

console.log('Seed complete.');
