'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/app/lib/api'
import { layoutGraph } from "../lib/layoutGraph"
import { TaskModel, PlanModel } from '@/app/lib/types'

export function useTaskWithPlan(taskId?: string) {
  const [task, setTask] = useState<TaskModel | null>(null)
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return

    setLoading(true)
    setError(null)

    Promise.all([
      apiGet(`/tasks/${taskId}`),
      apiGet(`/tasks/${taskId}/plan`).catch(() => null),
    ])
      .then(([taskData, planData]: [TaskModel, PlanModel | null]) => {
        setTask(taskData)

        if (planData?.graph) {
          try {
            const parsedPlan = JSON.parse(planData.graph) as { nodes: any[]; edges: any[] }
            const laidOutNodes = layoutGraph(parsedPlan.nodes, parsedPlan.edges)
            setNodes(laidOutNodes)
            setEdges(parsedPlan.edges)
          } catch (err) {
            console.error('Failed to parse plan JSON', err)
            setError('Invalid plan format')
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [taskId])

  return { task, nodes, edges, setNodes, setEdges, loading, error, setTask }
}