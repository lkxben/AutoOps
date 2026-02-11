'use client'

import { useState } from 'react'
import { useCreateTask } from '@/app/hooks/useCreateTask'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function TaskForm() {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const createTask = useCreateTask()
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !prompt.trim()) {
      toast.error('Please fill in both title and prompt')
      return
    }

    try {
      const res = await createTask.mutateAsync({ title, prompt })
      router.push(`/tasks/${res.id}`)
    } catch (err: any) {
      toast.error('Failed to create task')
    }

    setTitle('')
    setPrompt('')
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-3xl mx-auto flex flex-col gap-6 p-6 bg-white rounded-2xl shadow-lg"
    >
      <input
        className="border border-gray-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition"
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={createTask.isPending}
        maxLength={100}
      />

      <textarea
        className="border border-gray-200 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition resize-y min-h-[200px]"
        placeholder="Describe your task in detail..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={createTask.isPending}
        rows={8}
      />

      <button
        type="submit"
        disabled={createTask.isPending}
        className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition disabled:opacity-50"
      >
        {createTask.isPending ? 'Sending...' : 'Create Task'}
      </button>
    </form>
  )
}