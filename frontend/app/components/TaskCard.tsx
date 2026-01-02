'use client'

import { useRouter } from 'next/navigation'
import { TaskStatus, getTaskStatusLabel } from '@/app/lib/taskStatus'

type TaskCardProps = {
  task: {
    id: string
    inputData?: string
    status: number
    result?: string
  }
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
  const showButton = task.status === TaskStatus.Drafted || task.status === TaskStatus.Pending
  const buttonText =
    task.status === TaskStatus.Drafted
      ? 'View/Edit Plan'
      : task.status === TaskStatus.Pending
      ? 'Pending'
      : ''

  return (
    <div className="bg-white shadow-md rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition relative">
      {task.status === TaskStatus.Running && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
      )}

      <div className="mb-4">
        <h2 className="font-semibold text-lg truncate">{task.inputData || task.result || 'Task'}</h2>
        <p className="text-sm text-gray-500 truncate">ID: {task.id}</p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
          {getTaskStatusLabel(task.status)}
        </span>

        {showButton && (
          <button
            className={`ml-2 px-3 py-1 rounded-xl text-sm font-medium ${
              task.status === TaskStatus.Drafted
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-yellow-200 text-yellow-900 cursor-not-allowed'
            } transition`}
            onClick={() => task.status === TaskStatus.Drafted && router.push(`/tasks/${task.id}`)}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  )
}