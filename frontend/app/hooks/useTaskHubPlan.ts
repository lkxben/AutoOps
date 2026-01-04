'use client'

import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { Node, Edge } from 'reactflow'
import { layoutGraph } from '@/app/lib/layoutGraph'
const API_URL = process.env.NEXT_PUBLIC_EVENT_API_URL

export function useTaskHubPlan(taskId?: string) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    if (!taskId) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/ws`)
      .withAutomaticReconnect()
      .build()

    connection.on('PlanDraft', (payload: {
      task_id: string
      graph: { nodes: Node[]; edges: Edge[] }
    }) => {
      if (payload.task_id !== taskId) return

      const { nodes, edges } = payload.graph
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
  }, [taskId])

  return { nodes, edges }
}