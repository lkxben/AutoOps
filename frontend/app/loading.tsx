'use client'

export default function LoadingScreen({
  message = 'Loading...'
}: {
  message?: string
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-lg font-medium text-gray-700 text-center">
          {message}
        </p>
      </div>
    </div>
  )
}