'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { apiGet } from '@/app/lib/api'
import { RunModel, RunStatus, TaskModel } from '@/app/lib/types'
import { useTaskHubUpdates } from '@/app/hooks/useTaskHubUpdates'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import RunColumn from '@/app/components/RunColumn'
import EmptyState from '@/app/components/EmptyState'

export default function RunDashboard() {
  const { isAuthenticated } = useAuth()
  const [runs, setRuns] = useState<RunModel[]>([])
  const [tasks, setTasks] = useState<TaskModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([apiGet('/runs'), apiGet('/tasks')])
      .then(([runsData, tasksData]: [RunModel[], TaskModel[]]) => {
        setRuns(runsData)
        setTasks(tasksData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const taskMap = useMemo(() => {
    const map: Record<string, TaskModel> = {}
    tasks.forEach(t => (map[t.id] = t))
    return map
  }, [tasks])

  const enrichedRuns = useMemo(() => {
    return runs.map(r => ({
      ...r,
      task: taskMap[r.taskId],
    }))
  }, [runs, taskMap])

  const { updates: runUpdates } = useTaskHubUpdates()

  useEffect(() => {
    if (!runUpdates?.length) return

    runUpdates.forEach(async update => {
      setRuns(prev => {
        const existingIndex = prev.findIndex(r => r.id === update.runId)
        if (existingIndex >= 0) {
          const updatedRun = {
            ...prev[existingIndex],
            status: update.status,
            result: update.description,
            updatedAt: new Date().toISOString(),
          }
          const newRuns = [...prev]
          newRuns[existingIndex] = updatedRun
          return newRuns
        } else {
          const newRun: RunModel = {
            id: update.runId,
            userId: update.userId,
            taskId: update.taskId,
            planId: '',
            status: update.status,
            result: update.description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          if (!taskMap[update.taskId]) {
            apiGet(`/tasks/${update.taskId}`)
            .then((task: TaskModel) => {
              setTasks(prevTasks => [...prevTasks, task])
            })
            .catch(err => console.error('Failed to fetch task for new run:', err))
          }

          return [...prev, newRun]
        }
      })
    })
  }, [runUpdates, taskMap])

  const sortedRuns = useMemo(() => {
    return [...enrichedRuns].sort((a, b) => {
      const aTime = a.updatedAt ?? a.createdAt
      const bTime = b.updatedAt ?? b.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [enrichedRuns])

  const upcoming = sortedRuns.filter(r => r.status === RunStatus.Pending)
  const running = sortedRuns.filter(r => r.status === RunStatus.Running)
  const finished = sortedRuns.filter(r =>
    [RunStatus.Completed, RunStatus.Failed].includes(r.status)
  )

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Error error="You must be logged in to view runs." />
  if (error) return <Error error={error} />
  if (!runs.length) {
    return <EmptyState message="No runs yet" />
  }

  return (
    <div className="flex flex-1 flex-row gap-4 w-full min-h-[calc(100vh-4rem)]">
      <RunColumn
        title="Upcoming"
        runs={upcoming}
        color="bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-200"
      />

      <RunColumn
        title="Running"
        runs={running}
        color="bg-gradient-to-r from-indigo-50 via-indigo-100 to-indigo-200"
      />

      <RunColumn
        title="Finished"
        runs={finished}
        color="bg-gradient-to-r from-green-50 via-green-100 to-red-100"
      />
    </div>
  )
}