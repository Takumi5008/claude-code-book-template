import { getTask, updateTask, validatePriority, validateTags } from '../db.js'
import { autoPriority, parseDueDateExport } from '../priority.js'
import { formatTask, printSuccess, printError, printInfo } from '../ui.js'

export function cmdEdit(id, options) {
  const task = getTask(Number(id))
  if (!task) { printError(`タスク #${id} が見つかりません`); process.exit(1) }

  if (!options.text && !options.priority && !options.due && !options.tag) {
    printError('変更する内容を --text / --priority / --due / --tag で指定してください')
    process.exit(1)
  }

  if (options.priority) {
    try { validatePriority(options.priority) } catch (e) { printError(e.message); process.exit(1) }
  }

  const tags = options.tag
    ? options.tag.split(',').map(t => t.trim()).filter(Boolean)
    : undefined

  if (tags !== undefined) {
    try { validateTags(tags) } catch (e) { printError(e.message); process.exit(1) }
  }

  let dueDate
  if (options.due) {
    const { date, isPast } = parseDueDateExport(options.due)
    if (!date) {
      printError('日付形式が不正です (例: today / fri / 2026-05-01)')
      process.exit(1)
    }
    if (isPast) printInfo(`警告: 指定された締め切り（${date}）は過去の日付です`)
    dueDate = date
  }

  const fields = {}
  if (options.text) fields.text = options.text.trim()
  if (tags !== undefined) fields.tags = tags
  if (dueDate !== undefined) fields.dueDate = dueDate

  if (options.priority) {
    fields.priority       = options.priority
    fields.priorityReason = '手動で変更'
    fields.priorityManual = true
  } else if (options.text && !task.priority_manual) {
    const result          = autoPriority(options.text.trim(), options.due ?? task.due_date)
    fields.priority       = result.priority
    fields.priorityReason = result.reason
    fields.priorityManual = false
  }

  const updated = updateTask(Number(id), fields)
  console.log()
  printSuccess('更新しました')
  console.log('  ' + formatTask(updated, { showReason: true }))
  console.log()
}
