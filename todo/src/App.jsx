import { useState, useEffect, useRef } from 'react'
import './App.css'

const FILTERS = [
  { key: 'all',    label: 'すべて' },
  { key: 'active', label: '未完了' },
  { key: 'done',   label: '完了済' },
]

const PRIORITIES = [
  { key: 'high',   label: '高', },
  { key: 'medium', label: '中', },
  { key: 'low',    label: '低', },
]

export default function App() {
  const [tasks, setTasks]     = useState([])
  const [input, setInput]     = useState('')
  const [inputPriority, setInputPriority] = useState('medium')
  const [filter, setFilter]         = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId]     = useState(null)
  const [editingText, setEditingText] = useState('')
  const inputRef   = useRef(null)
  const editingRef = useRef(null)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false) })
  }, [])

  useEffect(() => {
    if (editingId !== null) editingRef.current?.focus()
  }, [editingId])

  const addTask = async () => {
    const text = input.trim()
    if (!text) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, priority: inputPriority }),
    })
    const task = await res.json()
    setTasks(prev => [...prev, task])
    setInput('')
    inputRef.current?.focus()
  }

  const toggleDone = async (id, done) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  const changePriority = async (id, priority) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditingText(task.text)
  }

  const commitEdit = async (id) => {
    const text = editingText.trim()
    if (!text) { cancelEdit(); return }
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const updated = await res.json()
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const deleteTask = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => {
    const statusOk   = filter === 'all' ? true : filter === 'active' ? !t.done : t.done
    const priorityOk = priorityFilter === 'all' ? true : t.priority === priorityFilter
    return statusOk && priorityOk
  })

  const doneCount   = tasks.filter(t => t.done).length
  const activeCount = tasks.length - doneCount

  return (
    <div className="container">
      <h1>タスク管理</h1>

      <div className="input-row">
        <input
          ref={inputRef}
          value={input}
          placeholder="新しいタスクを入力..."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <div className="priority-select">
          {PRIORITIES.map(p => (
            <button
              key={p.key}
              className={`priority-btn priority-${p.key}${inputPriority === p.key ? ' active' : ''}`}
              onClick={() => setInputPriority(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className="add-btn" onClick={addTask}>追加</button>
      </div>

      <div className="filter-row">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <span className="filter-sep">|</span>
        <button
          className={`filter-btn${priorityFilter === 'all' ? ' active' : ''}`}
          onClick={() => setPriorityFilter('all')}
        >
          全優先度
        </button>
        {PRIORITIES.map(p => (
          <button
            key={p.key}
            className={`filter-btn priority-filter-btn priority-${p.key}${priorityFilter === p.key ? ' active' : ''}`}
            onClick={() => setPriorityFilter(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="empty">タスクがありません</p>
      ) : (
        <ul className="task-list">
          {filtered.map(task => (
            <li key={task.id} className={`task-item${task.done ? ' done' : ''}`}>
              <button
                className={`check-btn${task.done ? ' checked' : ''}`}
                onClick={() => toggleDone(task.id, task.done)}
                title="完了トグル"
              >
                {task.done ? '✓' : ''}
              </button>

              {editingId === task.id ? (
                <input
                  ref={editingRef}
                  className="edit-input"
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  commitEdit(task.id)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  onBlur={() => commitEdit(task.id)}
                />
              ) : (
                <span className="task-text">{task.text}</span>
              )}

              <div className="task-actions">
                <div className="priority-select inline">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.key}
                      className={`priority-btn priority-${p.key}${task.priority === p.key ? ' active' : ''}`}
                      onClick={() => changePriority(task.id, p.key)}
                      title={`優先度: ${p.label}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {editingId === task.id ? (
                  <button className="save-btn" onMouseDown={() => commitEdit(task.id)}>保存</button>
                ) : (
                  <button className="edit-btn" onClick={() => startEdit(task)}>編集</button>
                )}
                <button className="delete-btn" onClick={() => deleteTask(task.id)}>削除</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="summary">未完了: {activeCount} 件 ／ 完了: {doneCount} 件</p>
    </div>
  )
}
