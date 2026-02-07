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

  const taskRunsMap = useMemo(() => {
    const map: Record<string, RunModel[]> = {}
    runs.forEach(run => {
      if (!map[run.taskId]) map[run.taskId] = []
      map[run.taskId].push(run)
    })
    return map
  }, [runs])

  const tasksWithLastRun = useMemo(() => {
    return tasks.map(task => {
      const taskRuns = taskRunsMap[task.id] || []
      const latestRun = taskRuns.length
        ? taskRuns.reduce((prev, curr) => {
            const prevTime = new Date(prev.updatedAt ?? prev.createdAt).getTime()
            const currTime = new Date(curr.updatedAt ?? curr.createdAt).getTime()
            return currTime > prevTime ? curr : prev
          })
        : null

      return {
        ...task,
        lastRun: latestRun ? new Date(latestRun.updatedAt ?? latestRun.createdAt) : undefined,
      }
    })
  }, [tasks, taskRunsMap])

  if (loading) return <p className="text-[var(--color-cyan)] p-4">Loading tasks...</p>
  if (error) return <p className="text-red-500 p-4">Error: {error}</p>
  if (!tasks.length) return <p className="text-[var(--color-cyan)] p-4">No tasks yet.</p>

  return (
    <div className="flex flex-col gap-3 p-4">
      {tasksWithLastRun.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onRunClick={() => alert(`Run ${task.title}`)}
        />
      ))}
    </div>
  )
}