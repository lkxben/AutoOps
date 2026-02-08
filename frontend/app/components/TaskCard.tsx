'use client'

import { formatDistanceToNow } from 'date-fns'
import { TaskModel, RunModel } from '@/app/lib/types'
import { apiPost } from '@/app/lib/api'

type TaskCardProps = {
  task: TaskModel & { schedule?: string }
  lastRun?: Date
  onRunCreated?: (run: RunModel) => void
  onClick?: () => void
}

export default function TaskCard({ task, lastRun, onRunCreated, onClick }: TaskCardProps) {
  const handleRunClick = async (e: React.MouseEvent) => {
    e.stopPropagation() // prevent triggering the card click
    try {
      const response = await apiPost('/runs', { taskId: task.id })

      if (response && response.id) {
        const now = new Date().toISOString()
        const newRun: RunModel = {
          id: response.id,
          taskId: task.id,
          userId: '',
          planId: '',
          status: 0,
          createdAt: now,
          updatedAt: now,
        }
        onRunCreated?.(newRun)
      }
    } catch (err) {
      console.error('Failed to start run', err)
    }
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-2xl transition w-[95%] min-w-[24rem] mx-auto py-6 px-8 hover:shadow-md cursor-pointer"
      onClick={onClick} // <--- trigger panel
    >
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-4">
        <div className="flex flex-col items-start min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{task.title || 'Untitled task'}</h2>
          <span className="text-xs text-gray-400 font-mono truncate">ID: {task.id.slice(0, 8)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase">Last Run</span>
          <span className="text-xs text-gray-500 text-center">
            {lastRun ? formatDistanceToNow(lastRun, { addSuffix: true }) : '-'}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase">Next Run</span>
          <span className="text-xs text-gray-500 text-center">{task.schedule ?? '-'}</span>
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