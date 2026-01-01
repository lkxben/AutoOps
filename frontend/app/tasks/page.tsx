'use client'

import React, { useState, useEffect } from "react"
import TaskForm from "./TaskForm"
import TaskGraph from "./TaskGraph"
import { CurrentTaskProvider, useCurrentTask } from "../contexts/CurrentTaskContext"
import { useTaskHubPlan } from "../hooks/useTaskHubPlan"
import { Node, Edge } from "reactflow"
import { useCreatePlan } from "../hooks/useCreatePlan"

function PageContent() {
  const { stage, setStage, setPlan, nodes, edges, taskId } = useCurrentTask()
  const { nodes: planNodes, edges: planEdges } = useTaskHubPlan()
  const createPlan = useCreatePlan()

  // updates to plan stage when plan is received
  useEffect(() => {
    if (planNodes.length > 0 && planEdges.length > 0) {
      setPlan(planNodes, planEdges)
      setStage("plan")
    }
  }, [planNodes, planEdges, setPlan, setStage])

  const handlePlanSubmit = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    setStage("submitting")
    try {
      await createPlan.mutateAsync({
        taskId: taskId,
        plan: { nodes: updatedNodes, edges: updatedEdges }
      })
      window.location.href = "/tasks" // change to dashboard later
    } catch (err) {
      console.error(err)
      alert("Failed to submit plan")
      setStage("plan")
    }
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {stage === "input" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <h2 className="text-xl font-semibold">Enter your task</h2>
          <TaskForm />
        </div>
      )}

      {stage === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-lg font-medium">Agent is planning your task...</p>
          <div className="loader border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        </div>
      )}

      {stage === "plan" && (
        <TaskGraph onSubmitPlan={handlePlanSubmit} />
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

export default function Page() {
  return (
    <CurrentTaskProvider>
      <PageContent />
    </CurrentTaskProvider>
  )
}