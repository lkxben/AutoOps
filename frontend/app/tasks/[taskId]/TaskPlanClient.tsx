'use client'

import { useEffect, useState } from 'react'
import { useTaskHubPlan } from '@/app/hooks/useTaskHubPlan'
import TaskGraph from '@/app/components/TaskGraph'
import { useCreatePlan } from "@/app/hooks/useCreatePlan"
import { apiGet } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'

type Props = { taskId: string }

type TaskModel = {
  id: string
  userId: string
  inputData: string
  status: string
  result?: string
}

type PlanModel = {
  id: string
  userId: string,
  taskId: string
  plan: string
}

export default function TaskPlanClient({ taskId }: Props) {
  const [task, setTask] = useState<TaskModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const createPlan = useCreatePlan()

  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan(taskId)
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const { token } = useAuth()

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      apiGet(`/tasks/${taskId}`, token),
      apiGet(`/plans?taskId=${taskId}`, token).catch(() => null),
    ])
      .then(([taskData, planData]: [TaskModel, PlanModel | null]) => {
        setTask(taskData)

        if (planData?.plan) {
          try {
            const parsedPlan = JSON.parse(planData.plan) as { nodes: any[]; edges: any[] }
            setNodes(parsedPlan.nodes)
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

  useEffect(() => {
    if (planNodes.length || planEdges.length) {
      setNodes(planNodes)
      setEdges(planEdges)
    }
  }, [planNodes, planEdges, setNodes, setEdges])

  const handlePlanSubmit = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    if (!task) return
    try {
      await createPlan.mutateAsync({
        taskId: task.id,
        plan: { nodes: updatedNodes, edges: updatedEdges }
      })
      window.location.href = "/tasks"
    } catch (err) {
      console.error(err)
      alert("Failed to submit plan")
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-lg font-medium text-gray-700">
            Agent is planning your task…
          </p>
        </div>
      </div>
    )
  }

  if (error) return <div>Error: {error}</div>
  if (!task) return <div>Task not found</div>

  return (
    <div className="h-screen w-full">
      <TaskGraph 
        nodes={nodes}
        edges={edges}
        setPlan={(newNodes, newEdges) => {
          setNodes(newNodes)
          setEdges(newEdges)
        }}
        onSubmitPlan={handlePlanSubmit}
      />
    </div>
  )
}