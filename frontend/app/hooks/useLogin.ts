import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/contexts/AuthContext'
import { toast } from 'sonner'

export function useLogin() {
  const { refresh } = useAuth()

  return useMutation({
    mutationKey: ['login'],
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await fetch('/api/proxySetCookie/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result?.message || 'Invalid username or password')
      }

      return result
    },

    onSuccess: async () => {
      await refresh()
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Login failed')
    }
  })
}