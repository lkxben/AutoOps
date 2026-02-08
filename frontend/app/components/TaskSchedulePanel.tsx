'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/app/lib/api'
import { TaskModel, ScheduleModel, ScheduleType } from '@/app/lib/types'
import ScheduleCard from './ScheduleCard'
import ScheduleCreateForm from '@/app/components/CreateScheduleForm'

interface TaskSchedulePanelProps {
  task: TaskModel
  onClose: () => void
}

export default function TaskSchedulePanel({ task, onClose }: TaskSchedulePanelProps) {
  const [schedules, setSchedules] = useState<ScheduleModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const fetchSchedules = () => {
    setLoading(true)
    apiGet(`/tasks/${task.id}/schedules`)
      .then(setSchedules)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSchedules()
  }, [task.id])

  const handleDelete = async (scheduleId: string) => {
    await apiDelete(`/schedules/${scheduleId}`)
    fetchSchedules()
  }

  const handleCreate = async (cronEx: string) => {
    await apiPost('/schedules', { taskId: task.id, cronEx, timezone: 'UTC' })
    setShowCreate(false)
    fetchSchedules()
  }

  const handleUpdate = (updated: ScheduleModel) => {
    setSchedules(prev =>
      prev.map(s => (s.id === updated.id ? updated : s))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-xl p-6 animate-slide-up overflow-y-auto">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Schedules — {task.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        {loading && <p>Loading schedules...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="flex flex-col gap-2 mb-6">
          {schedules.map(schedule => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={handleUpdate}
              onDelete={handleDelete}
              browserTimezone={browserTimezone}
            />
          ))}
        </div>

        {showCreate && (
          <ScheduleCreateForm onCreate={handleCreate} browserTimezone={browserTimezone} />
        )}

        <button
          onClick={() => setShowCreate(v => !v)}
          className={`w-full py-2 rounded ${
            showCreate
              ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              : 'bg-cyan-500 hover:bg-cyan-600 text-white'
          }`}
        >
          {showCreate ? 'Cancel' : '+ Create schedule'}
        </button>
      </div>

      <style jsx>{`
        .animate-slide-up {
          transform: translateY(100%);
          animation: slide-up 0.7s forwards;
        }
        @keyframes slide-up {
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}