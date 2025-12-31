'use client'

import { useState } from 'react'
import { useCreateTask } from '../hooks/useCreateTask'

type TaskFormProps = {
  onTaskSubmitted: () => void
}

export default function TaskForm({ onTaskSubmitted }: TaskFormProps) {
  const [inputData, setInputData] = useState('')
  const createTask = useCreateTask()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputData.trim()) return

    createTask.mutate({ inputData })
    setInputData('')
    onTaskSubmitted()
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-3xl mx-auto flex items-center gap-2 p-4"
    >
      <input
        className="flex-1 border rounded-lg px-4 py-3 focus:outline-none"
        placeholder="Type your task..."
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        disabled={createTask.isPending}
      />

      <button
        type="submit"
        disabled={createTask.isPending}
        className="text-white bg-sky-300 px-5 py-3 rounded-lg disabled:opacity-50 hover:bg-sky-400 transition"
      >
        {createTask.isPending ? '...' : 'Send'}
      </button>
    </form>
  )
}