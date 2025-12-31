'use client'

import TaskForm from './TaskForm'
import TaskUpdates from './TaskUpdates'
import TaskGraph from './TaskGraph'

export default function TasksPage() {
  return (
    <>
      <TaskUpdates />
      <TaskGraph />
      <TaskForm />
    </>
  )
}