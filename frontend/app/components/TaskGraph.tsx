'use client'

import React, { useCallback } from "react"
import { useCurrentTask } from "../contexts/CurrentTaskContext"
import ReactFlow, {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Elements,
  MiniMap,
  Controls,
  Background
} from "reactflow"
import 'reactflow/dist/style.css'
import { layoutGraph } from "../lib/layoutGraph"
import GraphNode from "./GraphNode"

type TaskGraphProps = {
  onSubmitPlan: (nodes: Node[], edges: Edge[]) => void
}

export default function TaskGraph({ onSubmitPlan }: TaskGraphProps) {
  const { nodes, edges, setPlan } = useCurrentTask()

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const updated = applyNodeChanges(changes, nodes)
    setPlan(updated, edges)
  }, [nodes, edges, setPlan])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updated = applyEdgeChanges(changes, edges)
    setPlan(nodes, updated)
  }, [nodes, edges, setPlan])

  const onConnect = useCallback((connection: Connection) => {
    const updated = [...edges, { ...connection, id: `${connection.source}-${connection.target}` }]
    setPlan(nodes, updated)
  }, [nodes, edges, setPlan])

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const newLabel = prompt("Edit node label:", node.data.label)
    if (!newLabel) return
    const updatedNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n)
    setPlan(updatedNodes, edges)
  }, [nodes, edges, setPlan])

  const onElementsRemove = useCallback((elements: Elements) => {
    const removeIds = new Set(elements.map(e => e.id))
    const updatedNodes = nodes.filter(n => !removeIds.has(n.id))
    const updatedEdges = edges.filter(e => !removeIds.has(e.id))
    setPlan(updatedNodes, updatedEdges)
  }, [nodes, edges, setPlan])

  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "custom",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "New Node" }
    }
    setPlan([...nodes, newNode], edges)
  }, [nodes, edges, setPlan])

  const layoutCurrentGraph = useCallback(() => {
    const laidOut = layoutGraph(nodes, edges)
    setPlan(laidOut, edges)
  }, [nodes, edges, setPlan])

  const handleSubmit = () => {
    onSubmitPlan(nodes, edges)
  }

  return (
    <div style={{ width: '100%', height: "100%" }}>
      <div className="absolute z-10 p-4 flex gap-2">
        <button onClick={addNode} className="bg-sky-300 text-white px-4 py-2 rounded-lg shadow hover:bg-sky-400 transition">Add Node</button>
        <button onClick={layoutCurrentGraph} className="bg-sky-300 text-white px-4 py-2 rounded-lg shadow hover:bg-sky-400 transition">Auto Layout</button>
        <button onClick={handleSubmit} className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-600 transition ml-auto">Submit Plan</button>
      </div>
      <ReactFlow
        nodes={nodes.map(n => ({ ...n, type: "custom" }))}
        edges={edges}
        nodeTypes={{ custom: GraphNode }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onElementsRemove={onElementsRemove}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={46}
        nodesDraggable
        nodesConnectable
        nodesSelectable
      >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  )
}