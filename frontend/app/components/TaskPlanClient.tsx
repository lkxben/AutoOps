'use client'

import { useEffect } from 'react'
import { useTaskHubPlan } from '@/app/hooks/useTaskHubPlan'
import TaskGraph from '@/app/components/TaskGraph'
import { useFinalizePlan } from "@/app/hooks/useFinalizePlan"
import { TaskStatus, TaskModel } from '@/app/lib/types'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/app/loading'
import Error from '@/app/error'
import CenteredMessage from '@/app/components/CenteredMessage'
import { useTaskWithPlan } from '@/app/hooks/useTaskWithPlan'

type Props = { taskId: string }

export default function TaskPlanClient({ taskId }: Props) {
  const finalizePlan = useFinalizePlan()
  const router = useRouter()
  const { nodes: planNodes, edges: planEdges, error: hubError } = useTaskHubPlan(taskId)
  const { task, nodes, edges, setNodes, setEdges, loading, error, setTask } = useTaskWithPlan(taskId)

  // Merge plan updates into task state
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
      await finalizePlan.mutateAsync({
        taskId: task.id,
        graph: { nodes: updatedNodes, edges: updatedEdges }
      })
      router.push("/tasks")
    } catch (err) {
      console.error(err)
      alert("Failed to submit plan")
    }
  }

  if (loading) return <LoadingScreen />

  if (!task) return <CenteredMessage>Task not found</CenteredMessage>
  if (hubError || error) {
    return <Error error={(hubError || error)!} />
  }

  return (
    <div className="w-full h-screen">
      {task.status === TaskStatus.Pending && (
        <CenteredMessage>
          Agent is planning your task…
        </CenteredMessage>
      )}

      {task.status === TaskStatus.Drafted && (
        <TaskGraph 
          nodes={nodes}
          edges={edges}
          setPlan={(newNodes, newEdges) => {
            setNodes(newNodes)
            setEdges(newEdges)
          }}
          onSubmitPlan={handlePlanSubmit}
        />
      )}

      {task.status !== TaskStatus.Pending && task.status !== TaskStatus.Drafted && (
        <CenteredMessage>
          Task is currently running in the background.<br/>
          Visit the summary dashboard to see its progress.
        </CenteredMessage>
      )}
    </div>
  )
}