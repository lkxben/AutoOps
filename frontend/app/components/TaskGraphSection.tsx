'use client'

import { useEffect, useState } from 'react'
import ReactFlow, { Node, Edge, MiniMap, Controls, Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { apiGet } from '@/app/lib/api'
import CenteredMessage from '@/app/components/CenteredMessage'
import ConditionalEdge from '@/app/components/ConditionalEdge'
import { layoutGraph } from '@/app/lib/layoutGraph'
import DisplayGraphNode from './DisplayGraphNode'
import { toast } from 'sonner'
import LoadingScreen from '../loading'

const NODE_TYPES = { custom: DisplayGraphNode }
const EDGE_TYPES = { conditional: ConditionalEdge }

type TaskGraphSectionProps = {
  taskId: string
}

export default function TaskGraphSection({ taskId }: TaskGraphSectionProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiGet(`/tasks/${taskId}/plan`)
      .then((plan) => {
        const parsedGraph = JSON.parse(plan.graph)
        const { nodes, edges } = parsedGraph
        setNodes(layoutGraph(nodes, edges))
        setEdges(edges)
      })
      .catch((err) => {
        toast.error('Failed to load graph plan')
      })
      .finally(() => setLoading(false))
  }, [taskId])

  if (loading) return <LoadingScreen />
  if (!nodes.length && !edges.length) return <CenteredMessage>No graph data available</CenteredMessage>

  return (
    <div className="w-full h-[400px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <ReactFlow
        nodes={nodes.map(n => ({ ...n, type: "custom" }))}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        selectNodesOnDrag={false}
        onConnect={() => null}
    >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={24} />
      </ReactFlow>
    </div>
  )
}