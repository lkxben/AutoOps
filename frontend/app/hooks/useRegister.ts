import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

export function useRegister() {
  const { refresh } = useAuth()

  return useMutation({
    mutationKey: ['register'],
    mutationFn: (data: { name: string, username: string; password: string }) =>
      apiPost('/register', data),

    onSuccess: async () => {
      await refresh()
    },
  })
}