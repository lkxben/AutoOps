'use client'

import { formatDistanceToNow } from 'date-fns'
import { TaskModel } from '@/app/lib/types'

type TaskCardProps = {
  task: TaskModel & { lastRun?: Date }
  onRunClick?: () => void
}

export default function TaskCard({ task, onRunClick }: TaskCardProps) {
  const hasRuns = !!task.lastRun

  return (
  <div className="bg-white border border-gray-200 rounded-2xl transition w-[95%] min-w-[24rem] mx-auto py-6 px-8">
  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-4">
    <div className="flex flex-col items-start min-w-0">
      <h2 className="text-sm font-semibold text-gray-900 truncate">
        {task.title || 'Untitled task'}
      </h2>
      <span className="text-xs text-gray-400 font-mono truncate">
        ID: {task.id.slice(0, 8)}
      </span>
    </div>

    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-400 uppercase">Last Run</span>
      <span className="text-xs text-gray-500 text-center">
        {task.lastRun ? formatDistanceToNow(task.lastRun, { addSuffix: true }) : 'No runs yet'}
      </span>
    </div>

    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-400 uppercase">Next Run</span>
      <span className="text-xs text-gray-500 text-center">
        {task.schedule ?? '-'}
      </span>
    </div>

    <div className="flex justify-end">
      <button
        className="px-4 py-1 rounded-xl text-sm font-medium
                   bg-cyan-300 text-white
                   hover:bg-cyan-400"
        onClick={(e) => { e.stopPropagation(); onRunClick?.() }}
      >
        Run
      </button>
    </div>
  </div>
</div>
  )
}