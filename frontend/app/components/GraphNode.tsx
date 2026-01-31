import React from "react"
import { Handle, Position } from "reactflow"

export type GraphNodeProps = {
  data: { label: string; action?: string }
}

export default function GraphNode({ data }: GraphNodeProps) {
  return (
    <div className="bg-cyan-300 border-1 border-gray-400 rounded-lg p-3 text-center min-w-[120px] max-w-[200px]">

      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, borderRadius: '50%' }}/>
      
      <div className="text-black">{data.label}</div>

      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, borderRadius: '50%' }}/>
    </div>
  )
}