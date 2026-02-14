'use client'

import { useState } from 'react'
import { useLogin } from '@/app/hooks/useLogin'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { mutate, isPending } = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!username.trim()) newErrors.username = 'Username is required'
    else if (username.trim().length < 3) newErrors.username = 'Username must be at least 3 characters'

    if (!password.trim()) newErrors.password = 'Password is required'
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      newErrors.password = 'Password must contain at least one special character'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutate({ username, password }, { onSuccess })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Login</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}