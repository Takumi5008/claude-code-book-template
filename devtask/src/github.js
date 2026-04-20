import fetch from 'node-fetch'
import { debug } from './debug.js'
import { autoPriority } from './priority.js'

const GH_API = 'https://api.github.com'

export function getToken() {
  return process.env.DEVTASK_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? null
}

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function fetchIssues(owner, repo, { state = 'open', labels = '' } = {}) {
  const token = getToken()
  if (!token) {
    throw new Error(
      'GitHubトークンが設定されていません\n' +
      '  export DEVTASK_GITHUB_TOKEN=<your_token> を実行してください\n' +
      '  トークンは https://github.com/settings/tokens で発行できます（repo スコープが必要）'
    )
  }

  const params = new URLSearchParams({ state, per_page: '100' })
  if (labels) params.set('labels', labels)

  const url = `${GH_API}/repos/${owner}/${repo}/issues?${params}`
  debug(`GitHub API: GET ${url}`)

  const res = await fetch(url, { headers: headers(token) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`GitHub API エラー ${res.status}: ${body.message ?? res.statusText}`)
  }

  const issues = await res.json()
  return issues.filter(i => !i.pull_request)
}

// ラベルからdevTaskの優先度にマッピング
const HIGH_LABELS = new Set(['critical', 'urgent', 'priority:high', 'bug', 'p0', 'p1'])
const LOW_LABELS  = new Set(['priority:low', 'enhancement', 'documentation', 'chore', 'p3'])

function mapPriority(issue) {
  const labels = issue.labels.map(l => l.name.toLowerCase())
  if (labels.some(l => HIGH_LABELS.has(l))) {
    return { priority: 'high', reason: `GitHubラベル [${labels.join(', ')}] から「高」に設定` }
  }
  if (labels.some(l => LOW_LABELS.has(l))) {
    return { priority: 'low', reason: `GitHubラベル [${labels.join(', ')}] から「低」に設定` }
  }
  return autoPriority(issue.title)
}

export function issueToTask(issue, owner, repo) {
  const { priority, reason } = mapPriority(issue)
  const dueDate = issue.milestone?.due_on
    ? issue.milestone.due_on.slice(0, 10)
    : null

  const labelTags = issue.labels
    .map(l => l.name.replace(/[\s/]+/g, '-').toLowerCase())
    .slice(0, 3)

  const tags = [...new Set(['github', `${owner}-${repo}`, ...labelTags])].slice(0, 5)

  return {
    text:           `[#${issue.number}] ${issue.title}`,
    priority,
    priorityReason: reason,
    priorityManual: false,
    tags,
    dueDate,
  }
}
