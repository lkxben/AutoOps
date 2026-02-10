'use client'

import { useState } from 'react'
import { useRegister } from '@/app/hooks/useRegister'

interface RegisterFormProps {
  onSuccess?: () => void
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { mutate, isPending } = useRegister()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [errors, setErrors] = useState<{ name?: string; username?: string; password?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!name.trim()) newErrors.name = 'Name is required'

    if (!username.trim()) newErrors.username = 'Username is required'
    else if (username.length < 3) newErrors.username = 'Username must be at least 3 characters'

    if (!password.trim()) newErrors.password = 'Password is required'
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutate({ name, username, password }, { onSuccess })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Register</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Name"
            className="w-full border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full border p-2 rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded"
          disabled={isPending}
        >
          {isPending ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}