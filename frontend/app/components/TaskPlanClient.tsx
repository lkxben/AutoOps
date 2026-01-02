'use client'

import { useEffect, useState } from 'react'
import { useTaskHubPlan } from '@/app/hooks/useTaskHubPlan'
import TaskGraph from '@/app/components/TaskGraph'
import { useCreatePlan } from "@/app/hooks/useCreatePlan"
import { TaskStatus } from '@/app/lib/taskStatus'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import CenteredMessage from '@/app/components/CenteredMessage'
import { useTaskWithPlan } from '@/app/hooks/useTaskWithPlan'

type Props = { taskId: string }

export default function TaskPlanClient({ taskId }: Props) {
  const createPlan = useCreatePlan()
  const router = useRouter()
  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan(taskId)
  const { task, nodes, edges, setNodes, setEdges, loading, error, setTask } = useTaskWithPlan(taskId)

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