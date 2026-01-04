import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/app/lib/api'

export function useCreateTask() {
  return useMutation({
    mutationKey: ['create-task'],
    mutationFn: (data: { title: string, prompt: string; }) =>
      apiPost('/tasks', data)
  })
}