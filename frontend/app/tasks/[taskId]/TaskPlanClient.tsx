'use client'

import { useEffect, useState } from 'react'
import { useTaskHubPlan } from '@/app/hooks/useTaskHubPlan'
import TaskGraph from '@/app/components/TaskGraph'
import { useCreatePlan } from "@/app/hooks/useCreatePlan"
import { apiGet } from '@/app/lib/api'
import { useAuth } from '@/app/contexts/AuthContext'
import { TaskStatus, getTaskStatusLabel } from '@/app/lib/taskStatus'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import CenteredMessage from '@/app/components/CenteredMessage'

type Props = { taskId: string }

type TaskModel = {
  id: string
  userId: string
  inputData: string
  status: number
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
  const router = useRouter()
  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan(taskId)
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
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
  }, [taskId, token])

  useEffect(() => {
    if (!task) return
    if (planNodes.length || planEdges.length) {
      setNodes(planNodes)
      setEdges(planEdges)
      setTask(prev =>
        prev ? { ...prev, status: TaskStatus.Drafted } : prev
      )
    }
  }, [planNodes, planEdges])

  const handlePlanSubmit = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    if (!task) return
    try {
      await createPlan.mutateAsync({
        taskId: task.id,
        plan: { nodes: updatedNodes, edges: updatedEdges }
      })
      router.push("/tasks")
    } catch (err) {
      console.error(err)
      alert("Failed to submit plan")
    }
  }

  if (loading) return <LoadingScreen />

  if (error) return <Error error={error} />

  if (task.status === TaskStatus.Pending) {
    return (
      <CenteredMessage>
            Agent is planning your task…
      </CenteredMessage>
    )
  }

  if (task.status === TaskStatus.Drafted) {
    return (<div className="h-screen w-full">
      <TaskGraph 
        nodes={nodes}
        edges={edges}
        setPlan={(newNodes, newEdges) => {
          setNodes(newNodes)
          setEdges(newEdges)
        }}
        onSubmitPlan={handlePlanSubmit}
      />
    </div>)
  }

  return (
    <CenteredMessage>
        Task is currently running in the background.<br/>
        Visit the summary dashboard to see it's progress.
    </CenteredMessage>
  )
}