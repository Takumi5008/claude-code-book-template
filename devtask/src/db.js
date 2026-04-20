import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import { homedir } from 'os'
import { debug } from './debug.js'

const DATA_DIR = process.env.DEVTASK_DB_PATH
  ? dirname(process.env.DEVTASK_DB_PATH)
  : join(homedir(), '.devtask')
mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = process.env.DEVTASK_DB_PATH ?? join(DATA_DIR, 'tasks.db')
export const db = new Database(DB_PATH)
debug(`DB: ${DB_PATH}`)

// スキーマ作成
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    text            TEXT    NOT NULL,
    done            INTEGER NOT NULL DEFAULT 0,
    priority        TEXT    NOT NULL DEFAULT 'medium',
    priority_reason TEXT,
    priority_manual INTEGER NOT NULL DEFAULT 0,
    tags            TEXT    NOT NULL DEFAULT '',
    due_date        TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    done_at         TEXT
  )
`)

// マイグレーション：将来のカラム追加はここに追記
const cols = db.prepare('PRAGMA table_info(tasks)').all().map(c => c.name)
debug(`columns: ${cols.join(', ')}`)

// 1000件超の警告（仕様書 7.1）
export function checkTaskCount() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE done = 0').get()
  if (count > 1000) {
    console.warn(`  ⚠  未完了タスクが ${count} 件あります。パフォーマンスが低下する可能性があります。`)
  }
}

// ---- バリデーション ----

const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])

export function validatePriority(p) {
  if (!VALID_PRIORITIES.has(p)) {
    throw new Error('優先度は high / medium / low で指定してください')
  }
}

export function validateTags(tags) {
  if (tags.length > 5) {
    throw new Error('タグは最大5件まで指定できます')
  }
  for (const t of tags) {
    if (t.length > 20) {
      throw new Error(`タグ「${t}」は20文字以内で指定してください`)
    }
    if (/\s/.test(t)) {
      throw new Error(`タグ「${t}」にスペースは使用できません`)
    }
  }
}

// タグを正規化（小文字化・重複排除）
export function normalizeTags(tags) {
  return [...new Set(tags.map(t => t.toLowerCase()))]
}

// ---- CRUD ----

export function addTask({ text, priority, priorityReason, priorityManual = false, tags = [], dueDate }) {
  debug(`addTask: ${JSON.stringify({ text, priority, tags, dueDate })}`)
  const normalized = normalizeTags(tags)
  const stmt = db.prepare(`
    INSERT INTO tasks (text, priority, priority_reason, priority_manual, tags, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(text, priority, priorityReason, priorityManual ? 1 : 0, normalized.join(','), dueDate ?? null)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
}

export function listTasks({ status = 'all', priority = 'all', tag } = {}) {
  let query = 'SELECT * FROM tasks WHERE 1=1'
  const params = []
  if (status === 'active') { query += ' AND done = 0' }
  if (status === 'done')   { query += ' AND done = 1' }
  if (priority !== 'all')  { query += ' AND priority = ?'; params.push(priority) }
  if (tag)                 { query += ' AND tags LIKE ?';  params.push(`%${tag.toLowerCase()}%`) }
  query += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at ASC"
  debug(`listTasks query: ${query} params: ${JSON.stringify(params)}`)
  return db.prepare(query).all(...params)
}

export function getTask(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function markDone(id) {
  db.prepare("UPDATE tasks SET done = 1, done_at = datetime('now','localtime') WHERE id = ?").run(id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function deleteTask(id) {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}

export function updateTask(id, fields) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  if (!task) return null
  const text     = fields.text     ?? task.text
  const priority = fields.priority ?? task.priority
  const reason   = fields.priorityReason ?? task.priority_reason
  const manual   = fields.priorityManual !== undefined ? (fields.priorityManual ? 1 : 0) : task.priority_manual
  const tags     = fields.tags !== undefined ? normalizeTags(fields.tags).join(',') : task.tags
  const due      = fields.dueDate !== undefined ? fields.dueDate : task.due_date
  debug(`updateTask #${id}: ${JSON.stringify({ text, priority, tags, due })}`)
  db.prepare(`
    UPDATE tasks SET text=?, priority=?, priority_reason=?, priority_manual=?, tags=?, due_date=? WHERE id=?
  `).run(text, priority, reason, manual, tags, due, id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}
