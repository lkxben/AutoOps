'use client'

import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '../contexts/AuthContext'
import { Node, Edge } from 'reactflow'
import { layoutGraph } from '../lib/layoutGraph'

const testPayload = {
  nodes: [
    { id: "1", type: "custom", position: { x: 0, y: 0 }, data: { label: "Add 5 and 2", action: "add", params: { a: "5", b: "2" } } },
    { id: "2", type: "custom", position: { x: 0, y: 0 }, data: { label: "Subtract 3 from 9", action: "subtract", params: { a: "9", b: "3" } } },
    { id: "3", type: "default", position: { x: 0, y: 0 }, data: { label: "Divide result of 1 by result of 2", action: "divide", params: { a: "$1", b: "$2" } } },
    { id: "START", type: "input", position: { x: -200, y: 0 }, data: { label: "START" } },
    { id: "END", type: "output", position: { x: 2000, y: 0 }, data: { label: "END" } }
  ],
  edges: [
    { id: "1-3", source: "1", target: "3", type: "default" },
    { id: "2-3", source: "2", target: "3", type: "default" },
    { id: "START-1", source: "START", target: "1", type: "default" },
    { id: "START-2", source: "START", target: "2", type: "default" },
    { id: "3-END", source: "3", target: "END", type: "default" }
  ]
}

export function useTaskHubPlan(mock = true) {
  const { token } = useAuth()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    // if (mock) {
    //   const laidOutNodes = layoutGraph(testPayload.nodes, testPayload.edges)
    //   setNodes(laidOutNodes)
    //   setEdges(testPayload.edges)
    //   return
    // }

    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:5004/ws?access_token=${token}`)
      .withAutomaticReconnect()
      .build()

    connection.on('PlanDraft', (payload: { nodes: Node[]; edges: Edge[] }) => {
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
  }, [token])

  return { nodes, edges }
}