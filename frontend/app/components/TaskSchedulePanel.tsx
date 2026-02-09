'use client'

import { useEffect, useState } from 'react'
import { apiPost, apiDelete } from '@/app/lib/api'
import { TaskModel, ScheduleModel } from '@/app/lib/types'
import ScheduleCard from './ScheduleCard'
import ScheduleCreateForm from '@/app/components/CreateScheduleForm'

interface TaskSchedulePanelProps {
  task: TaskModel
  schedules: ScheduleModel[]
  addSchedule: (taskId: string, schedule: ScheduleModel) => void
  updateSchedule: (taskId: string, schedule: ScheduleModel) => void
  deleteSchedule: (taskId: string, scheduleId: string) => void
  onClose: () => void
}

export default function TaskSchedulePanel({
  task,
  schedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  onClose,
}: TaskSchedulePanelProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleDelete = async (scheduleId: string) => {
    try {
      await apiDelete(`/schedules/${scheduleId}`)
      deleteSchedule(task.id, scheduleId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCreate = async (cronEx: string) => {
    try {
      const created = await apiPost('/schedules', { taskId: task.id, cronEx, timezone: 'UTC' })

      addSchedule(task.id, created)
      setShowCreate(false)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUpdate = (updated: ScheduleModel) => {
    updateSchedule(task.id, updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-xl p-6 animate-slide-up overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Schedules — {task.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

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