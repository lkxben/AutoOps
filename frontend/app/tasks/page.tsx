'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { apiGet } from '@/app/lib/api'
import { TaskStatus } from '@/app/lib/types'
import { useTaskHubUpdates } from '@/app/hooks/useTaskHubUpdates'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import TaskSection from '../components/TaskSection'
import { TaskModel } from '@/app/lib/types'

export default function TaskSummaryDashboard() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<TaskModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    setLoading(true)
    setError(null)

    apiGet('/tasks', token)
      .then((data: TaskModel[]) => setTasks(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const { updates: taskUpdates } = useTaskHubUpdates()

  useEffect(() => {
    if (!taskUpdates?.length) return

    setTasks(prev =>
      prev.map(task => {
        const update = taskUpdates.find(u => u.task_id === task.id)
        if (!update) return task

        return {
          ...task,
          status: update.status,
          result: update.description,
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }, [taskUpdates])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aTime = a.updatedAt ?? a.createdAt
      const bTime = b.updatedAt ?? b.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [tasks])

  const upcoming = sortedTasks.filter(t =>
    [TaskStatus.Pending, TaskStatus.Drafted, TaskStatus.Finalized].includes(t.status)
  )

  const running = sortedTasks.filter(t => t.status === TaskStatus.Running)

  const finished = sortedTasks.filter(t =>
    [TaskStatus.Completed, TaskStatus.Failed].includes(t.status)
  )

  if (loading) return <LoadingScreen />
  if (error) return <Error error={error} />

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      <TaskSection title="Upcoming" tasks={upcoming} />
      <TaskSection title="Running" tasks={running} />
      <TaskSection title="Finished" tasks={finished} />
    </div>
  )
}