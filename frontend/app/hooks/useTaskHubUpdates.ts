'use client'
import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '@/app/contexts/AuthContext'

export type TaskUpdate = {
  task_id: string
  user_id: string
  status: number
  description?: string
}

export function useTaskHubUpdates() {
  const { token } = useAuth()
  const [updates, setUpdates] = useState<Record<string, TaskUpdate>>({})

  useEffect(() => {
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:5004/ws?access_token=${token}`)
      .withAutomaticReconnect()
      .build()

    connection.start()
      .then(() => console.log('Connected to TaskHub'))
      .catch(console.error)

    connection.on('TaskUpdated', (update: TaskUpdate) => {
      setUpdates(prev => ({
        ...prev,
        [update.task_id]: update
      }))
    })

    return () => {
      connection.stop()
    }
  }, [token])

  return { updates: Object.values(updates) }
}