import { listTasks, checkTaskCount } from '../db.js'
import { formatTask, printHeader, printInfo, printError } from '../ui.js'
import chalk from 'chalk'

const VALID_STATUSES   = new Set(['all', 'active', 'done'])
const VALID_PRIORITIES = new Set(['all', 'high', 'medium', 'low'])

export function cmdList(options) {
  const status   = options.status   ?? 'active'
  const priority = options.priority ?? 'all'

  if (!VALID_STATUSES.has(status)) {
    printError('ステータスは all / active / done で指定してください')
    process.exit(1)
  }
  if (!VALID_PRIORITIES.has(priority)) {
    printError('優先度は high / medium / low / all で指定してください')
    process.exit(1)
  }

  checkTaskCount()

  const tasks = listTasks({ status, priority, tag: options.tag })

  const label = status === 'active' ? '未完了タスク'
              : status === 'done'   ? '完了済みタスク'
              : 'すべてのタスク'
  printHeader(label)

  if (tasks.length === 0) {
    printInfo('該当するタスクがありません')
    console.log()
    return
  }

  const showReason = !!options.reason
  for (const task of tasks) {
    console.log('  ' + formatTask(task, { showReason }))
  }

  const active = tasks.filter(t => !t.done).length
  const done   = tasks.filter(t =>  t.done).length
  console.log()
  console.log(chalk.dim(`  未完了: ${active}件  完了: ${done}件  合計: ${tasks.length}件`))
  console.log()
}
