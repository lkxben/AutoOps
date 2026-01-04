'use client'
import { useEffect, useState, useMemo } from 'react'
import * as signalR from '@microsoft/signalr'
import { TaskUpdate } from '@/app/lib/types'
const API_URL = process.env.NEXT_PUBLIC_EVENT_API_URL

export function useTaskHubUpdates() {
  const [updates, setUpdates] = useState<Record<string, TaskUpdate>>({})

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/ws`)
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
  }, [])

  const updatesArray = useMemo(() => Object.values(updates), [updates])
  return { updates: updatesArray }
}