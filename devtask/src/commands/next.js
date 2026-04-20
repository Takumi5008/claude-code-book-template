import { listTasks } from '../db.js'
import { formatTask, printHeader, printInfo, printError } from '../ui.js'
import chalk from 'chalk'

export function cmdNext(options) {
  const limit = Number(options.limit ?? 5)
  if (isNaN(limit) || limit < 1 || limit > 50) {
    printError('表示件数は 1〜50 の整数で指定してください')
    process.exit(1)
  }

  const all = listTasks({ status: 'active' })

  if (all.length === 0) {
    printHeader('次にやること')
    printInfo('未完了タスクがありません')
    console.log()
    return
  }

  const now = Date.now()
  const scored = all.map(task => {
    let score = task.priority === 'high' ? 100 : task.priority === 'medium' ? 50 : 10

    if (task.due_date) {
      const diff = (new Date(task.due_date) - now) / (1000 * 60 * 60 * 24)
      if (diff <= 0) score += 200
      else if (diff <= 1) score += 100
      else if (diff <= 3) score += 60
      else if (diff <= 7) score += 30
    }

    const ageDays = (now - new Date(task.created_at)) / (1000 * 60 * 60 * 24)
    if (ageDays > 14) score += 20
    else if (ageDays > 7) score += 10

    return { task, score }
  })

  // 同点の場合は登録が古いタスクを優先（created_at 昇順）
  scored.sort((a, b) => b.score - a.score || new Date(a.task.created_at) - new Date(b.task.created_at))
  const top = scored.slice(0, limit)

  printHeader(`次にやること TOP ${limit}`)

  top.forEach(({ task, score }, i) => {
    const rank = chalk.bold.white(`  ${i + 1}.`)
    console.log(`${rank} ${formatTask(task, { showReason: true })}`)
    console.log(chalk.dim(`       スコア: ${score}`))
  })

  const remaining = all.length - top.length
  console.log()
  if (remaining > 0) {
    console.log(chalk.dim(`  残り ${remaining} 件が待機中`))
  }
  console.log()
}
