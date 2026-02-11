'use client'

import { useEffect, useState, useMemo } from 'react'
import { TaskModel, RunModel, ScheduleModel } from '@/app/lib/types'
import { apiGet, apiPost } from '@/app/lib/api'
import TimeAgo from 'react-timeago'
import { formatter } from '@/app/lib/timeago'
import { toast } from 'sonner'

type TaskCardProps = {
  task: TaskModel & { schedule?: string }
  schedules: ScheduleModel[]
  onClick?: () => void
}

export default function TaskCard({ task, schedules, onClick }: TaskCardProps) {
  const [latestRun, setLatestRun] = useState<RunModel | null>(null)
  const [loadingRun, setLoadingRun] = useState(false)

  useEffect(() => {
    setLoadingRun(true)
    apiGet(`/tasks/${task.id}/runs?latest=true`)
      .then((runs: RunModel[]) => {
        if (runs.length) setLatestRun(runs[0])
      })
      .catch(err => {
        toast.error('Failed to fetch latest run')
      })
      .finally(() => setLoadingRun(false))
  }, [task.id])

  const lastRunTime = useMemo(() => {
    const scheduleLastRuns = schedules
      .map(s => s.lastRunAt)
      .filter((t): t is string => !!t)
      .map(t => new Date(t))

    const times = [...scheduleLastRuns]
    if (latestRun) {
      times.push(new Date(latestRun.updatedAt ?? latestRun.createdAt))
    }

    if (!times.length) return null
    return new Date(Math.max(...times.map(d => d.getTime())))
  }, [schedules, latestRun])

  const nextRun = useMemo(() => {
    const now = Date.now()
    const times = schedules
      .map(s => s.nextRunAt ? new Date(s.nextRunAt).getTime() : null)
      .filter((t): t is number => t !== null && t > now)
    if (!times.length) return null
    return new Date(Math.min(...times))
  }, [schedules])

  const handleRunClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await apiPost('/runs', { taskId: task.id })
      if (response && response.id) {
        setLatestRun(response)
      }
    } catch (err: any) {
      toast.error('Failed to start run')
    }
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl transition w-[95%] min-w-[24rem] mx-auto py-6 px-8 hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-4">
        <div className="flex flex-col items-start min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{task.title || 'Untitled task'}</h2>
          <span className="text-xs text-gray-400 font-mono truncate">ID: {task.id.slice(0, 8)}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase">Last Run</span>
          <span className="text-xs text-gray-500 text-center">
            {loadingRun ? 'Loading...' : lastRunTime ? <TimeAgo date={lastRunTime} formatter={formatter} /> : '-'}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase">Next Run</span>
          <span className="text-xs text-gray-500 text-center">
              {nextRun
              ? nextRun.getTime() <= Date.now()
                ? 'Running'
                : <TimeAgo date={nextRun} formatter={formatter} />
              : '-'}
          </span>
        </div>

        <div className="flex justify-end">
          <button
            className="px-4 py-1 rounded-xl text-sm font-medium bg-cyan-300 text-white hover:bg-cyan-400"
            onClick={handleRunClick}
          >
            Run
          </button>
        </div>
      </div>
    </div>
  )
}