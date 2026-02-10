'use client'

import { useState } from 'react'
import { ScheduleType } from '@/app/lib/types'

interface ScheduleCreateFormProps {
  onCreate: (cronEx: string) => void
  browserTimezone: string
}

export default function ScheduleCreateForm({ onCreate, browserTimezone }: ScheduleCreateFormProps) {
  const [type, setType] = useState<ScheduleType>('daily')
  const [interval, setInterval] = useState(1)
  const [time, setTime] = useState('09:00')
  const [weekday, setWeekday] = useState(1)

  function buildCronUtc() {
    if (type === 'minutes') return `*/${interval} * * * *`
    if (type === 'hours') return `0 */${interval} * * *`

    const [hour, minute] = time.split(':').map(Number)
    const now = new Date()
    const localDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0
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

  const handleCreateClick = () => {
    const cronEx = buildCronUtc()
    onCreate(cronEx)
  }

  return (
    <div className="border rounded-xl p-4 mb-4 bg-gray-50">
      <h3 className="font-semibold mb-3">New Schedule</h3>

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

        <div>
          <button
            className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
            onClick={handleCreateClick}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}