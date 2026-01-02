'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { apiGet } from '@/app/lib/api'
import { TaskStatus, getTaskStatusLabel } from '@/app/lib/taskStatus'
import { useTaskHubUpdates } from '@/app/hooks/useTaskHubUpdates'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import { useRouter } from 'next/navigation'
import TaskCard from '../components/TaskCard'

type TaskModel = {
  id: string
  userId: string
  inputData: string
  status: number
  result?: string
}

export default function TaskSummaryDashboard() {
  const { token } = useAuth()
  const router = useRouter()
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

  const { taskUpdates } = useTaskHubUpdates()

  useEffect(() => {
    if (!taskUpdates || !taskUpdates.length) return

    setTasks(prev => {
      const updated = [...prev]
      taskUpdates.forEach(payload => {
        const idx = updated.findIndex(t => t.id === payload.task_id)
        const taskData = {
          id: payload.task_id,
          status: payload.status,
          inputData: payload.description,
        }
        if (idx !== -1) updated[idx] = { ...updated[idx], ...taskData }
        else updated.push(taskData)
      })
      return updated
    })
  }, [taskUpdates])

  if (loading) return <LoadingScreen />
  if (error) return <Error error={error} />

  if (!tasks.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-gray-600 text-lg">No tasks found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}