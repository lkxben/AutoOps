import { useMutation } from '@tanstack/react-query'
import { apiPost } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function useCreatePlan() {
  const { token } = useAuth()

  return useMutation({
    mutationKey: ['create-plan'],
    mutationFn: (
        data: { 
            taskId: string; plan: Record<string, any>
        }) =>
      apiPost('/plans', data, token!)
  })
}