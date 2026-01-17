'use client'

import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { Node, Edge } from 'reactflow'
import { layoutGraph } from '@/app/lib/layoutGraph'
const API_URL = process.env.NEXT_PUBLIC_EVENT_API_URL

export function useTaskHubPlan(taskId?: string) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return

    let connection: signalR.HubConnection | null = null

    const setupConnection = async () => {
      try {
        const res = await fetch("/api/signalr-token")
        if (!res.ok) throw new Error(`Failed to get token: ${res.statusText}`)
        const data = await res.json()
        const token = typeof data.token === 'string' ? data.token : ''

        connection = new signalR.HubConnectionBuilder()
          .withUrl(`${API_URL}/ws?access_token=${token}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
            transport: signalR.HttpTransportType.WebSockets
          })
          .withAutomaticReconnect()
          .build()

        connection.on('PlanDraft', (payload: { task_id: string; graph: { nodes: Node[]; edges: Edge[] } }) => {
          try {
            if (payload.task_id !== taskId) return
            const { nodes: payloadNodes, edges: payloadEdges } = payload.graph
            setNodes(layoutGraph(payloadNodes, payloadEdges))
            setEdges(payloadEdges)
          } catch (err: any) {
            console.error('PlanDraft handler error:', err)
            setError(err instanceof Error ? err.message : String(err))
          }
        })

        await connection.start()
        console.log('Connected to TaskHub')
      } catch (err: any) {
        console.error('SignalR connection error:', err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    setupConnection()

    return () => {
      if (connection) connection.stop()
    }
  }, [taskId])

  return { nodes, edges, error }
}