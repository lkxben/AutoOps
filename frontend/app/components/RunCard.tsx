'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, Eye } from 'lucide-react'
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

type RunCardProps = {
  run: RunModel
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
        className="relative cursor-pointer bg-white rounded-2xl border border-gray-100
                  flex flex-col justify-between hover:shadow-lg transition
                  w-[95%] min-w-[16rem] h-44 mx-auto overflow-hidden"
      >
        <div className={`w-full h-2 ${statusClass}`} />

        <div className="flex flex-col justify-between flex-1 p-4">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>Task: {run.taskId.slice(0, 6)}</span>
            <span>Plan: {run.planId.slice(0, 6)}</span>
          </div>

          <div className="space-y-2 flex-1">
            <h2 className="text-md font-semibold text-gray-900 truncate">
              Run {run.id.slice(0, 8)}
            </h2>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                {timestampLabel} {format(timestamp, 'MMM d, p')}
              </span>
            </div>

            {run.result && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {run.result}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {label}
            </span>

            {run.result && (
              <Eye
                className="w-4 h-4 text-gray-500 hover:text-gray-700"
                onClick={(e) => { e.stopPropagation(); setShowResult(true) }}
              />
            )}

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
                    Run Result
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
          </div>
        </div>
      </div>      
    </>
  )
}