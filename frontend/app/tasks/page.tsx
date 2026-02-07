'use client'

import { useEffect, useState, useMemo } from 'react'
import { apiGet } from '@/app/lib/api'
import { TaskModel, RunModel } from '@/app/lib/types'
import TaskCard from '@/app/components/TaskCard'

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<TaskModel[]>([])
  const [runs, setRuns] = useState<RunModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([apiGet('/tasks'), apiGet('/runs')])
      .then(([tasksData, runsData]: [TaskModel[], RunModel[]]) => {
        setTasks(tasksData)
        setRuns(runsData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const lastRunMap = useMemo(() => {
    const map: Record<string, Date> = {}
    runs.forEach(run => {
      const runTime = new Date(run.updatedAt ?? run.createdAt)
      if (!map[run.taskId] || runTime > map[run.taskId]) {
        map[run.taskId] = runTime
      }
    })
    return map
  }, [runs])

  const handleRunCreated = (newRun: RunModel) => {
    setRuns(prev => [...prev, newRun])
  }

  if (loading) return <p className="text-[var(--color-cyan)] p-4">Loading tasks...</p>
  if (error) return <p className="text-red-500 p-4">Error: {error}</p>
  if (!tasks.length) return <p className="text-[var(--color-cyan)] p-4">No tasks yet.</p>

  return (
    <div className="flex flex-col gap-3 p-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          lastRun={lastRunMap[task.id]}
          onRunCreated={handleRunCreated}
        />
      ))}
    </div>
  )
}