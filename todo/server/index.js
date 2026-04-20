import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'tasks.db'))

// テーブル作成（priority カラム追加）
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    priority   TEXT    NOT NULL DEFAULT 'medium',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)
// 既存DBへのマイグレーション
const cols = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name)
if (!cols.includes('priority')) {
  db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'")
}

const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])

const app = express()
app.use(cors())
app.use(express.json())

// 一覧取得
app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at ASC').all()
  res.json(tasks.map(t => ({ ...t, done: !!t.done })))
})

// 追加
app.post('/api/tasks', (req, res) => {
  const { text, priority = 'medium' } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })
  if (!VALID_PRIORITIES.has(priority)) return res.status(400).json({ error: 'invalid priority' })
  const result = db.prepare('INSERT INTO tasks (text, priority) VALUES (?, ?)').run(text.trim(), priority)
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ ...task, done: !!task.done })
})

// 更新（完了トグル／テキスト編集／優先度変更）
app.patch('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'not found' })
  const done     = req.body.done     !== undefined ? (req.body.done ? 1 : 0) : task.done
  const text     = req.body.text     !== undefined ? req.body.text.trim()    : task.text
  const priority = req.body.priority !== undefined ? req.body.priority       : task.priority
  if (!text) return res.status(400).json({ error: 'text is required' })
  if (!VALID_PRIORITIES.has(priority)) return res.status(400).json({ error: 'invalid priority' })
  db.prepare('UPDATE tasks SET done = ?, text = ?, priority = ? WHERE id = ?').run(done, text, priority, req.params.id)
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json({ ...updated, done: !!updated.done })
})

// 削除
app.delete('/api/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))
