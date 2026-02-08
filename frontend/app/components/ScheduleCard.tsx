'use client'

import { ScheduleModel, ScheduleStatus } from '@/app/lib/types'
import cronstrue from 'cronstrue'

interface ScheduleCardProps {
  schedule: ScheduleModel
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const ScheduleStatusLabel: Record<ScheduleStatus, string> = {
  [ScheduleStatus.Active]: 'Active',
  [ScheduleStatus.Paused]: 'Paused',
}

export default function ScheduleCard({ schedule, onEdit, onDelete }: ScheduleCardProps) {
  let humanCron = schedule.cronEx
  try {
    humanCron = cronstrue.toString(schedule.cronEx, { use24HourTimeFormat: true })
  } catch {}

  const statusLabel = ScheduleStatusLabel[schedule.status]

  const statusClass =
    schedule.status === ScheduleStatus.Active
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="flex justify-between items-center border py-3 px-4 rounded-lg">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-gray-900">
          {humanCron}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          className="text-blue-500 hover:underline text-sm"
          onClick={() => onEdit(schedule.id)}
        >
          Edit
        </button>
        <button
          className="text-red-500 hover:underline text-sm"
          onClick={() => onDelete(schedule.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}