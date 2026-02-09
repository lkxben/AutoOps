'use client'

import { useEffect, useState } from 'react'
import { TaskModel, RunModel } from '@/app/lib/types'
import { apiGet } from '@/app/lib/api'
import TaskRunCard from '@/app/components/TaskRunCard'

interface TaskRunsSectionProps {
  task: TaskModel
}

export default function TaskRunsSection({ task }: TaskRunsSectionProps) {
  const [runs, setRuns] = useState<RunModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!task?.id) return

    setLoading(true)
    setError(null)

    apiGet(`/tasks/${task.id}/runs`)
      .then((data: RunModel[]) => {
        setRuns(data)
      })
      .catch(err => {
        console.error('Failed to fetch runs', err)
        setError(err.message ?? 'Failed to load runs')
      })
      .finally(() => setLoading(false))
  }, [task.id])

  if (loading) {
    return <p className="text-sm text-gray-500 py-4">Loading runs…</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 py-4">{error}</p>
  }

  if (!runs.length) {
    return <p className="text-sm text-gray-400 py-4">No runs yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map(run => (
        <TaskRunCard key={run.id} run={run} />
      ))}
    </div>
  )
}