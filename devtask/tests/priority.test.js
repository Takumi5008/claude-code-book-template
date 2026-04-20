import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { autoPriority } from '../src/priority.js'

// 現在日時を固定してテストを安定させる
const TODAY = new Date('2026-04-14T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── US-01: キーワードによる自動判定 ───────────────────────────────

describe('キーワード判定 — 高優先度', () => {
  it.each([
    ['ログインAPIのバグを修正する',    'バグ'],
    ['本番でエラーが発生している',     'エラー'],
    ['認証モジュールのfixが必要',      'fix'],
    ['サーバーがcrashしている',        'crash'],
    ['緊急: 決済処理が止まっている',   '緊急'],
    ['本番障害の対応',                 '障害'],
    ['APIがbrokenになっている',        'broken'],
    ['criticalなセキュリティ修正',     'critical'],
  ])('"%s" → high（検出キーワード: %s）', (text) => {
    const { priority } = autoPriority(text)
    expect(priority).toBe('high')
  })
})

describe('キーワード判定 — 低優先度', () => {
  it.each([
    ['認証モジュールのrefactor',   'refactor'],
    ['READMEを更新する',           'readme'],
    ['コードのcleanup',            'cleanup'],
    ['typoを直す',                 'typo'],
    ['リファクタリング: 認証周り', 'リファクタ'],
    ['ドキュメントを整理する',     'ドキュメント'],
    ['そのうちやる: ログ整理',     'そのうち'],
    ['lintの警告を解消する',        'lint'],
  ])('"%s" → low（検出キーワード: %s）', (text) => {
    const { priority } = autoPriority(text)
    expect(priority).toBe('low')
  })
})

describe('デフォルト判定', () => {
  it('キーワードなし・締め切りなし → medium', () => {
    const { priority } = autoPriority('ユーザー登録APIの実装')
    expect(priority).toBe('medium')
  })

  it('判定理由が返される', () => {
    const { reason } = autoPriority('ユーザー登録APIの実装')
    expect(reason).toBeTruthy()
    expect(typeof reason).toBe('string')
  })
})

// ─── 締め切りによる判定（SPEC §6.2） ──────────────────────────────

describe('締め切り判定', () => {
  it('today → high', () => {
    const { priority } = autoPriority('タスク', 'today')
    expect(priority).toBe('high')
  })

  it('tomorrow → high', () => {
    const { priority } = autoPriority('タスク', 'tomorrow')
    expect(priority).toBe('high')
  })

  it('3日以内（wed） → high', () => {
    // TODAY は 2026-04-14(火), wed = 4/15 = 1日後 → high
    const { priority } = autoPriority('タスク', 'wed')
    expect(priority).toBe('high')
  })

  it('1週間以内 → medium', () => {
    // next-week = 7日後
    const { priority } = autoPriority('タスク', 'next-week')
    expect(priority).toBe('medium')
  })

  it('YYYY-MM-DD（翌日） → high', () => {
    const { priority } = autoPriority('タスク', '2026-04-15')
    expect(priority).toBe('high')
  })

  it('YYYY-MM-DD（5日後） → medium', () => {
    const { priority } = autoPriority('タスク', '2026-04-19')
    expect(priority).toBe('medium')
  })
})

// ─── 判定優先順位: 締め切り > キーワード（SPEC §6.2） ─────────────

describe('判定優先順位: 締め切り > キーワード', () => {
  it('low キーワード + today → high（締め切りが勝つ）', () => {
    const { priority, reason } = autoPriority('refactorをそのうちやる', 'today')
    expect(priority).toBe('high')
    expect(reason).toMatch(/締め切り/)
  })

  it('締め切りなし + high キーワード → high（キーワードが適用される）', () => {
    const { priority, reason } = autoPriority('バグを修正する')
    expect(priority).toBe('high')
    expect(reason).toMatch(/キーワード/)
  })
})

// ─── 判定理由の表示（US-01 受け入れ条件） ─────────────────────────

describe('判定理由', () => {
  it('キーワード判定時は検出したキーワードを理由に含む', () => {
    const { reason } = autoPriority('バグを修正する')
    expect(reason).toContain('バグ')
  })

  it('締め切り判定時は締め切りに関する理由を返す', () => {
    const { reason } = autoPriority('タスク', 'today')
    expect(reason).toMatch(/締め切り/)
  })

  it('デフォルト判定でも理由が返される', () => {
    const { reason } = autoPriority('普通のタスク')
    expect(reason).toBeTruthy()
  })
})
