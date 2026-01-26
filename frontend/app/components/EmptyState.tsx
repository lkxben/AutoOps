'use client'

interface EmptyStateProps {
  message: string
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center text-center text-gray-500">
        <p className="text">{message}</p>
      </div>
    </div>
  )
}