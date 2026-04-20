// 優先度自動判定ロジック
// 判定結果は { priority, reason } を返す

const HIGH_KEYWORDS = [
  // 英語
  'bug', 'error', 'fix', 'crash', 'broken', 'urgent', 'critical', 'hotfix',
  'down', 'fail', 'exception', 'null', 'undefined', 'panic', 'alert', 'incident',
  // 日本語
  'バグ', 'エラー', '修正', 'クラッシュ', '緊急', '障害', '落ちる', '止まる',
  '本番', '死んでる', '動かない', '壊れ',
]

const LOW_KEYWORDS = [
  // 英語
  'refactor', 'cleanup', 'chore', 'docs', 'document', 'readme', 'typo',
  'comment', 'lint', 'format', 'style', 'todo', 'someday', 'maybe',
  // 日本語
  'リファクタ', 'ドキュメント', 'コメント', '整理', 'メモ', 'そのうち', 'いつか',
]

function parseDueDate(dueDateStr) {
  if (!dueDateStr) return null
  const now = new Date()
  const d = dueDateStr.toLowerCase()

  if (d === 'today')    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)
  if (d === 'tomorrow') return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59)

  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const widx = weekdays.findIndex(w => d.startsWith(w))
  if (widx !== -1) {
    const diff = (widx - now.getDay() + 7) % 7 || 7
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 23, 59)
  }

  if (d === 'next-week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59)

  const parsed = new Date(dueDateStr)
  return isNaN(parsed) ? null : parsed
}

export function autoPriority(text, dueDate = null) {
  const lower = text.toLowerCase()

  // 締め切りが今日 → 強制高
  const due = parseDueDate(dueDate)
  if (due) {
    const now = new Date()
    const diffDays = (due - now) / (1000 * 60 * 60 * 24)
    if (diffDays <= 1) return { priority: 'high',   reason: '締め切りが今日/明日のため自動で「高」に設定' }
    if (diffDays <= 3) return { priority: 'high',   reason: '締め切りまで3日以内のため自動で「高」に設定' }
    if (diffDays <= 7) return { priority: 'medium', reason: '締め切りまで1週間以内のため自動で「中」に設定' }
  }

  // キーワード判定（高）
  const highHit = HIGH_KEYWORDS.find(k => lower.includes(k))
  if (highHit) return { priority: 'high', reason: `キーワード「${highHit}」を検出したため自動で「高」に設定` }

  // キーワード判定（低）
  const lowHit = LOW_KEYWORDS.find(k => lower.includes(k))
  if (lowHit) return { priority: 'low', reason: `キーワード「${lowHit}」を検出したため自動で「低」に設定` }

  return { priority: 'medium', reason: '自動判定: 特記事項なし → 「中」に設定' }
}

// 過去日付かどうかを判定するフラグ付きで返す
export function parseDueDateExport(str) {
  const d = parseDueDate(str)
  if (!d) return { date: null, isPast: false }
  const isPast = d < new Date()
  return { date: d.toISOString().slice(0, 10), isPast }
}
