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

export default function TaskCard({ task }: TaskCardProps) {
  const router = useRouter()

  return (
    <div className="bg-white shadow-md rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition">
      <div className="mb-4">
        <h2 className="font-semibold text-lg truncate">{task.inputData || task.result || 'Task'}</h2>
        <p className="text-sm text-gray-500">Task ID: {task.id}</p>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            task.status === TaskStatus.Pending ? 'bg-yellow-100 text-yellow-800' :
            task.status === TaskStatus.Drafted ? 'bg-blue-100 text-blue-800' :
            task.status === TaskStatus.Running ? 'bg-indigo-100 text-indigo-800' :
            task.status === TaskStatus.Completed ? 'bg-green-100 text-green-800' :
            task.status === TaskStatus.Failed ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}
        >
          {getTaskStatusLabel(task.status)}
        </span>

        {(task.status === TaskStatus.Drafted || task.status === TaskStatus.Pending) && (
          <button
            className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 transition"
            onClick={() => router.push(`/tasks/${task.id}`)}
          >
            {task.status === TaskStatus.Drafted ? 'View/Edit Plan' : 'Pending'}
          </button>
        )}
      </div>
    </div>
  )
}