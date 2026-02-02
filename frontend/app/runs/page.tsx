'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { apiGet } from '@/app/lib/api'
import { RunModel, RunStatus } from '@/app/lib/types'
import { useTaskHubUpdates } from '@/app/hooks/useTaskHubUpdates'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import RunColumn from '@/app/components/RunColumn'
import EmptyState from '@/app/components/EmptyState'

export default function RunDashboard() {
  const { isAuthenticated } = useAuth()
  const [runs, setRuns] = useState<RunModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    apiGet('/runs')
      .then((data: RunModel[]) => setRuns(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const { updates: runUpdates } = useTaskHubUpdates()

  useEffect(() => {
    if (!runUpdates?.length) return

    setRuns(prev => {
      const updatedRuns = [...prev]

      runUpdates.forEach(update => {
        const existingIndex = updatedRuns.findIndex(r => r.id === update.runId)
        const runData = {
          id: update.runId,
          userId: update.userId,
          taskId: '',
          planId: '',
          status: update.status,
          result: update.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        if (existingIndex >= 0) {
          updatedRuns[existingIndex] = { ...updatedRuns[existingIndex], ...runData }
        } else {
          updatedRuns.push(runData)
        }
      })

      return updatedRuns
    })
  }, [runUpdates])

  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      const aTime = a.updatedAt ?? a.createdAt
      const bTime = b.updatedAt ?? b.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [runs])

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