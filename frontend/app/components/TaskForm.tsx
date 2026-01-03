'use client'

import { useState } from 'react'
import { useCreateTask } from '@/app/hooks/useCreateTask'
import { useRouter } from 'next/navigation'

export default function TaskForm() {
  const [prompt, setPrompt] = useState('')
  const createTask = useCreateTask()
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    try {
      const res = await createTask.mutateAsync({ title: "MOCK", prompt })
      router.push(`/tasks/${res.id}`)
    } catch (err) {
      console.error(err)
      alert("Failed to create task")
    }
    setPrompt('')
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-3xl mx-auto flex items-center gap-2 p-4"
    >
      <input
        className="flex-1 border rounded-lg px-4 py-3 focus:outline-none"
        placeholder="Type your task..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
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