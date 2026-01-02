'use client'

import React, { useCallback } from "react"
import ReactFlow, {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  MiniMap,
  Controls,
  Background
} from "reactflow"
import 'reactflow/dist/style.css'
import { layoutGraph } from "../lib/layoutGraph"
import GraphNode from "./GraphNode"

type TaskGraphProps = {
  nodes: Node[]
  edges: Edge[]
  setPlan: (nodes: Node[], edges: Edge[]) => void
  onSubmitPlan: (nodes: Node[], edges: Edge[]) => void
}

const NODE_TYPES = { custom: GraphNode }

export default function TaskGraph({ nodes, edges, setPlan, onSubmitPlan }: TaskGraphProps) {
  const updateNodes = useCallback((updatedNodes: Node[]) => {
    const nodeIds = new Set(updatedNodes.map(n => n.id))
    const updatedEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    setPlan(updatedNodes, updatedEdges)
  }, [edges, setPlan])

  const updateEdges = useCallback((updatedEdges: Edge[]) => setPlan(nodes, updatedEdges), [nodes, setPlan])

  const onNodesChange = useCallback((changes: NodeChange[]) => updateNodes(applyNodeChanges(changes, nodes)), [nodes, updateNodes])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => updateEdges(applyEdgeChanges(changes, edges)), [edges, updateEdges])

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = { ...connection, id: `${connection.source}-${connection.target}` }
    updateEdges([...edges, newEdge])
  }, [edges, updateEdges])

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const newLabel = prompt("Edit node label:", node.data.label)
    if (!newLabel) return
    updateNodes(nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n))
  }, [nodes, updateNodes])

  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "custom",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "New Node" }
    }
    updateNodes([...nodes, newNode])
  }, [nodes, updateNodes])

  const layoutCurrentGraph = useCallback(() => updateNodes(layoutGraph(nodes, edges)), [nodes, edges, updateNodes])

  const handleSubmit = useCallback(async () => {
    await onSubmitPlan(nodes, edges)
  }, [nodes, edges, onSubmitPlan])

  const handleNodesDelete = useCallback((deletedNodes: Node[]) => {
    const deleteIds = new Set(deletedNodes.map(n => n.id))
    const newNodes = nodes.filter(n => !deleteIds.has(n.id))
    const newEdges = edges.filter(e => !deleteIds.has(e.source) && !deleteIds.has(e.target))
    setPlan(newNodes, newEdges)
  }, [nodes, edges, setPlan])

  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const deleteIds = new Set(deletedEdges.map(e => e.id))
    const newEdges = edges.filter(e => !deleteIds.has(e.id))
    setPlan(nodes, newEdges)
  }, [nodes, edges, setPlan])

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
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  )
}