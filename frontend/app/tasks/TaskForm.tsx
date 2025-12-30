'use client'

import { useState } from 'react'
import { useCreateTask } from '../hooks/useCreateTask'

export default function TaskForm() {
  const [inputData, setInputData] = useState('')
  const { mutate, isPending } = useCreateTask()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputData.trim()) return
    mutate({ inputData })
    setInputData('')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <form
        onSubmit={submit}
        className="max-w-3xl mx-auto flex items-center gap-2 p-4"
      >
        <input
          className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Type your task..."
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
        />

        <button
          type="submit"
          disabled={isPending}
          className="bg-black text-white px-5 py-3 rounded-lg disabled:opacity-50"
        >
          {isPending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}