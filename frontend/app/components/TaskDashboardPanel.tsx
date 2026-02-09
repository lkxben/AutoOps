'use client'

import { useState } from 'react'
import { TaskModel, ScheduleModel } from '@/app/lib/types'
import TaskSchedulesSection from './TaskSchedulesSection'

type Tab = 'schedules' | 'runs' | 'graph'

interface TaskSchedulePanelProps {
  task: TaskModel
  schedules: ScheduleModel[]
  addSchedule: (taskId: string, schedule: ScheduleModel) => void
  updateSchedule: (taskId: string, schedule: ScheduleModel) => void
  deleteSchedule: (taskId: string, scheduleId: string) => void
  onClose: () => void
}

export default function TaskDashboardPanel({
  task,
  schedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  onClose,
}: TaskSchedulePanelProps) {
  const [tab, setTab] = useState<Tab>('schedules')

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full h-[75vh] bg-white rounded-t-3xl shadow-xl animate-slide-up flex flex-col">
        <div className="p-6 shrink-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-4">
            <h2 className="text-xl font-bold justify-self-start truncate">
              {task.title}
            </h2>

            <div className="flex gap-2 justify-self-center">
              {(['schedules', 'runs', 'graph'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    tab === t
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-transparent text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 justify-self-end"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {tab === 'schedules' && (
            <TaskSchedulesSection
              task={task}
              schedules={schedules}
              addSchedule={addSchedule}
              updateSchedule={updateSchedule}
              deleteSchedule={deleteSchedule}
            />
          )}

          {tab === 'runs' && (
            <div className="text-gray-500 text-sm py-6">
              Runs view coming soon…
            </div>
          )}

          {tab === 'graph' && (
            <div className="text-gray-500 text-sm py-6">
              Graph coming soon…
            </div>
          )}
        </div>
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