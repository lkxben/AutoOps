'use client'

import { useEffect } from 'react'
import { useTaskHubPlan } from '@/app/hooks/useTaskHubPlan'
import TaskGraph from '@/app/components/TaskGraph'
import { useCurrentTask } from "@/app/contexts/CurrentTaskContext"
import { useCreatePlan } from "@/app/hooks/useCreatePlan"

type Props = { taskId: string }

export default function TaskPlanClient({ taskId }: Props) {
  const { setPlan, nodes, edges } = useCurrentTask()
  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan(taskId)
  const createPlan = useCreatePlan()

  useEffect(() => {
    if (planNodes.length > 0 && planEdges.length > 0 && nodes.length === 0 && edges.length === 0) {
      console.log("Updating context with new plan")
      setPlan(planNodes, planEdges)
    }
  }, [planNodes, planEdges, nodes.length, edges.length, setPlan])

  const handlePlanSubmit = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    try {
      await createPlan.mutateAsync({
        taskId,
        plan: { nodes: updatedNodes, edges: updatedEdges }
      })
      window.location.href = "/tasks"
    } catch (err) {
      console.error(err)
      alert("Failed to submit plan")
    }
  }

  if (!nodes.length || !edges.length) {
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

  return (
    <div className="h-screen w-full">
      <TaskGraph onSubmitPlan={handlePlanSubmit} />
    </div>
  )
}