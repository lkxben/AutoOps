import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

export function useLogin() {
  const { login } = useAuth()

  return useMutation({
    mutationKey: ['login'],
    mutationFn: (data: { username: string; password: string }) =>
      apiPost('/login', data),

    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })
}