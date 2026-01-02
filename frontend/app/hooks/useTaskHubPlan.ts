'use client'

import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '@/app/contexts/AuthContext'
import { Node, Edge } from 'reactflow'
import { layoutGraph } from '@/app/lib/layoutGraph'

export function useTaskHubPlan(taskId?: string) {
  const { token } = useAuth()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    if (!token || !taskId) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:5004/ws?access_token=${token}`)
      .withAutomaticReconnect()
      .build()

    connection.on('PlanDraft', (payload: {
      task_id: string
      plan: { nodes: Node[]; edges: Edge[] }
    }) => {
      if (payload.task_id !== taskId) return

      const { nodes, edges } = payload.plan
      const laidOutNodes = layoutGraph(nodes, edges)
      setNodes(laidOutNodes)
      setEdges(edges)
    })

    connection
      .start()
      .then(() => console.log('Connected to TaskHub'))
      .catch(console.error)

    return () => {
      connection.stop()
    }
  }, [token, taskId])

  return { nodes, edges }
}