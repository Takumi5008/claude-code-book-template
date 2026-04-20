import { markDone, getTask } from '../db.js'
import { formatTask, printSuccess, printError } from '../ui.js'

export function cmdDone(id) {
  const task = getTask(Number(id))
  if (!task) { printError(`タスク #${id} が見つかりません`); return }
  if (task.done) { printError(`タスク #${id} はすでに完了しています`); return }

  const updated = markDone(Number(id))
  console.log()
  printSuccess('完了しました！')
  console.log('  ' + formatTask(updated))
  console.log()
}
