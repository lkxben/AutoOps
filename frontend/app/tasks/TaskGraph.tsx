'use client'

import React, { useCallback, useState, useEffect } from "react"
import { useCurrentTask } from "../contexts/CurrentTaskContext"
import ReactFlow, {
  addEdge,
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
import GraphNode from "../components/GraphNode"

type TaskGraphProps = {
  onSubmitPlan: (nodes: Node[], edges: Edge[]) => void
}

export default function TaskGraph({ onSubmitPlan }: TaskGraphProps) {
  const { nodes, edges, setPlan } = useCurrentTask()
  const [rfNodes, setRfNodes] = useState<Node[]>(nodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(edges)

  useEffect(() => {
    setRfNodes(nodes)
    setRfEdges(edges)
  }, [nodes, edges])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setRfNodes(prev => applyNodeChanges(changes, prev)),
    []
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setRfEdges(prev => applyEdgeChanges(changes, prev)),
    []
  )

  const onConnect = useCallback(
    (connection: Connection) => setRfEdges(prev => addEdge(connection, prev)),
    []
  )

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const newLabel = prompt("Edit node label:", node.data.label)
    if (newLabel) {
      setRfNodes(prev =>
        prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n)
      )
    }
  }, [])

  const onElementsRemove = useCallback((elements: Elements) => {
    const removeIds = new Set(elements.map(e => e.id))
    setRfNodes(prev => prev.filter(n => !removeIds.has(n.id)))
    setRfEdges(prev => prev.filter(e => !removeIds.has(e.id)))
  }, [])

  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "custom",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "New Node", action: "custom", params: {} }
    }
    setRfNodes(prev => [...prev, newNode])
  }, [])

  const layoutCurrentGraph = useCallback(() => {
    const laidOut = layoutGraph(rfNodes, rfEdges)
    setRfNodes(laidOut)
  }, [rfNodes, rfEdges])

  const handleSubmit = () => {
    setPlan(rfNodes, rfEdges)
    onSubmitPlan(rfNodes, rfEdges)
  }

  return (
    <div style={{ width: '100%', height: "100%" }}>
      <div className="absolute z-10 p-4 flex gap-2">
        <button onClick={addNode} className="bg-sky-300 text-white px-4 py-2 rounded-lg shadow hover:bg-sky-400 transition">Add Node</button>
        <button onClick={layoutCurrentGraph} className="bg-sky-300 text-white px-4 py-2 rounded-lg shadow hover:bg-sky-400 transition">Auto Layout</button>
        <button onClick={handleSubmit} className="bg-purple-500 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-600 transition ml-auto">Submit Plan</button>
      </div>
      <ReactFlow
        nodes={rfNodes.map(n => ({ ...n, type: "custom" }))}
        edges={rfEdges}
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