'use client'

import { useEffect, useState, useMemo } from 'react'
import { apiGet } from '@/app/lib/api'
import { TaskModel, RunModel, ScheduleModel } from '@/app/lib/types'
import TaskCard from '@/app/components/TaskCard'
import TaskSchedulePanel from '@/app/components/TaskSchedulePanel'

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<TaskModel[]>([])
  const [runs, setRuns] = useState<RunModel[]>([])
  const [schedules, setSchedules] = useState<Record<string, ScheduleModel[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskModel | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([apiGet('/tasks'), apiGet('/runs')])
      .then(([tasksData, runsData]: [TaskModel[], RunModel[]]) => {
        setTasks(tasksData)
        setRuns(runsData)

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

  const lastRunMap = useMemo(() => {
    const map: Record<string, Date> = {}
    runs.forEach(run => {
      const runTime = new Date(run.updatedAt ?? run.createdAt)
      if (!map[run.taskId] || runTime > map[run.taskId]) {
        map[run.taskId] = runTime
      }
    })
    return map
  }, [runs])

  const handleRunCreated = (newRun: RunModel) => {
    setRuns(prev => [...prev, newRun])
  }

  const addSchedule = (taskId: string, newSchedule: ScheduleModel) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newSchedule],
    }))
  }

  const updateSchedule = (taskId: string, updatedSchedule: ScheduleModel) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s => (s.id === updatedSchedule.id ? updatedSchedule : s)),
    }))
  }

  const deleteSchedule = (taskId: string, scheduleId: string) => {
    setSchedules(prev => ({
      ...prev,
      [taskId]: prev[taskId].filter(s => s.id !== scheduleId),
    }))
  }

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
            lastRun={lastRunMap[task.id]}
            onRunCreated={handleRunCreated}
            onClick={() => setSelectedTask(task)}
            addSchedule={addSchedule}
            updateSchedule={updateSchedule}
            deleteSchedule={deleteSchedule}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskSchedulePanel
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