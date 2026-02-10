import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/contexts/AuthContext'
import { toast } from 'sonner'

export function useRegister() {
  const { refresh } = useAuth()

  return useMutation({
    mutationKey: ['register'],
    mutationFn: async (data: { name: string; username: string; password: string }) => {
      const res = await fetch('/api/proxySetCookie/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result?.message || 'Registration failed')
      }

      return result
    },

    onSuccess: async () => {
      await refresh()
    },

    onError: (err: any) => {
      toast.error(err?.message || 'Registration failed')
    }
  })
}