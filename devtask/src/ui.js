import chalk from 'chalk'

export const PRIORITY_LABEL = {
  high:   chalk.bold.red('高'),
  medium: chalk.bold.yellow('中'),
  low:    chalk.bold.green('低'),
}

export const PRIORITY_COLOR = {
  high:   chalk.red,
  medium: chalk.yellow,
  low:    chalk.green,
}

export function formatTask(task, { showReason = false } = {}) {
  const done   = task.done ? chalk.gray('✓') : chalk.blue('○')
  const id     = chalk.dim(`#${String(task.id).padStart(3, '0')}`)
  const pri    = PRIORITY_LABEL[task.priority] ?? task.priority
  const text   = task.done ? chalk.strikethrough.gray(task.text) : task.text
  const tags   = task.tags ? chalk.cyan(task.tags.split(',').filter(Boolean).map(t => `#${t}`).join(' ')) : ''
  const due    = task.due_date ? chalk.magenta(` 期限:${task.due_date}`) : ''
  const manual = task.priority_manual ? chalk.dim(' [手動]') : chalk.dim(' [自動]')

  let line = `${done} ${id} [${pri}]${manual} ${text}`
  if (tags) line += `  ${tags}`
  if (due)  line += due

  if (showReason && task.priority_reason) {
    line += `\n       ${chalk.dim('→ ' + task.priority_reason)}`
  }

  return line
}

export function printHeader(title) {
  console.log()
  console.log(chalk.bold.cyan(`  devTask — ${title}`))
  console.log(chalk.dim('  ' + '─'.repeat(50)))
}

export function printSuccess(msg) { console.log(chalk.green('  ✓ ') + msg) }
export function printError(msg)   { console.log(chalk.red('  ✗ ') + msg) }
export function printInfo(msg)    { console.log(chalk.dim('  → ') + msg) }
