'use client'

import { useState } from 'react'
import { useRegister } from '../hooks/useRegister'

interface RegisterFormProps {
  onSuccess?: () => void
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { mutate, isPending, error } = useRegister()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name, username, password }, {
      onSuccess: () => {
        onSuccess?.()
      }
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Register</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="name"
          placeholder="Name"
          className="w-full border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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
          {isPending ? 'Registering...' : 'Register'}
        </button>

        {error && <p className="text-red-500 text-sm mt-2">Registration failed</p>}
      </form>
    </div>
  )
}