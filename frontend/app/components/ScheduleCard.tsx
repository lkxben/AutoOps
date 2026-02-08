'use client'

import { ScheduleModel, ScheduleStatus } from '@/app/lib/types'
import cronstrue from 'cronstrue'
import { useMemo } from 'react'

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
    const humanCron = useMemo(() => {
    try {
        const parts = schedule.cronEx.trim().split(' ')
        if (parts.length < 5) return schedule.cronEx

        const [min, hour, day, month, weekday] = parts.map(p => p.trim())

        const isInterval = min.startsWith('*/') || hour.startsWith('*/')

        if (isInterval) {
        return cronstrue.toString(schedule.cronEx, { use24HourTimeFormat: true })
        }

        const utcHour = parseInt(hour, 10)
        const utcMinute = parseInt(min, 10)
        const now = new Date()
        const localOffset = now.getTimezoneOffset()

        let totalMinutes = utcHour * 60 + utcMinute - localOffset
        if (totalMinutes < 0) totalMinutes += 24 * 60
        totalMinutes = totalMinutes % (24 * 60)

        const localHour = Math.floor(totalMinutes / 60)
        const localMinute = totalMinutes % 60

        const localCron = `${localMinute} ${localHour} ${day} ${month} ${weekday}`
        return cronstrue.toString(localCron, { use24HourTimeFormat: true })
    } catch {
        return schedule.cronEx
    }
    }, [schedule.cronEx])

  const statusLabel = ScheduleStatusLabel[schedule.status]

  const statusClass =
    schedule.status === ScheduleStatus.Active
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="flex justify-between items-center border py-3 px-4 rounded-lg">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-gray-900">{humanCron}</p>
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