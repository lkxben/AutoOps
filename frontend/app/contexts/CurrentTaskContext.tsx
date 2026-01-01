'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Node, Edge } from 'reactflow'

type TaskStage = 'input' | 'loading' | 'plan' | 'submitting'

export type CurrentTaskState = {
  taskId: string | null
  stage: TaskStage
  nodes: Node[]
  edges: Edge[]
}

type TaskContextProps = CurrentTaskState & {
  setTaskId: (id: string) => void
  setStage: (stage: TaskStage) => void
  setPlan: (nodes: Node[], edges: Edge[]) => void
  resetTask: () => void
}

const defaultState: CurrentTaskState = {
  taskId: null,
  stage: 'input',
  nodes: [],
  edges: []
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined)

export const CurrentTaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [taskId, setTaskIdState] = useState<string | null>(defaultState.taskId)
  const [stage, setStageState] = useState<TaskStage>(defaultState.stage)
  const [nodes, setNodes] = useState<Node[]>(defaultState.nodes)
  const [edges, setEdges] = useState<Edge[]>(defaultState.edges)

  useEffect(() => {
    const stored = localStorage.getItem('currentTask')
    if (stored) {
      const parsed: CurrentTaskState = JSON.parse(stored)
      setTaskIdState(parsed.taskId)
      setStageState(parsed.stage)
      setNodes(parsed.nodes)
      setEdges(parsed.edges)
    }
  }, [])

  useEffect(() => {
    const toStore: CurrentTaskState = { taskId, stage, nodes, edges }
    localStorage.setItem('currentTask', JSON.stringify(toStore))
  }, [taskId, stage, nodes, edges])

  const setTaskId = (id: string) => setTaskIdState(id)
  const setStage = (s: TaskStage) => setStageState(s)
  const setPlan = (n: Node[], e: Edge[]) => {
    setNodes(n)
    setEdges(e)
  }
  const resetTask = () => {
    setTaskIdState(null)
    setStageState('input')
    setNodes([])
    setEdges([])
    localStorage.removeItem('currentTask')
  }

  return (
    <TaskContext.Provider value={{ taskId, stage, nodes, edges, setTaskId, setStage, setPlan, resetTask }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useCurrentTask() {
  const context = useContext(TaskContext)
  if (!context) throw new Error('useCurrentTask must be used within CurrentTaskProvider')
  return context
}