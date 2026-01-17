'use client'
import { useEffect, useState, useMemo } from 'react'
import * as signalR from '@microsoft/signalr'
import { TaskUpdate } from '@/app/lib/types'
const API_URL = process.env.NEXT_PUBLIC_EVENT_API_URL

export function useTaskHubUpdates() {
  const [updates, setUpdates] = useState<Record<string, TaskUpdate>>({})

  useEffect(() => {
    const setupConnection = async () => {
      const res = await fetch("/api/signalr-token")
      const data = await res.json()
      const token = data.token

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/ws?access_token=${token}`, {
          transport: signalR.HttpTransportType.WebSockets, 
          headers: { "ngrok-skip-browser-warning": "true" }
        })
        .withAutomaticReconnect()
        .build()

      connection.on('TaskUpdated', (update: TaskUpdate) => {
        setUpdates(prev => ({
          ...prev,
          [update.task_id]: update
        }))
      })

      try {
        await connection.start()
        console.log('Connected to TaskHub')
      } catch (err) {
        console.error('SignalR connection error:', err)
      }

      return () => {
        connection.stop()
      }
    }

    setupConnection()
  }, [])

  const updatesArray = useMemo(() => Object.values(updates), [updates])
  return { updates: updatesArray }
}