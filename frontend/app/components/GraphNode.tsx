'use client'

import React from "react"
import { Handle, Position } from "reactflow"

export type GraphNodeProps = {
  data: { label: string; action?: string }
}

export default function GraphNode({ data }: GraphNodeProps) {
  return (
    <div className="relative bg-white border border-gray-300 rounded-lg p-3 text-center min-w-[140px] max-w-[200px]">

      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#4b5563',
          border: '2px solid white',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      <div className="text-sm font-medium text-gray-900 truncate">
        {data.label}
      </div>

      {data.action && (
        <div className="text-xs text-gray-500 truncate mt-1">
          {data.action}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#4b5563',
          border: '2px solid white',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  )
}