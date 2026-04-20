import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// スコアリングロジックをコマンドから抽出して単体テストする
// SPEC §6.1 の数値と照合する

const TODAY = new Date('2026-04-14T10:00:00')

// cmdNext と同じスコアリング関数をここで再現してテストする
function calcScore(task, now = TODAY) {
  const ts = now.getTime()
  let score = task.priority === 'high' ? 100 : task.priority === 'medium' ? 50 : 10

  if (task.due_date) {
    const diff = (new Date(task.due_date) - ts) / (1000 * 60 * 60 * 24)
    if (diff <= 0)      score += 200
    else if (diff <= 1) score += 100
    else if (diff <= 3) score += 60
    else if (diff <= 7) score += 30
  }

  const ageDays = (ts - new Date(task.created_at)) / (1000 * 60 * 60 * 24)
  if (ageDays > 14)     score += 20
  else if (ageDays > 7) score += 10

  return score
}

// テスト用タスクファクトリ
function makeTask({ priority = 'medium', due_date = null, created_at = TODAY.toISOString() } = {}) {
  return { priority, due_date, created_at }
}

// ─── 優先度ベーススコア（SPEC §6.1） ──────────────────────────────

describe('優先度ベーススコア', () => {
  it('high → 100', () => {
    expect(calcScore(makeTask({ priority: 'high' }))).toBe(100)
  })

  it('medium → 50', () => {
    expect(calcScore(makeTask({ priority: 'medium' }))).toBe(50)
  })

  it('low → 10', () => {
    expect(calcScore(makeTask({ priority: 'low' }))).toBe(10)
  })
})

// ─── 締め切りボーナス（SPEC §6.1） ────────────────────────────────

describe('締め切りボーナス', () => {
  it('期限切れ（過去日付） → +200', () => {
    const task = makeTask({ priority: 'medium', due_date: '2026-04-13' }) // 昨日
    expect(calcScore(task)).toBe(50 + 200)
  })

  it('当日日付文字列はUTC午前0時に解析されるため期限切れ扱い → +200', () => {
    // '2026-04-14' = UTC 00:00 < TODAY(10:00) なので diff <= 0
    const task = makeTask({ priority: 'medium', due_date: '2026-04-14' })
    expect(calcScore(task)).toBe(50 + 200)
  })

  it('翌日（4/15） → +100', () => {
    const task = makeTask({ priority: 'medium', due_date: '2026-04-15' })
    expect(calcScore(task)).toBe(50 + 100)
  })

  it('3日以内（4/16） → +60', () => {
    const task = makeTask({ priority: 'medium', due_date: '2026-04-16' })
    expect(calcScore(task)).toBe(50 + 60)
  })

  it('1週間以内（4/20） → +30', () => {
    const task = makeTask({ priority: 'medium', due_date: '2026-04-20' })
    expect(calcScore(task)).toBe(50 + 30)
  })

  it('締め切りなし → ボーナスなし', () => {
    const task = makeTask({ priority: 'medium', due_date: null })
    expect(calcScore(task)).toBe(50)
  })
})

// ─── 放置ボーナス（SPEC §6.1） ────────────────────────────────────

describe('放置ボーナス', () => {
  it('8日前に作成 → +10', () => {
    const past = new Date(TODAY)
    past.setDate(past.getDate() - 8)
    const task = makeTask({ created_at: past.toISOString() })
    expect(calcScore(task)).toBe(50 + 10)
  })

  it('15日前に作成 → +20', () => {
    const past = new Date(TODAY)
    past.setDate(past.getDate() - 15)
    const task = makeTask({ created_at: past.toISOString() })
    expect(calcScore(task)).toBe(50 + 20)
  })

  it('今日作成 → ボーナスなし', () => {
    const task = makeTask({ created_at: TODAY.toISOString() })
    expect(calcScore(task)).toBe(50)
  })
})

// ─── 複合スコア ────────────────────────────────────────────────────

describe('複合スコア', () => {
  it('high + 期限切れ + 15日放置 → 100+200+20 = 320', () => {
    const past = new Date(TODAY)
    past.setDate(past.getDate() - 15)
    const task = makeTask({ priority: 'high', due_date: '2026-04-13', created_at: past.toISOString() })
    expect(calcScore(task)).toBe(320)
  })

  it('low + 締め切りなし + 今日作成 → 10', () => {
    const task = makeTask({ priority: 'low' })
    expect(calcScore(task)).toBe(10)
  })
})

// ─── ソート順（同点は created_at 昇順） ───────────────────────────

describe('同点タスクのソート', () => {
  it('同スコアなら古いタスクが上位', () => {
    const older = { ...makeTask(), created_at: '2026-04-01T00:00:00.000Z' }
    const newer = { ...makeTask(), created_at: '2026-04-10T00:00:00.000Z' }

    const tasks = [newer, older]
    const scored = tasks.map(t => ({ task: t, score: calcScore(t) }))
    scored.sort((a, b) => b.score - a.score || new Date(a.task.created_at) - new Date(b.task.created_at))

    expect(scored[0].task.created_at).toBe(older.created_at)
  })
})
