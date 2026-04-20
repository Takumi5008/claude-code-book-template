import { addTask, validatePriority, validateTags } from '../db.js'
import { autoPriority, parseDueDateExport } from '../priority.js'
import { formatTask, printSuccess, printInfo, printError, PRIORITY_COLOR } from '../ui.js'

export function cmdAdd(text, options) {
  // バリデーション
  if (!text?.trim()) {
    printError('タスクのテキストを入力してください')
    process.exit(1)
  }

  if (options.priority) {
    try { validatePriority(options.priority) } catch (e) { printError(e.message); process.exit(1) }
  }

  const tags = options.tag
    ? options.tag.split(',').map(t => t.trim()).filter(Boolean)
    : []

  try { validateTags(tags) } catch (e) { printError(e.message); process.exit(1) }

  // 締め切りパース
  let dueDate = null
  if (options.due) {
    const { date, isPast } = parseDueDateExport(options.due)
    if (!date) {
      printError('日付形式が不正です (例: today / fri / 2026-05-01)')
      process.exit(1)
    }
    if (isPast) printInfo(`警告: 指定された締め切り（${date}）は過去の日付です`)
    dueDate = date
  }

  // 優先度判定
  let priority, priorityReason, priorityManual
  if (options.priority) {
    priority       = options.priority
    priorityReason = '手動で設定'
    priorityManual = true
  } else {
    const result   = autoPriority(text.trim(), options.due ?? null)
    priority       = result.priority
    priorityReason = result.reason
    priorityManual = false
  }

  const task = addTask({ text: text.trim(), priority, priorityReason, priorityManual, tags, dueDate })

  console.log()
  printSuccess('タスクを追加しました')
  console.log('  ' + formatTask(task))
  console.log()

  if (!options.priority) {
    const col = PRIORITY_COLOR[priority]
    const label = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'
    printInfo(`優先度自動判定: ${col(label)}`)
    printInfo(priorityReason)
  }
  console.log()
}
