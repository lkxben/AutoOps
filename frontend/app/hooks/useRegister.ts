import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

export function useRegister() {
  const { login } = useAuth()

  return useMutation({
    mutationKey: ['register'],
    mutationFn: (data: { name: string, username: string; password: string }) =>
      apiPost('/register', data),

    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })
}