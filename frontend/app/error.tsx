'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-600">
          Something went wrong
        </h1>

        <p className="text-gray-600">
          An unexpected error occurred. Please try again.
        </p>

        {/* <button
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition"
        >
          Try again
        </button> */}
      </div>
    </div>
  )
}