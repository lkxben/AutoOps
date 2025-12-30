import { useMutation } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

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