import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/app/contexts/AuthContext'

export function useLogin() {
  const { refresh } = useAuth()

  return useMutation({
    mutationKey: ['login'],
    mutationFn: (data: { username: string; password: string }) =>
      fetch('/api/proxySetCookie/login', {
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