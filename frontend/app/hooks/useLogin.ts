import { useMutation } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function useLogin() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      apiPost('/login', data),

    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })
}