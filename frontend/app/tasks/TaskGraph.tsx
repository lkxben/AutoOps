'use client'

import React, { useCallback } from "react"
import ReactFlow, {
  addEdge,
  removeElements,
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Elements
} from "reactflow"
import 'reactflow/dist/style.css'
import { useTaskHubPlan } from "../hooks/useTaskHubPlan"
import { layoutGraph } from "../lib/layoutGraph"

export default function TaskGraph() {
  const { nodes, edges } = useTaskHubPlan()
  const [rfNodes, setRfNodes] = React.useState<Node[]>(nodes)
  const [rfEdges, setRfEdges] = React.useState<Edge[]>(edges)

  // Sync initial hook values
  React.useEffect(() => {
    setRfNodes(nodes)
    setRfEdges(edges)
  }, [nodes, edges])

  // Node / Edge changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setRfNodes(prev => applyNodeChanges(changes, prev)),
    []
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setRfEdges(prev => applyEdgeChanges(changes, prev)),
    []
  )

  // Add edge by dragging handles
  const onConnect = useCallback(
    (connection: Connection) => setRfEdges(prev => addEdge(connection, prev)),
    []
  )

  // Edit node label on double-click
  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const newLabel = prompt("Edit node label:", node.data.label)
    if (newLabel) {
      setRfNodes(prev =>
        prev.map(n => (n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n))
      )
    }
  }, [])

  // Delete selected nodes/edges
  const onElementsRemove = useCallback((elements: Elements) => {
    const toRemoveIds = new Set(elements.map(e => e.id))
    setRfNodes(prev => prev.filter(n => !toRemoveIds.has(n.id)))
    setRfEdges(prev => prev.filter(e => !toRemoveIds.has(e.id)))
  }, [])

  // Add a new node
  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "default",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "New Node", action: "custom", params: {} }
    }
    setRfNodes(prev => [...prev, newNode])
  }, [])

  // Auto-layout current graph
  const layoutCurrentGraph = useCallback(() => {
    const laidOutNodes = layoutGraph(rfNodes, rfEdges)
    setRfNodes(laidOutNodes)
  }, [rfNodes, rfEdges])

  return (
    <div style={{ width: '100%', height: "100vh" }}>
      <div style={{ position: 'absolute', zIndex: 10, padding: 10 }}>
        <button onClick={addNode} style={{ marginRight: 10 }}>Add Node</button>
        <button onClick={layoutCurrentGraph}>Auto Layout</button>
      </div>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onElementsRemove={onElementsRemove}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={46} // Delete key
        nodesDraggable={true}
        nodesConnectable={true}
        nodesSelectable={true}
      >
        <MiniMap
          nodeColor={node => {
            switch (node.type) {
              case 'input': return '#0041d0'
              case 'output': return '#ff0072'
              default: return '#1a192b'
            }
          }}
        />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  )
}