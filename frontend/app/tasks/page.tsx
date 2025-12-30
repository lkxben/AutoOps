import TaskForm from './TaskForm'

export default function TasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Create Task</h1>
      <TaskForm />
    </div>
  )
}