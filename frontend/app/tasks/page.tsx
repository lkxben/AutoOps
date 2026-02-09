'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { apiGet } from '@/app/lib/api'
import { TaskModel, ScheduleModel } from '@/app/lib/types'
import TaskCard from '@/app/components/TaskCard'
import TaskDashboardPanel from '@/app/components/TaskDashboardPanel'
import { useScheduleUpdates } from '@/app/hooks/useScheduleUpdates'

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<TaskModel[]>([])
  const [schedules, setSchedules] = useState<Record<string, ScheduleModel[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskModel | null>(null)

  const { updates } = useScheduleUpdates()

  useEffect(() => {
    setLoading(true)
    setError(null)

    apiGet('/tasks')
      .then((tasksData: TaskModel[]) => {
        setTasks(tasksData)

        return Promise.all(
          tasksData.map(task =>
            apiGet(`/tasks/${task.id}/schedules`).then(
              (taskSchedules: ScheduleModel[]) => [task.id, taskSchedules] as [string, ScheduleModel[]]
            )
          )
        )
      })
      .then((taskSchedules: [string, ScheduleModel[]][]) => {
        const scheduleMap: Record<string, ScheduleModel[]> = {}
        taskSchedules.forEach(([taskId, taskSched]) => {
          scheduleMap[taskId] = taskSched
        })
        setSchedules(scheduleMap)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const addSchedule = useCallback((taskId: string, newSchedule: ScheduleModel) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newSchedule],
    }))
  }, [])

  const updateSchedule = useCallback((taskId: string, updated: ScheduleModel) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s =>
        s.id === updated.id ? { ...s, ...updated } : s
      ),
    }))
  }, [])

  const deleteSchedule = useCallback((taskId: string, scheduleId: string) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: prev[taskId].filter(s => s.id !== scheduleId),
    }))
  }, [])

  useEffect(() => {
    updates.forEach(update => {
      const taskSchedules = schedules[update.taskId]
      if (!taskSchedules) return

      updateSchedule(update.taskId, {
        ...taskSchedules.find(s => s.id === update.scheduleId)!,
        lastRunAt: update.lastRunAt,
        nextRunAt: update.nextRunAt,
      })
    })
  }, [updates, updateSchedule])

  if (loading) return <p className="text-[var(--color-cyan)] p-4">Loading tasks...</p>
  if (error) return <p className="text-red-500 p-4">Error: {error}</p>
  if (!tasks.length) return <p className="text-[var(--color-cyan)] p-4">No tasks yet.</p>

  return (
    <>
      <div className="flex flex-col gap-3 p-4">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            schedules={schedules[task.id] || []}
            onClick={() => setSelectedTask(task)}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskDashboardPanel
          task={selectedTask}
          schedules={schedules[selectedTask.id] || []}
          addSchedule={addSchedule}
          updateSchedule={updateSchedule}
          deleteSchedule={deleteSchedule}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}