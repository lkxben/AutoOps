'use client'
import { useEffect, useState, useMemo } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '@/app/contexts/AuthContext'
import { TaskUpdate } from '@/app/lib/types'

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

  const updatesArray = useMemo(() => Object.values(updates), [updates])
  return { updates: updatesArray }
}