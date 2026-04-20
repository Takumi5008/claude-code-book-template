import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// テスト用DBを ~/.devtask とは分離する
const TEST_DB_DIR  = join(tmpdir(), `devtask-test-${process.pid}`)
const TEST_DB_PATH = join(TEST_DB_DIR, 'tasks.db')

// db.js はモジュールロード時にDBを開くため、env を先に設定する
process.env.DEVTASK_DB_PATH = TEST_DB_PATH
mkdirSync(TEST_DB_DIR, { recursive: true })

// env 設定後にインポート
const { validatePriority, validateTags, normalizeTags, addTask, getTask, listTasks, markDone, deleteTask, updateTask } =
  await import('../src/db.js')

afterAll(() => {
  rmSync(TEST_DB_DIR, { recursive: true, force: true })
})

// ─── バリデーション ────────────────────────────────────────────────

describe('validatePriority', () => {
  it.each(['high', 'medium', 'low'])('"%s" は有効', (p) => {
    expect(() => validatePriority(p)).not.toThrow()
  })

  it.each(['urgent', 'HIGH', '', '1'])('"%s" は無効でエラー', (p) => {
    expect(() => validatePriority(p)).toThrow('優先度は high / medium / low で指定してください')
  })
})

describe('validateTags', () => {
  it('5件以下は通過', () => {
    expect(() => validateTags(['a', 'b', 'c', 'd', 'e'])).not.toThrow()
  })

  it('6件以上はエラー', () => {
    expect(() => validateTags(['a', 'b', 'c', 'd', 'e', 'f']))
      .toThrow('タグは最大5件まで指定できます')
  })

  it('21文字以上のタグはエラー', () => {
    expect(() => validateTags(['a'.repeat(21)]))
      .toThrow('20文字以内')
  })

  it('スペースを含むタグはエラー', () => {
    expect(() => validateTags(['tag name']))
      .toThrow('スペースは使用できません')
  })

  it('空配列は通過', () => {
    expect(() => validateTags([])).not.toThrow()
  })
})

describe('normalizeTags', () => {
  it('大文字を小文字に変換する', () => {
    expect(normalizeTags(['Auth', 'BACKEND'])).toEqual(['auth', 'backend'])
  })

  it('重複を排除する', () => {
    expect(normalizeTags(['auth', 'Auth', 'AUTH'])).toEqual(['auth'])
  })

  it('空配列は空配列を返す', () => {
    expect(normalizeTags([])).toEqual([])
  })
})

// ─── CRUD ─────────────────────────────────────────────────────────

describe('addTask', () => {
  it('タスクが追加されIDが返る', () => {
    const task = addTask({ text: 'テストタスク', priority: 'medium', priorityReason: 'テスト' })
    expect(task.id).toBeTypeOf('number')
    expect(task.text).toBe('テストタスク')
    expect(task.priority).toBe('medium')
    expect(task.done).toBe(0)
  })

  it('タグが小文字化されて保存される', () => {
    const task = addTask({ text: 'タグテスト', priority: 'low', tags: ['Auth', 'API'] })
    expect(task.tags).toBe('auth,api')
  })

  it('手動フラグが保存される', () => {
    const task = addTask({ text: '手動タスク', priority: 'high', priorityManual: true })
    expect(task.priority_manual).toBe(1)
  })

  it('締め切りが保存される', () => {
    const task = addTask({ text: '期限付き', priority: 'high', dueDate: '2026-05-01' })
    expect(task.due_date).toBe('2026-05-01')
  })
})

describe('getTask', () => {
  it('存在するIDはタスクを返す', () => {
    const added = addTask({ text: 'getテスト', priority: 'medium' })
    const found = getTask(added.id)
    expect(found).not.toBeNull()
    expect(found.id).toBe(added.id)
  })

  it('存在しないIDはundefinedを返す', () => {
    expect(getTask(99999)).toBeUndefined()
  })
})

describe('markDone', () => {
  it('完了フラグが立つ', () => {
    const task = addTask({ text: '完了テスト', priority: 'low' })
    const done = markDone(task.id)
    expect(done.done).toBe(1)
    expect(done.done_at).not.toBeNull()
  })
})

describe('deleteTask', () => {
  it('削除に成功するとtrueを返す', () => {
    const task = addTask({ text: '削除テスト', priority: 'low' })
    expect(deleteTask(task.id)).toBe(true)
  })

  it('削除後はgetTaskでundefinedになる', () => {
    const task = addTask({ text: '削除後確認', priority: 'low' })
    deleteTask(task.id)
    expect(getTask(task.id)).toBeUndefined()
  })

  it('存在しないIDはfalseを返す', () => {
    expect(deleteTask(99999)).toBe(false)
  })
})

describe('updateTask', () => {
  it('テキストを更新できる', () => {
    const task = addTask({ text: '更新前', priority: 'medium' })
    const updated = updateTask(task.id, { text: '更新後' })
    expect(updated.text).toBe('更新後')
  })

  it('手動優先度は更新後も保持される', () => {
    const task = addTask({ text: '手動設定タスク', priority: 'high', priorityManual: true })
    const updated = updateTask(task.id, { text: 'テキスト変更のみ' })
    expect(updated.priority_manual).toBe(1)
  })

  it('存在しないIDはnullを返す', () => {
    expect(updateTask(99999, { text: '存在しない' })).toBeNull()
  })
})

describe('listTasks', () => {
  it('statusフィルターが機能する', () => {
    const t = addTask({ text: 'listテスト', priority: 'medium' })
    const active = listTasks({ status: 'active' })
    expect(active.some(x => x.id === t.id)).toBe(true)

    markDone(t.id)
    const done = listTasks({ status: 'done' })
    expect(done.some(x => x.id === t.id)).toBe(true)

    const stillActive = listTasks({ status: 'active' })
    expect(stillActive.some(x => x.id === t.id)).toBe(false)
  })

  it('priorityフィルターが機能する', () => {
    addTask({ text: '高優先', priority: 'high' })
    const high = listTasks({ priority: 'high' })
    expect(high.every(t => t.priority === 'high')).toBe(true)
  })

  it('tagフィルターが機能する', () => {
    addTask({ text: 'タグ付き', priority: 'medium', tags: ['frontend'] })
    const tagged = listTasks({ tag: 'frontend' })
    expect(tagged.some(t => t.tags.includes('frontend'))).toBe(true)
  })
})
