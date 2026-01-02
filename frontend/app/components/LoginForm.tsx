'use client'

import { useState } from 'react'
import { useLogin } from '@/app/hooks/useLogin'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { mutate, isPending, error } = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ username, password }, {
      onSuccess: () => {
        onSuccess?.()
      }
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="username"
          placeholder="Username"
          className="w-full border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded"
          disabled={isPending}
        >
          {isPending ? 'Logging in...' : 'Login'}
        </button>

        {error && <p className="text-red-500 text-sm mt-2">Login failed</p>}
      </form>
    </div>
  )
}