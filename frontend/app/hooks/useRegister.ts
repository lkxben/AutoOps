import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/contexts/AuthContext'

export function useRegister() {
  const { refresh } = useAuth()

  return useMutation({
    mutationKey: ['register'],
    mutationFn: (data: { name: string, username: string; password: string }) =>
      fetch('/api/proxySetCookie/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      }).then(res => res.json()),

    onSuccess: async () => {
      await refresh()
    },
  })
}