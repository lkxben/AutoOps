import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

export function useCreateTask() {
  const { token } = useAuth()

  return useMutation({
    mutationKey: ['create-task'],
    mutationFn: (data: { inputData: string; }) =>
      apiPost('/tasks', data, token!)
  })
}