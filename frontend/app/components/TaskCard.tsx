'use client'

import { useRouter } from 'next/navigation'
import { TaskStatus, getTaskStatusLabel } from '@/app/lib/types'
import { format, parseISO } from 'date-fns'
import { Clock } from 'lucide-react'
import { TaskModel } from '@/app/lib/types'

type TaskCardProps = {
  task: TaskModel
}

const STATUS_STYLES: Record<number, string> = {
  [TaskStatus.Pending]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.Drafted]: 'bg-blue-100 text-blue-800',
  [TaskStatus.Running]: 'bg-indigo-100 text-indigo-800',
  [TaskStatus.Completed]: 'bg-green-100 text-green-800',
  [TaskStatus.Failed]: 'bg-red-100 text-red-800',
  [TaskStatus.Finalized]: 'bg-gray-100 text-gray-800',
}

export default function TaskCard({ task }: TaskCardProps) {
  const router = useRouter()
  const statusClass = STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-800'

  const created = parseISO(task.createdAt)
  const updated = task.updatedAt ? parseISO(task.updatedAt) : null

  const isFinished =
    task.status === TaskStatus.Completed ||
    task.status === TaskStatus.Failed

  const timestamp = isFinished && updated ? updated : created
  const label = isFinished ? 'Finished' : 'Started'

  return (
    <div
      className="relative flex-shrink-0 h-full aspect-square bg-white rounded-2xl border border-gray-100
                 p-5 flex flex-col justify-between hover:shadow-lg transition"
    >
      {task.status === TaskStatus.Running && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {task.title}
        </h2>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>
            {label} {format(timestamp, 'MMM d, p')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
          {getTaskStatusLabel(task.status)}
        </span>

        {task.status === TaskStatus.Drafted && (
          <button
            onClick={() => router.push(`/tasks/${task.id}`)}
            className="text-sm font-medium text-sky-600 hover:text-sky-700 transition"
          >
            View plan →
          </button>
        )}
      </div>
    </div>
  )
}