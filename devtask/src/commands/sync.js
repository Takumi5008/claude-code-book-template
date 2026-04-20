import { fetchIssues, issueToTask, getToken } from '../github.js'
import { addTask, listTasks } from '../db.js'
import { printHeader, printSuccess, printError, printInfo, formatTask } from '../ui.js'
import chalk from 'chalk'

export async function cmdSync(repo, options) {
  // repo は "owner/repo" 形式
  const match = repo.match(/^([^/]+)\/([^/]+)$/)
  if (!match) {
    printError('リポジトリは owner/repo 形式で指定してください (例: devtask sync torvalds/linux)')
    process.exit(1)
  }
  const [, owner, repoName] = match

  if (!getToken()) {
    printError(
      'GitHubトークンが設定されていません\n' +
      '  export DEVTASK_GITHUB_TOKEN=<your_token>\n' +
      '  トークンは https://github.com/settings/tokens で発行できます（repo スコープが必要）'
    )
    process.exit(1)
  }

  printHeader(`GitHub Issues 同期: ${owner}/${repoName}`)
  printInfo('Issueを取得中...')

  let issues
  try {
    issues = await fetchIssues(owner, repoName, {
      state:  options.state  ?? 'open',
      labels: options.labels ?? '',
    })
  } catch (e) {
    printError(e.message)
    process.exit(1)
  }

  if (issues.length === 0) {
    printInfo('取得できるIssueがありませんでした')
    console.log()
    return
  }

  printInfo(`${issues.length} 件のIssueを取得しました`)
  console.log()

  // 既存タスクのテキストと照合して重複をスキップ
  const existing = listTasks({ status: 'all' })
  const existingTexts = new Set(existing.map(t => t.text))

  let added = 0
  let skipped = 0

  for (const issue of issues) {
    const taskData = issueToTask(issue, owner, repoName)

    if (existingTexts.has(taskData.text)) {
      skipped++
      continue
    }

    if (options.dryRun) {
      console.log(chalk.dim('  [dry-run] ') + formatTask({ ...taskData, id: 0, done: 0, priority_manual: 0, priority_reason: taskData.priorityReason, tags: taskData.tags.join(',') }))
      added++
      continue
    }

    const task = addTask(taskData)
    console.log('  ' + formatTask(task))
    added++
  }

  console.log()
  if (options.dryRun) {
    printInfo(`[dry-run] ${added} 件を追加予定、${skipped} 件はスキップ（既存）`)
    printInfo('実際に追加するには --dry-run オプションを外して実行してください')
  } else {
    printSuccess(`${added} 件を追加しました（${skipped} 件は既存のためスキップ）`)
  }
  console.log()
}
