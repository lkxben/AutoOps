'use client'

import { useState } from 'react'
import { apiPost, apiDelete } from '@/app/lib/api'
import { TaskModel, ScheduleModel } from '@/app/lib/types'
import ScheduleCard from './ScheduleCard'
import ScheduleCreateForm from './CreateScheduleForm'
import { toast } from 'sonner'

interface TaskSchedulesSectionProps {
  task: TaskModel
  schedules: ScheduleModel[]
  addSchedule: (taskId: string, schedule: ScheduleModel) => void
  updateSchedule: (taskId: string, schedule: ScheduleModel) => void
  deleteSchedule: (taskId: string, scheduleId: string) => void
}

export default function TaskSchedulesSection({
  task,
  schedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
}: TaskSchedulesSectionProps) {
  const [showCreate, setShowCreate] = useState(false)

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleDelete = async (scheduleId: string) => {
    try {
      await apiDelete(`/schedules/${scheduleId}`)
      deleteSchedule(task.id, scheduleId)
    } catch (err: any) {
      toast.error("Failed to delete schedule")
    }
  }

  const handleCreate = async (cronEx: string) => {
    try {
      const created = await apiPost('/schedules', {
        taskId: task.id,
        cronEx,
        timezone: 'UTC',
      })

      addSchedule(task.id, created)
      setShowCreate(false)
    } catch (err: any) {
      toast.error("Failed to create schedule")
    }
  }

  const handleUpdate = (updated: ScheduleModel) => {
    updateSchedule(task.id, updated)
  }

  return (
    <div className="flex flex-col gap-4">
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

      {showCreate && (
        <ScheduleCreateForm
          onCreate={handleCreate}
          browserTimezone={browserTimezone}
        />
      )}

      <div className="flex flex-col gap-2">
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
    </div>
  )
}