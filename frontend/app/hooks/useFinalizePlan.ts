import { useMutation } from '@tanstack/react-query'
import { apiPut } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

export function useFinalizePlan() {
  const { token } = useAuth()

  return useMutation({
    mutationKey: ['finalize-plan'],
    mutationFn: (
        data: { 
            taskId: string; graph: Record<string, any>
        }) =>
      apiPut('/plans', data, token!)
  })
}