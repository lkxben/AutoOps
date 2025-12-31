'use client'
import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '../contexts/AuthContext'

export function useTaskHubUpdates() {
  const { token } = useAuth()
  const [updates, setUpdates] = useState<any[]>([])

  useEffect(() => {
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:5004/ws?access_token=${token}`)
      .withAutomaticReconnect()
      .build()

    connection.start()
      .then(() => console.log('Connected to TaskHub'))
      .catch(console.error)

    connection.on('TaskUpdated', (update: any) => {
      setUpdates(prev => [...prev, update])
    })

    return () => {
      connection.stop()
    }
  }, [token])

  return { updates }
}