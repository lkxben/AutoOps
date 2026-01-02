'use client'

import { useTaskHubUpdates } from '@/app/hooks/useTaskHubUpdates'

export default function TaskUpdates() {
  const { updates } = useTaskHubUpdates()

  return (
    <div className="space-y-2 p-4 max-w-3xl mx-auto">
      {updates.length === 0 && (
        <div className="text-gray-500">No updates yet</div>
      )}
      {updates.map((u, i) => (
        <div key={i} className="p-3 border rounded-lg bg-gray-50">
          <div className="font-medium">Task ID: {u.task_id}</div>
          <div>Status: {u.status}</div>
          {u.description && <div>Desc: {u.description}</div>}
        </div>
      ))}
    </div>
  )
}