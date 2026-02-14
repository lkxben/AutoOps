'use client'

import { useEffect, useState } from 'react'
import { TaskModel, RunModel } from '@/app/lib/types'
import { apiGet } from '@/app/lib/api'
import TaskRunCard from '@/app/components/TaskRunCard'
import { toast } from 'sonner'
import CenteredMessage from './CenteredMessage'
import LoadingScreen from '../loading'

interface TaskRunsSectionProps {
  task: TaskModel
}

export default function TaskRunsSection({ task }: TaskRunsSectionProps) {
  const [runs, setRuns] = useState<RunModel[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task?.id) return

    setLoading(true)

    apiGet(`/tasks/${task.id}/runs`)
      .then((data: RunModel[]) => {
        setRuns(data)
      })
      .catch(err => {
        toast.error('Failed to load runs')
      })
      .finally(() => setLoading(false))
  }, [task.id])

  if (loading) {
    return <LoadingScreen />
  }

  if (!runs.length) {
    return <CenteredMessage>No runs found.</CenteredMessage>
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map(run => (
        <TaskRunCard key={run.id} run={run} />
      ))}
    </div>
  )
}