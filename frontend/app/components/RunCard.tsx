'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Eye } from 'lucide-react'
import { RunModel, RunStatus } from '@/app/lib/types'

const STATUS_STYLES: Record<number, string> = {
  [RunStatus.Pending]: 'bg-yellow-100 text-yellow-800',
  [RunStatus.Running]: 'bg-indigo-100 text-indigo-800',
  [RunStatus.Completed]: 'bg-green-100 text-green-800',
  [RunStatus.Failed]: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<number, string> = {
  [RunStatus.Pending]: 'Pending',
  [RunStatus.Running]: 'Running',
  [RunStatus.Completed]: 'Completed',
  [RunStatus.Failed]: 'Failed',
}

type RunWithTask = RunModel & { task?: { title: string } }

type RunCardProps = {
  run: RunWithTask
}

export default function RunCard({ run }: RunCardProps) {
  const [showResult, setShowResult] = useState(false)

  const statusClass = STATUS_STYLES[run.status] || 'bg-gray-100 text-gray-800'
  const label = STATUS_LABELS[run.status] || 'Unknown'

  const created = parseISO(run.createdAt)
  const updated = run.updatedAt ? parseISO(run.updatedAt) : null
  const isFinished = run.status === RunStatus.Completed || run.status === RunStatus.Failed
  const timestamp = isFinished && updated ? updated : created
  const timestampLabel = isFinished ? 'Finished' : 'Started'

  const onCardClick = () => {
    if (run.result) setShowResult(true)
  }

  return (
    <>
      <div
        onClick={onCardClick}
        className="relative cursor-pointer bg-white rounded-2xl border border-gray-200
                  flex flex-col hover:shadow-lg transition
                  w-[95%] min-w-[16rem] mx-auto overflow-hidden"
      >
        <div className={`w-full h-1.5 ${statusClass}`} />

        <div className="flex flex-col flex-1 p-4 gap-1">
          {/* Top row: Task title + Status */}
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
              {run.task?.title ?? 'Untitled task'}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass}`}>
              {label}
            </span>
          </div>

          {/* Middle row: Task ID above Run ID */}
          <div className="flex flex-col gap-0.5 text-xs text-gray-400 truncate">
            <span className="truncate">Task ID: {run.taskId.slice(0, 8)}</span>
            <span className="truncate">Run ID: {run.id.slice(0, 8)}</span>
          </div>

          {/* Bottom row: Timestamp + Eye icon */}
          <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
            <span>{timestampLabel} {format(timestamp, 'MMM d, p')}</span>
            {run.result && (
              <Eye
                className="w-4 h-4 text-gray-400 hover:text-gray-600"
                onClick={(e) => { e.stopPropagation(); setShowResult(true) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Result modal */}
      {showResult && (
        <div
          onClick={() => setShowResult(false)}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {run.task?.title ?? 'Run Result'}
            </h3>

            <pre className="text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-auto">
              {run.result}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setShowResult(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}