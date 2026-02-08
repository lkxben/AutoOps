'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/app/lib/api'
import { TaskModel, ScheduleModel } from '@/app/lib/types'
import ScheduleCard from './ScheduleCard'

type ScheduleType = 'minutes' | 'hours' | 'daily' | 'weekly'

interface TaskSchedulePanelProps {
  task: TaskModel
  onClose: () => void
}

export default function TaskSchedulePanel({ task, onClose }: TaskSchedulePanelProps) {
  const [schedules, setSchedules] = useState<ScheduleModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)

  const [type, setType] = useState<ScheduleType>('daily')
  const [interval, setInterval] = useState(1)
  const [time, setTime] = useState('09:00')
  const [weekday, setWeekday] = useState(1)
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

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
      case 'minutes':
        return `Every ${interval} minute(s)`
      case 'hours':
        return `Every ${interval} hour(s)`
      case 'daily':
        return `Every day at ${time}`
      case 'weekly':
        return `Every week on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][weekday]} at ${time}`
    }
  }

  const handleCreate = async () => {
    const cronEx = buildCronUtc()

    await apiPost('/schedules', {
      taskId: task.id,
      cronEx,
      timezone,
    })

    setShowCreate(false)
    fetchSchedules()
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
              onEdit={() => console.log('edit')}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {showCreate && (
          <div className="border rounded-xl p-4 mb-4 bg-gray-50">
            <h3 className="font-semibold mb-2">New Schedule</h3>

            <div className="flex flex-wrap gap-2 mb-3">
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

            <div className="text-xs text-gray-500 mb-2">
              Preview: <span className="font-medium">{cronPreview()}</span><br/>
              Local timezone: {timezone}<br/>
              Stored cron (UTC): <span className="font-mono">{buildCronUtc()}</span>
            </div>

            <button
              className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
              onClick={handleCreate}
            >
              Create schedule
            </button>
          </div>
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
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}