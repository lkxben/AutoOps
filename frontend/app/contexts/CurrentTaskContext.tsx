'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Node, Edge } from 'reactflow'

type TaskState = {
  taskId: string | null
  nodes: Node[]
  edges: Edge[]
}

type TaskContextValue = TaskState & {
  setTaskId: (id: string) => void
  setPlan: (nodes: Node[], edges: Edge[]) => void
  resetTask: () => void
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined)

export function CurrentTaskProvider({ children }: { children: React.ReactNode }) {
  const [taskId, setTaskIdState] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    if (!taskId) return

    const raw = localStorage.getItem(`task-${taskId}`)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      setNodes(parsed.nodes ?? [])
      setEdges(parsed.edges ?? [])
    } catch {
      console.warn('Failed to restore task from storage')
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) return

    localStorage.setItem(
      `task-${taskId}`,
      JSON.stringify({ taskId, nodes, edges })
    )
  }, [taskId, nodes, edges])

  const setTaskId = (id: string) => {
    setTaskIdState(id)
  }

  const setPlan = (nodes: Node[], edges: Edge[]) => {
    setNodes(nodes)
    setEdges(edges)
  }

  const resetTask = () => {
    if (taskId) {
      localStorage.removeItem(`task-${taskId}`)
    }
    setTaskIdState(null)
    setNodes([])
    setEdges([])
  }

  return (
    <TaskContext.Provider
      value={{
        taskId,
        nodes,
        edges,
        setTaskId,
        setPlan,
        resetTask
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

export function useCurrentTask() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useCurrentTask must be used inside CurrentTaskProvider')
  return ctx
}