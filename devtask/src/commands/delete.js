import { deleteTask, getTask } from '../db.js'
import { printSuccess, printError } from '../ui.js'
import chalk from 'chalk'

export function cmdDelete(id) {
  const task = getTask(Number(id))
  if (!task) { printError(`タスク #${id} が見つかりません`); return }

  const ok = deleteTask(Number(id))
  console.log()
  if (ok) printSuccess(`削除しました: ${chalk.dim(task.text)}`)
  else    printError('削除に失敗しました')
  console.log()
}
