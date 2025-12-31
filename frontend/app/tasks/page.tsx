'use client'

import React, { useState, useEffect } from "react"
import TaskForm from "./TaskForm"
import TaskGraph from "./TaskGraph"
import { useTaskHubPlan } from "../hooks/useTaskHubPlan"
import { Node, Edge } from "reactflow"

export default function Page() {
  const [stage, setStage] = useState<"input" | "loading" | "plan" | "submitting">("input")
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan()

  useEffect(() => {
    if (planNodes.length > 0 && planEdges.length > 0) {
      setNodes(planNodes)
      setEdges(planEdges)
      setStage("plan")
    }
  }, [planNodes, planEdges])

  const handleTaskSubmitted = () => {
    setStage("loading")
  }

  const handlePlanSubmit = (updatedNodes: Node[], updatedEdges: Edge[]) => {
    setStage("submitting")
    // Send updated plan to backend for execution or simulate
    setTimeout(() => {
      window.location.href = "/tasks"
    }, 1000)
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {stage === "input" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <h2 className="text-xl font-semibold">Enter your task</h2>
          <TaskForm onTaskSubmitted={handleTaskSubmitted} />
        </div>
      )}

      {stage === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-medium">Agent is planning your task...</p>
          <div className="loader border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        </div>
      )}

      {stage === "plan" && (
        <TaskGraph
          initialNodes={nodes}
          initialEdges={edges}
          onSubmitPlan={handlePlanSubmit}
        />
      )}

      {stage === "submitting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-medium">Submitting your plan...</p>
          <div className="loader border-4 border-purple-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        </div>
      )}
    </div>
  )
}