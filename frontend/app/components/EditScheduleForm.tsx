'use client'

import { useState, useEffect } from 'react'
import { ScheduleModel, ScheduleType } from '@/app/lib/types'
import { apiPatch } from '@/app/lib/api'

interface ScheduleEditFormProps {
  schedule: ScheduleModel
  onEdit: (updated: ScheduleModel) => void
  onCancel: () => void
  browserTimezone: string
}

export default function ScheduleEditForm({
  schedule,
  onEdit,
  onCancel,
  browserTimezone,
}: ScheduleEditFormProps) {
  const [type, setType] = useState<ScheduleType>('daily')
  const [interval, setInterval] = useState(1)
  const [time, setTime] = useState('09:00')
  const [weekday, setWeekday] = useState(1)

  useEffect(() => {
    const parts = schedule.cronEx.split(' ')
    const [min, hour, , , weekdayPart] = parts

    if (min.startsWith('*/')) {
      setType('minutes')
      setInterval(parseInt(min.replace('*/', ''), 10))
    } else if (hour.startsWith('*/')) {
      setType('hours')
      setInterval(parseInt(hour.replace('*/', ''), 10))
    } else {
      const utcHour = parseInt(hour, 10)
      const utcMinute = parseInt(min, 10)
      const now = new Date()
      const localDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        utcHour,
        utcMinute
      ))
      const localHour = localDate.getHours()
      const localMinute = localDate.getMinutes()
      const timeStr = `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')}`

      if (weekdayPart === '*') {
        setType('daily')
        setTime(timeStr)
      } else {
        setType('weekly')
        setTime(timeStr)
        setWeekday(parseInt(weekdayPart, 10))
      }
    }
  }, [schedule.cronEx])

  function buildCronUtc() {
    if (type === 'minutes') return `*/${interval} * * * *`
    if (type === 'hours') return `0 */${interval} * * *`

    const [hourStr, minStr] = time.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minStr, 10)

    const now = new Date()
    const localDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute
    )
    const utcHour = localDate.getUTCHours()
    const utcMinute = localDate.getUTCMinutes()

    if (type === 'daily') return `${utcMinute} ${utcHour} * * *`
    return `${utcMinute} ${utcHour} * * ${weekday}`
  }

  function cronPreview() {
    switch (type) {
      case 'minutes': return `Every ${interval} minute(s)`
      case 'hours': return `Every ${interval} hour(s)`
      case 'daily': return `Every day at ${time}`
      case 'weekly': return `Every week on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][weekday]} at ${time}`
    }
  }

  const handleSave = async () => {
    const cronEx = buildCronUtc()
    const updated = await apiPatch(`/schedules/${schedule.id}`, { cronEx, timezone: 'UTC' })
    onEdit(updated)
  }

  return (
    <div className="border rounded-xl p-4 mb-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Edit Schedule</h3>

      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <select value={type} onChange={e => setType(e.target.value as ScheduleType)} className="border rounded px-2 py-1">
            <option value="minutes">Every N minutes</option>
            <option value="hours">Every N hours</option>
            <option value="daily">Daily at time</option>
            <option value="weekly">Weekly at time</option>
          </select>

          {(type === 'minutes' || type === 'hours') && (
            <input
              type="number"
              min={1}
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20"
            />
          )}

          {(type === 'daily' || type === 'weekly') && (
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="border rounded px-2 py-1"
            />
          )}

          {type === 'weekly' && (
            <select value={weekday} onChange={e => setWeekday(Number(e.target.value))} className="border rounded px-2 py-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <div className="mb-1 font-medium">{cronPreview()}</div>
          <div className="text-xs">Local: {browserTimezone}</div>
          <div className="text-xs font-mono">UTC cron: {buildCronUtc()}</div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}